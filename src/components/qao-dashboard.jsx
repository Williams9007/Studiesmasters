"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Button } from "./ui/button";
import {
  Users,
  FileCheck,
  MessageSquare,
  BarChart3,
  Bell,
  LogOut,
  Send,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function QaoDashboard() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [resources, setResources] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState({
    receiver: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const token = localStorage.getItem("qaoToken");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Redirect if not authenticated
  useEffect(() => {
    if (!token) navigate("/qao/access");
  }, [token, navigate]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [resTeachers, resResources, resKpis, resMessages, resNotifs] =
          await Promise.all([
            axios.get("/api/qao/teachers", config),
            axios.get("/api/qao/resources", config),
            axios.get("/api/qao/kpis", config),
            axios.get("/api/qao/inbox", config),
            axios.get("/api/qao/notifications", config),
          ]);

        setTeachers(resTeachers.data.teachers || []);
        setResources(resResources.data || []);
        setKpis(resKpis.data || []);
        setMessages(resMessages.data.messages || []);
        setNotifications(resNotifs.data || []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // send message function
  const handleSendMessage = async () => {
    if (!newMessage.receiver || !newMessage.subject || !newMessage.message)
      return alert("Please fill in all fields.");

    setSending(true);
    try {
      await axios.post(
        "/api/messages",
        {
          senderRole: "qao",
          receiverRole: "teacher",
          ...newMessage,
        },
        config
      );
      alert("Message sent successfully!");
      setNewMessage({ receiver: "", subject: "", message: "" });
      const res = await axios.get("/api/qao/inbox", config);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error("Send message error:", err);
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("qaoToken");
    navigate("/qao/access");
  };

  const handleApproval = async (id, approved) => {
    try {
      await axios.put(`/api/qao/resources/${id}`, { approved }, config);
      setResources((prev) =>
        prev.map((r) => (r._id === id ? { ...r, approved } : r))
      );
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading QAO Dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">
          Quality Assurance Officer Dashboard
        </h1>
        <div className="flex items-center space-x-3 relative">
          <Button
            variant="ghost"
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                {notifications.length}
              </span>
            )}
          </Button>
          {showNotifs && (
            <div className="absolute right-0 mt-10 bg-white border rounded-lg shadow-md w-64 max-h-64 overflow-y-auto z-10">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n._id} className="px-3 py-2 border-b text-sm">
                    {n.message}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 p-3 text-sm">No notifications</p>
              )}
            </div>
          )}

          <Button
            onClick={handleLogout}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <motion.div
            className="grid md:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Users className="w-5 h-5" /> Teachers
                </CardTitle>
                <CardDescription>Total registered teachers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-gray-800">
                  {teachers.length}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pink-600">
                  <FileCheck className="w-5 h-5" /> Resources
                </CardTitle>
                <CardDescription>Uploaded lesson notes & timetables</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-gray-800">
                  {resources.length}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-600">
                  <BarChart3 className="w-5 h-5" /> KPIs
                </CardTitle>
                <CardDescription>Performance metrics logged</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-gray-800">
                  {kpis.length}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Teachers */}
        <TabsContent value="teachers">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <Users className="w-5 h-5" /> Teachers
              </CardTitle>
              <CardDescription>All registered teachers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {teachers.map((t) => (
                <div key={t._id} className="border-b py-2">
                  <p className="font-medium">{t.fullName}</p>
                  <p className="text-sm text-gray-600">{t.email}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources */}
        <TabsContent value="resources">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-pink-600">
                <FileCheck className="w-5 h-5" /> Resources
              </CardTitle>
              <CardDescription>Approve or review uploaded resources</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resources.map((r) => (
                <div key={r._id} className="flex justify-between items-center border-b py-2">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-sm text-gray-600">{r.teacher?.fullName}</p>
                  </div>
                  {!r.approved ? (
                    <Button
                      size="sm"
                      onClick={() => handleApproval(r._id, true)}
                      className="bg-purple-500 text-white"
                    >
                      Approve
                    </Button>
                  ) : (
                    <span className="text-green-600 text-sm font-medium">Approved</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPIs */}
        <TabsContent value="kpis">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-600">
                <BarChart3 className="w-5 h-5" /> KPIs
              </CardTitle>
              <CardDescription>Teacher performance data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {kpis.map((kpi) => (
                <div key={kpi._id} className="border-b py-2">
                  <p className="font-medium">{kpi.metric}</p>
                  <p className="text-sm text-gray-600">{kpi.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages */}
        <TabsContent value="messages">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <MessageSquare className="w-5 h-5" /> Messages
              </CardTitle>
              <CardDescription>Communicate with teachers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Send New Message</h3>
                <select
                  value={newMessage.receiver}
                  onChange={(e) =>
                    setNewMessage({ ...newMessage, receiver: e.target.value })
                  }
                  className="border rounded-md w-full p-2 mb-2"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Subject"
                  value={newMessage.subject}
                  onChange={(e) =>
                    setNewMessage({ ...newMessage, subject: e.target.value })
                  }
                  className="border rounded-md w-full p-2 mb-2"
                />
                <textarea
                  rows="3"
                  placeholder="Type your message..."
                  value={newMessage.message}
                  onChange={(e) =>
                    setNewMessage({ ...newMessage, message: e.target.value })
                  }
                  className="border rounded-md w-full p-2 mb-2"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sending}
                  className="bg-purple-500 text-white flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send"}
                </Button>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mt-6 mb-2">Inbox</h3>
                {messages.length > 0 ? (
                  messages.map((m) => (
                    <div key={m._id} className="border-b py-2">
                      <p className="font-medium">{m.subject}</p>
                      <p className="text-sm text-gray-600">{m.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No messages yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default QaoDashboard;
