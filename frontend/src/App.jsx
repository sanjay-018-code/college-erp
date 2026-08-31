import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ROLES, DEPT_MANAGER_ROLES } from "./roles";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Faculty from "./pages/Faculty";
import Courses from "./pages/Courses";
import Attendance from "./pages/Attendance";
import Grades from "./pages/Grades";
import Fees from "./pages/Fees";
import Notices from "./pages/Notices";
import Departments from "./pages/Departments";
import Advisees from "./pages/Advisees";
import Bonafide from "./pages/Bonafide";
import CourseMaterials from "./pages/CourseMaterials";
import StaffDirectory from "./pages/StaffDirectory";

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route
            path="/departments"
            element={<PrivateRoute roles={DEPT_MANAGER_ROLES}><Departments /></PrivateRoute>}
          />
          <Route
            path="/students"
            element={<PrivateRoute roles={[...DEPT_MANAGER_ROLES, ROLES.FACULTY, ROLES.ADVISOR]}><Students /></PrivateRoute>}
          />
          <Route
            path="/staff"
            element={<PrivateRoute roles={DEPT_MANAGER_ROLES}><StaffDirectory /></PrivateRoute>}
          />
          <Route
            path="/faculty"
            element={<PrivateRoute roles={DEPT_MANAGER_ROLES}><Faculty /></PrivateRoute>}
          />
          <Route
            path="/courses"
            element={<PrivateRoute roles={[...DEPT_MANAGER_ROLES, ROLES.FACULTY, ROLES.ADVISOR]}><Courses /></PrivateRoute>}
          />
          <Route
            path="/materials"
            element={<PrivateRoute><CourseMaterials /></PrivateRoute>}
          />
          <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
          <Route path="/grades" element={<PrivateRoute><Grades /></PrivateRoute>} />
          <Route path="/fees" element={<PrivateRoute><Fees /></PrivateRoute>} />
          <Route
            path="/advisees"
            element={<PrivateRoute roles={[ROLES.ADVISOR, ...DEPT_MANAGER_ROLES]}><Advisees /></PrivateRoute>}
          />
          <Route
            path="/bonafide"
            element={<PrivateRoute roles={[ROLES.STUDENT, ...DEPT_MANAGER_ROLES]}><Bonafide /></PrivateRoute>}
          />
          <Route path="/notices" element={<PrivateRoute><Notices /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
