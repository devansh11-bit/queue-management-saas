import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

function getAuthErrorMessage(errorCode) {
  if (errorCode === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (
    errorCode === "auth/user-not-found" ||
    errorCode === "auth/wrong-password" ||
    errorCode === "auth/invalid-credential"
  ) {
    return "Email or password is incorrect.";
  }

  if (errorCode === "auth/too-many-requests") {
    return "Too many attempts. Please try again later.";
  }

  return "Login failed. Please try again.";
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(location.state?.from || "/home");
    } catch (error) {
      setError(getAuthErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell flex items-center justify-center px-4 py-8">
      <div className="auth-card">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#333]">Login</h1>
          <p className="mt-2 muted-text">
            Sign in to manage your queue.
          </p>
        </div>

        {error && (
          <div className="alert-error mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#333]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#333]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-field"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#777]">
          New user?{" "}
          <Link
            to="/signup"
            state={location.state}
            className="font-medium text-[#333] underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
