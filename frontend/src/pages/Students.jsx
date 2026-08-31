import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ConfirmButton from "../components/ConfirmButton";
import api from "../api/axios";
import { parseFieldErrors } from "../api/errors";
import { useToast } from "../context/ToastContext";

const EMPTY_FORM = {
  username: "", email: "", first_name: "", last_name: "", password: "",
  roll_number: "", department: "", semester: 1, admission_year: new Date().getFullYear(),
  date_of_birth: "", address: "", guardian_name: "", guardian_phone: "", is_hostel_resident: false,
};

export default function Students() {
  const { showError, showSuccess } = useToast();
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setLoadFailed(false);
    Promise.all([
      api.get("/students/profiles/"),
      api.get("/academics/departments/"),
    ])
      .then(([s, d]) => {
        setStudents(s.data.results ?? s.data);
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

  function startEdit(s) {
    setEditingId(s.id);
    setForm({
      username: "", email: s.email || "", first_name: "", last_name: "", password: "",
      roll_number: s.roll_number, department: s.department || "", semester: s.semester,
      admission_year: s.admission_year, date_of_birth: s.date_of_birth || "",
      address: s.address || "", guardian_name: s.guardian_name || "",
      guardian_phone: s.guardian_phone || "", is_hostel_resident: s.is_hostel_resident || false,
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
        last_name: form.last_name, password: form.password, role: "STUDENT",
      }, { skipGlobalErrorToast: true });
      await api.post("/students/profiles/", {
        user: userRes.data.id, roll_number: form.roll_number, department: form.department || null,
        semester: form.semester, admission_year: form.admission_year,
        date_of_birth: form.date_of_birth || null, address: form.address,
        guardian_name: form.guardian_name, guardian_phone: form.guardian_phone,
        is_hostel_resident: form.is_hostel_resident,
      }, { skipGlobalErrorToast: true });
      showSuccess("Student created.");
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
      await api.patch(`/students/profiles/${editingId}/`, {
        roll_number: form.roll_number, department: form.department || null,
        semester: form.semester, admission_year: form.admission_year,
        date_of_birth: form.date_of_birth || null, address: form.address,
        guardian_name: form.guardian_name, guardian_phone: form.guardian_phone,
        is_hostel_resident: form.is_hostel_resident,
      }, { skipGlobalErrorToast: true });
      showSuccess("Student updated.");
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
      await api.delete(`/students/profiles/${id}/`, { skipGlobalErrorToast: true });
      showSuccess("Student removed.");
      load();
    } catch (err) {
      showError(err, "Couldn't delete this student — they may have attendance, grades, or fee records attached.");
    }
  }

  return (
    <Layout title="Students">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>All students</div>
          <button className="btn btn-accent" onClick={() => (showForm ? setShowForm(false) : startCreate())}>
            {showForm ? "Cancel" : "+ Add student"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={editingId ? handleUpdate : handleCreate} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
            <div className="form-grid">
              {!editingId && (
                <>
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
                <label>Roll number</label>
                <input required value={form.roll_number} onChange={(e) => setForm({ ...form, roll_number: e.target.value })} />
                {fieldErrors.roll_number && <div className="field-error">{fieldErrors.roll_number}</div>}
              </div>
              <div className="field">
                <label>Department</label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="">None</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Semester</label>
                <input required type="number" min="1" max="12" value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} />
                {fieldErrors.semester && <div className="field-error">{fieldErrors.semester}</div>}
              </div>
              <div className="field">
                <label>Admission year</label>
                <input required type="number" value={form.admission_year} onChange={(e) => setForm({ ...form, admission_year: Number(e.target.value) })} />
                {fieldErrors.admission_year && <div className="field-error">{fieldErrors.admission_year}</div>}
              </div>
              <div className="field">
                <label>Date of birth (optional)</label>
                <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
              </div>
              <div className="field">
                <label>Guardian name (optional)</label>
                <input value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} />
              </div>
              <div className="field">
                <label>Guardian phone (optional)</label>
                <input value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} />
              </div>
              <div className="field">
                <label>
                  <input type="checkbox" checked={form.is_hostel_resident} onChange={(e) => setForm({ ...form, is_hostel_resident: e.target.checked })} style={{ marginRight: 6 }} />
                  Hostel resident
                </label>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Address (optional)</label>
                <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Save changes" : "Create student"}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="empty-state">Loading students...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load students. Try refreshing the page.</p>}
        {!loading && !loadFailed && (
          <table className="ledger">
            <thead>
              <tr><th className="mono">Roll No.</th><th>Name</th><th>Department</th><th className="mono">Semester</th><th>Email</th><th></th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.roll_number}</td>
                  <td>{s.full_name}</td>
                  <td>{s.department_name || "—"}</td>
                  <td className="mono">{s.semester}</td>
                  <td>{s.email}</td>
                  <td>
                    <span className="row-actions">
                      <button className="btn btn-sm btn-ghost" onClick={() => startEdit(s)}>Edit</button>
                      <ConfirmButton onConfirm={() => handleDelete(s.id)} />
                    </span>
                  </td>
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan={6} className="empty-state">No students yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
