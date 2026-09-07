const crypto = require("crypto");
const Meeting = require("../models/Meeting");

const createMeeting = async (req, res) => {
    try {
        const roomId = crypto.randomBytes(8).toString("hex");

        const meeting = await Meeting.create({
            roomId,
            host: req.user._id,
            participants: [req.user._id],
            title: "New Meeting",
        });

        res.status(201).json({
            message: "Meeting created successfully",
            meeting: {
                id: meeting._id,
                roomId: meeting.roomId,
                title: meeting.title,
                host: meeting.host,
                participants: meeting.participants,
                isActive: meeting.isActive,
            },
        });
    } catch (error) {
        console.error("Create meeting error:", error);

        res.status(500).json({
            message: "Server error",
        });
    }
};

const joinMeeting = async (req, res) => {
    try {
        const { roomId } = req.params;

        const meeting = await Meeting.findOne({ roomId });

        if (!meeting) {
            return res.status(404).json({
                message: "Meeting not found",
            });
        }

        if (!meeting.isActive) {
            return res.status(400).json({
                message: "Meeting is no longer active",
            });
        }

        const alreadyJoined = meeting.participants.some(
            (participant) =>
                participant.toString() === req.user._id.toString()
        );

        if (!alreadyJoined) {
            meeting.participants.push(req.user._id);
            await meeting.save();
        }

        res.status(200).json({
            message: "Meeting joined successfully",
            meeting: {
                id: meeting._id,
                roomId: meeting.roomId,
                title: meeting.title,
                host: meeting.host,
                participants: meeting.participants,
                isActive: meeting.isActive,
            },
        });
    } catch (error) {
        console.error("Join meeting error:", error);

        res.status(500).json({
            message: "Server error",
        });
    }
};

module.exports = {
    createMeeting,
    joinMeeting,
};