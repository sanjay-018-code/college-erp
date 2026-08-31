import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_LABELS } from "../roles";

const NAV_BY_ROLE = {
  [ROLES.SUPER_ADMIN]: [
    { to: "/", label: "Dashboard" },
    { to: "/departments", label: "Departments" },
    { to: "/students", label: "Students" },
    { to: "/staff", label: "Staff Directory" },
    { to: "/faculty", label: "Add Staff" },
    { to: "/courses", label: "Courses" },
    { to: "/materials", label: "Course Materials" },
    { to: "/attendance", label: "Attendance" },
    { to: "/grades", label: "Exams & Grades" },
    { to: "/fees", label: "Fees" },
    { to: "/bonafide", label: "Bonafide Requests" },
    { to: "/notices", label: "Notices" },
  ],
  [ROLES.DEPT_ADMIN]: [
    { to: "/", label: "Dashboard" },
    { to: "/departments", label: "My Department" },
    { to: "/students", label: "Students" },
    { to: "/staff", label: "Staff Directory" },
    { to: "/faculty", label: "Add Staff" },
    { to: "/courses", label: "Courses" },
    { to: "/fees", label: "Fees" },
    { to: "/bonafide", label: "Bonafide Requests" },
    { to: "/notices", label: "Notices" },
  ],
  [ROLES.HOD]: [
    { to: "/", label: "Dashboard" },
    { to: "/departments", label: "My Department" },
    { to: "/students", label: "Students" },
    { to: "/staff", label: "Staff Directory" },
    { to: "/faculty", label: "Add Staff" },
    { to: "/courses", label: "Courses" },
    { to: "/materials", label: "Course Materials" },
    { to: "/attendance", label: "Attendance" },
    { to: "/grades", label: "Exams & Grades" },
    { to: "/bonafide", label: "Bonafide Requests" },
    { to: "/notices", label: "Notices" },
  ],
  [ROLES.ADVISOR]: [
    { to: "/", label: "Dashboard" },
    { to: "/advisees", label: "My Advisees" },
    { to: "/students", label: "Students" },
    { to: "/courses", label: "Courses" },
    { to: "/materials", label: "Course Materials" },
    { to: "/attendance", label: "Attendance" },
    { to: "/grades", label: "Exams & Grades" },
    { to: "/notices", label: "Notices" },
  ],
  [ROLES.FACULTY]: [
    { to: "/", label: "Dashboard" },
    { to: "/materials", label: "Course Materials" },
    { to: "/attendance", label: "Attendance" },
    { to: "/grades", label: "Exams & Grades" },
    { to: "/notices", label: "Notices" },
  ],
  [ROLES.NON_TEACHING]: [
    { to: "/", label: "Dashboard" },
    { to: "/notices", label: "Notices" },
  ],
  [ROLES.STUDENT]: [
    { to: "/", label: "Dashboard" },
    { to: "/materials", label: "Course Materials" },
    { to: "/attendance", label: "My Attendance" },
    { to: "/grades", label: "My Grades" },
    { to: "/fees", label: "My Fees" },
    { to: "/bonafide", label: "Bonafide Requests" },
    { to: "/notices", label: "Notices" },
  ],
  [ROLES.PARENT]: [
    { to: "/", label: "Dashboard" },
    { to: "/notices", label: "Notices" },
  ],
};

export default function Layout({ children, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = NAV_BY_ROLE[user?.role] || [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Campus<span>Ledger</span></div>
        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div
            className="sidebar-link"
            style={{ padding: "8px 0", cursor: "pointer" }}
            onClick={() => { logout(); navigate("/login"); }}
          >
            Log out
          </div>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-user">
            <span>{user?.first_name || user?.username}</span>
            <span className="role-badge">{ROLE_LABELS[user?.role] || user?.role}</span>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
