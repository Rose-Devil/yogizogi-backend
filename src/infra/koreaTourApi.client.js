import { TOUR_API_KEY } from '../config/env.js'

const ENDPOINT = 'http://apis.data.go.kr/B551011/KorService1/searchKeyword1'

export async function fetchKoreaTourPlaces({ type }) {
  if (!TOUR_API_KEY) {
    const error = new Error('관광공사 API 키(TOUR_API_KEY)가 없습니다.')
    error.status = 500
    throw error
  }

  const decodedKey = decodeURIComponent(TOUR_API_KEY)
  const url = new URL(ENDPOINT)
  url.searchParams.append('serviceKey', decodedKey)
  url.searchParams.append('keyword', type === 'restaurant' ? '맛집' : '관광지')
  url.searchParams.append('areaCode', '1')
  url.searchParams.append('numOfRows', '100')
  url.searchParams.append('pageNo', '1')
  url.searchParams.append('MobileOS', 'ETC')
  url.searchParams.append('MobileApp', 'AppName')
  url.searchParams.append('_type', 'json')

  const response = await fetch(url.toString())
  const text = await response.text()

  if (!response.ok) {
    const error = new Error(text.slice(0, 200))
    error.status = response.status
    throw error
  }

  let data
  try {
    data = JSON.parse(text)
  } catch (err) {
    const error = new Error(`API JSON parse 실패: ${text.slice(0, 200)}`)
    error.status = 500
    throw error
  }

  const items = data.response?.body?.items?.item || []
  return items.map((item) => ({
    id: item.contentid,
    name: item.title,
    type: type || 'attraction',
    lat: Number.parseFloat(item.mapy || '37.5665'),
    lng: Number.parseFloat(item.mapx || '126.978'),
    address: item.addr1,
    description: item.overview?.substring(0, 120),
    image: item.firstimage,
    category: item.contenttypeid,
    rating: Math.random() * 1 + 4,
  }))
}
