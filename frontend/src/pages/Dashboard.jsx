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

            await api.post(
                `/meetings/join/${roomId.trim()}`
            );

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
        <div className="dashboard-page">

            {/* Header */}
            <header className="dashboard-header">

                <div className="dashboard-brand">
                    <div className="brand-icon">
                        💬
                    </div>

                    <div>
                        <h1>
                            Real-Time Communication
                        </h1>

                        <p>
                            Connect, communicate and collaborate
                        </p>
                    </div>
                </div>

                <button
                    className="logout-button"
                    onClick={handleLogout}
                >
                    Logout
                </button>

            </header>

            {/* Main */}
            <main className="dashboard-content">

                {/* Welcome */}
                <section className="welcome-section">

                    <div>
                        <p className="dashboard-label">
                            DASHBOARD
                        </p>

                        <h2>
                            Welcome, {user?.name} 👋
                        </h2>

                        <p className="user-email">
                            {user?.email}
                        </p>
                    </div>

                    <div className="user-status">
                        <span className="online-dot"></span>
                        Online
                    </div>

                </section>

                {/* Message */}
                {message && (
                    <div className="dashboard-message">
                        <span>⚠️</span>
                        <p>{message}</p>
                    </div>
                )}

                {/* Meeting Actions */}
                <section className="meeting-actions">

                    {/* Create Meeting */}
                    <div className="dashboard-card">

                        <div className="card-icon create-icon">
                            ➕
                        </div>

                        <h3>
                            Create a Meeting
                        </h3>

                        <p>
                            Start a new meeting and invite
                            others to join using the meeting ID.
                        </p>

                        <button
                            className="dashboard-primary-button"
                            onClick={createMeeting}
                            disabled={loading}
                        >
                            {loading
                                ? "Creating..."
                                : "Create Meeting"}
                        </button>

                    </div>

                    {/* Join Meeting */}
                    <div className="dashboard-card">

                        <div className="card-icon join-icon">
                            🔗
                        </div>

                        <h3>
                            Join a Meeting
                        </h3>

                        <p>
                            Enter an existing meeting ID
                            to join a meeting.
                        </p>

                        <div className="join-form">

                            <input
                                type="text"
                                placeholder="Enter Meeting ID"
                                value={roomId}
                                onChange={(e) =>
                                    setRoomId(e.target.value)
                                }
                            />

                            <button
                                className="dashboard-secondary-button"
                                onClick={joinMeeting}
                                disabled={loading}
                            >
                                {loading
                                    ? "Joining..."
                                    : "Join Meeting"}
                            </button>

                        </div>

                    </div>

                </section>

                {/* Features */}
                <section className="features-section">

                    <div className="section-title">
                        <h2>
                            Everything you need
                        </h2>

                        <p>
                            Powerful real-time collaboration
                            features in one place.
                        </p>
                    </div>

                    <div className="features-grid">

                        <div className="feature-item">
                            <span>🎥</span>
                            <div>
                                <h3>Video Calling</h3>
                                <p>
                                    Real-time video communication
                                    with other participants.
                                </p>
                            </div>
                        </div>

                        <div className="feature-item">
                            <span>🖥️</span>
                            <div>
                                <h3>Screen Sharing</h3>
                                <p>
                                    Share your screen during
                                    meetings.
                                </p>
                            </div>
                        </div>

                        <div className="feature-item">
                            <span>📁</span>
                            <div>
                                <h3>File Sharing</h3>
                                <p>
                                    Send files directly to
                                    meeting participants.
                                </p>
                            </div>
                        </div>

                        <div className="feature-item">
                            <span>🎨</span>
                            <div>
                                <h3>Collaborative Whiteboard</h3>
                                <p>
                                    Draw and collaborate together
                                    in real time.
                                </p>
                            </div>
                        </div>

                    </div>

                </section>

            </main>

            {/* Footer */}
            <footer className="dashboard-footer">
                <p>
                    Real-Time Communication App
                </p>

                <span>
                    CodeAlpha Full Stack Development Internship
                </span>
            </footer>

        </div>
    );
};

export default Dashboard;