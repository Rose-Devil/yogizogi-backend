// src/swagger.js
const path = require("path");
const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Yogizogi API", version: "1.0.0" },
    servers: [
      { url: process.env.SWAGGER_SERVER_URL || "http://localhost:9090" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },

  // ✅ 핵심: __dirname(=src 폴더) 기준 절대경로로 스캔
  apis: [
    path.join(__dirname, "modules/**/*.route.js"),
    path.join(__dirname, "modules/**/*.controller.js"),
    path.join(__dirname, "modules/**/*.types.js"),
  ],
};

const spec = swaggerJSDoc(options);

// ✅ 디버그: 스캔이 성공하면 paths 키가 찍힘
console.log("[swagger] paths:", Object.keys(spec.paths || {}));

module.exports = spec;
