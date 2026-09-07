const express = require("express");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const meetingSocket = require("./sockets/meetingSocket");

require("dotenv").config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Real-Time Communication App API is running",
    });
});

// Create HTTP server
const server = http.createServer(app);

// Socket.IO
const { Server } = require("socket.io");

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication required"));
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        socket.userId = decoded.userId;

        next();
    } catch (error) {
        console.error(
            "Socket authentication error:",
            error.message
        );

        next(new Error("Invalid authentication token"));
    }
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    meetingSocket(io, socket);

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});