require('dotenv').config()

const app = require('./app')
const db = require('./config/db')

const PORT = process.env.PORT || 5000

async function start() {
  try {
    await db.query('SELECT 1')
    console.log('Connected to PostgreSQL')
  } catch (err) {
    console.error('Could not connect to PostgreSQL:', err.message)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`Fursa API running on http://localhost:${PORT}`)
  })
}

start()
