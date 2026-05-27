import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { auth } from "../firebase";
import { createUserProfile, getUserRole } from "../services/userService";
import { getPostAuthRedirect } from "../utils/authRouting.js";

const ROLE_STORAGE_KEY = "queuecity_login_role";

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
  const [selectedRole, setSelectedRole] = useState(() => {
    const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
    return stored === "admin" ? "admin" : "customer";
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handlePostAuthNavigation(user) {
    const role = await getUserRole(user.uid);
    const destination = getPostAuthRedirect({
      role,
      fromPath: location.state?.from
    });

    if (selectedRole === "admin" && role !== "admin") {
      await signOut(auth);
      throw new Error("This account is not an admin. Please continue as Customer.");
    }

    window.localStorage.setItem(
      ROLE_STORAGE_KEY,
      selectedRole === "admin" ? "admin" : "customer"
    );
    navigate(destination);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await handlePostAuthNavigation(credential.user);
    } catch (error) {
      setError(error.message || getAuthErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setSuccess("");
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      await createUserProfile(credential.user, "customer");
      await handlePostAuthNavigation(credential.user);
    } catch (error) {
      setError(error.message || getAuthErrorMessage(error.code));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setSuccess("");

    if (!email) {
      setError("Enter your email address first to reset your password.");
      return;
    }

    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset email sent. Please check your inbox.");
    } catch (error) {
      setError(error.message || "Could not send reset email. Please try again.");
    } finally {
      setResetLoading(false);
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
        {success && <div className="alert-success mb-4">{success}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-[#333]">Continue as</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedRole("customer")}
                disabled={loading || googleLoading || resetLoading}
                className={
                  selectedRole === "customer"
                    ? "btn-primary"
                    : "btn-secondary"
                }
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("admin")}
                disabled={loading || googleLoading || resetLoading}
                className={
                  selectedRole === "admin" ? "btn-primary" : "btn-secondary"
                }
              >
                Admin
              </button>
            </div>
          </div>

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
            disabled={loading || googleLoading || resetLoading}
            className="btn-primary w-full"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading || resetLoading}
            className="btn-secondary w-full"
          >
            {googleLoading ? "Signing in with Google..." : "Continue with Google"}
          </button>

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading || googleLoading || resetLoading}
            className="btn-secondary w-full"
          >
            {resetLoading ? "Sending reset link..." : "Forgot Password?"}
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
