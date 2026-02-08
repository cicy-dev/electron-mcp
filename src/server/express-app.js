const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
const fs = require("fs");

function createExpressApp(authMiddleware) {
  const app = express();

  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  app.use(express.json());
  app.use(express.text());

  // Swagger UI
  app.get("/docs", (req, res) => {
    const htmlPath = path.join(__dirname, "../swagger-ui.html");
    res.sendFile(htmlPath);
  });

  // OpenAPI spec
  app.get("/openapi.json", authMiddleware, (req, res) => {
    const openapiPath = path.join(__dirname, "../../openapi.json");
    if (fs.existsSync(openapiPath)) {
      res.json(JSON.parse(fs.readFileSync(openapiPath, "utf8")));
    } else {
      res.status(404).json({ error: "OpenAPI spec not found" });
    }
  });

  return app;
}

module.exports = { createExpressApp };
