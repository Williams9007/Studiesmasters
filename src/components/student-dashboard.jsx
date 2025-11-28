"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Button } from "./ui/button";
import { User, BookOpen, Bell, Upload } from "lucide-react";

const BASE_URL = "https://studiesmasters-backend-2.onrender.com";

export function StudentDashboard({ user = {} }) {
  const [studentData, setStudentData] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");

        // Fetch student info
        const studentRes = await fetch(`${BASE_URL}/api/students/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!studentRes.ok) throw new Error("Failed to fetch student info");
        const student = await studentRes.json();
        const studentInfo = student.user || student;
        setStudentData(studentInfo);
        const studentId = studentInfo._id;

        // Fetch subjects
        const subjectsRes = await fetch(`${BASE_URL}/api/students/${studentId}/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const subjectData = subjectsRes.ok ? await subjectsRes.json() : [];
        setSubjects(subjectData);

        // Fetch broadcasts
        const broadcastRes = await fetch(`${BASE_URL}/api/students/broadcasts/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const broadcastData = broadcastRes.ok ? await broadcastRes.json() : [];
        setBroadcasts(broadcastData);

        // Fetch payment history
        const paymentRes = await fetch(`${BASE_URL}/api/students/payments/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const paymentData = paymentRes.ok ? await paymentRes.json() : [];
        setPaymentHistory(Array.isArray(paymentData) ? paymentData : []);

        // Fetch assignments
        const assignmentRes = await fetch(`${BASE_URL}/api/students/assignments/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const assignmentData = assignmentRes.ok ? await assignmentRes.json() : [];
        setAssignments(Array.isArray(assignmentData) ? assignmentData : []);

        addNotification(`Welcome back, ${studentInfo.fullName || "Student"}! 👋`);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchAllData();
  }, [navigate]);

  const addNotification = (message) => {
    const note = { id: Date.now(), message, time: new Date().toLocaleTimeString() };
    setNotifications((prev) => [note, ...prev]);
  };

  const handleSubmitAssignment = async (assignmentId, mode, content) => {
    try {
      const formData = new FormData();
      formData.append("mode", mode);
      if (mode === "typed") formData.append("typedAnswer", content);
      else formData.append("file", content);

      const res = await fetch(`${BASE_URL}/api/students/assignments/submit/${assignmentId}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      alert(data.message || "Assignment submitted!");
    } catch (error) {
      console.error("Assignment submit error:", error);
    }
  };

  const latestPayment = paymentHistory.length
    ? paymentHistory[paymentHistory.length - 1]
    : null;
  const durationDisplay =
    latestPayment?.duration || studentData.studyDuration || "N/A";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative">
      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
                EduConnect
              </h1>
              <p className="text-sm text-gray-600">Student Portal</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="h-6 w-6 text-gray-700" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white shadow-md rounded-lg border border-gray-100 z-50">
                  {notifications.length ? (
                    notifications.slice(0, 5).map((note) => (
                      <div
                        key={note.id}
                        className="p-3 border-b border-gray-100 text-sm text-gray-700"
                      >
                        {note.message}
                        <p className="text-xs text-gray-400">{note.time}</p>
                      </div>
                    ))
                  ) : (
                    <p className="p-3 text-sm text-gray-500 text-center">
                      No notifications
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="text-center sm:text-right">
              <p className="font-semibold text-gray-900">
                {studentData.fullName || user.name || "Student"}
              </p>
              <p className="text-sm text-gray-600 truncate max-w-[150px] sm:max-w-full">
                {studentData.email}
              </p>
            </div>

            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <User className="h-6 w-6 text-white" />
            </div>

            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem("token");
                navigate("/");
              }}
              className="hover:bg-red-50 hover:text-red-600"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-1 bg-white rounded-lg shadow-sm overflow-x-auto whitespace-nowrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="broadcasts">Broadcasts</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <Card className="shadow-md p-4 sm:p-6">
              <CardHeader>
                <CardTitle>
                  Welcome, {studentData.fullName || "Student"}!
                </CardTitle>
                <CardDescription>Your personalized EduConnect dashboard.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                  Curriculum: {studentData.curriculum || "N/A"} <br />
                  Grade: {studentData.grade || "N/A"} <br />
                  Duration: {durationDisplay} <br />
                  Package: {studentData.package || "N/A"}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subjects */}
          <TabsContent value="subjects">
            <Card className="shadow-md p-4 sm:p-6">
              <CardHeader>
                <CardTitle>Your Subjects</CardTitle>
              </CardHeader>
              <CardContent>
                {subjects.length ? (
                  <ul className="list-disc pl-4 space-y-2 text-sm sm:text-base">
                    {subjects.map((s) => (
                      <li key={s._id}>
                        {s.name} -{" "}
                        <span className="font-semibold text-blue-700">₵{s.price}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm sm:text-base">No subjects assigned.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Broadcasts */}
          <TabsContent value="broadcasts">
            <Card className="shadow-md p-4 sm:p-6">
              <CardHeader>
                <CardTitle>📢 Announcements</CardTitle>
              </CardHeader>
              <CardContent>
                {broadcasts.length ? (
                  broadcasts.map((b, i) => (
                    <div key={i} className="p-2 sm:p-3 border-b border-gray-200">
                      <p className="font-semibold">{b.subjectName || "General"}</p>
                      <p className="text-sm sm:text-base">{b.message}</p>
                      <small className="text-gray-500 text-xs sm:text-sm">
                        {new Date(b.createdAt).toLocaleString()}
                      </small>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm sm:text-base">No broadcasts available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments */}
          <TabsContent value="assignments">
            <Card className="shadow-md p-4 sm:p-6 space-y-4">
              <CardHeader>
                <CardTitle>📚 Assignments</CardTitle>
                <CardDescription>Submit your assignments using any available method.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(assignments.length ? assignments : [{ _id: "placeholder", title: "Sample Assignment", dueDate: new Date() }]).map((a) => (
                  <div key={a._id} className="border-b border-gray-200 pb-4">
                    <p className="font-semibold text-sm sm:text-base">{a.title}</p>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2">
                      Due: {new Date(a.dueDate).toLocaleDateString()}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Button
                        className="w-full sm:w-auto"
                        onClick={() => document.getElementById(`file-${a._id}`).click()}
                      >
                        <Upload className="h-4 w-4 mr-2" /> Upload File
                      </Button>
                      <input
                        id={`file-${a._id}`}
                        type="file"
                        hidden
                        onChange={(e) => handleSubmitAssignment(a._id, "file", e.target.files[0])}
                      />

                      <Button className="w-full sm:w-auto" onClick={() => document.getElementById(`image-${a._id}`).click()}>
                        Upload Image
                      </Button>
                      <input
                        id={`image-${a._id}`}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handleSubmitAssignment(a._id, "image", e.target.files[0])}
                      />

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                        <textarea
                          id={`typed-${a._id}`}
                          placeholder="Type your answer here..."
                          className="w-full sm:w-64 p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                          rows={3}
                        ></textarea>
                        <Button
                          className="w-full sm:w-auto"
                          onClick={() => {
                            const text = document.getElementById(`typed-${a._id}`).value.trim();
                            if (!text) return alert("Please type your answer before submitting.");
                            handleSubmitAssignment(a._id, "typed", text);
                            document.getElementById(`typed-${a._id}`).value = "";
                          }}
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {assignments.length === 0 && (
                  <p className="text-gray-500 text-center text-sm sm:text-base mt-2">
                    No assignments available yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments */}
          <TabsContent value="payments">
            <Card className="shadow-md p-4 sm:p-6 space-y-4">
              <CardHeader>
                <CardTitle>💳 Payment History</CardTitle>
                <CardDescription>Your payment history and current status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentHistory.length ? (
                  paymentHistory.map((p, i) => {
                    const statusColor =
                      p.status === "confirmed"
                        ? "bg-green-500"
                        : p.status === "pending"
                        ? "bg-yellow-400"
                        : "bg-red-500";
                    return (
                      <div
                        key={i}
                        className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`w-3 h-3 rounded-full ${statusColor}`}></span>
                          <div>
                            <p className="text-sm sm:text-base font-semibold">
                              ₵{p.amount} — {p.package || "N/A"}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {new Date(p.transactionDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500">
                              Status: <span className="capitalize font-medium">{p.status}</span>
                            </p>
                          </div>
                        </div>

                        {p.screenshot && (
                          <img
                            src={`${BASE_URL}${p.screenshot}`}
                            alt="proof"
                            className="w-full sm:w-20 h-20 object-cover rounded-lg border"
                          />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 text-sm sm:text-base">
                    No payment records found.
                  </div>
                )}

                <div className="mt-4 flex justify-center">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto" onClick={() => alert("Payment function triggered")}>
                    Renew / Make Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default StudentDashboard;
