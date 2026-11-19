const db = require('../config/db')

// Every page reads and saves skill names through this file, so "react " and "React" are always treated as the same skill

// Trims each name and drops repeats, ignoring case
const cleanNames = (names) => {
  const seen = new Map()
  for (const n of names) {
    const name = String(n ?? '')
      .trim()
      .replace(/\s+/g, ' ')
    if (name && !seen.has(name.toLowerCase()))
      seen.set(name.toLowerCase(), name)
  }
  return [...seen.values()]
}

// Skill names for the dropdowns, most used first
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

// Returns the ids of these skills, adding any that aren't saved yet.
// Existing skills keep their spelling: ['react', 'SQL'] gives the ids of React and SQL
async function skillIds(client, names) {
  const list = cleanNames(names)
  if (list.length === 0) return []
  await client.query(
    `INSERT INTO skills (name) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING`,
    [list]
  )
  const { rows } = await client.query(
    `SELECT id FROM skills WHERE lower(trim(name)) = ANY($1::text[])`,
    [list.map((n) => n.toLowerCase())]
  )
  return rows.map((r) => r.id)
}

module.exports = { listSkills, skillIds }
