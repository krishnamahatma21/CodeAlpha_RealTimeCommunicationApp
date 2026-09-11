import { useAuth } from "../context/AuthContext";

const Home = () => {
    const { user, logout } = useAuth();

    return (
        <div className="home-page">
            <div className="home-container">

                <div className="home-card">
                    <div className="home-icon">
                        ⚡
                    </div>

                    <h1 className="home-title">
                        Real-Time Communication App
                    </h1>

                    {user ? (
                        <div className="home-user-section">
                            <h2 className="home-welcome">
                                Welcome, {user.name}
                            </h2>

                            <p className="home-email">
                                {user.email}
                            </p>

                            <div className="home-status">
                                <span className="home-online-dot"></span>
                                You're logged in
                            </div>

                            <button
                                className="home-logout-button"
                                onClick={logout}
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="home-login-section">
                            <p className="home-login-text">
                                Please login to continue.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Home;