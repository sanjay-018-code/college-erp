import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ROLES } from "../roles";

export default function Attendance() {
  const { user } = useAuth();
  const isStaff = [ROLES.SUPER_ADMIN, ROLES.DEPT_ADMIN, ROLES.HOD, ROLES.ADVISOR, ROLES.FACULTY].includes(user?.role);
  const { showError, showSuccess } = useToast();

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [myRecords, setMyRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadFailed(false);
    const req = isStaff ? api.get("/academics/courses/") : api.get("/attendance/records/");
    req
      .then(({ data }) => {
        if (isStaff) setCourses(data.results ?? data);
        else setMyRecords(data.results ?? data);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [isStaff]);

  useEffect(() => {
    if (!selectedCourse) {
      setRoster([]);
      setStatusMap({});
      return;
    }
    setRosterLoading(true);
    Promise.all([
      api.get(`/students/enrollments/?course=${selectedCourse}`),
      api.get(`/attendance/records/?course=${selectedCourse}&date=${date}`),
    ])
      .then(([enrollRes, existingRes]) => {
        const list = enrollRes.data.results ?? enrollRes.data;
        const existing = existingRes.data.results ?? existingRes.data;
        setRoster(list);
        const existingByStudent = {};
        existing.forEach((r) => { existingByStudent[r.student] = r.status; });
        const init = {};
        list.forEach((e) => { init[e.student] = existingByStudent[e.student] || "PRESENT"; });
        setStatusMap(init);
      })
      .catch((err) => showError(err, "Couldn't load the class roster."))
      .finally(() => setRosterLoading(false));
  }, [selectedCourse, date]);

  async function submitAttendance() {
    setSaving(true);
    const records = Object.entries(statusMap).map(([student, status]) => ({ student: Number(student), status }));
    try {
      const { data } = await api.post(
        "/attendance/bulk-mark/",
        { course: Number(selectedCourse), date, records },
        { skipGlobalErrorToast: true }
      );
      showSuccess(data.detail || "Attendance saved.");
    } catch (err) {
      showError(err, "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  }

  if (!isStaff) {
    return (
      <Layout title="My Attendance">
        <div className="card">
          <div className="card-title">Attendance history</div>
          {loading && <p className="empty-state">Loading attendance...</p>}
          {!loading && loadFailed && <p className="empty-state">Couldn't load attendance. Try refreshing the page.</p>}
          {!loading && !loadFailed && (
            <table className="ledger">
              <thead><tr><th className="mono">Date</th><th>Course</th><th>Status</th></tr></thead>
              <tbody>
                {myRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.date}</td>
                    <td>{r.course_code}</td>
                    <td><span className={`badge badge-${r.status === "PRESENT" ? "present" : "absent"}`}>{r.status}</span></td>
                  </tr>
                ))}
                {myRecords.length === 0 && <tr><td colSpan={3} className="empty-state">No attendance recorded yet.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Mark Attendance">
      <div className="card">
        {loading && <p className="empty-state">Loading courses...</p>}
        {!loading && loadFailed && <p className="empty-state">Couldn't load courses. Try refreshing the page.</p>}
        {!loading && !loadFailed && (
          <>
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <div className="field" style={{ minWidth: 220 }}>
                <label>Course</label>
                <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                  <option value="">Select a course...</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            {rosterLoading && <p className="empty-state">Loading roster...</p>}

            {!rosterLoading && selectedCourse && roster.length === 0 && (
              <p className="empty-state">No students are enrolled in this course yet.</p>
            )}

            {!rosterLoading && roster.length > 0 && (
              <>
                <table className="ledger">
                  <thead><tr><th className="mono">Roll No.</th><th>Name</th><th>Status</th></tr></thead>
                  <tbody>
                    {roster.map((e) => (
                      <tr key={e.student}>
                        <td className="mono">{e.roll_number}</td>
                        <td>{e.student_name}</td>
                        <td>
                          <select
                            value={statusMap[e.student] || "PRESENT"}
                            onChange={(ev) => setStatusMap({ ...statusMap, [e.student]: ev.target.value })}
                          >
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="LATE">Late</option>
                            <option value="EXCUSED">Excused</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="btn btn-accent" style={{ marginTop: 16 }} onClick={submitAttendance} disabled={saving}>
                  {saving ? "Saving..." : "Save attendance"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
