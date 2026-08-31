import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import { ROLE_LABELS, STAFF_ROLES } from "../roles";

export default function StaffDirectory() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [roleFilter, setRoleFilter] = useState("ALL");

  useEffect(() => {
    setLoading(true);
    setLoadFailed(false);
    const params = roleFilter === "ALL" ? {} : { user__role: roleFilter };
    api.get("/faculty/profiles/", { params })
      .then((res) => setStaff(res.data.results ?? res.data))
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [roleFilter]);

  return (
    <Layout title="Staff Directory">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>Staff directory</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="ALL">All roles</option>
              {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </div>

        {loading && <p className="empty-state">Loading staff...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load the staff directory. Try refreshing the page.</p>}
        {!loading && !loadFailed && (
          <table className="ledger">
            <thead>
              <tr><th className="mono">Employee ID</th><th>Name</th><th>Role</th><th>Department</th><th>Designation</th><th>Email</th></tr>
            </thead>
            <tbody>
              {staff.map((f) => (
                <tr key={f.id}>
                  <td className="mono">{f.employee_id}</td>
                  <td>{f.full_name}</td>
                  <td><span className="badge badge-pending">{f.role_display || f.role}</span></td>
                  <td>{f.department_name || "—"}</td>
                  <td>{f.designation || "—"}</td>
                  <td>{f.email}</td>
                </tr>
              ))}
              {staff.length === 0 && <tr><td colSpan={6} className="empty-state">No staff found for this filter.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
