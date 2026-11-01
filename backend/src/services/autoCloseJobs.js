const db = require('../config/db')

// Closes every open job whose deadline has passed
const autoCloseJobs = async () => {
  try {
    const { rowCount } = await db.query(
      `UPDATE jobs
          SET status = 'closed'
        WHERE status = 'open' AND deadline < CURRENT_DATE`
    )
    if (rowCount > 0) console.log(`Auto-closed ${rowCount} expired job(s)`)
  } catch (err) {
    console.error('Auto-close jobs failed:', err.message)
  }
}

module.exports = autoCloseJobs
