import { Router } from 'express'
import { getAttractions, getKakaoPlaces } from './places.controller.js'

const router = Router()

router.get('/attractions', getAttractions)
router.get('/kakao/places', getKakaoPlaces)

export default router
