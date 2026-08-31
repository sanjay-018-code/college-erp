import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ConfirmButton from "../components/ConfirmButton";
import api from "../api/axios";
import { parseFieldErrors } from "../api/errors";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../roles";

const EMPTY_STRUCTURE = { department: "", semester: 1, academic_year: "", tuition_fee: "", hostel_fee: 0, other_fee: 0 };
const EMPTY_PAYMENT = { student: "", fee_structure: "", amount_paid: "", status: "SUCCESS", remarks: "" };

export default function Fees() {
  const { user } = useAuth();
  const isStaff = [ROLES.SUPER_ADMIN, ROLES.DEPT_ADMIN, ROLES.HOD].includes(user?.role);
  const { showError, showSuccess } = useToast();

  const [payments, setPayments] = useState([]);
  const [structures, setStructures] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [showStructureForm, setShowStructureForm] = useState(false);
  const [editingStructureId, setEditingStructureId] = useState(null);
  const [structureForm, setStructureForm] = useState(EMPTY_STRUCTURE);
  const [structureFieldErrors, setStructureFieldErrors] = useState({});
  const [savingStructure, setSavingStructure] = useState(false);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [paymentFieldErrors, setPaymentFieldErrors] = useState({});
  const [savingPayment, setSavingPayment] = useState(false);

  function load() {
    setLoading(true);
    setLoadFailed(false);
    const requests = isStaff
      ? [api.get("/fees/payments/"), api.get("/fees/structures/"), api.get("/academics/departments/"), api.get("/students/profiles/")]
      : [api.get("/fees/payments/"), api.get("/fees/structures/")];
    Promise.all(requests)
      .then(([p, s, d, st]) => {
        setPayments(p.data.results ?? p.data);
        setStructures(s.data.results ?? s.data);
        if (d) setDepartments(d.data.results ?? d.data);
        if (st) setStudents(st.data.results ?? st.data);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, [isStaff]);

  // --- Fee structures ---
  function startCreateStructure() {
    setEditingStructureId(null);
    setStructureForm(EMPTY_STRUCTURE);
    setStructureFieldErrors({});
    setShowStructureForm(true);
  }

  function startEditStructure(s) {
    setEditingStructureId(s.id);
    setStructureForm({
      department: s.department, semester: s.semester, academic_year: s.academic_year,
      tuition_fee: s.tuition_fee, hostel_fee: s.hostel_fee, other_fee: s.other_fee,
    });
    setStructureFieldErrors({});
    setShowStructureForm(true);
  }

  async function handleSubmitStructure(e) {
    e.preventDefault();
    setStructureFieldErrors({});
    setSavingStructure(true);
    try {
      if (editingStructureId) {
        await api.patch(`/fees/structures/${editingStructureId}/`, structureForm, { skipGlobalErrorToast: true });
        showSuccess("Fee structure updated.");
      } else {
        await api.post("/fees/structures/", structureForm, { skipGlobalErrorToast: true });
        showSuccess("Fee structure created.");
      }
      setShowStructureForm(false);
      load();
    } catch (err) {
      setStructureFieldErrors(parseFieldErrors(err));
      showError(err);
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleDeleteStructure(id) {
    try {
      await api.delete(`/fees/structures/${id}/`, { skipGlobalErrorToast: true });
      showSuccess("Fee structure deleted.");
      load();
    } catch (err) {
      showError(err, "Couldn't delete fee structure — it may have payments recorded against it.");
    }
  }

  // --- Payments ---
  function startCreatePayment() {
    setEditingPaymentId(null);
    setPaymentForm(EMPTY_PAYMENT);
    setPaymentFieldErrors({});
    setShowPaymentForm(true);
  }

  function startEditPayment(p) {
    setEditingPaymentId(p.id);
    setPaymentForm({
      student: p.student, fee_structure: p.fee_structure, amount_paid: p.amount_paid,
      status: p.status, remarks: p.remarks || "",
    });
    setPaymentFieldErrors({});
    setShowPaymentForm(true);
  }

  async function handleSubmitPayment(e) {
    e.preventDefault();
    setPaymentFieldErrors({});
    setSavingPayment(true);
    try {
      if (editingPaymentId) {
        await api.patch(`/fees/payments/${editingPaymentId}/`, paymentForm, { skipGlobalErrorToast: true });
        showSuccess("Payment updated.");
      } else {
        await api.post("/fees/payments/", paymentForm, { skipGlobalErrorToast: true });
        showSuccess("Payment recorded.");
      }
      setShowPaymentForm(false);
      load();
    } catch (err) {
      setPaymentFieldErrors(parseFieldErrors(err));
      showError(err);
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleDeletePayment(id) {
    try {
      await api.delete(`/fees/payments/${id}/`, { skipGlobalErrorToast: true });
      showSuccess("Payment record deleted.");
      load();
    } catch (err) {
      showError(err, "Couldn't delete payment record.");
    }
  }

  return (
    <Layout title={isStaff ? "Fees" : "My Fees"}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>{isStaff ? "Fee structures" : "Applicable fee structure"}</div>
          {isStaff && (
            <button className="btn btn-accent" onClick={() => (showStructureForm ? setShowStructureForm(false) : startCreateStructure())}>
              {showStructureForm ? "Cancel" : "+ Add fee structure"}
            </button>
          )}
        </div>

        {isStaff && showStructureForm && (
          <form onSubmit={handleSubmitStructure} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
            <div className="form-grid">
              <div className="field">
                <label>Department</label>
                <select required value={structureForm.department} onChange={(e) => setStructureForm({ ...structureForm, department: e.target.value })}>
                  <option value="">Select department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
                </select>
                {structureFieldErrors.department && <div className="field-error">{structureFieldErrors.department}</div>}
              </div>
              <div className="field">
                <label>Semester</label>
                <input required type="number" min={1} max={12} value={structureForm.semester} onChange={(e) => setStructureForm({ ...structureForm, semester: Number(e.target.value) })} />
                {structureFieldErrors.semester && <div className="field-error">{structureFieldErrors.semester}</div>}
              </div>
              <div className="field">
                <label>Academic year</label>
                <input required placeholder="2026-2027" value={structureForm.academic_year} onChange={(e) => setStructureForm({ ...structureForm, academic_year: e.target.value })} />
                {structureFieldErrors.academic_year && <div className="field-error">{structureFieldErrors.academic_year}</div>}
              </div>
              <div className="field">
                <label>Tuition fee</label>
                <input required type="number" step="0.01" value={structureForm.tuition_fee} onChange={(e) => setStructureForm({ ...structureForm, tuition_fee: e.target.value })} />
                {structureFieldErrors.tuition_fee && <div className="field-error">{structureFieldErrors.tuition_fee}</div>}
              </div>
              <div className="field">
                <label>Hostel fee</label>
                <input required type="number" step="0.01" value={structureForm.hostel_fee} onChange={(e) => setStructureForm({ ...structureForm, hostel_fee: e.target.value })} />
              </div>
              <div className="field">
                <label>Other fee</label>
                <input required type="number" step="0.01" value={structureForm.other_fee} onChange={(e) => setStructureForm({ ...structureForm, other_fee: e.target.value })} />
              </div>
            </div>
            {structureFieldErrors.non_field_errors && <div className="field-error">{structureFieldErrors.non_field_errors}</div>}
            <div className="form-actions">
              <button className="btn" type="submit" disabled={savingStructure}>
                {savingStructure ? "Saving..." : editingStructureId ? "Save changes" : "Create fee structure"}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="empty-state">Loading fee structures...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load fees. Try refreshing the page.</p>}
        {!loading && !loadFailed && (
          <table className="ledger">
            <thead>
              <tr>
                {isStaff && <th>Department</th>}
                <th className="mono">Semester</th><th>Academic year</th><th className="mono">Total</th>
                {isStaff && <th></th>}
              </tr>
            </thead>
            <tbody>
              {structures.map((s) => (
                <tr key={s.id}>
                  {isStaff && <td>{s.department_name}</td>}
                  <td className="mono">{s.semester}</td>
                  <td>{s.academic_year}</td>
                  <td className="mono">₹{s.total}</td>
                  {isStaff && (
                    <td>
                      <span className="row-actions">
                        <button className="btn btn-sm btn-ghost" onClick={() => startEditStructure(s)}>Edit</button>
                        <ConfirmButton onConfirm={() => handleDeleteStructure(s.id)} />
                      </span>
                    </td>
                  )}
                </tr>
              ))}
              {structures.length === 0 && <tr><td colSpan={isStaff ? 5 : 3} className="empty-state">No fee structures yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>{isStaff ? "All payments" : "Your payment history"}</div>
          {isStaff && (
            <button className="btn btn-accent" onClick={() => (showPaymentForm ? setShowPaymentForm(false) : startCreatePayment())}>
              {showPaymentForm ? "Cancel" : "+ Record payment"}
            </button>
          )}
        </div>

        {isStaff && showPaymentForm && (
          <form onSubmit={handleSubmitPayment} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
            <div className="form-grid">
              <div className="field">
                <label>Student</label>
                <select required value={paymentForm.student} onChange={(e) => setPaymentForm({ ...paymentForm, student: e.target.value })}>
                  <option value="">Select student</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.roll_number} - {s.full_name}</option>)}
                </select>
                {paymentFieldErrors.student && <div className="field-error">{paymentFieldErrors.student}</div>}
              </div>
              <div className="field">
                <label>Fee structure</label>
                <select required value={paymentForm.fee_structure} onChange={(e) => setPaymentForm({ ...paymentForm, fee_structure: e.target.value })}>
                  <option value="">Select fee structure</option>
                  {structures.map((s) => <option key={s.id} value={s.id}>{s.department_name} Sem{s.semester} {s.academic_year} (₹{s.total})</option>)}
                </select>
                {paymentFieldErrors.fee_structure && <div className="field-error">{paymentFieldErrors.fee_structure}</div>}
              </div>
              <div className="field">
                <label>Amount paid</label>
                <input required type="number" step="0.01" value={paymentForm.amount_paid} onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })} />
                {paymentFieldErrors.amount_paid && <div className="field-error">{paymentFieldErrors.amount_paid}</div>}
              </div>
              <div className="field">
                <label>Status</label>
                <select value={paymentForm.status} onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}>
                  <option value="SUCCESS">Success</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Remarks (e.g. receipt no., mode of payment)</label>
                <input value={paymentForm.remarks} onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={savingPayment}>
                {savingPayment ? "Saving..." : editingPaymentId ? "Save changes" : "Record payment"}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="empty-state">Loading payments...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load payments. Try refreshing the page.</p>}
        {!loading && !loadFailed && (
          <table className="ledger">
            <thead>
              <tr>
                {isStaff && <th>Student</th>}
                <th className="mono">Amount</th><th>Status</th><th>Remarks</th><th className="mono">Date</th>
                {isStaff && <th></th>}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  {isStaff && <td>{p.student_name} <span className="mono" style={{ color: "var(--muted)" }}>({p.roll_number})</span></td>}
                  <td className="mono">₹{p.amount_paid}</td>
                  <td><span className={`badge badge-${p.status === "SUCCESS" ? "success" : p.status === "FAILED" ? "danger" : "pending"}`}>{p.status}</span></td>
                  <td>{p.remarks}</td>
                  <td className="mono">{p.paid_at?.slice(0, 10) || p.created_at?.slice(0, 10)}</td>
                  {isStaff && (
                    <td>
                      <span className="row-actions">
                        <button className="btn btn-sm btn-ghost" onClick={() => startEditPayment(p)}>Edit</button>
                        <ConfirmButton onConfirm={() => handleDeletePayment(p.id)} />
                      </span>
                    </td>
                  )}
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={isStaff ? 6 : 4} className="empty-state">No payments yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
