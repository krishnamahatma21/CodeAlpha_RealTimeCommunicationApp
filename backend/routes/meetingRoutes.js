const express = require("express");

const {
    createMeeting,
    joinMeeting,
} = require("../controllers/meetingController");

const protect = require("../middleware/protect");

const router = express.Router();

router.post("/", protect, createMeeting);

router.post("/join/:roomId", protect, joinMeeting);

module.exports = router;