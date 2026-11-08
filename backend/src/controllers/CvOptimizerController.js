const db = require('../config/db')
const { aiEnabled } = require('../services/cvAi')
const { reviewCv, applySuggestions, missingContent, afterAllChanges, reachableScore, cleanCvText, COMPARISON_LABELS, scoreAcceptedSuggestions } = require('../services/cvOptimizer')
const { renderCv, renderReport } = require('../services/cvPdf')

// Advanced CV report (simulated payment). VAT is 10%, the same as plan payments
const REPORT_PRICE = { subtotal: 2, vat: 0.2, total: 2.2 }
const PAYMENT_METHODS = ['card']
const SUGGESTION_STATUSES = ['pending', 'accepted', 'dismissed']
async function loadCurrentResume(seekerId) {
  const { rows } = await db.query(
    `SELECT r.id, r.file_name, r.parsed_text, r.uploaded_at, sp.major
       FROM resumes r
       JOIN seeker_profiles sp ON sp.user_id = r.seeker_id
      WHERE r.seeker_id = $1 AND r.is_current`,
    [seekerId]
  )
  return rows[0] || null
}

async function loadReview(resumeId, queryable = db) {
  const { rows } = await queryable.query(
    `SELECT rv.*, p.paid_at, p.subtotal_bhd, p.vat_bhd, p.total_bhd
       FROM cv_reviews rv
       LEFT JOIN payments p
         ON p.cv_review_id = rv.id AND p.item = 'advanced_cv_report' AND p.status = 'paid'
      WHERE rv.resume_id = $1
      ORDER BY rv.created_at DESC, rv.id DESC
      LIMIT 1`,
    [resumeId]
  )
  return rows[0] || null
}

async function loadSuggestions(reviewId) {
  const { rows } = await db.query(
    `SELECT id, section, before_text, after_text, reason, points, is_free_preview, status
       FROM cv_suggestions WHERE review_id = $1 ORDER BY id`,
    [reviewId]
  )
  return rows
}

// The rewrites are what the report sells, so locked ones never leave the server
function formatSuggestion(s, isAdvanced) {
  const summary = { id: s.id, section: s.section, beforeText: s.before_text }
  if (!isAdvanced && !s.is_free_preview) return { ...summary, locked: true }
  return {
    ...summary,
    locked: false,
    afterText: s.after_text,
    reason: s.reason,
    points: s.points,
    isFreePreview: s.is_free_preview,
    status: s.status
  }
}

function formatReview(review, suggestions, resume, missing, currentScore, reachable) {
  const isAdvanced = review.is_advanced
  return {
    id: review.id,
    resume: { id: resume.id, fileName: resume.file_name, uploadedAt: resume.uploaded_at },
    cvText: cleanCvText(resume.parsed_text),
    major: resume.major,
    strengthScore: review.strength_score,
    improvementsFound: suggestions.length,
    isAdvanced,
    suggestions: suggestions.map((s) => formatSuggestion(s, isAdvanced)),
    missing,
    createdAt: review.created_at,
    currentScore,
    // Shown before paying too, so nobody pays expecting more than the rewrites can give.
    // potentialScore: after every rewrite. reachableScore: after the rewrites and everything in "missing"
    potentialScore: review.potential_score,
    reachableScore: reachable,
    ...(isAdvanced
      ? {
          comparison: Object.entries(COMPARISON_LABELS).map(([key, label]) => ({
            key,
            label,
            met: review.comparison?.[key] === true
          })),
          payment: review.paid_at && {
            paidAt: review.paid_at,
            subtotalBhd: Number(review.subtotal_bhd),
            vatBhd: Number(review.vat_bhd),
            totalBhd: Number(review.total_bhd),
            isSimulated: true
          }
        }
      : {
          // false when the free suggestion is the only one: there is nothing to pay for
          canUnlock: suggestions.some((s) => !s.is_free_preview),
          reportPrice: { subtotalBhd: REPORT_PRICE.subtotal, vatBhd: REPORT_PRICE.vat, totalBhd: REPORT_PRICE.total }
        })
  }
}

