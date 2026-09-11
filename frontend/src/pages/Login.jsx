import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import socket from "../services/socket";

const Login = () => {
    const navigate = useNavigate();
    const { setUser } = useAuth();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setMessage("");

            const response = await api.post("/auth/login", formData);

            const { token, user } = response.data;

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));

            socket.auth = {
                token: response.data.token,
            };

            socket.connect();

            setUser(user);

            setMessage("Login successful!");

            setTimeout(() => {
                navigate("/");
            }, 500);
        } catch (error) {
            setMessage(
                error.response?.data?.message || "Login failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">

                <div className="auth-logo">
                    💬
                </div>

                <h1>Welcome Back</h1>

                <p className="auth-subtitle">
                    Login to continue to your communication dashboard.
                </p>

                <form className="auth-form" onSubmit={handleSubmit}>

                    <div className="auth-field">
                        <label>Email</label>

                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label>Password</label>

                        <input
                            type="password"
                            name="password"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button
                        className="auth-submit"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                </form>

                {message && (
                    <p className="auth-message">
                        {message}
                    </p>
                )}

                <button
                    className="auth-switch"
                    onClick={() => navigate("/register")}
                >
                    Don't have an account? Register
                </button>

            </div>
        </div>
    );
};

export default Login;