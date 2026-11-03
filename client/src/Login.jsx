
import { useState } from "react";
import "./Login.css";

function Login({ onLogin }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setIsSuccess(false);
        setLoading(true);

        try {
            const response = await fetch(`http://localhost:5000/api/auth/${isRegistering ? "register" : "login"}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(
                    isRegistering ? { name, email, password } : { email, password }
                )
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || (isRegistering ? "Registration failed." : "Login failed."));
            }

            if (isRegistering) {
                setIsRegistering(false);
                setName("");
                setPassword("");
                setIsSuccess(true);
                setMessage("Account created. You can now sign in with your email and password.");
                return;
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            onLogin(data.user);
        } catch (error) {
            setMessage(error.message || "Cannot connect to the server.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <form className="login-card" onSubmit={handleSubmit}>
                <div className="login-icon">🎓</div>

                <h1>{isRegistering ? "Create your account" : "Student Attendance"}</h1>
                <p className="login-subtitle">
                    {isRegistering
                        ? "Create a teacher account to get started"
                        : "Sign in to manage student attendance"}
                </p>

                {isRegistering && (
                    <>
                        <label htmlFor="name">Your name</label>
                        <input
                            id="name"
                            type="text"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                            required
                        />
                    </>
                )}

                <label htmlFor="email">Email address</label>
                <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                />

                <label htmlFor="password">Password</label>
                <div className="password-field">
                    <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={isRegistering ? 6 : undefined}
                        autoComplete={isRegistering ? "new-password" : "current-password"}
                        required
                    />
                    <button
                        className="password-toggle"
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? "Hide" : "Show"}
                    </button>
                </div>

                {message && (
                    <p className={`login-message${isSuccess ? " success" : ""}`} role={isSuccess ? "status" : "alert"}>
                        {message}
                    </p>
                )}

                <button type="submit" disabled={loading}>
                    {loading
                        ? (isRegistering ? "Creating account..." : "Signing in...")
                        : (isRegistering ? "Create account" : "Login")}
                </button>

                <p className="login-switch">
                    {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                        type="button"
                        onClick={() => {
                            setIsRegistering((current) => !current);
                            setMessage("");
                            setIsSuccess(false);
                        }}
                    >
                        {isRegistering ? "Sign in" : "Create one"}
                    </button>
                </p>

                <p className="login-footer">
                    Student Attendance Management System
                </p>
            </form>
        </div>
    );
}

export default Login;
