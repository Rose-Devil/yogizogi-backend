import { fetchKoreaTourPlaces } from '../../infra/koreaTourApi.client.js'
import { fetchKakaoPlaces } from '../../infra/kakao.client.js'

export async function getAttractions(req, res) {
  const { lat, lng, type = 'attraction' } = req.query

  if (!lat || !lng) {
    return res
      .status(400)
      .json({ success: false, data: [], error: '위도/경도 쿼리 파라미터가 필요합니다.' })
  }

  try {
    const places = await fetchKoreaTourPlaces({ type })
    return res.json({ success: true, data: places, error: null })
  } catch (error) {
    const status = error.status || 500
    const message =
      error instanceof Error ? error.message : '관광/맛집 데이터를 불러오지 못했습니다.'
    return res.status(status).json({ success: false, data: [], error: message })
  }
}

export async function getKakaoPlaces(req, res) {
  const { query } = req.query

  try {
    const places = await fetchKakaoPlaces(query)
    return res.json({ success: true, data: places, error: null })
  } catch (error) {
    const status = error.status || 500
    const message =
      error instanceof Error ? error.message : '카카오맵 데이터를 불러오지 못했습니다.'
    return res.status(status).json({ success: false, data: [], error: message })
  }
}
