"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { BookOpen, User, Bell, CheckCircle, Send, LogOut, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function TeacherDashboard({ user = {}, onLogout }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") setToken(localStorage.getItem("token"));
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentMessage, setRecentMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replies, setReplies] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasts, setBroadcasts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [newAssignment, setNewAssignment] = useState({ title: "", description: "", className: "", subjectId: "" });
  const [sending, setSending] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  // --- Fetch initial data ---
  useEffect(() => {
    if (!user._id) return;
    addNotification(`Welcome back, ${user.name || "Teacher"}! 👋`);
    fetchSubjects();
    fetchBroadcasts();
    fetchMessages();
    fetchStudents();
    fetchAssignments();
  }, [user._id]);

  // --- Fetch functions ---
  const fetchSubjects = async () => {
    if (!user._id || !token) return;
    try { const res = await fetch(`/api/teacher/${user._id}/subjects`, { headers: { Authorization: `Bearer ${token}` } }); const data = await res.json(); setSubjects(data || []); } catch (err) { console.error(err); }
  };
  const fetchStudents = async () => {
    if (!user._id || !token) return;
    try { const res = await fetch(`/api/teacher/${user._id}/students`, { headers: { Authorization: `Bearer ${token}` } }); const data = await res.json(); setStudents(data || []); } catch (err) { console.error(err); }
  };
  const fetchAssignments = async () => {
    if (!user._id || !token) return;
    try { const res = await fetch(`/api/teacher/${user._id}/assignments`, { headers: { Authorization: `Bearer ${token}` } }); const data = await res.json(); setAssignments(data || []); } catch (err) { console.error(err); }
  };
  const fetchBroadcasts = async () => {
    if (!user._id || !token) return;
    try {
      const res = await fetch(`/api/teacher/${user._id}/broadcasts`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setBroadcasts(data || []);
      const newActs = (data || []).map(b => ({ type: "broadcast", subject: b.subjectName || "General", message: b.message, time: new Date(b.createdAt).toLocaleString() }));
      setActivities(prev => [...newActs, ...prev]);
    } catch (err) { console.error(err); }
  };
  const fetchMessages = async () => {
    if (!user._id || !token) return;
    try {
      const res = await fetch(`/api/messages/teacher/${user._id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMessages(data || []);
      const msgActs = (data || []).map(m => ({ type: "message", message: m.content, time: new Date(m.date).toLocaleString() }));
      setActivities(prev => [...msgActs, ...prev]);
    } catch (err) { console.error(err); }
  };

  // --- Actions ---
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim() || !broadcastSubject) return alert("Please complete all fields");
    setSending(true);
    try {
      const res = await fetch("/api/teacher/broadcast", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ teacherId: user._id, subjectId: broadcastSubject, message: broadcastMessage }) });
      if (res.ok) { addNotification("Broadcast sent ✅"); setBroadcastMessage(""); fetchBroadcasts(); }
    } catch (err) { console.error(err); } finally { setSending(false); }
  };
  const handlePostAssignment = async () => {
    if (!newAssignment.title || !newAssignment.description || !newAssignment.subjectId) return alert("Complete all fields");
    try {
      const res = await fetch("/api/teacher/assignments", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...newAssignment, teacherId: user._id }) });
      if (res.ok) { addNotification("Assignment posted ✅"); setNewAssignment({ title: "", description: "", className: "", subjectId: "" }); fetchAssignments(); }
    } catch (err) { console.error(err); }
  };
  const handleReply = async (e, msgId) => {
    e.preventDefault();
    const replyText = replies[msgId];
    if (!replyText?.trim()) return;
    try {
      const res = await fetch(`/api/messages/reply/${msgId}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ reply: replyText, teacherId: user._id }) });
      if (res.ok) { setReplies(prev => ({ ...prev, [msgId]: "" })); fetchMessages(); addNotification("Reply sent ✅"); setActivities(prev => [{ type: "reply", message: replyText, time: new Date().toLocaleString() }, ...prev]); }
    } catch (err) { console.error(err); }
  };

  const addNotification = (message) => {
    const note = { id: Date.now(), message, time: new Date().toLocaleTimeString() };
    setNotifications(prev => [note, ...prev]);
    setRecentMessage(message);
    setTimeout(() => setRecentMessage(null), 5000);
  };
  const handleLogout = () => { if (onLogout) onLogout(); localStorage.removeItem("token"); navigate("/login"); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-sm shadow-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center px-4 py-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-8 h-8 text-green-500" />
            <div>
              <h1 className="text-xl font-bold">EduConnect</h1>
              <p className="text-sm text-gray-600">Teacher Portal</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <Button className="md:hidden" variant="ghost" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu className="w-6 h-6" /></Button>

            <div className="hidden md:flex items-center space-x-3 relative">
              <Button variant="ghost" onClick={() => setShowDropdown(!showDropdown)}>
                <Bell className="w-6 h-6 text-gray-700" />
                {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{notifications.length}</span>}
              </Button>

              <div className="text-right">
                <p className="font-semibold text-gray-900">{user.name || "Guest Teacher"}</p>
                <p className="text-sm text-gray-600">{user.email || "guest@educonnect.com"}</p>
              </div>

              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                <User className="h-5 w-5 text-white" />
              </div>

              <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-1"><LogOut className="w-4 h-4" /> Logout</Button>
            </div>
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <TabsList className="flex flex-col p-2 space-y-1">
              {["overview","students","assignments","subjects","messages"].map(tab => (
                <TabsTrigger key={tab} value={tab} onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }} className="text-left w-full">{tab.charAt(0).toUpperCase() + tab.slice(1)}</TabsTrigger>
              ))}
            </TabsList>
          </div>
        )}
      </header>

      {/* Notification Banner */}
      <AnimatePresence>
        {recentMessage && (
          <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }} className="mx-auto mt-3 w-fit bg-green-500 text-white px-6 py-2 rounded-xl shadow flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{recentMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABS CONTENT */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden md:grid grid-cols-5 bg-white shadow rounded-lg p-1">
            {["overview","students","assignments","subjects","messages"].map(tab => <TabsTrigger key={tab} value={tab}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</TabsTrigger>)}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <h2 className="text-xl font-semibold mb-4">Recent Activities</h2>
            {activities.length === 0 ? <p className="text-gray-500">No recent activities</p> :
              activities.map((act,i) => (
                <Card key={i} className="p-4 mb-3 shadow-sm border">
                  <CardContent>
                    <p className="font-medium">{act.type==="broadcast" && `Sent broadcast in "${act.subject}"`}{act.type==="message" && "Received message"}{act.type==="reply" && "Replied to a message"}</p>
                    <p className="text-gray-700">{act.message}</p>
                    <p className="text-gray-400 text-xs mt-1">{act.time}</p>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <h2 className="text-xl font-semibold mb-4">Students</h2>
            {students.length===0 ? <p className="text-gray-500">No students assigned</p> :
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map(s => <Card key={s._id} className="p-4 shadow-sm border"><CardHeader><CardTitle>{s.name}</CardTitle><CardDescription>{s.email}</CardDescription></CardHeader></Card>)}
              </div>}
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <div className="space-y-6">
              <Card className="p-6 shadow-lg">
                <CardHeader><CardTitle>Post New Assignment</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Assignment Title" value={newAssignment.title} onChange={e=>setNewAssignment(prev=>({...prev,title:e.target.value}))}/>
                  <Input placeholder="Class Name" value={newAssignment.className} onChange={e=>setNewAssignment(prev=>({...prev,className:e.target.value}))}/>
                  <Select onValueChange={v=>setNewAssignment(prev=>({...prev,subjectId:v}))} value={newAssignment.subjectId}>
                    <SelectTrigger><SelectValue placeholder="Select Subject"/></SelectTrigger>
                    <SelectContent>{subjects.length?subjects.map(subj=><SelectItem key={subj._id} value={subj._id}>{subj.name}</SelectItem>):<SelectItem disabled>No subjects</SelectItem>}</SelectContent>
                  </Select>
                  <Textarea placeholder="Assignment Description" value={newAssignment.description} onChange={e=>setNewAssignment(prev=>({...prev,description:e.target.value}))}/>
                  <Button onClick={handlePostAssignment}>Post Assignment</Button>
                </CardContent>
              </Card>

              <h2 className="text-xl font-semibold">Existing Assignments</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.length===0?<p className="text-gray-500 col-span-full">No assignments posted</p>:assignments.map(a=><Card key={a._id} className="p-4 shadow-sm border"><CardHeader><CardTitle>{a.title}</CardTitle><CardDescription>{a.className} - {a.subjectName}</CardDescription></CardHeader><CardContent><p>{a.description}</p><p className="text-gray-400 text-xs mt-1">{new Date(a.createdAt).toLocaleString()}</p></CardContent></Card>)}
              </div>
            </div>
          </TabsContent>

          {/* Subjects / Broadcast Tab */}
          <TabsContent value="subjects">
            <Card className="shadow-lg p-6">
              <CardHeader><CardTitle>📢 Broadcast Message</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Select onValueChange={setBroadcastSubject} value={broadcastSubject}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select subject"/></SelectTrigger>
                  <SelectContent>{subjects.length?subjects.map(subj=><SelectItem key={subj._id} value={subj._id}>{subj.name}</SelectItem>):<SelectItem disabled>No subjects</SelectItem>}</SelectContent>
                </Select>
                <Textarea rows="4" placeholder="Type your announcement..." value={broadcastMessage} onChange={e=>setBroadcastMessage(e.target.value)}/>
                <Button onClick={handleSendBroadcast} disabled={sending}>{sending?"Sending...":"Send Broadcast"}</Button>
              </CardContent>
            </Card>

            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-3">Previous Broadcasts</h2>
              {broadcasts.length?broadcasts.map((b,i)=><Card key={i} className="p-4 mb-3 shadow-sm border"><CardHeader><CardTitle>{b.subjectName||"General"}</CardTitle><p className="text-gray-500 text-sm">{new Date(b.createdAt).toLocaleString()}</p></CardHeader><CardContent><p>{b.message}</p></CardContent></Card>):<p className="text-gray-500">No broadcasts yet</p>}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            {messages.length===0?<p className="text-gray-500 py-8 text-center">No messages yet</p>:messages.map(msg=><Card key={msg._id} className="bg-white/80 backdrop-blur-sm mb-4"><CardHeader><CardTitle>{msg.title||"Broadcast"}</CardTitle><CardDescription>{new Date(msg.date).toLocaleString()}</CardDescription></CardHeader><CardContent><p className="text-gray-700 mb-3">{msg.content}</p><form onSubmit={e=>handleReply(e,msg._id)} className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0"><Input placeholder="Write a reply..." value={replies[msg._id]||""} onChange={e=>setReplies(prev=>({...prev,[msg._id]:e.target.value}))}/><Button type="submit" className="w-full md:w-auto flex items-center space-x-1"><Send className="w-4 h-4"/> Reply</Button></form></CardContent></Card>)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default TeacherDashboard;
