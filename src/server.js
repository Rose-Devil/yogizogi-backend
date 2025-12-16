import app from './app.js'
import { PORT } from './config/env.js'

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
