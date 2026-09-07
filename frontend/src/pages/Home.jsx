import { useAuth } from "../context/AuthContext";

const Home = () => {
    const { user, logout } = useAuth();

    return (
        <div>
            <h1>Real-Time Communication App</h1>

            {user ? (
                <>
                    <h2>Welcome, {user.name}</h2>
                    <p>Email: {user.email}</p>

                    <button onClick={logout}>
                        Logout
                    </button>
                </>
            ) : (
                <>
                    <p>Please login to continue.</p>
                </>
            )}
        </div>
    );
};

export default Home;