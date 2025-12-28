const express = require("express");
const { getAttractions, getKakaoPlaces } = require("./places.controller");

const router = express.Router();

router.get("/attractions", getAttractions);
router.get("/kakao/places", getKakaoPlaces);

module.exports = router;
