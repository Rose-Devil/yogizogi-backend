const ENDPOINT = 'http://apis.data.go.kr/B551011/KorService1/searchKeyword1'

const kmDistance = (lat1, lng1, lat2, lng2) => {
  const toRad = (value) => (value * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

async function fetchKoreaTourPlaces({ type, lat, lng, radiusKm = 5 }) {
  const apiKey = process.env.TOUR_API_KEY
  if (!apiKey) {
    const error = new Error('Missing TOUR_API_KEY environment variable.')
    error.status = 500
    throw error
  }

  const decodedKey = decodeURIComponent(apiKey)
  const url = new URL(ENDPOINT)
  url.searchParams.append('serviceKey', decodedKey)
  url.searchParams.append('keyword', type === 'restaurant' ? '맛집' : '관광지')
  url.searchParams.append('numOfRows', '100')
  url.searchParams.append('pageNo', '1')
  url.searchParams.append('MobileOS', 'ETC')
  url.searchParams.append('MobileApp', 'AppName')
  url.searchParams.append('_type', 'json')
  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    url.searchParams.append('mapX', lng)
    url.searchParams.append('mapY', lat)
    url.searchParams.append('radius', String(radiusKm * 1000))
  }

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
    const error = new Error(`API JSON parse failed: ${text.slice(0, 200)}`)
    error.status = 500
    throw error
  }

  const items = data.response?.body?.items?.item || []
  const mapped = items.map((item) => ({
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

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return mapped
  }

  return mapped.filter((place) => {
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return false
    return kmDistance(lat, lng, place.lat, place.lng) <= radiusKm
  })
}

module.exports = { fetchKoreaTourPlaces }
