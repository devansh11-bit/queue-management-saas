import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import places from "../data/places";
import { getQueue, joinQueue } from "../services/queueService";

function JoinQueue() {
  const { placeId } = useParams();
  const [place, setPlace] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadQueue() {
      try {
        const queue = await getQueue(placeId);
        const localPlace = places.find((currentPlace) => {
          return currentPlace.id === placeId;
        });

        if (!queue && !localPlace) {
          setError("This QR code is not valid.");
          setStatus("error");
          return;
        }

        setPlace({
          id: placeId,
          name: queue?.name || queue?.placeName || localPlace.name,
          type: queue?.type || localPlace?.type || "Queue"
        });
        setStatus("ready");
      } catch (error) {
        setError("Could not load this queue. Please try again.");
        setStatus("error");
      }
    }

    loadQueue();
  }, [placeId]);

  async function handleJoinQueue(event) {
    event.preventDefault();
    setError("");
    setStatus("joining");

    try {
      await joinQueue(place, phoneNumber);
      setStatus("success");
    } catch (error) {
      setError(error.message || "Could not join queue. Please try again.");
      setStatus("ready");
    }
  }

  return (
    <div className="app-shell flex items-center justify-center px-4 py-8">
      <div className="auth-card text-center">
        <h1 className="text-2xl font-semibold text-[#333]">Join Queue</h1>

        {status === "loading" && (
          <p className="mt-3 muted-text">Loading queue...</p>
        )}

        {(status === "ready" || status === "joining") && (
          <form onSubmit={handleJoinQueue} className="mt-5 text-left">
            <p className="mb-4 text-center text-sm text-[#777]">
              Queue: {place?.name}
            </p>

            {error && <div className="alert-error mb-4">{error}</div>}

            <label className="mb-1 block text-sm font-medium text-[#333]">
              WhatsApp number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="input-field"
              placeholder="+919876543210"
              required
            />

            <button
              type="submit"
              disabled={status === "joining"}
              className="btn-primary mt-5 w-full"
            >
              {status === "joining" ? "Joining..." : "Join queue"}
            </button>
          </form>
        )}

        {status === "success" && (
          <>
            <p className="mt-3 text-sm text-[#777]">
              You have joined the queue for {place?.name}.
            </p>

            <Link to="/home" className="btn-primary mt-6 inline-block">
              View my position
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="alert-error mt-4">{error}</div>

            <Link to="/home" className="btn-primary mt-6 inline-block">
              Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default JoinQueue;
