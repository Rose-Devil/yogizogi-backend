// src/swagger.js
const path = require("path");
const swaggerJSDoc = require("swagger-jsdoc");
const { config } = require("./config/env");

function toGlob(p) {
  return p.replace(/\\/g, "/");
}

const serverUrl =
  config.swagger.serverUrl || `http://localhost:${config.host.port}`;

const apis = (config.swagger.apis ?? [path.join(__dirname, "modules/**/*.route.js")]).map(
  (p) => toGlob(p)
);

const options = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Yogizogi API", version: "1.0.0" },
    servers: [{ url: serverUrl }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis,
};

const spec = swaggerJSDoc(options);

if (config.swagger.logPaths && config.nodeEnv !== "production") {
  console.log("[swagger] apis:", apis);
  console.log("[swagger] paths:", Object.keys(spec.paths || {}));
}

module.exports = spec;
