import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import CustomerLayout from "./components/CustomerLayout.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AnalyticsDashboard from "./pages/AnalyticsDashboard.jsx";
import Home from "./pages/Home.jsx";
import Explore from "./pages/Explore.jsx";
import JoinQueue from "./pages/JoinQueue.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute allowedRoles={["customer", "admin"]}>
            <CustomerLayout>
              <Home />
            </CustomerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/explore"
        element={
          <ProtectedRoute allowedRoles={["customer", "admin"]}>
            <CustomerLayout>
              <Explore />
            </CustomerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/join/:placeId"
        element={
          <ProtectedRoute allowedRoles={["customer", "admin"]}>
            <JoinQueue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]} redirectTo="/home">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={["admin"]} redirectTo="/home">
            <AnalyticsDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
