const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

// Allow the Next.js frontend (localhost:3000) to call this server
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Quick check that the backend is running
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Mission Control online 🚀" });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
