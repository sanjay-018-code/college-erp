import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ConfirmButton from "../components/ConfirmButton";
import api from "../api/axios";
import { parseFieldErrors } from "../api/errors";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../roles";

const MATERIAL_TYPES = ["SYLLABUS", "NOTES", "ASSIGNMENT", "VIDEO", "OTHER"];
const EMPTY_FORM = { course: "", title: "", material_type: "NOTES", external_link: "" };

export default function CourseMaterials() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const canUpload = [ROLES.SUPER_ADMIN, ROLES.DEPT_ADMIN, ROLES.HOD, ROLES.FACULTY, ROLES.ADVISOR].includes(user?.role);

  const [materials, setMaterials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setLoadFailed(false);
    Promise.all([
      api.get("/academics/materials/"),
      api.get("/academics/courses/"),
    ])
      .then(([m, c]) => {
        setMaterials(m.data.results ?? m.data);
        setCourses(c.data.results ?? c.data);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    setSaving(true);
    try {
      await api.post("/academics/materials/", form, { skipGlobalErrorToast: true });
      showSuccess("Material shared with the class.");
      setShowForm(false);
      setForm(EMPTY_FORM);
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
      await api.delete(`/academics/materials/${id}/`, { skipGlobalErrorToast: true });
      showSuccess("Material removed.");
      load();
    } catch (err) {
      showError(err);
    }
  }

  return (
    <Layout title="Course Materials">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>Syllabus, notes & assignments</div>
          {canUpload && (
            <button className="btn btn-accent" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ Share material"}
            </button>
          )}
        </div>

        {showForm && canUpload && (
          <form onSubmit={handleSubmit} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
            <div className="form-grid">
              <div className="field">
                <label>Course</label>
                <select required value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
                {fieldErrors.course && <div className="field-error">{fieldErrors.course}</div>}
              </div>
              <div className="field">
                <label>Type</label>
                <select value={form.material_type} onChange={(e) => setForm({ ...form, material_type: e.target.value })}>
                  {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Title</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                {fieldErrors.title && <div className="field-error">{fieldErrors.title}</div>}
              </div>
              <div className="field">
                <label>Link (video / external doc)</label>
                <input type="url" placeholder="https://..." value={form.external_link} onChange={(e) => setForm({ ...form, external_link: e.target.value })} />
                {fieldErrors.external_link && <div className="field-error">{fieldErrors.external_link}</div>}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>{saving ? "Sharing..." : "Share with class"}</button>
            </div>
          </form>
        )}

        {loading && <p className="empty-state">Loading materials...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load course materials.</p>}
        {!loading && !loadFailed && (
          <table className="ledger">
            <thead>
              <tr><th className="mono">Course</th><th>Title</th><th>Type</th><th>Link</th><th>Shared by</th><th>Date</th>{canUpload && <th></th>}</tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id}>
                  <td className="mono">{m.course_code}</td>
                  <td>{m.title}</td>
                  <td><span className="badge badge-pending">{m.material_type}</span></td>
                  <td>{m.external_link ? <a href={m.external_link} target="_blank" rel="noreferrer">Open</a> : (m.file ? <a href={m.file} target="_blank" rel="noreferrer">Download</a> : "—")}</td>
                  <td>{m.uploaded_by_name || "—"}</td>
                  <td className="mono">{new Date(m.uploaded_on).toLocaleDateString()}</td>
                  {canUpload && <td><ConfirmButton onConfirm={() => handleDelete(m.id)} /></td>}
                </tr>
              ))}
              {materials.length === 0 && <tr><td colSpan={canUpload ? 7 : 6} className="empty-state">No materials shared yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
