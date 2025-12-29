const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const uploadsRoot = path.resolve(__dirname, "../../../uploads");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function createDiskStorage(subdir) {
  return multer.diskStorage({
    destination(req, file, cb) {
      const dest = path.join(uploadsRoot, subdir);
      try {
        ensureDir(dest);
        cb(null, dest);
      } catch (err) {
        cb(err);
      }
    },
    filename(req, file, cb) {
      const original = file.originalname || "file";
      const safe = original.replace(/[^\w.\-]/g, "_");
      const ext = path.extname(safe);
      const base = path.basename(safe, ext);
      const unique = `${Date.now()}-${crypto.randomUUID()}`;
      cb(null, `${base}-${unique}${ext}`);
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

function createImageUploader(subdir, { maxFileSizeBytes = 10 * 1024 * 1024 } = {}) {
  return multer({
    storage: createDiskStorage(subdir),
    fileFilter: imageFileFilter,
    limits: { fileSize: maxFileSizeBytes },
  });
}

const postImagesUpload = createImageUploader("posts");
const profileImageUpload = createImageUploader("profiles");

module.exports = { postImagesUpload, profileImageUpload, uploadsRoot };
