import 'dotenv/config'
import app from './app'

const port = Number(process.env.DIRECTOR_PORT ?? 8787)

app.listen(port, '0.0.0.0', () => {
  console.log(`FramePilot Director API listening on http://localhost:${port}`)
})
