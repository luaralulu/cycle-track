import React, { useState } from "react";

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, loading, error }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div
      className="login-container"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
      }}
    >
      <form
        className="login-form"
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.2rem",
          minWidth: 320,
          background: "#fff",
          padding: 32,
          borderRadius: 12,
          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        }}
      >
        <h2 style={{ color: "#222", marginBottom: 8, textAlign: "center" }}>
          Login
        </h2>
        <label
          style={{
            color: "#333",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            style={{
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
              color: "#222",
            }}
          />
        </label>
        <label
          style={{
            color: "#333",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
              color: "#222",
            }}
          />
        </label>
        {error && (
          <div
            className="login-error"
            style={{ color: "#b00020", textAlign: "center" }}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            padding: 10,
            borderRadius: 6,
            background: "#f3f3f3",
            color: "#222",
            border: "1px solid #ccc",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
