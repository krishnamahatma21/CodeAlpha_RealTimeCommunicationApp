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
            setMessage("A new participant joined the meeting.");
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

    // Get mouse/touch position on canvas
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

    // Draw on canvas
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

        // Keep this basic Socket.IO version for small files.
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
            setMessage("Unable to read the selected file.");
        };

        reader.readAsDataURL(file);

        // Allow selecting the same file again
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
        <div>
            <h1>Meeting Room</h1>

            <p>
                Room ID: <strong>{roomId}</strong>
            </p>

            <p>
                Participants:{" "}
                <strong>{participants}</strong>
            </p>

            {message && <p>{message}</p>}

            <hr />

            <h2>Your Video</h2>

            {localPreviewStream ? (
                <VideoPlayer
                    stream={localPreviewStream}
                    muted={true}
                />
            ) : (
                <p>Starting camera...</p>
            )}

            <br />

            <button onClick={toggleCamera}>
                {cameraOn
                    ? "📹 Turn Camera Off"
                    : "📹 Turn Camera On"}
            </button>

            {" "}

            <button onClick={toggleMicrophone}>
                {micOn
                    ? "🎤 Mute Microphone"
                    : "🎤 Unmute Microphone"}
            </button>

            {" "}

            {!screenSharing ? (
                <button onClick={startScreenSharing}>
                    🖥️ Share Screen
                </button>
            ) : (
                <button onClick={stopScreenSharing}>
                    🛑 Stop Sharing
                </button>
            )}

            <hr />

            <h2>📁 File Sharing</h2>

            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                style={{ display: "none" }}
            />

            <button onClick={selectFile}>
                📎 Select & Send File
            </button>

            <p>
                Maximum file size: 500 KB
            </p>

            {receivedFiles.length > 0 && (
                <div>
                    <h3>📥 Received Files</h3>

                    {receivedFiles.map((file) => (
                        <div key={file.id}>
                            <span>
                                {file.name} (
                                {Math.round(
                                    file.size / 1024
                                )} KB)
                            </span>

                            {" "}

                            <button
                                onClick={() =>
                                    downloadFile(file)
                                }
                            >
                                ⬇️ Download
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <hr />

            <h2>🎨 Collaborative Whiteboard</h2>

            <canvas
                ref={canvasRef}
                width={800}
                height={500}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{
                    border: "2px solid black",
                    backgroundColor: "white",
                    cursor: "crosshair",
                    display: "block",
                }}
            />

            <br />

            <button onClick={clearWhiteboard}>
                🧹 Clear Whiteboard
            </button>

            <h2>Remote Videos</h2>

            {Object.keys(remoteStreams).length === 0 ? (
                <p>
                    Waiting for other participants...
                </p>
            ) : (
                <div>
                    {Object.entries(remoteStreams).map(
                        ([socketId, stream]) => (
                            <div key={socketId}>
                                <VideoPlayer
                                    stream={stream}
                                />
                            </div>
                        )
                    )}
                </div>
            )}

            <br />

            <button onClick={leaveMeeting}>
                Leave Meeting
            </button>
        </div>
    );
};

export default Meeting;