import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ConfirmButton from "../components/ConfirmButton";
import api from "../api/axios";
import { parseFieldErrors } from "../api/errors";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_LABELS, ALL_STAFF_CREATABLE_ROLES, DEPT_CREATABLE_ROLES } from "../roles";

const EMPTY_FORM = {
  username: "", email: "", first_name: "", last_name: "", password: "", role: ROLES.FACULTY,
  employee_id: "", department: "", designation: "", qualification: "", date_joined: "",
};

export default function Faculty() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // A Super Admin can create any staff-type account (including another Dept
  // Admin or HOD); a Dept Admin/HOD can only bring on Faculty, Advisors, and
  // Non-Teaching staff for their own department.
  const assignableRoles = user?.role === ROLES.SUPER_ADMIN ? ALL_STAFF_CREATABLE_ROLES
    : DEPT_CREATABLE_ROLES.filter((r) => r !== ROLES.STUDENT && r !== ROLES.PARENT);

  function load() {
    setLoading(true);
    setLoadFailed(false);
    Promise.all([
      api.get("/faculty/profiles/"),
      api.get("/academics/departments/"),
    ])
      .then(([f, d]) => {
        setFaculty(f.data.results ?? f.data);
        setDepartments(d.data.results ?? d.data);
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

  function startEdit(f) {
    setEditingId(f.id);
    setForm({
      username: "", email: f.email || "", first_name: "", last_name: "", password: "", role: f.role,
      employee_id: f.employee_id, department: f.department || "",
      designation: f.designation || "", qualification: f.qualification || "",
      date_joined: f.date_joined || "",
    });
    setFieldErrors({});
    setShowForm(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFieldErrors({});
    setSaving(true);
    try {
      const userRes = await api.post("/auth/users/", {
        username: form.username, email: form.email, first_name: form.first_name,
        last_name: form.last_name, password: form.password, role: form.role,
      }, { skipGlobalErrorToast: true });
      await api.post("/faculty/profiles/", {
        user: userRes.data.id, employee_id: form.employee_id, department: form.department || null,
        designation: form.designation, qualification: form.qualification,
        date_joined: form.date_joined || null,
      }, { skipGlobalErrorToast: true });
      showSuccess("Staff account created.");
      setShowForm(false);
      load();
    } catch (err) {
      setFieldErrors(parseFieldErrors(err));
      showError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setFieldErrors({});
    setSaving(true);
    try {
      await api.patch(`/faculty/profiles/${editingId}/`, {
        employee_id: form.employee_id, department: form.department || null,
        designation: form.designation, qualification: form.qualification,
        date_joined: form.date_joined || null,
      }, { skipGlobalErrorToast: true });
      showSuccess("Staff record updated.");
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
      await api.delete(`/faculty/profiles/${id}/`, { skipGlobalErrorToast: true });
      showSuccess("Staff member removed.");
      load();
    } catch (err) {
      showError(err, "Couldn't delete this staff member — they may still be assigned to courses.");
    }
  }

  return (
    <Layout title="Add Staff">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>All staff</div>
          <button className="btn btn-accent" onClick={() => (showForm ? setShowForm(false) : startCreate())}>
            {showForm ? "Cancel" : "+ Add staff member"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={editingId ? handleUpdate : handleCreate} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
            <div className="form-grid">
              {!editingId && (
                <>
                  <div className="field">
                    <label>Role</label>
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                      {assignableRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Username</label>
                    <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                    {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
                  </div>
                  <div className="field">
                    <label>First name</label>
                    <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Last name</label>
                    <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Temporary password</label>
                    <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
                  </div>
                </>
              )}
              <div className="field">
                <label>Employee ID</label>
                <input required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
                {fieldErrors.employee_id && <div className="field-error">{fieldErrors.employee_id}</div>}
              </div>
              <div className="field">
                <label>Department</label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="">None</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Designation</label>
                <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Assistant Professor, Office Assistant" />
              </div>
              <div className="field">
                <label>Qualification</label>
                <input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. PhD in Computer Science" />
              </div>
              <div className="field">
                <label>Date joined</label>
                <input type="date" value={form.date_joined} onChange={(e) => setForm({ ...form, date_joined: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Save changes" : "Create staff account"}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="empty-state">Loading staff...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load staff. Try refreshing the page.</p>}
        {!loading && !loadFailed && (
          <table className="ledger">
            <thead>
              <tr><th className="mono">Employee ID</th><th>Name</th><th>Role</th><th>Department</th><th>Designation</th><th>Email</th><th></th></tr>
            </thead>
            <tbody>
              {faculty.map((f) => (
                <tr key={f.id}>
                  <td className="mono">{f.employee_id}</td>
                  <td>{f.full_name}</td>
                  <td><span className="badge badge-pending">{f.role_display || f.role}</span></td>
                  <td>{f.department_name || "—"}</td>
                  <td>{f.designation || "—"}</td>
                  <td>{f.email}</td>
                  <td>
                    <span className="row-actions">
                      <button className="btn btn-sm btn-ghost" onClick={() => startEdit(f)}>Edit</button>
                      <ConfirmButton onConfirm={() => handleDelete(f.id)} />
                    </span>
                  </td>
                </tr>
              ))}
              {faculty.length === 0 && <tr><td colSpan={7} className="empty-state">No staff yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
