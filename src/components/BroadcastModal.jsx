import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import apiClient from "@/utils/apiClient"; // Axios wrapper (handles baseURL + token)

export default function BroadcastModal({ users, currentUserRole, onClose }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter users by search and role
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.subject && u.subject.toLowerCase().includes(search.toLowerCase()));
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [search, roleFilter, users]);

  const toggleUserSelect = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return alert("Message cannot be empty.");

    const recipients =
      selectedUsers.length > 0 ? selectedUsers : []; // if empty, backend sends to roleFilter or all
    const payload = {
      type: roleFilter,
      subject,
      message,
      recipients: recipients,
    };

    try {
  setLoading(true);
  const res = await apiClient.post("/admin/broadcasts", payload);
      alert(res.data.message || "Broadcast sent successfully!");
      onClose();
    } catch (err) {
      console.error("Broadcast error:", err);
      alert(err.response?.data?.message || "Error sending broadcast");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl w-[500px] shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
          📢 Broadcast Message
        </h2>

        {/* Subject */}
        <input
          type="text"
          placeholder="Subject (optional)"
          className="w-full border p-2 rounded mb-2 text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        {/* Message */}
        <textarea
          placeholder="Write your message..."
          className="w-full border p-2 rounded mb-3 h-24 text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        {/* Filters */}
        <div className="flex gap-2 mb-3">
          <select
            className="flex-1 border p-2 rounded text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="students">Students</option>
            <option value="teachers">Teachers</option>
            <option value="qaos">QAOs</option>
          </select>

          <input
            type="text"
            placeholder="Search users..."
            className="flex-1 border p-2 rounded text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* User List */}
        <div className="max-h-40 overflow-y-auto border rounded mb-4 p-2">
          {filteredUsers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">No users found.</p>
          ) : (
            filteredUsers.map((u) => (
              <label
                key={u._id}
                className="flex items-center gap-2 border-b py-1 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(u._id)}
                  onChange={() => toggleUserSelect(u._id)}
                />
                <span className="flex-1 text-sm">
                  <strong>{u.name}</strong> ({u.role})
                  <br />
                  <span className="text-gray-500 text-xs">{u.email}</span>
                  {u.subject && (
                    <span className="text-gray-400 text-xs"> — {u.subject}</span>
                  )}
                </span>
              </label>
            ))
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            className="bg-gray-200 hover:bg-gray-300"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
