import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Register = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
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

            const response = await api.post("/auth/register", formData);

            setMessage(response.data.message);

            setTimeout(() => {
                navigate("/login");
            }, 1000);
        } catch (error) {
            setMessage(
                error.response?.data?.message || "Registration failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">

                <div className="auth-logo">
                    ⚡
                </div>

                <h1>Create Account</h1>

                <p className="auth-subtitle">
                    Join the Real-Time Communication App
                </p>

                <form
                    className="auth-form"
                    onSubmit={handleSubmit}
                >
                    <div className="auth-field">
                        <label>Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Enter your name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

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
                            placeholder="Create a password"
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
                        {loading ? "Registering..." : "Create Account"}
                    </button>
                </form>

                {message && (
                    <p className="auth-message">
                        {message}
                    </p>
                )}

                <button
                    className="auth-switch"
                    onClick={() => navigate("/login")}
                >
                    Already have an account? Login
                </button>

            </div>
        </div>
    );
};

export default Register;