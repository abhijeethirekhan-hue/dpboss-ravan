const express = require('express')
const path = require('path')
const app = express()

// Allow CORS for Supabase
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', '*')
  next()
})

// Serve static files from public folder
app.use(express.static('public'))

// Admin route - serve admin.html from root
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'))
})

// All other routes - serve index.html (Express v5 syntax)
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
  console.log('Admin panel: http://localhost:3000/admin')
})