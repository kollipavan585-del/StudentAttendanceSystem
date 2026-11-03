
import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function getToday() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function Dashboard({ user, onLogout }) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [attendanceDraft, setAttendanceDraft] = useState({});
  const [attendanceDate, setAttendanceDate] = useState(getToday);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    rollNumber: "",
    course: "",
    year: "3",
  });

  const authorizedFetch = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.status === 401) {
      onLogout();
      throw new Error("Your session has expired. Please sign in again.");
    }

    return response;
  }, [onLogout]);

  const loadStudents = useCallback(async () => {
    try {
      const response = await authorizedFetch(`${API_URL}/students`);
      if (!response.ok) throw new Error("Unable to load students");
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      setMessage(error.message || "Cannot connect to backend. Check that the server is running.");
    }
  }, [authorizedFetch]);

  useEffect(() => {
    let active = true;

    authorizedFetch(`${API_URL}/students`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load students");
        return response.json();
      })
      .then((data) => {
        if (active) setStudents(data);
      })
      .catch((error) => {
        if (active) {
          setMessage(error.message || "Cannot connect to backend. Check that the server is running.");
        }
      });

    return () => {
      active = false;
    };
  }, [authorizedFetch]);

  useEffect(() => {
    let active = true;

    authorizedFetch(
      `${API_URL}/attendance?date=${encodeURIComponent(attendanceDate)}`
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to load attendance.");
        }
        return data;
      })
      .then((data) => {
        if (active) {
          setAttendance(
            Object.fromEntries(
              data
                .filter((record) => record.student)
                .map((record) => [record.student._id, record.status])
            )
          );
          setAttendanceDraft({});
          setAttendanceMessage("");
        }
      })
      .catch((error) => {
        if (active) {
          setAttendanceMessage(error.message || "Unable to load attendance.");
        }
      });

    return () => {
      active = false;
    };
  }, [attendanceDate, authorizedFetch]);

  function updateAttendance(studentId, status) {
    setAttendanceMessage("");
    setAttendanceDraft((current) => ({ ...current, [studentId]: status }));
  }

  async function submitAttendance() {
    const changes = Object.entries(attendanceDraft).filter(
      ([studentId, status]) => attendance[studentId] !== status
    );

    if (changes.length === 0) {
      setAttendanceMessage("Mark attendance for at least one student before submitting.");
      return;
    }

    setSubmittingAttendance(true);
    setAttendanceMessage("");

    const results = await Promise.allSettled(
      changes.map(async ([studentId, status]) => {
        const response = await authorizedFetch(
          `${API_URL}/attendance/${studentId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: attendanceDate, status }),
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Could not save attendance.");
        }
        return { studentId, status };
      })
    );

    const saved = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    if (saved.length > 0) {
      setAttendance((current) => ({
        ...current,
        ...Object.fromEntries(saved.map(({ studentId, status }) => [studentId, status])),
      }));
      setAttendanceDraft((current) => {
        const remaining = { ...current };
        saved.forEach(({ studentId }) => delete remaining[studentId]);
        return remaining;
      });
    }

    const failed = results.length - saved.length;
    setAttendanceMessage(
      failed === 0
        ? `Attendance submitted for ${saved.length} student${saved.length === 1 ? "" : "s"}.`
        : `Attendance saved for ${saved.length} student${saved.length === 1 ? "" : "s"}; ${failed} failed. Please retry.`
    );
    setSubmittingAttendance(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await authorizedFetch(`${API_URL}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not add student");
      }

      setMessage("Student added successfully!");
      setForm({
        name: "",
        rollNumber: "",
        course: "",
        year: "3",
      });
      await loadStudents();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteStudent(id) {
    if (!window.confirm("Are you sure you want to delete this student?")) {
      return;
    }

    try {
      const response = await authorizedFetch(`${API_URL}/students/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Delete failed");

      setMessage("Student deleted successfully!");
      await loadStudents();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.rollNumber}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const submittedAttendance = students.filter(
    (student) => attendance[student._id]
  );

  return (
    <main className="app-container">
      <header className="app-header">
        <div>
          <p className="eyebrow">ATTENDANCE MANAGEMENT</p>
          <h1>Student Attendance</h1>
          <p>Welcome, {user.name}. Track attendance and manage student records.</p>
        </div>
        <div className="header-actions">
          <div className="student-count">
            <span>Total Students</span>
            <strong>{students.length}</strong>
          </div>
          <button className="logout-button" onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      </header>

      {message && <div className="message">{message}</div>}

      <section className="panel">
        <div className="list-header">
          <div>
            <h2>Daily Attendance</h2>
            <p>Choose a date and record each student as present, absent, or late.</p>
          </div>
          <label className="date-field">
            Attendance date
            <input
              type="date"
              value={attendanceDate}
              disabled={submittingAttendance}
              onChange={(event) => setAttendanceDate(event.target.value)}
            />
          </label>
        </div>

        {attendanceMessage && (
          <div className="message" role="status">{attendanceMessage}</div>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Roll Number</th>
                <th>Status</th>
                <th>Mark attendance</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td>{student.name}</td>
                  <td>{student.rollNumber}</td>
                  <td>{attendanceDraft[student._id] || attendance[student._id] || "Not marked"}</td>
                  <td>
                    <div className="attendance-actions">
                      {["Present", "Absent", "Late"].map((status) => (
                        <button
                          className={`attendance-button attendance-${status.toLowerCase()}${(attendanceDraft[student._id] || attendance[student._id]) === status ? " selected" : ""}`}
                          key={status}
                          onClick={() => updateAttendance(student._id, status)}
                          disabled={submittingAttendance}
                          type="button"
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="4" className="empty-state">
                    Add students below to start taking attendance.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button
          className="primary-button attendance-submit"
          disabled={
            submittingAttendance ||
            !Object.entries(attendanceDraft).some(
              ([studentId, status]) => attendance[studentId] !== status
            )
          }
          onClick={submitAttendance}
          type="button"
        >
          {submittingAttendance ? "Submitting..." : "Submit Attendance"}
        </button>
      </section>

      <section className="panel">
        <div className="list-header">
          <div>
            <h2>Submitted Attendance</h2>
            <p>Saved attendance records for {attendanceDate}.</p>
          </div>
          <strong className="submitted-count">
            {submittedAttendance.length} of {students.length} submitted
          </strong>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Roll Number</th>
                <th>Course</th>
                <th>Year</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {submittedAttendance.map((student) => (
                <tr key={student._id}>
                  <td>{student.name}</td>
                  <td>{student.rollNumber}</td>
                  <td>{student.course}</td>
                  <td>{student.year}</td>
                  <td>{attendanceDate}</td>
                  <td>
                    <span
                      className={`attendance-status status-${attendance[student._id].toLowerCase()}`}
                    >
                      {attendance[student._id]}
                    </span>
                  </td>
                </tr>
              ))}
              {submittedAttendance.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No attendance has been submitted for this date yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Add New Student</h2>

        <form className="student-form" onSubmit={handleSubmit}>
          <label>
            Student Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter full name"
            />
          </label>

          <label>
            Roll Number
            <input
              required
              value={form.rollNumber}
              onChange={(e) =>
                setForm({ ...form, rollNumber: e.target.value })
              }
              placeholder="e.g. 23DS001"
            />
          </label>

          <label>
            Course
            <input
              required
              value={form.course}
              onChange={(e) => setForm({ ...form, course: e.target.value })}
              placeholder="e.g. Data Science"
            />
          </label>

          <label>
            Year
            <select
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            >
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </label>

          <button className="primary-button full-width" type="submit">
            + Add Student
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="list-header">
          <div>
            <h2>Student Records</h2>
            <p>Search and manage registered students.</p>
          </div>

          <input
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or roll number..."
            aria-label="Search students"
          />
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Roll Number</th>
                <th>Course</th>
                <th>Year</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student._id}>
                  <td>{student.name}</td>
                  <td>{student.rollNumber}</td>
                  <td>{student.course}</td>
                  <td>{student.year}</td>
                  <td>
                    <button
                      className="delete-button"
                      onClick={() => deleteStudent(student._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-state">
                    {search
                      ? "No matching students found."
                      : "No students yet. Add your first student above."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
