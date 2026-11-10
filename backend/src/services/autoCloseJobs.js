const db = require('../config/db')

// Closes every open job whose deadline has passed, and tells the company
const closeExpiredJobs = async () => {
  const { rowCount } = await db.query(
    `WITH closed AS (
       UPDATE jobs SET status = 'closed'
        WHERE status = 'open' AND deadline < CURRENT_DATE
        RETURNING id, title, company_id
     )
     INSERT INTO notifications (user_id, job_id, type, title, message)
     SELECT c.user_id, closed.id, 'job_closed',
            LEFT('Job closed: ' || closed.title, 150),
            (SELECT COUNT(*) FROM applications a
              WHERE a.job_id = closed.id AND a.status IN ('applied', 'shortlisted', 'interview'))
              || ' applicants are waiting for a decision.'
       FROM closed
       JOIN companies c ON c.id = closed.company_id`
  )
  if (rowCount > 0) console.log(`Auto-closed ${rowCount} expired job(s)`)
}

// 3 days before the deadline, remind the company once
const remindDeadlines = async () => {
  await db.query(
    `INSERT INTO notifications (user_id, job_id, type, title, message)
     SELECT c.user_id, j.id, 'deadline', 'Deadline in 2 days',
            j.title || ' closes on ' || to_char(j.deadline, 'DD Mon') || '. You can extend it from View & edit.'
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
      WHERE j.status = 'open' AND j.deadline = CURRENT_DATE + 3
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
           WHERE n.job_id = j.id AND n.user_id = c.user_id AND n.type = 'deadline'
        )`
  )
}

const autoCloseJobs = async () => {
  try {
    await closeExpiredJobs()
    await remindDeadlines()
  } catch (err) {
    console.error('Auto-close jobs failed:', err.message)
  }
}

module.exports = autoCloseJobs
