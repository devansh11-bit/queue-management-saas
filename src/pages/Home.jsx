import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import places from "../data/places";
import {
  createSampleQueue,
  getEstimatedWait,
  joinQueue,
  leaveQueue,
  listenToQueues,
  listenToQueueUsers
} from "../services/queueService";

function Home() {
  const navigate = useNavigate();
  const [queues, setQueues] = useState([]);
  const [queueUsers, setQueueUsers] = useState({});
  const [phoneNumbers, setPhoneNumbers] = useState({});
  const [joiningQueueId, setJoiningQueueId] = useState("");
  const [leavingQueueId, setLeavingQueueId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function seedSampleQueues() {
      try {
        await Promise.all(
          places.map((place) => {
            return createSampleQueue(place);
          })
        );
      } catch (error) {
        setError("Could not prepare queues. Please check Firestore rules.");
      }
    }

    seedSampleQueues();
  }, []);

  useEffect(() => {
    const unsubscribe = listenToQueues(
      setQueues,
      () => setError("Could not load queues in real time.")
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribers = queues.map((queueItem) => {
      return listenToQueueUsers(
        queueItem.id,
        (users) => {
          setQueueUsers((currentUsers) => ({
            ...currentUsers,
            [queueItem.id]: users
          }));
        },
        () => setError("Could not load queue users in real time.")
      );
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [queues]);

  const queuesWithUserData = useMemo(() => {
    return queues.map((queueItem) => {
      const users = queueUsers[queueItem.id] || [];
      const waitingUsers = users.filter((user) => user.status === "waiting");
      const myQueueUser = users.find((user) => {
        return user.userId === auth.currentUser?.uid;
      });
      const myWaitingIndex = waitingUsers.findIndex((user) => {
        return user.userId === auth.currentUser?.uid;
      });
      const peopleAhead = myWaitingIndex >= 0 ? myWaitingIndex : null;

      return {
        ...queueItem,
        users,
        waitingUsers,
        myQueueUser,
        peopleAhead,
        userPosition: myWaitingIndex >= 0 ? myWaitingIndex + 1 : null
      };
    });
  }, [queues, queueUsers]);

  async function handleJoinQueue(queueItem) {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    if (!phoneNumbers[queueItem.id]) {
      setError("Please enter your WhatsApp number before joining.");
      return;
    }

    setError("");
    setSuccess("");
    setJoiningQueueId(queueItem.id);

    try {
      const tokenNumber = await joinQueue(
        {
          id: queueItem.id,
          name: queueItem.name || queueItem.placeName,
          type: queueItem.type
        },
        phoneNumbers[queueItem.id]
      );

      setSuccess(`Joined queue. Your token number is ${tokenNumber}.`);
    } catch (error) {
      setError(error.message || "Could not join queue. Please try again.");
    } finally {
      setJoiningQueueId("");
    }
  }

  async function handleLeaveQueue(queueItem) {
    setError("");
    setSuccess("");
    setLeavingQueueId(queueItem.id);

    try {
      await leaveQueue({ id: queueItem.id });
      setSuccess("You left the queue.");
    } catch (error) {
      setError(error.message || "Could not leave queue. Please try again.");
    } finally {
      setLeavingQueueId("");
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
            <h1 className="page-title">Queue Management</h1>
            <p className="muted-text">
              Live tokens, people ahead, and estimated wait time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin" className="btn-secondary">
              Admin
            </Link>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="app-container py-8">
        <div className="mb-6">
          <h2 className="section-title">Available queues</h2>
          <p className="mt-1 muted-text">
            Join once and watch your position update in real time.
          </p>
        </div>

        {error && <div className="alert-error mb-5">{error}</div>}
        {success && <div className="alert-success mb-5">{success}</div>}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {queuesWithUserData.map((queueItem) => {
            const queueName = queueItem.name || queueItem.placeName;
            const myQueueUser = queueItem.myQueueUser;
            const isWaiting = myQueueUser?.status === "waiting";
            const isCalled = myQueueUser?.status === "called";
            const isCompleted = myQueueUser?.status === "completed";
            const isSkipped = myQueueUser?.status === "skipped";
            const isLeft = myQueueUser?.status === "left";
            const canJoinAgain = !myQueueUser || isCompleted || isSkipped || isLeft;
            const isNext = isWaiting && queueItem.peopleAhead === 0;
            const isQueueReset =
              (queueItem.totalWaiting || 0) === 0 && !queueItem.currentUserId;
            const qrValue = `${window.location.origin}/join/${queueItem.id}`;

            return (
              <div key={queueItem.id} className="app-card">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-[#333]">{queueName}</h3>
                    <p className="mt-1 text-sm text-[#777]">
                      {queueItem.type || "Queue"}
                    </p>
                  </div>
                  <span className="status-pill">Live</span>
                </div>

                {isNext && (
                  <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                    You are next
                  </div>
                )}

                <div className="space-y-3 border-t border-[#eeeeee] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#777]">Current token</span>
                    <span className="font-semibold text-[#333]">
                      {isQueueReset ? "--" : queueItem.currentToken || "--"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#777]">Next token</span>
                    <span className="font-semibold text-[#333]">
                      {isQueueReset
                        ? "--"
                        : queueItem.waitingUsers[0]?.tokenNumber ||
                          queueItem.nextToken ||
                          "--"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#777]">Total waiting</span>
                    <span className="font-semibold text-[#333]">
                      {queueItem.totalWaiting || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#777]">Queue wait</span>
                    <span className="font-semibold text-[#333]">
                      {isQueueReset ? "--" : `${queueItem.estimatedWait || 0} min`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#777]">Your token</span>
                    <span className="font-semibold text-[#333]">
                      {isQueueReset ? "--" : myQueueUser?.tokenNumber || "--"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#777]">People ahead</span>
                    <span className="font-semibold text-[#333]">
                      {isQueueReset ? "--" : queueItem.peopleAhead ?? "--"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#777]">Your wait</span>
                    <span className="font-semibold text-[#333]">
                      {isQueueReset || queueItem.peopleAhead === null
                        ? "--"
                        : `${getEstimatedWait(queueItem.peopleAhead)} min`}
                    </span>
                  </div>
                </div>

                {myQueueUser && (
                  <div className="soft-panel mt-5">
                    <p className="text-sm text-[#777]">Your status</p>
                    <p className="mt-1 font-semibold capitalize text-[#333]">
                      {myQueueUser.status}
                    </p>
                    {isCalled && (
                      <p className="mt-1 text-sm text-[#777]">
                        Please proceed to the counter.
                      </p>
                    )}
                    {(isCompleted || isSkipped || isLeft) && (
                      <p className="mt-1 text-sm text-[#777]">
                        You can join again if needed.
                      </p>
                    )}
                  </div>
                )}

                {canJoinAgain ? (
                  <div className="mt-5">
                    <label className="mb-1 block text-sm font-medium text-[#333]">
                      WhatsApp number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumbers[queueItem.id] || ""}
                      onChange={(event) =>
                        setPhoneNumbers((currentNumbers) => ({
                          ...currentNumbers,
                          [queueItem.id]: event.target.value
                        }))
                      }
                      className="input-field text-sm"
                      placeholder="+919876543210"
                    />
                  </div>
                ) : null}

                <div className="soft-panel mt-5 flex items-center gap-4">
                  <div className="rounded-lg border border-[#e5e5e5] bg-white p-2">
                    <QRCodeCanvas value={qrValue} size={72} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#333]">
                      Scan to join
                    </p>
                    <p className="mt-1 text-xs text-[#777]">
                      Opens this queue directly.
                    </p>
                  </div>
                </div>

                {!canJoinAgain ? (
                  <button
                    onClick={() => handleLeaveQueue(queueItem)}
                    disabled={leavingQueueId === queueItem.id}
                    className="btn-secondary mt-5 w-full"
                  >
                    {leavingQueueId === queueItem.id
                      ? "Leaving..."
                      : "Leave queue"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoinQueue(queueItem)}
                    disabled={joiningQueueId === queueItem.id}
                    className="btn-primary mt-5 w-full"
                  >
                    {joiningQueueId === queueItem.id
                      ? "Joining..."
                      : "Join queue"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {queuesWithUserData.length === 0 && (
          <div className="app-card text-center text-sm text-[#777]">
            No queues found.
          </div>
        )}
      </main>
    </div>
  );
}

export default Home;