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
    const [localStream, setLocalStream] = useState(null);

    const [participants, setParticipants] = useState(0);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!roomId || !user) {
            return;
        }

        socket.emit("join-meeting", {
            roomId,
            userId: user.id,
        });

        const handleMeetingJoined = (data) => {
            setParticipants(data.participantCount);
            setMessage("You joined the meeting.");
        };

        const handleUserJoined = () => {
            setParticipants((count) => count + 1);
        };

        const handleUserLeft = () => {
            setParticipants((count) => Math.max(0, count - 1));
        };

        const handleMeetingError = (data) => {
            setMessage(data.message);
        };

        socket.on("meeting-joined", handleMeetingJoined);
        socket.on("user-joined", handleUserJoined);
        socket.on("user-left", handleUserLeft);
        socket.on("meeting-error", handleMeetingError);

        return () => {
            socket.emit("leave-meeting", {
                roomId,
                userId: user.id,
            });

            socket.off("meeting-joined", handleMeetingJoined);
            socket.off("user-joined", handleUserJoined);
            socket.off("user-left", handleUserLeft);
            socket.off("meeting-error", handleMeetingError);
        };
    }, [roomId, user]);

    const leaveMeeting = () => {
        socket.emit("leave-meeting", {
            roomId,
            userId: user.id,
        });

        navigate("/");
    };

    useEffect(() => {
        const startMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });

                localStreamRef.current = stream;
                setLocalStream(stream);
            } catch (error) {
                console.error("Camera/Microphone error:", error);
                setMessage(
                    "Camera or microphone permission was denied."
                );
            }
        };

        startMedia();

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => {
                    track.stop();
                });
            }
        };
    }, []);

    return (
        <div>
            <h1>Meeting Room</h1>

            <p>
                Room ID: <strong>{roomId}</strong>
            </p>

            <p>
                Participants: <strong>{participants}</strong>
            </p>

            {message && <p>{message}</p>}

            <div>
                <h2>Video Area</h2>

                {localStream ? (
                    <VideoPlayer
                        stream={localStream}
                        muted={true}
                    />
                ) : (
                    <p>Starting camera...</p>
                )}
            </div>

            <button onClick={leaveMeeting}>
                Leave Meeting
            </button>
        </div>
    );
};

export default Meeting;