import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ConfirmButton from "../components/ConfirmButton";
import api from "../api/axios";
import { parseFieldErrors } from "../api/errors";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../roles";

const EMPTY_EXAM = { course: "", name: "", exam_type: "MIDTERM", date: "", max_marks: 100, weightage_percent: 100 };
const EMPTY_GRADE = { exam: "", student: "", marks_obtained: "", remarks: "" };

export default function Grades() {
  const { user } = useAuth();
  const isStaff = [ROLES.SUPER_ADMIN, ROLES.DEPT_ADMIN, ROLES.HOD, ROLES.ADVISOR, ROLES.FACULTY].includes(user?.role);
  const { showError, showSuccess } = useToast();

  const [grades, setGrades] = useState([]);
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [showExamForm, setShowExamForm] = useState(false);
  const [examForm, setExamForm] = useState(EMPTY_EXAM);
  const [examFieldErrors, setExamFieldErrors] = useState({});
  const [savingExam, setSavingExam] = useState(false);

  const [showGradeForm, setShowGradeForm] = useState(false);
  const [editingGradeId, setEditingGradeId] = useState(null);
  const [gradeForm, setGradeForm] = useState(EMPTY_GRADE);
  const [gradeFieldErrors, setGradeFieldErrors] = useState({});
  const [savingGrade, setSavingGrade] = useState(false);

  function load() {
    setLoading(true);
    setLoadFailed(false);
    const requests = isStaff
      ? [api.get("/exams/grades/"), api.get("/exams/exams/"), api.get("/academics/courses/"), api.get("/students/profiles/")]
      : [api.get("/exams/grades/")];
    Promise.all(requests)
      .then(([g, e, c, s]) => {
        setGrades(g.data.results ?? g.data);
        if (e) setExams(e.data.results ?? e.data);
        if (c) setCourses(c.data.results ?? c.data);
        if (s) setStudents(s.data.results ?? s.data);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, [isStaff]);

  async function handleCreateExam(e) {
    e.preventDefault();
    setExamFieldErrors({});
    setSavingExam(true);
    try {
      await api.post("/exams/exams/", examForm, { skipGlobalErrorToast: true });
      showSuccess("Exam created.");
      setShowExamForm(false);
      setExamForm(EMPTY_EXAM);
      load();
    } catch (err) {
      setExamFieldErrors(parseFieldErrors(err));
      showError(err);
    } finally {
      setSavingExam(false);
    }
  }

  function startCreateGrade() {
    setEditingGradeId(null);
    setGradeForm(EMPTY_GRADE);
    setGradeFieldErrors({});
    setShowGradeForm(true);
  }

  function startEditGrade(g) {
    setEditingGradeId(g.id);
    setGradeForm({ exam: g.exam, student: g.student, marks_obtained: g.marks_obtained, remarks: g.remarks || "" });
    setGradeFieldErrors({});
    setShowGradeForm(true);
  }

  async function handleSubmitGrade(e) {
    e.preventDefault();
    setGradeFieldErrors({});
    setSavingGrade(true);
    try {
      if (editingGradeId) {
        await api.patch(`/exams/grades/${editingGradeId}/`, gradeForm, { skipGlobalErrorToast: true });
        showSuccess("Grade updated.");
      } else {
        await api.post("/exams/grades/", gradeForm, { skipGlobalErrorToast: true });
        showSuccess("Grade recorded.");
      }
      setShowGradeForm(false);
      load();
    } catch (err) {
      setGradeFieldErrors(parseFieldErrors(err));
      showError(err);
    } finally {
      setSavingGrade(false);
    }
  }

  async function handleDeleteGrade(id) {
    try {
      await api.delete(`/exams/grades/${id}/`, { skipGlobalErrorToast: true });
      showSuccess("Grade deleted.");
      load();
    } catch (err) {
      showError(err, "Couldn't delete grade.");
    }
  }

  return (
    <Layout title={isStaff ? "Exams & Grades" : "My Grades"}>
      {isStaff && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="card-title" style={{ margin: 0 }}>Exams</div>
            <button className="btn btn-accent" onClick={() => setShowExamForm((v) => !v)}>
              {showExamForm ? "Cancel" : "+ Add exam"}
            </button>
          </div>
          {showExamForm && (
            <form onSubmit={handleCreateExam} style={{ marginBottom: 14 }}>
              <div className="form-grid">
                <div className="field">
                  <label>Course</label>
                  <select required value={examForm.course} onChange={(e) => setExamForm({ ...examForm, course: e.target.value })}>
                    <option value="">Select course</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                  </select>
                  {examFieldErrors.course && <div className="field-error">{examFieldErrors.course}</div>}
                </div>
                <div className="field">
                  <label>Exam name</label>
                  <input required value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} />
                  {examFieldErrors.name && <div className="field-error">{examFieldErrors.name}</div>}
                </div>
                <div className="field">
                  <label>Type</label>
                  <select value={examForm.exam_type} onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}>
                    <option value="MIDTERM">Midterm</option>
                    <option value="FINAL">Final</option>
                    <option value="QUIZ">Quiz</option>
                    <option value="ASSIGNMENT">Assignment</option>
                  </select>
                </div>
                <div className="field">
                  <label>Date</label>
                  <input required type="date" value={examForm.date} onChange={(e) => setExamForm({ ...examForm, date: e.target.value })} />
                  {examFieldErrors.date && <div className="field-error">{examFieldErrors.date}</div>}
                </div>
                <div className="field">
                  <label>Max marks</label>
                  <input required type="number" value={examForm.max_marks} onChange={(e) => setExamForm({ ...examForm, max_marks: e.target.value })} />
                </div>
                <div className="field">
                  <label>Weightage %</label>
                  <input required type="number" value={examForm.weightage_percent} onChange={(e) => setExamForm({ ...examForm, weightage_percent: e.target.value })} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn" type="submit" disabled={savingExam}>{savingExam ? "Saving..." : "Create exam"}</button>
              </div>
            </form>
          )}
          <table className="ledger">
            <thead><tr><th>Exam</th><th>Course</th><th>Type</th><th className="mono">Date</th><th className="mono">Max marks</th></tr></thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td><td className="mono">{e.course_code}</td><td>{e.exam_type}</td>
                  <td className="mono">{e.date}</td><td className="mono">{e.max_marks}</td>
                </tr>
              ))}
              {exams.length === 0 && <tr><td colSpan={5} className="empty-state">No exams yet — add one above before recording grades.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>{isStaff ? "Recorded grades" : "Your grades"}</div>
          {isStaff && (
            <button className="btn btn-accent" onClick={() => (showGradeForm ? setShowGradeForm(false) : startCreateGrade())}>
              {showGradeForm ? "Cancel" : "+ Record grade"}
            </button>
          )}
        </div>

        {isStaff && showGradeForm && (
          <form onSubmit={handleSubmitGrade} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
            <div className="form-grid">
              <div className="field">
                <label>Exam</label>
                <select required value={gradeForm.exam} onChange={(e) => setGradeForm({ ...gradeForm, exam: e.target.value })}>
                  <option value="">Select exam</option>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.course_code} - {e.name}</option>)}
                </select>
                {gradeFieldErrors.exam && <div className="field-error">{gradeFieldErrors.exam}</div>}
              </div>
              <div className="field">
                <label>Student</label>
                <select required value={gradeForm.student} onChange={(e) => setGradeForm({ ...gradeForm, student: e.target.value })}>
                  <option value="">Select student</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.roll_number} - {s.full_name}</option>)}
                </select>
                {gradeFieldErrors.student && <div className="field-error">{gradeFieldErrors.student}</div>}
              </div>
              <div className="field">
                <label>Marks obtained</label>
                <input required type="number" step="0.01" value={gradeForm.marks_obtained} onChange={(e) => setGradeForm({ ...gradeForm, marks_obtained: e.target.value })} />
                {gradeFieldErrors.marks_obtained && <div className="field-error">{gradeFieldErrors.marks_obtained}</div>}
              </div>
              <div className="field">
                <label>Remarks (optional)</label>
                <input value={gradeForm.remarks} onChange={(e) => setGradeForm({ ...gradeForm, remarks: e.target.value })} />
              </div>
            </div>
            {gradeFieldErrors.non_field_errors && <div className="field-error">{gradeFieldErrors.non_field_errors}</div>}
            <div className="form-actions">
              <button className="btn" type="submit" disabled={savingGrade}>
                {savingGrade ? "Saving..." : editingGradeId ? "Save changes" : "Record grade"}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="empty-state">Loading grades...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load grades. Try refreshing the page.</p>}
        {!loading && !loadFailed && (
          <table className="ledger">
            <thead>
              <tr>
                {isStaff && <th>Student</th>}
                <th>Exam</th><th className="mono">Marks</th><th className="mono">Max</th><th>Remarks</th>
                {isStaff && <th></th>}
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.id}>
                  {isStaff && <td>{g.student_name} <span className="mono" style={{ color: "var(--muted)" }}>({g.roll_number})</span></td>}
                  <td>{g.exam_name}</td>
                  <td className="mono">{g.marks_obtained}</td>
                  <td className="mono">{g.max_marks}</td>
                  <td>{g.remarks}</td>
                  {isStaff && (
                    <td>
                      <span className="row-actions">
                        <button className="btn btn-sm btn-ghost" onClick={() => startEditGrade(g)}>Edit</button>
                        <ConfirmButton onConfirm={() => handleDeleteGrade(g.id)} />
                      </span>
                    </td>
                  )}
                </tr>
              ))}
              {grades.length === 0 && <tr><td colSpan={isStaff ? 6 : 4} className="empty-state">No grades recorded yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
