import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { auth, db } from "../firebase";

const pieColors = ["#333", "#777", "#d8d8d8"];

function getHourLabel(hour) {
  if (hour === 0) {
    return "12 AM";
  }

  if (hour < 12) {
    return `${hour} AM`;
  }

  if (hour === 12) {
    return "12 PM";
  }

  return `${hour - 12} PM`;
}

function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [queues, setQueues] = useState([]);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const queuesRef = collection(db, "queues");
    const queuesQuery = query(queuesRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      queuesQuery,
      (snapshot) => {
        const queueList = snapshot.docs.map((queueDoc) => ({
          id: queueDoc.id,
          ...queueDoc.data()
        }));

        setQueues(queueList);
      },
      () => {
        setError("Could not load queue analytics. Please check Firestore rules.");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const membersRef = collection(db, "queueUsers");
    const membersQuery = query(membersRef, orderBy("joinedAt", "asc"));

    const unsubscribe = onSnapshot(
      membersQuery,
      (snapshot) => {
        const memberList = snapshot.docs.map((memberDoc) => ({
          id: memberDoc.id,
          ...memberDoc.data()
        }));

        setMembers(memberList);
      },
      () => {
        setError("Could not load user analytics. Please check Firestore rules.");
      }
    );

    return () => unsubscribe();
  }, []);

  const analytics = useMemo(() => {
    const uniqueUsers = new Set(members.map((member) => member.userId));
    const waitingUsers = members.filter(
      (member) => member.status !== "called" && member.status !== "skipped"
    );
    const calledUsers = members.filter((member) => member.status === "called");
    const skippedUsers = members.filter((member) => member.status === "skipped");

    const hourlyCounts = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: getHourLabel(hour),
      users: 0
    }));

    members.forEach((member) => {
      const joinedDate = member.joinedAt?.toDate?.();

      if (joinedDate) {
        hourlyCounts[joinedDate.getHours()].users += 1;
      }
    });

    const peakHour = hourlyCounts.reduce((highest, current) => {
      return current.users > highest.users ? current : highest;
    }, hourlyCounts[0]);

    const queueChartData = queues.map((queueItem) => ({
      name: queueItem.name || queueItem.placeName || "Queue",
      waiting: queueItem.totalWaiting || 0
    }));

    const statusChartData = [
      { name: "Waiting", value: waitingUsers.length },
      { name: "Called", value: calledUsers.length },
      { name: "Skipped", value: skippedUsers.length }
    ];

    return {
      totalUsers: uniqueUsers.size,
      totalBookings: members.length,
      totalWaiting: waitingUsers.length,
      peakHour,
      hourlyCounts,
      queueChartData,
      statusChartData
    };
  }, [members, queues]);

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-container flex items-center justify-between py-5">
          <div>
            <h1 className="page-title">
              Analytics Dashboard
            </h1>
            <p className="muted-text">
              Queue traffic, users, and peak hours.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="btn-secondary"
            >
              Admin
            </Link>
            <button
              onClick={handleLogout}
              className="btn-secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="app-container py-8">
        {error && (
          <div className="alert-error mb-5">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="app-card">
            <p className="text-sm text-[#777]">Number of users</p>
            <p className="mt-2 text-3xl font-semibold text-[#333]">
              {analytics.totalUsers}
            </p>
          </div>

          <div className="app-card">
            <p className="text-sm text-[#777]">Total joins</p>
            <p className="mt-2 text-3xl font-semibold text-[#333]">
              {analytics.totalBookings}
            </p>
          </div>

          <div className="app-card">
            <p className="text-sm text-[#777]">Total waiting</p>
            <p className="mt-2 text-3xl font-semibold text-[#333]">
              {analytics.totalWaiting}
            </p>
          </div>

          <div className="app-card">
            <p className="text-sm text-[#777]">Peak hour</p>
            <p className="mt-2 text-3xl font-semibold text-[#333]">
              {analytics.peakHour.users > 0 ? analytics.peakHour.label : "-"}
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="app-card">
            <h2 className="section-title">Peak hours</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.hourlyCounts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="users" fill="#333" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="app-card">
            <h2 className="section-title">
              Waiting by queue
            </h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.queueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="waiting" fill="#777" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="app-card lg:col-span-2">
            <h2 className="section-title">User status</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {analytics.statusChartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={pieColors[index % pieColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AnalyticsDashboard;
