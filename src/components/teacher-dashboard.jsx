"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { BookOpen, User, Bell, CheckCircle, Send, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function TeacherDashboard({ user = {}, onLogout }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentMessage, setRecentMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replies, setReplies] = useState({}); // per-message replies

  const [subjects, setSubjects] = useState([]);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasts, setBroadcasts] = useState([]);
  const [sending, setSending] = useState(false);

  const [activities, setActivities] = useState([]); // For Overview tab

  // --- Fetch initial data ---
  useEffect(() => {
    if (!user._id) return;

    addNotification(`Welcome back, ${user.name || "Teacher"}! 👋`);

    fetchSubjects();
    fetchBroadcasts();
    fetchMessages();
    fetchNotifications();
  }, [user._id]);

  // --- Fetch subjects ---
  const fetchSubjects = async () => {
    if (!user._id || !token) return;
    try {
      const res = await fetch(`/api/teacher/${user._id}/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const data = await res.json();
      setSubjects(data || []);
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  };

  // --- Fetch broadcasts ---
  const fetchBroadcasts = async () => {
    if (!user._id || !token) return;
    try {
      const res = await fetch(`/api/teacher/${user._id}/broadcasts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch broadcasts");
      const data = await res.json();
      setBroadcasts(data || []);

      const newActivities = (data || []).map((b) => ({
        type: "broadcast",
        subject: b.subjectName || "General",
        message: b.message,
        time: new Date(b.createdAt).toLocaleString(),
      }));
      setActivities((prev) => [...newActivities, ...prev]);
    } catch (err) {
      console.error("Error fetching broadcasts:", err);
    }
  };

  // --- Fetch messages ---
  const fetchMessages = async () => {
    if (!user._id || !token) return;
    try {
      const res = await fetch(`/api/messages/teacher/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data || []);

      const msgActivities = (data || []).map((m) => ({
        type: "message",
        message: m.content,
        time: new Date(m.date).toLocaleString(),
      }));
      setActivities((prev) => [...msgActivities, ...prev]);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  // --- Fetch notifications ---
  const fetchNotifications = async () => {
    if (!user._id || !token) return;
    try {
      const res = await fetch(`/api/teacher/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  // --- Send broadcast ---
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return alert("Message cannot be empty");
    if (!broadcastSubject) return alert("Please select a subject");

    if (!token) return alert("No auth token found");

    try {
      setSending(true);
      const res = await fetch("/api/teacher/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          teacherId: user._id,
          subjectId: broadcastSubject,
          message: broadcastMessage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addNotification("Broadcast sent successfully ✅");
        setBroadcastMessage("");
        fetchBroadcasts();
      } else alert(data.message || "Failed to send broadcast");
    } catch (err) {
      console.error("Error sending broadcast:", err);
    } finally {
      setSending(false);
    }
  };

  // --- Reply to a message ---
  const handleReply = async (e, msgId) => {
    e.preventDefault();
    const replyText = replies[msgId];
    if (!replyText?.trim()) return;

    if (!token) return alert("No auth token found");

    try {
      const res = await fetch(`/api/messages/reply/${msgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reply: replyText, teacherId: user._id }),
      });
      if (res.ok) {
        setReplies((prev) => ({ ...prev, [msgId]: "" }));
        fetchMessages();
        addNotification("Reply sent successfully ✅");

        setActivities((prev) => [
          { type: "reply", message: replyText, time: new Date().toLocaleString() },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error("Error sending reply:", err);
    }
  };

  // --- Add notification ---
  const addNotification = (message) => {
    const newNote = { id: Date.now(), message, time: new Date().toLocaleTimeString() };
    setNotifications((prev) => [newNote, ...prev]);
    setRecentMessage(message);
    setTimeout(() => setRecentMessage(null), 6000);
  };

  // --- Logout ---
  const handleLogout = () => {
    if (onLogout) onLogout();
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 relative">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-soft border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">EduConnect</h1>
              <p className="text-sm text-gray-600">Teacher Portal</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 relative">
            <div className="relative">
              <Button variant="ghost" onClick={() => setShowDropdown(!showDropdown)}>
                <Bell className="w-6 h-6 text-gray-700" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </Button>

              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-3 w-64 bg-white shadow-lg rounded-xl border border-gray-100 z-50"
                  >
                    <div className="p-3 border-b text-sm font-semibold text-gray-700">
                      Notifications
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>
                      ) : (
                        notifications.map((note) => (
                          <div key={note.id} className="p-3 border-b hover:bg-gray-50 transition">
                            <p className="text-sm text-gray-800">{note.message}</p>
                            <p className="text-xs text-gray-400">{note.time}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-right">
              <p className="font-semibold text-gray-900">{user.name || "Guest Teacher"}</p>
              <p className="text-sm text-gray-600">{user.email || "guest@educonnect.com"}</p>
            </div>

            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
              <User className="h-6 w-6 text-white" />
            </div>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center space-x-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Notification Banner */}
      <AnimatePresence>
        {recentMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-auto mt-3 w-fit bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center space-x-3"
          >
            <CheckCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{recentMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-soft rounded-lg p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <h2 className="text-xl font-semibold mb-4">Recent Activities</h2>
            {activities.length === 0 ? (
              <p className="text-gray-500">No recent activities</p>
            ) : (
              activities.map((act, i) => (
                <Card key={i} className="p-4 mb-3 shadow-sm border">
                  <CardContent>
                    <p className="font-medium">
                      {act.type === "broadcast" && `Sent broadcast in "${act.subject}"`}
                      {act.type === "message" && "Received message"}
                      {act.type === "reply" && "Replied to a message"}
                    </p>
                    <p className="text-gray-700">{act.message}</p>
                    <p className="text-gray-400 text-xs mt-1">{act.time}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <div className="space-y-6">
              {messages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No messages yet.</p>
              ) : (
                messages.map((msg) => (
                  <Card key={msg._id} className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>{msg.title || "Broadcast"}</CardTitle>
                      <CardDescription>{new Date(msg.date).toLocaleString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4">{msg.content}</p>
                      <form
                        onSubmit={(e) => handleReply(e, msg._id)}
                        className="flex items-center space-x-2"
                      >
                        <Input
                          placeholder="Write a reply..."
                          value={replies[msg._id] || ""}
                          onChange={(e) =>
                            setReplies((prev) => ({ ...prev, [msg._id]: e.target.value }))
                          }
                        />
                        <Button type="submit" className="flex items-center">
                          <Send className="h-4 w-4 mr-1" /> Reply
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

           {/* Assignments */}
          <TabsContent value="assignments">
            <div className="space-y-6">
              {/* Post Assignment Form */}
              <Card className="p-6 shadow-lg">
                <CardHeader>
                  <CardTitle>Post New Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Assignment Title"
                    value={newAssignment.title}
                    onChange={e => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Input
                    placeholder="Class Name"
                    value={newAssignment.className}
                    onChange={e => setNewAssignment(prev => ({ ...prev, className: e.target.value }))}
                  />
                  <Select
                    onValueChange={v => setNewAssignment(prev => ({ ...prev, subjectId: v }))}
                    value={newAssignment.subjectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.length > 0 ? subjects.map(subj => (
                        <SelectItem key={subj._id} value={subj._id}>{subj.name}</SelectItem>
                      )) : <SelectItem disabled>No subjects</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Assignment Description"
                    value={newAssignment.description}
                    onChange={e => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
                  />
                  <Button onClick={handlePostAssignment}>Post Assignment</Button>
                </CardContent>
              </Card>

              {/* Existing Assignments */}
              <h2 className="text-xl font-semibold">Existing Assignments</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.length === 0 ? (
                  <p className="text-gray-500 col-span-full">No assignments posted</p>
                ) : (
                  assignments.map(a => (
                    <Card key={a._id} className="p-4 shadow-sm border">
                      <CardHeader>
                        <CardTitle>{a.title}</CardTitle>
                        <CardDescription>{a.className} - {a.subjectName}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p>{a.description}</p>
                        <p className="text-gray-400 text-xs mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>






          {/* Broadcast Tab */}
          <TabsContent value="subjects">
            <Card className="shadow-lg p-6">
              <CardHeader>
                <CardTitle>📢 Broadcast Message to Students</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select onValueChange={setBroadcastSubject} value={broadcastSubject}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length > 0 ? (
                      subjects.map((subj) => (
                        <SelectItem key={subj._id} value={subj._id}>
                          {subj.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem disabled>No subjects available</SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <Textarea
                  rows="4"
                  placeholder="Type your announcement here..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                />

                <Button
                  onClick={handleSendBroadcast}
                  disabled={sending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {sending ? "Sending..." : "Send Broadcast"}
                </Button>
              </CardContent>
            </Card>

            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-3">Previous Broadcasts</h2>
              {broadcasts.length > 0 ? (
                broadcasts.map((b, i) => (
                  <Card key={i} className="p-4 mb-3 shadow-sm border">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">
                        {b.subjectName || "General"}
                      </CardTitle>
                      <p className="text-gray-500 text-sm">
                        {new Date(b.createdAt).toLocaleString()}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p>{b.message}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-gray-500">No broadcasts sent yet.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default TeacherDashboard;
