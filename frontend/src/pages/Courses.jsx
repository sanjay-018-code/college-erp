import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ConfirmButton from "../components/ConfirmButton";
import api from "../api/axios";
import { parseFieldErrors } from "../api/errors";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../roles";

const EMPTY_FORM = { name: "", code: "", department: "", semester: 1, credits: 3, faculty: "", description: "" };

export default function Courses() {
  const { user } = useAuth();
  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.DEPT_ADMIN, ROLES.HOD].includes(user?.role);
  const { showError, showSuccess } = useToast();
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
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
    const requests = isAdmin
      ? [api.get("/academics/courses/"), api.get("/academics/departments/"), api.get("/faculty/profiles/")]
      : [api.get("/academics/courses/")];
    Promise.all(requests)
      .then(([c, d, f]) => {
        setCourses(c.data.results ?? c.data);
        if (d) setDepartments(d.data.results ?? d.data);
        if (f) setFaculty(f.data.results ?? f.data);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, [isAdmin]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setShowForm(true);
  }

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      name: c.name, code: c.code, department: c.department, semester: c.semester,
      credits: c.credits, faculty: c.faculty || "", description: c.description || "",
    });
    setFieldErrors({});
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    setSaving(true);
    const payload = { ...form, faculty: form.faculty || null };
    try {
      if (editingId) {
        await api.patch(`/academics/courses/${editingId}/`, payload, { skipGlobalErrorToast: true });
        showSuccess("Course updated.");
      } else {
        await api.post("/academics/courses/", payload, { skipGlobalErrorToast: true });
        showSuccess("Course created.");
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
      await api.delete(`/academics/courses/${id}/`, { skipGlobalErrorToast: true });
      showSuccess("Course deleted.");
      load();
    } catch (err) {
      showError(err, "Couldn't delete course — it may have enrollments, exams, or attendance records attached.");
    }
  }

  return (
    <Layout title="Courses">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>Course catalog</div>
          {isAdmin && (
            <button className="btn btn-accent" onClick={() => (showForm ? setShowForm(false) : startCreate())}>
              {showForm ? "Cancel" : "+ Add course"}
            </button>
          )}
        </div>

        {isAdmin && showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
            <div className="form-grid">
              <div className="field">
                <label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
              </div>
              <div className="field">
                <label>Code</label>
                <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                {fieldErrors.code && <div className="field-error">{fieldErrors.code}</div>}
              </div>
              <div className="field">
                <label>Department</label>
                <select required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="">Select department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
                </select>
                {fieldErrors.department && <div className="field-error">{fieldErrors.department}</div>}
              </div>
              <div className="field">
                <label>Semester</label>
                <input required type="number" min={1} max={12} value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} />
                {fieldErrors.semester && <div className="field-error">{fieldErrors.semester}</div>}
              </div>
              <div className="field">
                <label>Credits</label>
                <input required type="number" min={1} max={10} value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
                {fieldErrors.credits && <div className="field-error">{fieldErrors.credits}</div>}
              </div>
              <div className="field">
                <label>Faculty (optional)</label>
                <select value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })}>
                  <option value="">Unassigned</option>
                  {faculty.map((f) => <option key={f.id} value={f.id}>{f.full_name} ({f.employee_id})</option>)}
                </select>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Description (optional)</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Save changes" : "Create course"}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="empty-state">Loading courses...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load courses. Try refreshing the page.</p>}
        {!loading && !loadFailed && (
          <table className="ledger">
            <thead>
              <tr>
                <th className="mono">Code</th><th>Name</th><th>Department</th>
                <th className="mono">Sem</th><th className="mono">Credits</th><th>Faculty</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.code}</td>
                  <td>{c.name}</td>
                  <td>{c.department_name}</td>
                  <td className="mono">{c.semester}</td>
                  <td className="mono">{c.credits}</td>
                  <td>{c.faculty_name || "—"}</td>
                  {isAdmin && (
                    <td>
                      <span className="row-actions">
                        <button className="btn btn-sm btn-ghost" onClick={() => startEdit(c)}>Edit</button>
                        <ConfirmButton onConfirm={() => handleDelete(c.id)} />
                      </span>
                    </td>
                  )}
                </tr>
              ))}
              {courses.length === 0 && <tr><td colSpan={isAdmin ? 7 : 6} className="empty-state">No courses yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
