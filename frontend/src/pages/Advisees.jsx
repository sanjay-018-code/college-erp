import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ConfirmButton from "../components/ConfirmButton";
import api from "../api/axios";
import { parseFieldErrors } from "../api/errors";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../roles";

const CURRENT_YEAR = new Date().getFullYear();
const EMPTY_FORM = { advisor: "", student: "", academic_year: CURRENT_YEAR, remarks: "" };

export default function Advisees() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const canAssign = [ROLES.SUPER_ADMIN, ROLES.DEPT_ADMIN, ROLES.HOD].includes(user?.role);

  const [assignments, setAssignments] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setLoadFailed(false);
    const calls = [api.get("/students/advisor-assignments/")];
    if (canAssign) {
      calls.push(api.get("/faculty/profiles/?user__role=ADVISOR"), api.get("/students/profiles/"));
    }
    Promise.all(calls)
      .then(([a, adv, s]) => {
        setAssignments(a.data.results ?? a.data);
        if (canAssign) {
          setAdvisors(adv.data.results ?? adv.data);
          setStudents(s.data.results ?? s.data);
        }
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
      await api.post("/students/advisor-assignments/", form, { skipGlobalErrorToast: true });
      showSuccess("Advisor assigned.");
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
      await api.delete(`/students/advisor-assignments/${id}/`, { skipGlobalErrorToast: true });
      showSuccess("Advisor assignment removed.");
      load();
    } catch (err) {
      showError(err);
    }
  }

  const title = user?.role === ROLES.ADVISOR ? "My Advisees" : "Advisor Assignments";

  return (
    <Layout title={title}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>
            {user?.role === ROLES.ADVISOR ? "Students you are mentoring" : "All advisor assignments"}
          </div>
          {canAssign && (
            <button className="btn btn-accent" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ Assign advisor"}
            </button>
          )}
        </div>

        {showForm && canAssign && (
          <form onSubmit={handleSubmit} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
            <div className="form-grid">
              <div className="field">
                <label>Advisor</label>
                <select required value={form.advisor} onChange={(e) => setForm({ ...form, advisor: e.target.value })}>
                  <option value="">Select advisor</option>
                  {advisors.map((a) => <option key={a.id} value={a.id}>{a.full_name} ({a.employee_id})</option>)}
                </select>
                {fieldErrors.advisor && <div className="field-error">{fieldErrors.advisor}</div>}
              </div>
              <div className="field">
                <label>Student</label>
                <select required value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
                  <option value="">Select student</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.roll_number})</option>)}
                </select>
                {fieldErrors.student && <div className="field-error">{fieldErrors.student}</div>}
              </div>
              <div className="field">
                <label>Academic year</label>
                <input type="number" required value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
                {fieldErrors.academic_year && <div className="field-error">{fieldErrors.academic_year}</div>}
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Remarks (optional)</label>
                <textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Assign"}</button>
            </div>
          </form>
        )}

        {loading && <p className="empty-state">Loading...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load advisor assignments.</p>}
        {!loading && !loadFailed && (
          <table className="ledger">
            <thead>
              <tr><th className="mono">Roll No.</th><th>Student</th><th>Advisor</th><th className="mono">Year</th><th>Remarks</th>{canAssign && <th></th>}</tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.roll_number}</td>
                  <td>{a.student_name}</td>
                  <td>{a.advisor_name}</td>
                  <td className="mono">{a.academic_year}</td>
                  <td>{a.remarks || "—"}</td>
                  {canAssign && (
                    <td><ConfirmButton onConfirm={() => handleDelete(a.id)} /></td>
                  )}
                </tr>
              ))}
              {assignments.length === 0 && <tr><td colSpan={canAssign ? 6 : 5} className="empty-state">No advisor assignments yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
