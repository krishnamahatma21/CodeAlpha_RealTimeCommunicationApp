import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import socket from "../services/socket";
import VideoPlayer from "../components/VideoPlayer";

const Meeting = () => {
    const { roomId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const localStreamRef = useRef(null);
    const peerConnectionsRef = useRef({});
    const screenStreamRef = useRef(null);
    const fileInputRef = useRef(null);

    const [localStream, setLocalStream] = useState(null);
    const [localPreviewStream, setLocalPreviewStream] = useState(null);

    const [remoteStreams, setRemoteStreams] = useState({});
    const [participants, setParticipants] = useState(0);
    const [message, setMessage] = useState("");

    const [cameraOn, setCameraOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [screenSharing, setScreenSharing] = useState(false);

    const [receivedFiles, setReceivedFiles] = useState([]);

    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Create WebRTC Peer Connection
    const createPeerConnection = (targetSocketId) => {
        if (peerConnectionsRef.current[targetSocketId]) {
            return peerConnectionsRef.current[targetSocketId];
        }

        const peerConnection = new RTCPeerConnection();

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                peerConnection.addTrack(
                    track,
                    localStreamRef.current
                );
            });
        }

        peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;

            if (remoteStream) {
                setRemoteStreams((prev) => ({
                    ...prev,
                    [targetSocketId]: remoteStream,
                }));
            }
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("webrtc-ice-candidate", {
                    candidate: event.candidate,
                    targetSocketId,
                });
            }
        };

        peerConnectionsRef.current[targetSocketId] =
            peerConnection;

        return peerConnection;
    };

    // Start Camera + Microphone
    useEffect(() => {
        const startMedia = async () => {
            try {
                const stream =
                    await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true,
                    });

                localStreamRef.current = stream;

                setLocalStream(stream);
                setLocalPreviewStream(stream);
            } catch (error) {
                console.error(
                    "Camera/Microphone error:",
                    error
                );

                setMessage(
                    "Camera or microphone permission was denied."
                );
            }
        };

        startMedia();

        return () => {
            if (screenStreamRef.current) {
                screenStreamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
            }

            if (localStreamRef.current) {
                localStreamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
            }
        };
    }, []);

    // Socket + WebRTC
    useEffect(() => {
        if (!roomId || !user || !localStream) {
            return;
        }

        socket.emit("join-meeting", {
            roomId,
        });

        const handleMeetingJoined = (data) => {
            setParticipants(data.participantCount);
            setMessage("You joined the meeting.");
        };

        const handleExistingUsers = async (data) => {
            for (const targetSocketId of data.users) {
                try {
                    const peerConnection =
                        createPeerConnection(targetSocketId);

                    const offer =
                        await peerConnection.createOffer();

                    await peerConnection.setLocalDescription(
                        offer
                    );

                    socket.emit("webrtc-offer", {
                        roomId,
                        offer,
                        targetSocketId,
                    });
                } catch (error) {
                    console.error(
                        "Offer creation error:",
                        error
                    );
                }
            }
        };

        const handleUserJoined = () => {
            setMessage(
                "A new participant joined the meeting."
            );
        };

        const handleParticipantCount = ({ count }) => {
            setParticipants(count);
        };

        const handleWebRTCOffer = async ({
            offer,
            senderSocketId,
        }) => {
            try {
                const peerConnection =
                    createPeerConnection(senderSocketId);

                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription(offer)
                );

                const answer =
                    await peerConnection.createAnswer();

                await peerConnection.setLocalDescription(
                    answer
                );

                socket.emit("webrtc-answer", {
                    answer,
                    targetSocketId: senderSocketId,
                });
            } catch (error) {
                console.error(
                    "WebRTC offer error:",
                    error
                );
            }
        };

        const handleWebRTCAnswer = async ({
            answer,
            senderSocketId,
        }) => {
            try {
                const peerConnection =
                    peerConnectionsRef.current[
                        senderSocketId
                    ];

                if (!peerConnection) {
                    return;
                }

                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );
            } catch (error) {
                console.error(
                    "WebRTC answer error:",
                    error
                );
            }
        };

        const handleICECandidate = async ({
            candidate,
            senderSocketId,
        }) => {
            try {
                const peerConnection =
                    peerConnectionsRef.current[
                        senderSocketId
                    ];

                if (!peerConnection) {
                    return;
                }

                await peerConnection.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            } catch (error) {
                console.error(
                    "ICE candidate error:",
                    error
                );
            }
        };

        const handleUserLeft = ({ socketId }) => {
            const peerConnection =
                peerConnectionsRef.current[socketId];

            if (peerConnection) {
                peerConnection.close();

                delete peerConnectionsRef.current[
                    socketId
                ];
            }

            setRemoteStreams((prev) => {
                const updated = { ...prev };
                delete updated[socketId];
                return updated;
            });
        };

        const handleMeetingError = (data) => {
            setMessage(data.message);
        };

        const handleWhiteboardDraw = ({ data }) => {
            const canvas = canvasRef.current;

            if (!canvas) {
                return;
            }

            const context = canvas.getContext("2d");

            context.lineWidth = 3;
            context.lineCap = "round";

            context.lineTo(data.x, data.y);
            context.stroke();
        };

        const handleWhiteboardClear = () => {
            const canvas = canvasRef.current;

            if (!canvas) {
                return;
            }

            const context = canvas.getContext("2d");

            context.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );
        };

        // Receive shared file
        const handleFileReceived = (data) => {
            setReceivedFiles((prev) => [
                ...prev,
                {
                    id: Date.now() + Math.random(),
                    name: data.file.name,
                    type: data.file.type,
                    size: data.file.size,
                    data: data.file.data,
                },
            ]);

            setMessage(
                `File received: ${data.file.name}`
            );
        };

        socket.on(
            "meeting-joined",
            handleMeetingJoined
        );

        socket.on(
            "existing-users",
            handleExistingUsers
        );

        socket.on(
            "user-joined",
            handleUserJoined
        );

        socket.on(
            "participant-count",
            handleParticipantCount
        );

        socket.on(
            "webrtc-offer",
            handleWebRTCOffer
        );

        socket.on(
            "webrtc-answer",
            handleWebRTCAnswer
        );

        socket.on(
            "webrtc-ice-candidate",
            handleICECandidate
        );

        socket.on(
            "user-left",
            handleUserLeft
        );

        socket.on(
            "meeting-error",
            handleMeetingError
        );

        socket.on(
            "whiteboard-draw",
            handleWhiteboardDraw
        );

        socket.on(
            "whiteboard-clear",
            handleWhiteboardClear
        );

        socket.on(
            "file-received",
            handleFileReceived
        );

        return () => {
            socket.emit("leave-meeting", {
                roomId,
            });

            socket.off(
                "meeting-joined",
                handleMeetingJoined
            );

            socket.off(
                "existing-users",
                handleExistingUsers
            );

            socket.off(
                "user-joined",
                handleUserJoined
            );

            socket.off(
                "participant-count",
                handleParticipantCount
            );

            socket.off(
                "webrtc-offer",
                handleWebRTCOffer
            );

            socket.off(
                "webrtc-answer",
                handleWebRTCAnswer
            );

            socket.off(
                "webrtc-ice-candidate",
                handleICECandidate
            );

            socket.off(
                "user-left",
                handleUserLeft
            );

            socket.off(
                "meeting-error",
                handleMeetingError
            );

            socket.off(
                "whiteboard-draw",
                handleWhiteboardDraw
            );

            socket.off(
                "whiteboard-clear",
                handleWhiteboardClear
            );

            socket.off(
                "file-received",
                handleFileReceived
            );

            Object.values(
                peerConnectionsRef.current
            ).forEach((peerConnection) => {
                peerConnection.close();
            });

            peerConnectionsRef.current = {};
        };
    }, [roomId, user, localStream]);

    // Get canvas position
    const getCanvasPosition = (event) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    // Start drawing
    const startDrawing = (event) => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        const { x, y } = getCanvasPosition(event);

        context.beginPath();
        context.moveTo(x, y);

        setIsDrawing(true);
    };

    // Draw
    const draw = (event) => {
        if (!isDrawing) {
            return;
        }

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        const { x, y } = getCanvasPosition(event);

        context.lineWidth = 3;
        context.lineCap = "round";

        context.lineTo(x, y);
        context.stroke();

        socket.emit("whiteboard-draw", {
            roomId,
            data: {
                x,
                y,
            },
        });
    };

    // Stop drawing
    const stopDrawing = () => {
        setIsDrawing(false);
    };

    // Clear whiteboard
    const clearWhiteboard = () => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const context = canvas.getContext("2d");

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        socket.emit("whiteboard-clear", {
            roomId,
        });
    };

    // Toggle Camera
    const toggleCamera = () => {
        if (!localStreamRef.current) {
            return;
        }

        const videoTrack =
            localStreamRef.current.getVideoTracks()[0];

        if (!videoTrack) {
            return;
        }

        videoTrack.enabled = !videoTrack.enabled;

        setCameraOn(videoTrack.enabled);
    };

    // Toggle Microphone
    const toggleMicrophone = () => {
        if (!localStreamRef.current) {
            return;
        }

        const audioTrack =
            localStreamRef.current.getAudioTracks()[0];

        if (!audioTrack) {
            return;
        }

        audioTrack.enabled = !audioTrack.enabled;

        setMicOn(audioTrack.enabled);
    };

    // Start Screen Sharing
    const startScreenSharing = async () => {
        try {
            const screenStream =
                await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                });

            const screenTrack =
                screenStream.getVideoTracks()[0];

            screenStreamRef.current = screenStream;

            Object.values(
                peerConnectionsRef.current
            ).forEach((peerConnection) => {
                const videoSender =
                    peerConnection
                        .getSenders()
                        .find(
                            (sender) =>
                                sender.track?.kind ===
                                "video"
                        );

                if (videoSender) {
                    videoSender.replaceTrack(
                        screenTrack
                    );
                }
            });

            const previewStream = new MediaStream();

            previewStream.addTrack(screenTrack);

            const audioTrack =
                localStreamRef.current?.getAudioTracks()[0];

            if (audioTrack) {
                previewStream.addTrack(audioTrack);
            }

            setLocalPreviewStream(previewStream);
            setScreenSharing(true);
            setMessage("You are sharing your screen.");

            screenTrack.onended = () => {
                stopScreenSharing();
            };
        } catch (error) {
            console.error(
                "Screen sharing error:",
                error
            );

            setMessage(
                "Screen sharing was cancelled or unavailable."
            );
        }
    };

    // Stop Screen Sharing
    const stopScreenSharing = async () => {
        const cameraTrack =
            localStreamRef.current?.getVideoTracks()[0];

        if (!cameraTrack) {
            return;
        }

        Object.values(
            peerConnectionsRef.current
        ).forEach((peerConnection) => {
            const videoSender =
                peerConnection
                    .getSenders()
                    .find(
                        (sender) =>
                            sender.track?.kind ===
                            "video"
                    );

            if (videoSender) {
                videoSender.replaceTrack(
                    cameraTrack
                );
            }
        });

        if (screenStreamRef.current) {
            screenStreamRef.current
                .getTracks()
                .forEach((track) => {
                    track.onended = null;
                    track.stop();
                });

            screenStreamRef.current = null;
        }

        setLocalPreviewStream(localStream);
        setScreenSharing(false);
        setMessage("Screen sharing stopped.");
    };

    // Open file picker
    const selectFile = () => {
        fileInputRef.current?.click();
    };

    // Send file
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const maxFileSize = 500 * 1024;

        if (file.size > maxFileSize) {
            setMessage(
                "For this version, please select a file smaller than 500 KB."
            );

            event.target.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            socket.emit("file-share", {
                roomId,
                file: {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: reader.result,
                },
            });

            setMessage(
                `File sent: ${file.name}`
            );
        };

        reader.onerror = () => {
            setMessage(
                "Unable to read the selected file."
            );
        };

        reader.readAsDataURL(file);

        event.target.value = "";
    };

    // Download received file
    const downloadFile = (file) => {
        const link = document.createElement("a");

        link.href = file.data;
        link.download = file.name;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Leave meeting
    const leaveMeeting = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current
                .getTracks()
                .forEach((track) => track.stop());
        }

        Object.values(
            peerConnectionsRef.current
        ).forEach((peerConnection) => {
            peerConnection.close();
        });

        peerConnectionsRef.current = {};

        navigate("/");
    };

    return (
        <div className="meeting-page">

            {/* Header */}
            <header className="meeting-header">
                <div>
                    <p className="meeting-label">
                        REAL-TIME COMMUNICATION
                    </p>

                    <h1>Meeting Room</h1>

                    <div className="meeting-room-info">
                        <span>
                            Room ID:
                        </span>

                        <strong>
                            {roomId}
                        </strong>
                    </div>
                </div>

                <div className="participant-badge">
                    <span className="online-dot"></span>

                    <span>
                        {participants}{" "}
                        {participants === 1
                            ? "Participant"
                            : "Participants"}
                    </span>
                </div>
            </header>

            {/* Status Message */}
            {message && (
                <div className="status-message">
                    <span>●</span>

                    <p>{message}</p>
                </div>
            )}

            {/* Main Content */}
            <main className="meeting-content">

                {/* Video Section */}
                <section className="video-section">

                    <div className="section-heading">
                        <div>
                            <h2>Video Call</h2>

                            <p>
                                Connect with participants in real time
                            </p>
                        </div>
                    </div>

                    <div className="video-grid">

                        {/* Local Video */}
                        <div className="video-card local-video-card">
                            <div className="video-card-header">
                                <span>
                                    You
                                </span>

                                <span className="video-status">
                                    {cameraOn
                                        ? "Camera On"
                                        : "Camera Off"}
                                </span>
                            </div>

                            <div className="video-container">
                                {localPreviewStream ? (
                                    <VideoPlayer
                                        stream={localPreviewStream}
                                        muted={true}
                                    />
                                ) : (
                                    <div className="video-placeholder">
                                        Starting camera...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Remote Videos */}
                        {Object.keys(remoteStreams).map(
                            (socketId) => (
                                <div
                                    className="video-card"
                                    key={socketId}
                                >
                                    <div className="video-card-header">
                                        <span>
                                            Participant
                                        </span>

                                        <span className="video-status">
                                            Connected
                                        </span>
                                    </div>

                                    <div className="video-container">
                                        <VideoPlayer
                                            stream={
                                                remoteStreams[
                                                    socketId
                                                ]
                                            }
                                        />
                                    </div>
                                </div>
                            )
                        )}

                        {/* Waiting State */}
                        {Object.keys(remoteStreams).length ===
                            0 && (
                            <div className="waiting-card">
                                <div className="waiting-icon">
                                    👥
                                </div>

                                <h3>
                                    Waiting for participants
                                </h3>

                                <p>
                                    Share the meeting room ID with
                                    others to join the call.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="control-bar">

                        <button
                            className={`control-button ${
                                !cameraOn
                                    ? "control-button-off"
                                    : ""
                            }`}
                            onClick={toggleCamera}
                        >
                            {cameraOn
                                ? "📹 Camera"
                                : "📹 Camera Off"}
                        </button>

                        <button
                            className={`control-button ${
                                !micOn
                                    ? "control-button-off"
                                    : ""
                            }`}
                            onClick={toggleMicrophone}
                        >
                            {micOn
                                ? "🎤 Microphone"
                                : "🎤 Muted"}
                        </button>

                        {!screenSharing ? (
                            <button
                                className="control-button"
                                onClick={
                                    startScreenSharing
                                }
                            >
                                🖥️ Share Screen
                            </button>
                        ) : (
                            <button
                                className="control-button control-button-off"
                                onClick={
                                    stopScreenSharing
                                }
                            >
                                🛑 Stop Sharing
                            </button>
                        )}

                        <button
                            className="leave-button"
                            onClick={leaveMeeting}
                        >
                            Leave Meeting
                        </button>
                    </div>
                </section>

                {/* Tools */}
                <div className="tools-grid">

                    {/* File Sharing */}
                    <section className="feature-card">

                        <div className="feature-card-header">
                            <div className="feature-icon">
                                📁
                            </div>

                            <div>
                                <h2>File Sharing</h2>

                                <p>
                                    Share small files with participants
                                </p>
                            </div>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                            style={{
                                display: "none",
                            }}
                        />

                        <button
                            className="primary-action"
                            onClick={selectFile}
                        >
                            📎 Select & Send File
                        </button>

                        <p className="feature-note">
                            Maximum file size: 500 KB
                        </p>

                        {receivedFiles.length > 0 && (
                            <div className="received-files">
                                <h3>
                                    📥 Received Files
                                </h3>

                                {receivedFiles.map(
                                    (file) => (
                                        <div
                                            className="file-item"
                                            key={file.id}
                                        >
                                            <div>
                                                <strong>
                                                    {file.name}
                                                </strong>

                                                <span>
                                                    {Math.round(
                                                        file.size /
                                                            1024
                                                    )}{" "}
                                                    KB
                                                </span>
                                            </div>

                                            <button
                                                className="small-action"
                                                onClick={() =>
                                                    downloadFile(
                                                        file
                                                    )
                                                }
                                            >
                                                ⬇️ Download
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </section>

                    {/* Whiteboard */}
                    <section className="feature-card whiteboard-section">

                        <div className="feature-card-header">
                            <div className="feature-icon">
                                🎨
                            </div>

                            <div>
                                <h2>
                                    Collaborative Whiteboard
                                </h2>

                                <p>
                                    Draw and collaborate in real time
                                </p>
                            </div>
                        </div>

                        <div className="whiteboard-wrapper">
                            <canvas
                                ref={canvasRef}
                                width={800}
                                height={500}
                                onMouseDown={
                                    startDrawing
                                }
                                onMouseMove={draw}
                                onMouseUp={
                                    stopDrawing
                                }
                                onMouseLeave={
                                    stopDrawing
                                }
                                className="whiteboard-canvas"
                                style={{
                                    border: "2px solid black",
                                    backgroundColor: "white",
                                    cursor: "crosshair",
                                    display: "block",
                                }}
                            />
                        </div>

                        <button
                            className="secondary-action"
                            onClick={clearWhiteboard}
                        >
                            🧹 Clear Whiteboard
                        </button>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Meeting;