const db = require('../config/db')

// The ONE place that reads and saves skill names.
// Names are matched ignoring case/spaces, so "react " and "React" are the same skill.

const cleanNames = (names) => {
  const seen = new Map()
  for (const n of names) {
    const name = String(n ?? '').trim().replace(/\s+/g, ' ')
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name)
  }
  return [...seen.values()]
}

// All skill names, most used first (by jobs + seekers), then A–Z
async function listSkills(limit = 200) {
  const { rows } = await db.query(
    `SELECT s.name
       FROM skills s
       LEFT JOIN (SELECT skill_id, COUNT(*) AS n FROM job_skills GROUP BY skill_id) j ON j.skill_id = s.id
       LEFT JOIN (SELECT skill_id, COUNT(*) AS n FROM seeker_skills GROUP BY skill_id) k ON k.skill_id = s.id
      ORDER BY COALESCE(j.n, 0) + COALESCE(k.n, 0) DESC, s.name
      LIMIT $1`,
    [limit]
  )
  return rows.map((r) => r.name)
}

// Adds names that don't exist yet (keeps the existing spelling for the ones that do)
// and returns their ids, e.g. ['react', 'SQL'] → [2, 3]
async function skillIds(client, names) {
  const list = cleanNames(names)
  if (list.length === 0) return []
  await client.query(
    `INSERT INTO skills (name) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING`,
    [list]
  )
  const { rows } = await client.query(
    `SELECT id FROM skills WHERE lower(name) = ANY($1::text[])`,
    [list.map((n) => n.toLowerCase())]
  )
  return rows.map((r) => r.id)
}

module.exports = { cleanNames, listSkills, skillIds }
