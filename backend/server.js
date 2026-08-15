const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    message: "Backend is running",
    environment: process.env.ENVIRONMENT || "development"
  });
});

app.get("/api/hello", (req, res) => {
  res.json({
    message: "Hello from Kubernetes backend!",
    timestamp: new Date().toISOString(),
    pod: process.env.HOSTNAME || "unknown"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
