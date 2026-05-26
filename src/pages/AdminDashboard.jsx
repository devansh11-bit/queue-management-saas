import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import places from "../data/places";
import {
  callNextUser,
  completeCurrentUser,
  createQueue,
  createSampleQueue,
  skipUser,
  listenToQueues,
  listenToQueueUsers
} from "../services/queueService";

function getQueueTitle(queueItem) {
  return queueItem.name || queueItem.placeName || "Queue";
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [queueName, setQueueName] = useState("");
  const [queueType, setQueueType] = useState("Hospital");
  const [queues, setQueues] = useState([]);
  const [usersByQueue, setUsersByQueue] = useState({});
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function createStarterQueues() {
      try {
        await Promise.all(
          places.map((place) => {
            return createSampleQueue(place);
          })
        );
      } catch (error) {
        setError("Could not prepare sample queues.");
      }
    }

    createStarterQueues();
  }, []);

  useEffect(() => {
    const unsubscribeQueues = listenToQueues(
      (queueList) => {
        setQueues(queueList);
      },
      () => {
        setError("Could not load queues in real time.");
      }
    );

    return () => unsubscribeQueues();
  }, []);

  useEffect(() => {
    const unsubscribers = queues.map((queueItem) => {
      return listenToQueueUsers(
        queueItem.id,
        (users) => {
          setUsersByQueue((currentUsers) => ({
            ...currentUsers,
            [queueItem.id]: users
          }));
        },
        () => {
          setError("Could not load queue users in real time.");
        }
      );
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [queues]);

  const queueCards = useMemo(() => {
    return queues.map((queueItem) => {
      const users = usersByQueue[queueItem.id] || [];
      const waitingUsers = users.filter((user) => user.status === "waiting");
      const completedUsers = users.filter((user) => {
        return (
          user.status === "completed" ||
          user.status === "skipped" ||
          user.status === "left"
        );
      });
      const calledUser =
        queueItem.currentToken > 0 && queueItem.currentUserId
          ? users.find((user) => {
              return (
                user.id === queueItem.currentUserId &&
                user.status === "called"
              );
            }) || null
          : null;

      return {
        ...queueItem,
        users,
        waitingUsers,
        calledUser,
        completedUsers
      };
    });
  }, [queues, usersByQueue]);

  async function handleCreateQueue(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoadingAction("create");

    try {
      await createQueue(queueName, queueType);
      setQueueName("");
      setQueueType("Hospital");
      setSuccess("Queue created successfully.");
    } catch (error) {
      setError(error.message || "Could not create queue.");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleCallNext(queueId) {
    setError("");
    setSuccess("");
    setLoadingAction(`call-${queueId}`);

    try {
      await callNextUser(queueId);
      setSuccess("Next user called.");
    } catch (error) {
      setError(error.message || "Could not call next user.");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleCompleteCurrent(queueId) {
    setError("");
    setSuccess("");
    setLoadingAction(`complete-${queueId}`);

    try {
      await completeCurrentUser(queueId);
      setSuccess("Current user completed.");
    } catch (error) {
      setError(error.message || "Could not complete current user.");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleSkipUser(userId) {
    setError("");
    setSuccess("");
    setLoadingAction(`skip-${userId}`);

    try {
      await skipUser(userId);
      setSuccess("User skipped.");
    } catch (error) {
      setError(error.message || "Could not skip user.");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-container flex items-center justify-between py-5">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="muted-text">
              Manage live queue tokens with Firestore realtime updates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/analytics" className="btn-secondary">
              Analytics
            </Link>
            <Link to="/home" className="btn-secondary">
              User view
            </Link>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="app-container py-8">
        <form onSubmit={handleCreateQueue} className="app-card mb-6">
          <h2 className="section-title">Create queue</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px_auto]">
            <input
              type="text"
              value={queueName}
              onChange={(event) => setQueueName(event.target.value)}
              className="input-field"
              placeholder="Example: Apollo Hospital"
              required
            />

            <select
              value={queueType}
              onChange={(event) => setQueueType(event.target.value)}
              className="input-field"
            >
              <option>Hospital</option>
              <option>Bank</option>
              <option>Restaurant</option>
              <option>Other</option>
            </select>

            <button
              type="submit"
              disabled={loadingAction === "create"}
              className="btn-primary"
            >
              {loadingAction === "create" ? "Creating..." : "Create"}
            </button>
          </div>
        </form>

        {error && <div className="alert-error mb-5">{error}</div>}
        {success && <div className="alert-success mb-5">{success}</div>}

        <div className="mb-4">
          <h2 className="section-title">Live queues</h2>
          <p className="mt-1 muted-text">
            Waiting, called, and completed users are separated by status.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {queueCards.map((queueItem) => {
            const isQueueReset =
              (queueItem.totalWaiting || 0) === 0 && !queueItem.currentUserId;

            return (
              <div key={queueItem.id} className="app-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-[#333]">
                      {getQueueTitle(queueItem)}
                    </h3>
                    <p className="mt-1 text-sm text-[#777]">
                      {queueItem.type || "Queue"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-semibold text-[#333]">
                      {queueItem.waitingUsers.length}
                    </p>
                    <p className="text-xs text-[#777]">waiting</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="soft-panel">
                    <p className="text-xs text-[#777]">Current token</p>
                    <p className="mt-1 text-xl font-semibold text-[#333]">
                      {isQueueReset ? "--" : queueItem.currentToken || "--"}
                    </p>
                  </div>

                  <div className="soft-panel">
                    <p className="text-xs text-[#777]">Next token</p>
                    <p className="mt-1 text-xl font-semibold text-[#333]">
                      {isQueueReset
                        ? "--"
                        : queueItem.waitingUsers[0]?.tokenNumber ||
                          queueItem.nextToken ||
                          "--"}
                    </p>
                  </div>

                  <div className="soft-panel">
                    <p className="text-xs text-[#777]">Estimated wait</p>
                    <p className="mt-1 text-xl font-semibold text-[#333]">
                      {isQueueReset ? "--" : `${queueItem.estimatedWait || 0} min`}
                    </p>
                  </div>
                </div>

                <div className="soft-panel mt-5">
                  <p className="text-sm text-[#777]">Currently called</p>
                  <p className="mt-1 font-semibold text-[#333]">
                    {queueItem.calledUser
                      ? `Token ${queueItem.calledUser.tokenNumber}`
                      : "No user called"}
                  </p>
                  {queueItem.calledUser && (
                    <p className="mt-1 text-xs text-[#777]">
                      {queueItem.calledUser.userEmail ||
                        queueItem.calledUser.userId}
                    </p>
                  )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => handleCallNext(queueItem.id)}
                    disabled={
                      queueItem.waitingUsers.length === 0 ||
                      loadingAction === `call-${queueItem.id}`
                    }
                    className="btn-primary"
                  >
                    {loadingAction === `call-${queueItem.id}`
                      ? "Calling..."
                      : "Call next"}
                  </button>

                  <button
                    onClick={() => handleCompleteCurrent(queueItem.id)}
                    disabled={
                      !queueItem.calledUser ||
                      loadingAction === `complete-${queueItem.id}`
                    }
                    className="btn-secondary"
                  >
                    {loadingAction === `complete-${queueItem.id}`
                      ? "Completing..."
                      : "Complete current"}
                  </button>
                </div>

                <section className="mt-6">
                  <h4 className="text-sm font-semibold text-[#333]">
                    Waiting users
                  </h4>

                  <div className="mt-3 space-y-3">
                    {queueItem.waitingUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] px-4 py-3"
                      >
                        <div>
                          <p className="font-semibold text-[#333]">
                            Token {user.tokenNumber}
                          </p>
                          <p className="text-xs text-[#777]">
                            {user.userEmail || user.userId}
                          </p>
                        </div>

                        <button
                          onClick={() => handleSkipUser(user.id)}
                          disabled={loadingAction === `skip-${user.id}`}
                          className="btn-secondary"
                        >
                          {loadingAction === `skip-${user.id}`
                            ? "Skipping..."
                            : "Skip user"}
                        </button>
                      </div>
                    ))}

                    {queueItem.waitingUsers.length === 0 && (
                      <div className="rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] px-4 py-4 text-center text-sm text-[#777]">
                        No waiting users.
                      </div>
                    )}
                  </div>
                </section>

                <section className="mt-6">
                  <h4 className="text-sm font-semibold text-[#333]">
                    Completed / skipped / left
                  </h4>

                  <div className="mt-3 space-y-2">
                    {queueItem.completedUsers.slice(0, 8).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded-xl border border-[#eeeeee] px-4 py-2 text-sm"
                      >
                        <span className="text-[#333]">
                          Token {user.tokenNumber}
                        </span>
                        <span className="capitalize text-[#777]">
                          {user.status}
                        </span>
                      </div>
                    ))}

                    {queueItem.completedUsers.length === 0 && (
                      <p className="text-sm text-[#777]">
                        No completed users yet.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            );
          })}
        </div>

        {queueCards.length === 0 && (
          <div className="app-card text-center text-sm text-[#777]">
            No queues yet. Create your first queue above.
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;