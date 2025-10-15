const express = require("express");
const router = express.Router();
const { verifySlotHmac } = require("../middleware/verifySlotHmac");
const { handleAction } = require("../controllers/slotgrator.controller");

// Public endpoint Slotgrator will call
router.post("/callbacks/aggregator", verifySlotHmac, handleAction);
router.get("/", (req, res) => {
    res.send("Hello")
});

module.exports = router;
