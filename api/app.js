require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

const PORT = 3001;
const BUILD_NUMBER = process.env.BUILD_NUMBER;
const GIT_COMMIT = process.env.GIT_COMMIT;
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello from server");
});

app.get("/data", (req, res) => {
  const data = {
    service: "Jenkins API",
    status: "running",
    message: "Hello from the API",
    time: new Date().toLocaleTimeString(),
  };

  res.json({ data });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    build: BUILD_NUMBER,
    commit: GIT_COMMIT,
  });
});

app.listen(PORT, () => {
  console.log(`App is running on ${PORT}`);
});

module.exports = app;
