import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ConfirmButton from "../components/ConfirmButton";
import api from "../api/axios";
import { parseFieldErrors } from "../api/errors";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../roles";

const EMPTY_FORM = { title: "", body: "", audience: "ALL", is_urgent: false };

export default function Notices() {
  const { user } = useAuth();
  const canPost = [ROLES.SUPER_ADMIN, ROLES.DEPT_ADMIN, ROLES.HOD, ROLES.ADVISOR, ROLES.FACULTY].includes(user?.role);
  const { showError, showSuccess } = useToast();

  const [notices, setNotices] = useState([]);
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
    api.get("/notices/")
      .then(({ data }) => setNotices(data.results ?? data))
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

  function startEdit(n) {
    setEditingId(n.id);
    setForm({ title: n.title, body: n.body, audience: n.audience, is_urgent: n.is_urgent });
    setFieldErrors({});
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/notices/${editingId}/`, form, { skipGlobalErrorToast: true });
        showSuccess("Notice updated.");
      } else {
        await api.post("/notices/", form, { skipGlobalErrorToast: true });
        showSuccess("Notice posted.");
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
      await api.delete(`/notices/${id}/`, { skipGlobalErrorToast: true });
      showSuccess("Notice deleted.");
      load();
    } catch (err) {
      showError(err, "Couldn't delete notice.");
    }
  }

  return (
    <Layout title="Notices">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>Announcements</div>
          {canPost && (
            <button className="btn btn-accent" onClick={() => (showForm ? setShowForm(false) : startCreate())}>
              {showForm ? "Cancel" : "+ Post notice"}
            </button>
          )}
        </div>

        {canPost && showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
            <div className="field">
              <label>Title</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              {fieldErrors.title && <div className="field-error">{fieldErrors.title}</div>}
            </div>
            <div className="field">
              <label>Body</label>
              <textarea required rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              {fieldErrors.body && <div className="field-error">{fieldErrors.body}</div>}
            </div>
            <div className="field">
              <label>Audience</label>
              <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                <option value="ALL">Everyone</option>
                <option value="STUDENTS">Students only</option>
                <option value="FACULTY">Faculty only</option>
                <option value="STAFF">All staff (teaching & non-teaching)</option>
                <option value="PARENTS">Parents only</option>
              </select>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, fontSize: "0.88rem" }}>
              <input type="checkbox" checked={form.is_urgent} onChange={(e) => setForm({ ...form, is_urgent: e.target.checked })} />
              Mark as urgent
            </label>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Save changes" : "Post"}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="empty-state">Loading notices...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load notices. Try refreshing the page.</p>}
        {!loading && !loadFailed && notices.map((n) => (
          <div key={n.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <strong>{n.title}</strong>
                {n.is_urgent && <span className="badge badge-danger">Urgent</span>}
                <span className="badge badge-pending">{n.audience}</span>
              </div>
              {canPost && (
                <span className="row-actions">
                  <button className="btn btn-sm btn-ghost" onClick={() => startEdit(n)}>Edit</button>
                  <ConfirmButton onConfirm={() => handleDelete(n.id)} />
                </span>
              )}
            </div>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{n.body}</p>
            <span className="mono" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              {n.posted_by_name} · {n.created_at?.slice(0, 10)}
            </span>
          </div>
        ))}
        {!loading && !loadFailed && notices.length === 0 && <p className="empty-state">No notices posted yet.</p>}
      </div>
    </Layout>
  );
}
