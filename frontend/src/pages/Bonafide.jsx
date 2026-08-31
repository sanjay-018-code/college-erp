import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../roles";

const STATUS_BADGE = { PENDING: "badge-pending", APPROVED: "badge-success", REJECTED: "badge-danger" };

export default function Bonafide() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const canProcess = [ROLES.SUPER_ADMIN, ROLES.DEPT_ADMIN, ROLES.HOD].includes(user?.role);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  function load() {
    setLoading(true);
    setLoadFailed(false);
    api.get("/students/bonafide-requests/")
      .then((res) => setRequests(res.data.results ?? res.data))
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleRequest(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/students/bonafide-requests/", { purpose }, { skipGlobalErrorToast: true });
      showSuccess("Bonafide request submitted.");
      setPurpose("");
      load();
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(id, action) {
    setProcessingId(id);
    try {
      await api.post(`/students/bonafide-requests/${id}/${action}/`, {}, { skipGlobalErrorToast: true });
      showSuccess(action === "approve" ? "Request approved." : "Request rejected.");
      load();
    } catch (err) {
      showError(err);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <Layout title="Bonafide Requests">
      {user?.role === ROLES.STUDENT && (
        <div className="card">
          <div className="card-title">Request a bonafide certificate</div>
          <form onSubmit={handleRequest} style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Purpose</label>
              <input required placeholder="e.g. Bank loan, passport application, bus pass"
                value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <button className="btn btn-accent" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit request"}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          {canProcess ? "Bonafide requests for your department" : "Your bonafide requests"}
        </div>
        {loading && <p className="empty-state">Loading requests...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load requests.</p>}
        {!loading && !loadFailed && (
          <table className="ledger">
            <thead>
              <tr>
                <th className="mono">Roll No.</th>
                {canProcess && <th>Student</th>}
                <th>Purpose</th><th>Status</th><th>Requested on</th><th>Processed by</th>{canProcess && <th></th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.roll_number}</td>
                  {canProcess && <td>{r.student_name}</td>}
                  <td>{r.purpose}</td>
                  <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span></td>
                  <td className="mono">{new Date(r.requested_on).toLocaleDateString()}</td>
                  <td>{r.processed_by_name || "—"}</td>
                  {canProcess && (
                    <td>
                      {r.status === "PENDING" ? (
                        <span className="row-actions">
                          <button className="btn btn-sm" disabled={processingId === r.id} onClick={() => handleDecision(r.id, "approve")}>Approve</button>
                          <button className="btn btn-sm btn-ghost" disabled={processingId === r.id} onClick={() => handleDecision(r.id, "reject")}>Reject</button>
                        </span>
                      ) : "—"}
                    </td>
                  )}
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={canProcess ? 7 : 5} className="empty-state">No bonafide requests yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
