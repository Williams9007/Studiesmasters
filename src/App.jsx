import { Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

// ✅ Import your pages
import LandingPage from "./components/landing-page.jsx";
import LoginPage from "./components/LoginPage.jsx";
import RegisterCoursePage from "./components/RegisterCoursePage.jsx";
import { StudentDashboard } from "./components/student-dashboard.jsx";
import { AuthForm }  from  "./components/auth-form-updated.jsx";
import PaymentPage from "./components/payment-flow.jsx";
import { AccountSettings } from "./components/AccountSettings.jsx";
import ForgetPasswordPage from "./components/ForgetPasswordPage.jsx";
import ResetPasswordPage from "./components/ResetPasswordPage.jsx";
import ErrorBoundary from "./components/error-boundary.jsx";
import QaoDashboard from "./components/qao-dashboard.jsx";
import QaoAccess from "./components/qao-access.jsx";
import { TeacherDashboard } from "./components/teacher-dashboard.jsx";
import AdminDashboard from "./components/admin-dashboard.jsx";
import AdminLogin from "./components/admin-login.jsx"; // ✅ New import
import { PrivateAdminRoute } from "./utils/PrivateAdminRoute.jsx"; // ✅ Admin route protection

function App() {
  const handleSignup = async (data) => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/register", data);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.user._id);
      return res.data;
    } catch (err) {
      console.error("❌ Backend signup error:", err.response?.data || err.message);
      throw err.response ? new Error(err.response.data.message) : err;
    }
  };

  return (
    <ErrorBoundary>
      <Routes>
        {/* ✅ Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register-course/:role" element={<RegisterCoursePage />} />
        <Route path="/auth-form/:role" element={<AuthForm onSignup={handleSignup} />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/forget-password" element={<ForgetPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/qao/dashboard" element={<QaoDashboard />} />
        <Route path="/qao/access" element={<QaoAccess />} />

        {/* ✅ Admin Login */}
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* ✅ Protected Routes */}
        <Route
          path="/student/dashboard"
          element={<StudentDashboard />}
        />
        <Route
          path="/teacher/dashboard"
          element={<TeacherDashboard />}
        />
        <Route
          path="/account-settings"
          element={<AccountSettings />}
        />

        {/* ✅ Protected Admin Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <PrivateAdminRoute>
              <AdminDashboard />
            </PrivateAdminRoute>
          }
        />

        {/* convenience redirect so /admin works */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* ✅ Fallback Route */}
        <Route
          path="*"
          element={<div className="text-center mt-20 text-xl">Page Not Found</div>}
        />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
