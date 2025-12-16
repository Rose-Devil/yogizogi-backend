const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Yogizogi API", version: "1.0.0" },
    servers: [
      { url: process.env.SWAGGER_SERVER_URL || "http://localhost:8080/api" },
    ],
  },
  // 라우트 주석(@swagger) 위치에 맞게 수정
  apis: ["./src/modules/**/*.route.js", "./src/modules/**/*.controller.js"],
};

module.exports = swaggerJSDoc(options);
