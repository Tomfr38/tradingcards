require('dotenv').config()
const express = require('express')
const cors = require('cors')

const profileRoutes = require('./routes/profile')
const artworkRoutes = require('./routes/artworks')
const shopRoutes = require('./routes/shop')
const inventoryRoutes = require('./routes/inventory')

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => res.json({ ok: true }))

app.use('/profile', profileRoutes)
app.use('/', artworkRoutes)
app.use('/', shopRoutes)
app.use('/', inventoryRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`tradingcards backend listening on ${PORT}`))
