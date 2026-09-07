const Meeting = require("../models/Meeting");

const meetingSocket = (io, socket) => {
    // Join meeting room
    socket.on("join-meeting", async ({ roomId }) => {
        try {
            const meeting = await Meeting.findOne({ roomId });

            if (!meeting) {
                socket.emit("meeting-error", {
                    message: "Meeting not found",
                });
                return;
            }

            const existingUsers = [
                ...(io.sockets.adapter.rooms.get(roomId) || []),
            ];

            socket.join(roomId);

            socket.emit("existing-users", {
                users: existingUsers,
            });

            socket.to(roomId).emit("user-joined", {
                userId: socket.userId,
                socketId: socket.id,
            });

            const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;

            socket.emit("meeting-joined", {
                roomId,
                socketId: socket.id,
                participantCount: roomSize,
            });

            console.log(`User ${socket.userId} joined room ${roomId}`);
        } catch (error) {
            console.error("Join meeting socket error:", error);

            socket.emit("meeting-error", {
                message: "Unable to join meeting",
            });
        }
    });

    // Leave meeting room
    socket.on("leave-meeting", ({ roomId }) => {
        socket.leave(roomId);

        socket.to(roomId).emit("user-left", {
            userId: socket.userId,
            socketId: socket.id,
        });

        console.log(`User ${socket.userId} left room ${roomId}`);
    });

    // WebRTC Offer
    socket.on("webrtc-offer", ({ roomId, offer, targetSocketId }) => {
        io.to(targetSocketId).emit("webrtc-offer", {
            offer,
            senderSocketId: socket.id,
        });
    });

    // WebRTC Answer
    socket.on("webrtc-answer", ({ answer, targetSocketId }) => {
        io.to(targetSocketId).emit("webrtc-answer", {
            answer,
            senderSocketId: socket.id,
        });
    });

    // ICE Candidate
    socket.on("webrtc-ice-candidate", ({ candidate, targetSocketId }) => {
        io.to(targetSocketId).emit("webrtc-ice-candidate", {
            candidate,
            senderSocketId: socket.id,
        });
    });

    // File Sharing
    socket.on("file-share", ({ roomId, file }) => {
        socket.to(roomId).emit("file-received", {
            file,
            senderSocketId: socket.id,
        });
    });

    // Whiteboard Drawing
    socket.on("whiteboard-draw", ({ roomId, data }) => {
        socket.to(roomId).emit("whiteboard-draw", {
            data,
        });
    });

    // Clear Whiteboard
    socket.on("whiteboard-clear", ({ roomId }) => {
        socket.to(roomId).emit("whiteboard-clear");
    });

    // Disconnect Handling
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
};

module.exports = meetingSocket;