//routes/whatsapp.js
const express = require("express");
const {
  handleWebhook,
  verifyWebhook,
} = require("../controllers/whatsappController");

const router = express.Router();

router.post("/webhook", handleWebhook);
router.get("/webhook", verifyWebhook);

module.exports = router;
