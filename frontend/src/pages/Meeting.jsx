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

    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [participants, setParticipants] = useState(0);
    const [message, setMessage] = useState("");

    // Create WebRTC Peer Connection
    const createPeerConnection = (targetSocketId) => {
        if (peerConnectionsRef.current[targetSocketId]) {
            return peerConnectionsRef.current[targetSocketId];
        }

        const peerConnection = new RTCPeerConnection();

        // Add local camera and microphone tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                peerConnection.addTrack(
                    track,
                    localStreamRef.current
                );
            });
        }

        // Receive remote stream
        peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;

            if (remoteStream) {
                setRemoteStreams((prev) => ({
                    ...prev,
                    [targetSocketId]: remoteStream,
                }));
            }
        };

        // Send ICE candidate
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

    // Start local camera and microphone
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
            if (localStreamRef.current) {
                localStreamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
            }
        };
    }, []);

    // Socket + WebRTC logic
    useEffect(() => {
        if (!roomId || !user || !localStream) {
            return;
        }

        // Join meeting
        socket.emit("join-meeting", {
            roomId,
            userId: user.id,
        });

        // Meeting joined
        const handleMeetingJoined = (data) => {
            setParticipants(data.participantCount);
            setMessage("You joined the meeting.");
        };

        // Existing users
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

        // New user joined
        const handleUserJoined = () => {
            setParticipants((count) => count + 1);
        };

        // Receive WebRTC Offer
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

        // Receive WebRTC Answer
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

        // Receive ICE Candidate
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

        // User left
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

            setParticipants((count) =>
                Math.max(0, count - 1)
            );
        };

        // Meeting error
        const handleMeetingError = (data) => {
            setMessage(data.message);
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

        return () => {
            socket.emit("leave-meeting", {
                roomId,
                userId: user.id,
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

            Object.values(
                peerConnectionsRef.current
            ).forEach((peerConnection) => {
                peerConnection.close();
            });

            peerConnectionsRef.current = {};
        };
    }, [roomId, user, localStream]);

    const leaveMeeting = () => {
        socket.emit("leave-meeting", {
            roomId,
            userId: user.id,
        });

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

            {localStream ? (
                <VideoPlayer
                    stream={localStream}
                    muted={true}
                />
            ) : (
                <p>Starting camera...</p>
            )}

            <hr />

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