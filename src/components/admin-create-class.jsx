import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardHeader, CardContent, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";

const AdminCreateClass = () => {
  const [classData, setClassData] = useState({
    className: "",
    curriculum: "",
    grade: "",
    subjects: [],
    teachers: [],
    startDate: "",
    duration: "",
    maxStudents: 30,
  });
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);

  // Fetch teachers + classes
  useEffect(() => {
    const fetchData = async () => {
      const teachersRes = await axios.get("/api/teachers");
      setTeachers(teachersRes.data);
      const classesRes = await axios.get("/api/classes");
      setClasses(classesRes.data);
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post("/api/classes/create", classData);
    alert("Class created successfully!");
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Class</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Class Name"
              value={classData.className}
              onChange={(e) => setClassData({ ...classData, className: e.target.value })}
            />
            <Select onValueChange={(value) => setClassData({ ...classData, curriculum: value })}>
              <SelectTrigger><SelectValue placeholder="Select Curriculum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GES">GES</SelectItem>
                <SelectItem value="Cambridge">Cambridge</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Grade"
              value={classData.grade}
              onChange={(e) => setClassData({ ...classData, grade: e.target.value })}
            />

            <Input
              placeholder="Subjects (comma-separated)"
              onChange={(e) => setClassData({ ...classData, subjects: e.target.value.split(",") })}
            />

            <Select onValueChange={(value) => setClassData({ ...classData, teachers: [value] })}>
              <SelectTrigger><SelectValue placeholder="Select Teacher" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              onChange={(e) => setClassData({ ...classData, startDate: e.target.value })}
            />

            <Input
              placeholder="Duration (e.g. 3 months)"
              onChange={(e) => setClassData({ ...classData, duration: e.target.value })}
            />

            <Input
              type="number"
              placeholder="Max Students (default 30)"
              onChange={(e) => setClassData({ ...classData, maxStudents: e.target.value })}
            />

            <Button type="submit">Create Class</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border">
              <thead>
                <tr>
                  <th>Class Name</th>
                  <th>Curriculum</th>
                  <th>Grade</th>
                  <th>Subjects</th>
                  <th>Teacher</th>
                  <th>Students</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls._id}>
                    <td>{cls.className}</td>
                    <td>{cls.curriculum}</td>
                    <td>{cls.grade}</td>
                    <td>{cls.subjects.join(", ")}</td>
                    <td>{cls.teachers?.map((t) => t.name).join(", ")}</td>
                    <td>{cls.students.length}</td>
                    <td>{cls.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCreateClass;
