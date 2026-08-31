import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ROLES, ROLE_LABELS } from "../roles";

const DEPT_MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.DEPT_ADMIN, ROLES.HOD];

export default function Dashboard() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [notices, setNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [noticesFailed, setNoticesFailed] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsFailed, setStatsFailed] = useState(false);

  const showStats = DEPT_MANAGER_ROLES.includes(user?.role);

  useEffect(() => {
    setNoticesLoading(true);
    setNoticesFailed(false);
    api.get("/notices/")
      .then(({ data }) => setNotices((data.results ?? data).slice(0, 5)))
      .catch(() => setNoticesFailed(true))
      .finally(() => setNoticesLoading(false));

    if (showStats) {
      setStatsFailed(false);
      Promise.all([
        api.get("/students/profiles/"),
        api.get("/faculty/profiles/"),
        api.get("/academics/courses/"),
      ]).then(([s, f, c]) => {
        setStats({
          students: s.data.count ?? s.data.length,
          faculty: f.data.count ?? f.data.length,
          courses: c.data.count ?? c.data.length,
        });
      }).catch((err) => {
        setStatsFailed(true);
        showError(err, "Couldn't load dashboard statistics.");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Layout title={`Welcome, ${user?.first_name || user?.username}`}>
      {showStats && statsFailed && (
        <p className="empty-state">Couldn't load dashboard statistics. Try refreshing the page.</p>
      )}
      {stats && (
        <div className="grid-stats">
          <div className="stat-card">
            <div className="stat-label">{user?.role === ROLES.SUPER_ADMIN ? "Students" : "Students in your department"}</div>
            <div className="stat-value">{stats.students}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{user?.role === ROLES.SUPER_ADMIN ? "Staff" : "Staff in your department"}</div>
            <div className="stat-value">{stats.faculty}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Courses</div>
            <div className="stat-value">{stats.courses}</div>
          </div>
        </div>
      )}

      {!showStats && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="card-title" style={{ margin: 0 }}>Signed in as {ROLE_LABELS[user?.role] || user?.role}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Recent notices</div>
        {noticesLoading && <p className="empty-state">Loading notices...</p>}
        {!noticesLoading && noticesFailed && <p className="empty-state">Couldn't load notices. Try refreshing the page.</p>}
        {!noticesLoading && !noticesFailed && notices.length === 0 && <p className="empty-state">No notices yet.</p>}
        {!noticesLoading && !noticesFailed && notices.map((n) => (
          <div key={n.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
            <strong>{n.title}</strong>{n.is_urgent && <span className="badge badge-danger" style={{ marginLeft: 8 }}>Urgent</span>}
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.88rem" }}>{n.body}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
