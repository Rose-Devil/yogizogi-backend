const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../utils/s3");

function createS3Storage(subdir) {
  return multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE, // 파일 타입 자동 설정
    key: function (req, file, cb) {
      const original = file.originalname || "file";
      const safe = original.replace(/[^\w.\-]/g, "_");
      const ext = path.extname(safe);
      const base = path.basename(safe, ext);
      const unique = `${Date.now()}-${crypto.randomUUID()}`;

      // S3 내 경로: subdir/파일명
      cb(null, `${subdir}/${base}-${unique}${ext}`);
    },
  });
}

function imageFileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    const err = new Error("이미지 파일만 업로드할 수 있습니다.");
    err.statusCode = 400;
    return cb(err);
  }
  cb(null, true);
}

function createImageUploader(
  subdir,
  { maxFileSizeBytes = 10 * 1024 * 1024 } = {}
) {
  return multer({
    storage: createS3Storage(subdir),
    fileFilter: imageFileFilter,
    limits: { fileSize: maxFileSizeBytes },
  });
}

const postImagesUpload = createImageUploader("posts");
const profileImageUpload = createImageUploader("profiles");

module.exports = { postImagesUpload, profileImageUpload };
