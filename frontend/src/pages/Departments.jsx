import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ConfirmButton from "../components/ConfirmButton";
import api from "../api/axios";
import { parseFieldErrors } from "../api/errors";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../roles";

const EMPTY_FORM = { name: "", code: "", description: "", head_of_department: "", dept_admin: "" };

export default function Departments() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [departments, setDepartments] = useState([]);
  const [hods, setHods] = useState([]);
  const [deptAdmins, setDeptAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const canCreateOrDelete = user?.role === ROLES.SUPER_ADMIN;

  function load() {
    setLoading(true);
    setLoadFailed(false);
    Promise.all([
      api.get("/academics/departments/"),
      api.get("/faculty/profiles/?user__role=HOD"),
      api.get("/auth/users/?role=DEPT_ADMIN"),
    ])
      .then(([d, h, a]) => {
        setDepartments(d.data.results ?? d.data);
        setHods(h.data.results ?? h.data);
        setDeptAdmins(a.data.results ?? a.data);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setShowForm(true);
  }

  function startEdit(dept) {
    setEditingId(dept.id);
    setForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || "",
      head_of_department: dept.head_of_department || "",
      dept_admin: dept.dept_admin || "",
    });
    setFieldErrors({});
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    setSaving(true);
    const payload = {
      ...form,
      head_of_department: form.head_of_department || null,
      dept_admin: form.dept_admin || null,
    };
    try {
      if (editingId) {
        await api.patch(`/academics/departments/${editingId}/`, payload, { skipGlobalErrorToast: true });
        showSuccess("Department updated.");
      } else {
        await api.post("/academics/departments/", payload, { skipGlobalErrorToast: true });
        showSuccess("Department created.");
      }
      setShowForm(false);
      load();
    } catch (err) {
      setFieldErrors(parseFieldErrors(err));
      showError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/academics/departments/${id}/`, { skipGlobalErrorToast: true });
      showSuccess("Department deleted.");
      load();
    } catch (err) {
      showError(err, "Couldn't delete department — it may still have students, faculty, or courses attached.");
    }
  }

  return (
    <Layout title="Departments">
      <div className="grid-stats">
        <div className="stat-card">
          <div className="stat-label">Departments</div>
          <div className="stat-value">{departments.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total students</div>
          <div className="stat-value">{departments.reduce((s, d) => s + (d.student_count || 0), 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total staff</div>
          <div className="stat-value">{departments.reduce((s, d) => s + (d.faculty_count || 0), 0)}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>All departments</div>
          {canCreateOrDelete && (
            <button className="btn btn-accent" onClick={() => (showForm ? setShowForm(false) : startCreate())}>
              {showForm ? "Cancel" : "+ Add department"}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
            <div className="form-grid">
              <div className="field">
                <label>Name</label>
                <input required disabled={!canCreateOrDelete && !editingId} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
              </div>
              <div className="field">
                <label>Code</label>
                <input required disabled={!!editingId && !canCreateOrDelete} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                {fieldErrors.code && <div className="field-error">{fieldErrors.code}</div>}
              </div>
              <div className="field">
                <label>Head of Department</label>
                <select value={form.head_of_department} onChange={(e) => setForm({ ...form, head_of_department: e.target.value })}>
                  <option value="">None</option>
                  {hods.map((f) => <option key={f.id} value={f.id}>{f.full_name} ({f.employee_id})</option>)}
                </select>
                {fieldErrors.head_of_department && <div className="field-error">{fieldErrors.head_of_department}</div>}
                <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  Only staff accounts with the "Head of Department" role appear here.
                </span>
              </div>
              <div className="field">
                <label>Department Admin</label>
                <select value={form.dept_admin} onChange={(e) => setForm({ ...form, dept_admin: e.target.value })}>
                  <option value="">None</option>
                  {deptAdmins.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>)}
                </select>
                {fieldErrors.dept_admin && <div className="field-error">{fieldErrors.dept_admin}</div>}
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Save changes" : "Create department"}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="empty-state">Loading departments...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load departments. Try refreshing the page.</p>}
        {!loading && !loadFailed && (
          <table className="ledger">
            <thead>
              <tr>
                <th className="mono">Code</th><th>Name</th><th>HOD</th><th>Dept Admin</th>
                <th className="mono">Students</th><th className="mono">Staff</th><th className="mono">Courses</th><th></th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.code}</td>
                  <td>{d.name}</td>
                  <td>{d.hod_name || "—"}</td>
                  <td>{d.dept_admin_name || "—"}</td>
                  <td className="mono">{d.student_count ?? 0}</td>
                  <td className="mono">{d.faculty_count ?? 0}</td>
                  <td className="mono">{d.course_count ?? 0}</td>
                  <td>
                    <span className="row-actions">
                      <button className="btn btn-sm btn-ghost" onClick={() => startEdit(d)}>Edit</button>
                      {canCreateOrDelete && <ConfirmButton onConfirm={() => handleDelete(d.id)} />}
                    </span>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && <tr><td colSpan={8} className="empty-state">No departments yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
