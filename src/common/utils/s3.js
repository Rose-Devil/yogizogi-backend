const { S3Client } = require("@aws-sdk/client-s3");
const { config } = require("../../config/env");

// S3 클라이언트 생성
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = s3;
