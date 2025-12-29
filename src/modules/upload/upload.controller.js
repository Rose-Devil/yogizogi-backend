// src/modules/upload/upload.controller.js
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

const required = (name, value) => {
  if (!value) {
    throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  }
  return value;
};

const region = required("AWS_REGION", process.env.AWS_REGION);
const bucket = required("AWS_S3_BUCKET", process.env.AWS_S3_BUCKET);

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: required("AWS_ACCESS_KEY", process.env.AWS_ACCESS_KEY),
    secretAccessKey: required("AWS_SECRET_KEY", process.env.AWS_SECRET_KEY),
  },
});

const getPresignedUrl = async (req, res, next) => {
  try {
    const { filename, contentType, folder = "uploads" } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ message: "filename과 contentType은 필수입니다." });
    }

    if (!contentType.startsWith("image/")) {
      return res.status(400).json({ message: "이미지 파일만 업로드할 수 있습니다." });
    }

    const safeFilename = filename.replace(/[^\w.\-]/g, "_");
    const uniqueKey = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: uniqueKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    const imageUrl = `https://${bucket}.s3.${region}.amazonaws.com/${uniqueKey}`;

    res.json({ uploadUrl, imageUrl, expiresIn: 60 });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPresignedUrl };
