import { KAKAO_REST_API_KEY } from '../config/env.js'

const ENDPOINT = 'https://dapi.kakao.com/v2/local/search/keyword.json'

export async function fetchKakaoPlaces(query) {
  if (!query) {
    const error = new Error('query 파라미터가 필요합니다.')
    error.status = 400
    throw error
  }

  if (!KAKAO_REST_API_KEY) {
    const error = new Error('KAKAO_REST_API_KEY가 설정되지 않았습니다.')
    error.status = 500
    throw error
  }

  const url = new URL(ENDPOINT)
  url.searchParams.set('query', query)
  url.searchParams.set('size', '15')

  const upstream = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
  })

  if (!upstream.ok) {
    const text = await upstream.text()
    const error = new Error(text.slice(0, 200))
    error.status = upstream.status
    throw error
  }

  const data = await upstream.json()
  return (data.documents || []).map((item) => ({
    id: item.id,
    name: item.place_name,
    type: 'kakao',
    lat: Number.parseFloat(item.y),
    lng: Number.parseFloat(item.x),
    address: item.road_address_name || item.address_name,
    description: item.category_name,
    rating: Math.random() * 1 + 4,
  }))
}
