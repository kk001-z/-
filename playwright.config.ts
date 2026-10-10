import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4175', headless: true, launchOptions: existsSync(chrome) ? { executablePath: chrome } : {}, screenshot: 'only-on-failure' },
  webServer: { command: 'npm start', env: { PORT: '4175', OPENAI_API_KEY: '' }, url: 'http://127.0.0.1:4175', reuseExistingServer: false, timeout: 30000 },
})
