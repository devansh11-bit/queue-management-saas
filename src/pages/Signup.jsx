import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

function getAuthErrorMessage(errorCode) {
  if (errorCode === "auth/email-already-in-use") {
    return "This email is already registered. Please login instead.";
  }

  if (errorCode === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (errorCode === "auth/weak-password") {
    return "Password should be at least 6 characters.";
  }

  return "Signup failed. Please try again.";
}

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate(location.state?.from || "/home");
    } catch (error) {
  console.log("ERROR:", error.code, error.message);
  setError(error.message);
}
finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell flex items-center justify-center px-4 py-8">
      <div className="auth-card">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#333]">Create account</h1>
          <p className="mt-2 muted-text">
            Start using your queue management app.
          </p>
        </div>

        {error && (
          <div className="alert-error mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
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
              placeholder="Minimum 6 characters"
              minLength="6"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#333]">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="input-field"
              placeholder="Re-enter your password"
              minLength="6"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#777]">
          Already have an account?{" "}
          <Link
            to="/login"
            state={location.state}
            className="font-medium text-[#333] underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
