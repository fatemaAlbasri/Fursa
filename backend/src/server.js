require('dotenv').config()

const app = require('./app')
const db = require('./config/db')

const autoCloseJobs = require('./services/autoCloseJobs')
const renewPlans = require('./services/renewPlans')

const PORT = process.env.PORT || 5000

async function start() {
  try {
    await db.query('SELECT 1')
    console.log('Connected to PostgreSQL')
  } catch (err) {
    console.error('Could not connect to PostgreSQL:', err.message)
    process.exit(1)
  }

  // close expired jobs
  autoCloseJobs()
  setInterval(autoCloseJobs, 60 * 60 * 1000)

  // simulated monthly renewals + reminders
  renewPlans()
  setInterval(renewPlans, 60 * 60 * 1000)

  app.listen(PORT, () => {
    console.log(`Fursa API running on http://localhost:${PORT}`)
  })
}

start()
