// imports
const express = require('express')
const cors = require('cors')
const { UPLOADS_DIR } = require('./middleware/upload')

// initialize express app
const app = express()

// require middlewares
app.use(cors())
app.use(express.json())

// Root route
app.get('/', (req, res) => {
  res.send('Your app is connected ...')
})

// Require routes
const authRoutes = require('./routes/AuthRouter')
const cvRoutes = require('./routes/CvRouter')
const jobRoutes = require('./routes/JobRouter')
const companyRoutes = require('./routes/CompanyRouter')
const applicationRoutes = require('./routes/ApplicationRouter')
const notificationRoutes = require('./routes/NotificationRouter')

// Uploaded CVs and logos
app.use('/uploads', express.static(UPLOADS_DIR))

// use routes
app.use('/api/auth', authRoutes)
app.use('/api/cv', cvRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/notifications', notificationRoutes)

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Central error handler
app.use((err, req, res, next) => {
  // Upload problems (file too big, wrong type) are the user's mistake, not a server error
  if (err.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too big (max 5 MB)'
        : err.message
    return res.status(400).json({ error: message })
  }
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

module.exports = app
