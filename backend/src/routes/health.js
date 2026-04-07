import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "API OK", status: "running" });
});

router.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

export default router;