async function reviewResponse(resume) {
  const review = await loadReview(resume.id)
  if (!review) return null
  const suggestions = await loadSuggestions(review.id)
  const currentScore = await scoreAcceptedSuggestions(resume.parsed_text, suggestions)
  const after = await afterAllChanges(resume.parsed_text, suggestions)
  // Paid users see every rewrite, so "what only you can add" and the comparison are what's left after them,
  // the same as the PDF report. Free users can't use the rewrites, so they see their CV as it is
  const advanced = review.is_advanced

  return formatReview(
    advanced ? { ...review, comparison: after.comparison } : review,
    suggestions,
    resume,
    advanced ? after.missing : await missingContent(resume.parsed_text),
    currentScore,
    reachableScore(review.potential_score, after.missing)
  )
}

async function getReview(req, res, next) {
  try {
    const resume = await loadCurrentResume(req.user.id)
    if (!resume) return res.status(404).json({ error: 'Please upload your CV first' })
    // Without readable text there is nothing to show; the frontend asks for a new upload
    if (!resume.parsed_text) return res.json({ review: null, canReview: false })
    res.json({ review: await reviewResponse(resume), canReview: true })
  } catch (err) {
    next(err)
  }
}

// The same CV uploaded again keeps its review, so its score doesn't change and it isn't paid for twice
async function reuseReview(resume, seekerId) {
  const { rowCount } = await db.query(
    `UPDATE cv_reviews SET resume_id = $1
      WHERE id = (SELECT rv.id
                    FROM cv_reviews rv
                    JOIN resumes r ON r.id = rv.resume_id
                   WHERE r.seeker_id = $2 AND r.parsed_text = $3 AND r.id <> $1
                   ORDER BY rv.is_advanced DESC, rv.created_at DESC, rv.id DESC
                   LIMIT 1)`,
    [resume.id, seekerId, resume.parsed_text]
  )
  return rowCount > 0
}

async function createReview(req, res, next) {
  let client
  try {
    const resume = await loadCurrentResume(req.user.id)
    if (!resume) return res.status(404).json({ error: 'Please upload your CV first' })
    if (!resume.parsed_text) {
      return res.status(422).json({ error: "We couldn't read this CV. Please upload a PDF or Word file that isn't a scanned image." })
    }

    // A CV file never changes, so one review per CV (and paying again is never needed)
    const existing = await reviewResponse(resume)
    if (existing) return res.json({ review: existing })

    if (await reuseReview(resume, req.user.id)) return res.json({ review: await reviewResponse(resume) })

    if (!aiEnabled()) return res.status(503).json({ error: 'The AI CV Optimizer is not available right now' })

    let result
    try {
      result = await reviewCv(resume.parsed_text, { major: resume.major })
    } catch (err) {
      console.error('CV review failed:', err.message)
      return res.status(502).json({ error: "We couldn't review your CV right now. Please try again." })
    }

    client = await db.connect()
    try {
      await client.query('BEGIN')
      // Two clicks at once: the second one waits here, then finds the first one's review
      await client.query('SELECT id FROM resumes WHERE id = $1 FOR UPDATE', [resume.id])
      if (await loadReview(resume.id, client)) {
        await client.query('COMMIT')
        return res.json({ review: await reviewResponse(resume) })
      }

      const { rows } = await client.query(
        `INSERT INTO cv_reviews (resume_id, strength_score, potential_score, comparison)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [resume.id, result.strength, result.potential, result.comparison]
      )
      // The first suggestion (the most useful section) is the free one
      for (const [i, s] of result.suggestions.entries()) {
        await client.query(
          `INSERT INTO cv_suggestions (review_id, section, before_text, after_text, reason, points, is_free_preview)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [rows[0].id, s.section, s.before, s.after, s.reason, s.points, i === 0]
        )
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    }
    res.status(201).json({ review: await reviewResponse(resume) })
  } catch (err) {
    next(err)
  } finally {
    client?.release()
  }
}

