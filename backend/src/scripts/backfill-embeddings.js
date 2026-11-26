// One-off script: creates embeddings for data that was added with SQL (seed data)
// and recalculates all match scores.
// Put this file in: src/scripts/backfill-embeddings.js
// Run from the backend folder:  node src/scripts/backfill-embeddings.js
require('dotenv').config()
const db = require('../config/db')
const { aiEnabled } = require('../services/cvAi')
const { saveJobEmbedding, rescoreJob } = require('../services/matching')
const { saveCvEmbedding } = require('../services/cvParser')

async function main() {
  if (!aiEnabled()) {
    console.error('GEMINI_API_KEY is missing in .env, so embeddings cannot be created.')
    process.exit(1)
  }

  // 1. Jobs: embedding from title + skills + description (same as when a job is saved)
  const { rows: jobs } = await db.query(`SELECT id, title FROM jobs WHERE status = 'open'`)
  for (const job of jobs) {
    await saveJobEmbedding(job.id)
    console.log(`Job ${job.id} (${job.title}): embedding saved`)
  }

  // 2. Seekers: embedding from the text of their current CV
  const { rows: seekers } = await db.query(
    `SELECT sp.user_id, r.parsed_text
       FROM seeker_profiles sp
       LEFT JOIN resumes r ON r.seeker_id = sp.user_id AND r.is_current`
  )
  for (const s of seekers) {
    if (!s.parsed_text) {
      console.log(`Seeker ${s.user_id}: no CV text, skipped (upload a CV from the website instead)`)
      continue
    }
    await saveCvEmbedding(s.user_id, s.parsed_text)
    console.log(`Seeker ${s.user_id}: embedding saved`)
  }

  // 3. Recalculate every score now that the embeddings exist
  for (const job of jobs) {
    await rescoreJob(job.id)
    console.log(`Job ${job.id}: scores recalculated`)
  }

  console.log('Done.')
  await db.end?.()
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})