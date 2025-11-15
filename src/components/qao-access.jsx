"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useNavigate } from "react-router-dom";

function QaoAccess() {
  const [qaoCode, setQaoCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!qaoCode.trim()) {
      setError("Please enter your QAO access code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post("/api/qao/access", { qaoCode });
      if (res.data.success) {
        // store token in localStorage
        localStorage.setItem("qaoToken", res.data.token); 
        navigate("/qao/dashboard");
      } else {
        setError(res.data.message || "Access denied");
      }
    } catch (err) {
      console.error("QAO access error:", err);
      setError(err.response?.data?.message || "Network or server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
        <Label htmlFor="qaoCode">QAO Access Code</Label>
        <Input
          id="qaoCode"
          type="password"
          value={qaoCode}
          onChange={(e) => setQaoCode(e.target.value)}
          required
        />
        {error && <p className="text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Access Dashboard"}
        </Button>
      </form>
    </div>
  );
}

export default QaoAccess;
