import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Always load .env relative to project root, even if process.cwd() differs.
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const DEFAULT_CLIENT_DIST = path.resolve(__dirname, '../../../yogizogi-frontend/dist')

export const PORT = process.env.PORT || 4002
export const CLIENT_DIST = process.env.CLIENT_DIST || DEFAULT_CLIENT_DIST

const tourApiKey = process.env.TOUR_API_KEY || process.env.VITE_TOUR_API_KEY
export const TOUR_API_KEY = tourApiKey

export const KAKAO_REST_API_KEY =
  process.env.KAKAO_REST_API_KEY || process.env.VITE_KAKAO_MAP_KEY

export const env = {
  PORT,
  CLIENT_DIST,
  TOUR_API_KEY,
  KAKAO_REST_API_KEY,
}
