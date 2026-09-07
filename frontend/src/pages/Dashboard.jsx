import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [roomId, setRoomId] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const createMeeting = async () => {
        try {
            setLoading(true);
            setMessage("");

            const response = await api.post("/meetings");

            const newRoomId = response.data.meeting.roomId;

            navigate(`/meeting/${newRoomId}`);
        } catch (error) {
            setMessage(
                error.response?.data?.message ||
                "Unable to create meeting"
            );
        } finally {
            setLoading(false);
        }
    };

    const joinMeeting = async () => {
        if (!roomId.trim()) {
            setMessage("Please enter a meeting ID");
            return;
        }

        try {
            setLoading(true);
            setMessage("");

            await api.post(`/meetings/join/${roomId.trim()}`);

            navigate(`/meeting/${roomId.trim()}`);
        } catch (error) {
            setMessage(
                error.response?.data?.message ||
                "Unable to join meeting"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div>
            <h1>Real-Time Communication App</h1>

            <h2>Welcome, {user?.name}</h2>
            <p>{user?.email}</p>

            <hr />

            <h3>Create a Meeting</h3>

            <button onClick={createMeeting} disabled={loading}>
                {loading ? "Creating..." : "Create Meeting"}
            </button>

            <hr />

            <h3>Join a Meeting</h3>

            <input
                type="text"
                placeholder="Enter Meeting ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
            />

            <button onClick={joinMeeting} disabled={loading}>
                {loading ? "Joining..." : "Join Meeting"}
            </button>

            {message && <p>{message}</p>}

            <hr />

            <button onClick={handleLogout}>
                Logout
            </button>
        </div>
    );
};

export default Dashboard;