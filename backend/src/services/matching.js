const db = require('../config/db')
const { computeScore } = require('./scoring')
const { embedText, aiEnabled } = require('./cvAi')

async function saveJobEmbedding(jobId) {
  if (!aiEnabled()) return
  const { rows } = await db.query(
    `SELECT j.title, j.description, string_agg(s.name, ', ') AS skills
       FROM jobs j
       LEFT JOIN job_skills js ON js.job_id = j.id
       LEFT JOIN skills s ON s.id = js.skill_id
      WHERE j.id = $1
      GROUP BY j.id`,
    [jobId]
  )
  if (!rows[0]) return
  const { title, skills, description } = rows[0]
  const vector = await embedText(
    `Title: ${title}\nSkills: ${skills || ''}\nDescription: ${description || ''}`
  )
  await db.query('UPDATE jobs SET jd_embedding = $1::vector WHERE id = $2', [vector, jobId])
}

async function scorePair(seekerId, jobId) {
  const { rows } = await db.query(
    `SELECT sp.major, sp.years_experience, sp.job_types, sp.work_modes,
            j.field, j.major_must_have, j.min_years, j.max_years, j.job_type, j.work_mode,
            1 - (sp.cv_embedding <=> j.jd_embedding) AS sim,
            EXISTS (SELECT 1 FROM related_fields r
                     WHERE (r.field_a = sp.major AND r.field_b = j.field)
                        OR (r.field_b = sp.major AND r.field_a = j.field)) AS related,
            COALESCE((SELECT json_agg(json_build_object(
                        'name', s.name, 'required', js.is_required, 'has', ss.skill_id IS NOT NULL))
                        FROM job_skills js
                        JOIN skills s ON s.id = js.skill_id
                        LEFT JOIN seeker_skills ss ON ss.skill_id = js.skill_id AND ss.seeker_id = sp.user_id
                       WHERE js.job_id = j.id), '[]') AS skills
       FROM seeker_profiles sp, jobs j
      WHERE sp.user_id = $1 AND j.id = $2`,
    [seekerId, jobId]
  )
  if (!rows[0]) return

  const { score, tier, isQualified, breakdown } = computeScore(rows[0])
  await db.query(
    `INSERT INTO match_scores (job_id, seeker_id, score, tier, is_qualified, breakdown)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (job_id, seeker_id) DO UPDATE
       SET score = $3, tier = $4, is_qualified = $5, breakdown = $6, computed_at = now()`,
    [jobId, seekerId, score, tier, isQualified, breakdown]
  )
}

async function rescoreSeeker(seekerId) {
  const { rows } = await db.query(`SELECT id FROM jobs WHERE status = 'open'`)
  for (const job of rows) await scorePair(seekerId, job.id)
}

async function rescoreJob(jobId) {
  const { rows: open } = await db.query(`SELECT 1 FROM jobs WHERE id = $1 AND status = 'open'`, [jobId])
  if (open.length === 0) return // drafts and closed jobs aren't scored
  const { rows } = await db.query('SELECT user_id FROM seeker_profiles')
  for (const seeker of rows) await scorePair(seeker.user_id, jobId)
}

// After a job is scored: tell seekers it's a strong match for (80%+).
// Skips seekers who already applied or were already told about this job,
// so editing the job never sends the same notification twice.
async function notifyNewMatches(jobId) {
  await db.query(
    `INSERT INTO notifications (user_id, job_id, type, title, message)
     SELECT ms.seeker_id, j.id, 'new_matches',
            'A new job matches your profile',
            j.title || ' at ' || c.name || ' is a ' || ms.score || '% match for you.'
       FROM match_scores ms
       JOIN jobs j ON j.id = ms.job_id
       JOIN companies c ON c.id = j.company_id
      WHERE ms.job_id = $1 AND j.status = 'open' AND ms.tier = 'strong'
        AND NOT EXISTS (SELECT 1 FROM applications a
                         WHERE a.job_id = j.id AND a.seeker_id = ms.seeker_id)
        AND NOT EXISTS (SELECT 1 FROM notifications n
                         WHERE n.user_id = ms.seeker_id AND n.job_id = j.id AND n.type = 'new_matches')`,
    [jobId]
  )
}

module.exports = { saveJobEmbedding, rescoreSeeker, rescoreJob, notifyNewMatches }
