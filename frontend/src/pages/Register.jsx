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
        <div>
            <h1>Register</h1>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />

                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <button type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register"}
                </button>
            </form>

            {message && <p>{message}</p>}

            <button onClick={() => navigate("/login")}>
                Already have an account? Login
            </button>
        </div>
    );
};

export default Register;