async function unlock(req, res, next) {
  const { method } = req.body || {}
  if (!PAYMENT_METHODS.includes(method)) {
    return res.status(400).json({ error: 'Please choose how to pay', fields: { method: 'Must be card' } })
  }

  let client
  try {
    const resume = await loadCurrentResume(req.user.id)
    const review = resume && (await loadReview(resume.id))
    if (!review) return res.status(404).json({ error: 'Your CV has not been reviewed yet' })

    client = await db.connect()
    try {
      await client.query('BEGIN')
      // Locks the review so a double click can't charge twice
      const { rows } = await client.query('SELECT is_advanced FROM cv_reviews WHERE id = $1 FOR UPDATE', [review.id])
      if (!rows[0].is_advanced) {
        const { rows: locked } = await client.query(
          'SELECT 1 FROM cv_suggestions WHERE review_id = $1 AND NOT is_free_preview LIMIT 1',
          [review.id]
        )
        if (!locked.length) {
          await client.query('ROLLBACK')
          return res.status(409).json({ error: 'Your CV has nothing more to unlock' })
        }
        await client.query(
          `INSERT INTO payments (user_id, cv_review_id, item, method, subtotal_bhd, vat_bhd, total_bhd, status, is_simulated, paid_at)
           VALUES ($1, $2, 'advanced_cv_report', $3, $4, $5, $6, 'paid', true, now())`,
          [req.user.id, review.id, method, REPORT_PRICE.subtotal, REPORT_PRICE.vat, REPORT_PRICE.total]
        )
        await client.query('UPDATE cv_reviews SET is_advanced = true WHERE id = $1', [review.id])
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    }
    res.json({ review: await reviewResponse(resume) })
  } catch (err) {
    next(err)
  } finally {
    client?.release()
  }
}

async function updateSuggestion(req, res, next) {
  const { status } = req.body || {}
  if (!/^\d{1,9}$/.test(req.params.id)) return res.status(404).json({ error: 'Suggestion not found' })
  if (!SUGGESTION_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status', fields: { status: 'Must be pending, accepted or dismissed' } })
  }
  try {
    const { rows } = await db.query(
      `SELECT s.is_free_preview, rv.is_advanced, rv.id AS review_id, r.parsed_text
         FROM cv_suggestions s
         JOIN cv_reviews rv ON rv.id = s.review_id
         JOIN resumes r ON r.id = rv.resume_id
        WHERE s.id = $1 AND r.seeker_id = $2 AND r.is_current`,
      [req.params.id, req.user.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Suggestion not found' })
    if (!rows[0].is_free_preview && !rows[0].is_advanced) {
      return res.status(403).json({ error: 'Unlock the advanced report to use this suggestion' })
    }

    const { rows: updated } = await db.query(
      `UPDATE cv_suggestions SET status = $1 WHERE id = $2
       RETURNING id, section, before_text, after_text, reason, points, is_free_preview, status`,
      [status, req.params.id]
    )
    const currentScore = await scoreAcceptedSuggestions(
      rows[0].parsed_text,
      await loadSuggestions(rows[0].review_id)
    )
    res.json({
      suggestion: formatSuggestion(updated[0], true),
      currentScore
    })
  } catch (err) {
    next(err)
  }
}



function sendPdf(res, buffer, fileName) {
  res.set('Content-Type', 'application/pdf')
  res.set('Content-Disposition', `attachment; filename="${fileName}"`)
  res.send(buffer)
}

async function downloadCv(req, res, next) {
  try {
    const resume = await loadCurrentResume(req.user.id)
    const review = resume && (await loadReview(resume.id))
    if (!review) return res.status(404).json({ error: 'Your CV has not been reviewed yet' })

    const text = applySuggestions(resume.parsed_text, await loadSuggestions(review.id))
    sendPdf(res, await renderCv(text), 'improved-cv.pdf')
  } catch (err) {
    next(err)
  }
}

async function downloadReport(req, res, next) {
  try {
    const resume = await loadCurrentResume(req.user.id)
    const review = resume && (await loadReview(resume.id))
    if (!review) return res.status(404).json({ error: 'Your CV has not been reviewed yet' })
    if (!review.is_advanced) return res.status(403).json({ error: 'Unlock the advanced report to download it' })

    const suggestions = await loadSuggestions(review.id)
    // Shown beside the "after all changes" score, so worked out on the CV with every suggestion used
    const after = await afterAllChanges(resume.parsed_text, suggestions)
    const buffer = await renderReport({
      review: { ...review, comparison: after.comparison },
      suggestions,
      missing: after.missing,
      reachable: reachableScore(review.potential_score, after.missing),
      major: resume.major,
      fileName: resume.file_name
    })
    sendPdf(res, buffer, 'cv-report.pdf')
  } catch (err) {
    next(err)
  }
}

module.exports = { getReview, createReview, unlock, updateSuggestion, downloadCv, downloadReport }
