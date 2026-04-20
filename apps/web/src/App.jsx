import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import useStore from './store/useStore';
import { auth as authApi } from './api';
import Shell from './components/layout/Shell';
import Toast from './components/ui/Toast';
import Login from './pages/auth/Login';

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherCourses from './pages/teacher/Courses';
import TeacherLessons from './pages/teacher/Lessons';
import TestEditor from './pages/teacher/TestEditor';
import Homework from './pages/teacher/Homework';
import Library from './pages/teacher/Library';
import Meetings from './pages/teacher/Meetings';
import TeacherJoinMeeting from './pages/teacher/TeacherJoinMeeting';
import TeacherStudents from './pages/teacher/Students';
import StudentDetail from './pages/teacher/StudentDetail';
import TeacherChat from './pages/teacher/Chat';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import StudentCourses from './pages/student/Courses';
import StudentLessons from './pages/student/Lessons';
import StudentTest from './pages/student/Test';
import StudentMeetings from './pages/student/Meetings';
import JoinMeeting from './pages/student/JoinMeeting';
import StudentChat from './pages/student/Chat';
import CourseOverview from './pages/student/CourseOverview';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminMessages from './pages/admin/Messages';
import AdminPayments from './pages/admin/Payments';
import AdminSalaries from './pages/admin/Salaries';

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const { token, login, user } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token && !user) {
      authApi.me().then((u) => login(u, token)).catch(() => {});
    }
  }, [token]);

  const defaultPath = user?.role === 'admin' ? '/admin' : user?.role === 'teacher' ? '/teacher' : user?.role === 'student' ? '/student' : '/login';

  return (
    <>
      <Toast />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/teacher" element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <Shell role="teacher" />
          </ProtectedRoute>
        }>
          <Route index element={<TeacherDashboard />} />
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="courses/:courseId/lessons" element={<TeacherLessons />} />
          <Route path="lessons/:lessonId/test" element={<TestEditor />} />
          <Route path="homework" element={<Homework />} />
          <Route path="library" element={<Library />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="students/:studentId" element={<StudentDetail />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="meetings/:meetingId/student/:studentId" element={<StudentDetail />} />
          <Route path="chat/:studentId" element={<TeacherChat />} />
          <Route path="chat" element={<TeacherChat />} />
        </Route>

        <Route path="/teacher/meetings/:meetingId/join" element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <TeacherJoinMeeting />
          </ProtectedRoute>
        } />

        <Route path="/student" element={
          <ProtectedRoute roles={['student']}>
            <Shell role="student" />
          </ProtectedRoute>
        }>
          <Route index element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="courses/:courseId" element={<CourseOverview />} />
          <Route path="courses/:courseId/lessons" element={<StudentLessons />} />
          <Route path="test/:testId" element={<StudentTest />} />
          <Route path="meetings" element={<StudentMeetings />} />
          <Route path="chat" element={<StudentChat />} />
        </Route>

        <Route path="/student/meetings/:meetingId" element={
          <ProtectedRoute roles={['student']}>
            <JoinMeeting />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <Shell role="admin" />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="salaries" element={<AdminSalaries />} />
        </Route>

        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </>
  );
}
