import express from 'express'
import path from 'node:path'
import placesRouter from './modules/places/places.route.js'
import { CLIENT_DIST } from './config/env.js'

const app = express()

app.use(express.json())
app.use('/api', placesRouter)

app.use(express.static(CLIENT_DIST))
app.get('*', (req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'))
})

export default app
