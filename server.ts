import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import app from './server/app'

const port = Number(process.env.PORT ?? 3000)
const distDir = path.resolve(process.cwd(), 'dist')

app.use(express.static(distDir))

app.use((_request, response) => {
  response.sendFile(path.join(distDir, 'index.html'))
})

app.listen(port, '0.0.0.0', () => {
  console.log(`FramePilot production server listening on http://localhost:${port}`)
})
