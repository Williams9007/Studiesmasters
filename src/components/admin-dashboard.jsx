import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, PlusCircle, Megaphone } from "lucide-react";
import BroadcastModal from "./BroadcastModal";
import AssignSubjectModal from "./AssignSubjectModal";
import AddAccountModal from "./AddAccountModal";
import apiClient from "@/utils/apiClient";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [qaos, setQaos] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);

  // ✅ Verify Admin Session
  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        if (!token) throw new Error("No token found");

        await apiClient.get("/admin/verify", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("❌ Admin verification failed:", err);
        localStorage.clear();
        navigate("/admin/login");
      } finally {
        setVerifying(false);
      }
    };
    verifyAdmin();
  }, [navigate]);

  // ✅ Fetch all dashboard data safely
  useEffect(() => {
    if (verifying) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("adminToken");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch dashboard data
        const [dashboardRes, paymentsRes, subjectsRes] = await Promise.all([
          apiClient.get("/admin/dashboard", { headers }),
          apiClient.get("/admin/payments", { headers }),
          apiClient.get("/admin/subjects", { headers }),
        ]);

        const { students = [], teachers = [], qaos = [] } = dashboardRes.data || {};

        setStudents(students);
        setTeachers(teachers);
        setQaos(qaos);
        setSubjects(subjectsRes.data || []);
        setPayments(paymentsRes.data || []);

        // ✅ Fetch messages for QAOs safely
        const qaoMessages = await Promise.all(
          qaos.map(async (qao) => {
            if (!qao._id) return { ...qao, messages: [] };
            try {
              const res = await apiClient.get(`/api/qao/messages/${qao._id}`, { headers });
              return { ...qao, messages: res.data || [] };
            } catch (err) {
              console.error(`Failed to fetch messages for QAO ${qao._id}:`, err);
              return { ...qao, messages: [] };
            }
          })
        );
        setQaos(qaoMessages);

      } catch (err) {
        console.error("❌ Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [verifying]);

  // ✅ Approve Payment
  const approvePayment = async (id) => {
    try {
      const token = localStorage.getItem("adminToken");
      await apiClient.put(`/api/payments/approve/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPayments((prev) =>
        prev.map((p) => (p._id === id ? { ...p, status: "approved" } : p))
      );
    } catch (err) {
      console.error("❌ Payment approval failed:", err);
      alert("Failed to approve payment");
    }
  };

  if (verifying || loading)
    return <div className="p-8 text-center text-gray-600">Loading dashboard...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="text-blue-500" /> Admin Dashboard
        </h1>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowBroadcast(true)}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Megaphone size={18} /> Broadcast
          </Button>
          <Button
            onClick={() => setShowAddAccount(true)}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            <PlusCircle size={18} /> Add Account
          </Button>
          <Button
            onClick={() => setShowAssign(true)}
            className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
          >
            Assign Subject
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="shadow-lg rounded-2xl bg-white">
        <CardHeader className="border-b">
          <CardTitle className="text-xl font-semibold">Control Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="flex flex-wrap gap-2 bg-gray-100 p-2 rounded-lg mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="qaos">QAOs</TabsTrigger>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <OverviewCard title="Students" count={students.length} color="blue" />
                <OverviewCard title="Teachers" count={teachers.length} color="green" />
                <OverviewCard title="QAOs" count={qaos.length} color="purple" />
                <OverviewCard title="Subjects" count={subjects.length} color="yellow" />
              </div>
            </TabsContent>

            {/* Students */}
            <TabsContent value="students">
              <DataTable data={students} role="student" />
            </TabsContent>

            {/* Teachers */}
            <TabsContent value="teachers">
              <DataTable data={teachers} role="teacher" />
            </TabsContent>

            {/* QAOs */}
            <TabsContent value="qaos">
              <DataTable data={qaos} role="qao" />
            </TabsContent>

            {/* Subjects */}
            <TabsContent value="subjects">
              <DataTable data={subjects} role="subject" />
            </TabsContent>

            {/* Payments */}
            <TabsContent value="payments">
              {payments.length === 0 ? (
                <p className="text-gray-500">No payments uploaded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2">Student</th>
                        <th className="p-2">Package</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Screenshot</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p._id} className="border-t hover:bg-gray-50">
                          <td className="p-2">{p.studentId?.name || "N/A"}</td>
                          <td className="p-2">{p.package}</td>
                          <td className="p-2">{p.amount}</td>
                          <td className="p-2">
                            <a
                              href={p.screenshot}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View
                            </a>
                          </td>
                          <td className="p-2">
                            {p.status === "pending" ? (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => approvePayment(p._id)}
                              >
                                Approve
                              </Button>
                            ) : (
                              <span className="text-green-600 font-semibold">Approved</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ✅ Modals */}
      {showBroadcast && (
        <BroadcastModal onClose={() => setShowBroadcast(false)} users={[...students, ...teachers, ...qaos]} />
      )}
      {showAddAccount && <AddAccountModal onClose={() => setShowAddAccount(false)} />}
      {showAssign && (
        <AssignSubjectModal
          users={teachers}
          subjects={subjects}
          isOpen={showAssign}
          onClose={() => setShowAssign(false)}
        />
      )}
    </div>
  );
}

/* ---------- Reusable Components ---------- */
function OverviewCard({ title, count, color }) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    green: "text-green-600 bg-green-50 border-green-100",
    purple: "text-purple-600 bg-purple-50 border-purple-100",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-100",
  };
  return (
    <div className={`rounded-xl shadow p-6 text-center border ${colorMap[color]}`}>
      <p className="font-semibold">{title}</p>
      <h3 className="text-3xl font-bold">{count ?? 0}</h3>
    </div>
  );
}

function DataTable({ data, role }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            {role === "teacher" && <th className="p-2">Subjects</th>}
            {role === "student" && <th className="p-2">Enrolled Classes</th>}
            {role === "subject" && <th className="p-2">Assigned Teacher</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item._id} className="border-t hover:bg-gray-50">
              <td className="p-2">{item.name || item.title}</td>
              <td className="p-2">{item.email || "—"}</td>
              {role === "teacher" && (
                <td className="p-2">
                  {item.assignedSubjects?.length
                    ? item.assignedSubjects.map((s) => s.name).join(", ")
                    : "—"}
                </td>
              )}
              {role === "student" && (
                <td className="p-2">
                  {item.enrolledClasses?.length
                    ? item.enrolledClasses.map((c) => c.name || c.subject).join(", ")
                    : "—"}
                </td>
              )}
              {role === "subject" && (
                <td className="p-2">{item.assignedTeacher?.name || "Unassigned"}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
