import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useStore, { tokenStore } from './store/useStore';
import { auth as authApi } from './api';
import Shell from './components/layout/Shell';
import Toast from './components/ui/Toast';
import IncomingCall from './components/ui/IncomingCall';
import Login from './pages/auth/Login';
import AutoJoin from './pages/auth/AutoJoin';
import { ensurePushSubscription } from './lib/push';

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherCourses from './pages/teacher/Courses';
import Curricula from './pages/teacher/Curricula';
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
import AdminGroups from './pages/admin/Groups';

// Teacher groups
import TeacherGroups from './pages/teacher/Groups';
import TeacherExams from './pages/teacher/Exams';

// Student schedule
import StudentSchedule from './pages/student/Schedule';
import StudentExams from './pages/student/Exams';

// Sprint 1 pages
import StudentFlashcards from './pages/student/Flashcards';
import StudentGamification from './pages/student/Gamification';
import TeacherFlashcards from './pages/teacher/Flashcards';
import TeacherAnalytics from './pages/teacher/Analytics';
import ParentDashboard from './pages/parent/Dashboard';
import AiTutorWidget from './components/AiTutorWidget';

import NotFound from './pages/NotFound';

const ProtectedRoute = ({ children, roles }) => {
  const { user, authResolving } = useStore();
  if (authResolving) return <SplashLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function SplashLoader() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#0C1A52 0%,#1E2D8A 100%)', color: '#fff',
      flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#fff',
        animation: 'spin .8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  const { login, user, authResolving, setAuthResolving } = useStore();

  useEffect(() => {
    let cancelled = false;
    const access = tokenStore.getAccess();
    const refresh = tokenStore.getRefresh();
    if (!access && !refresh) {
      setAuthResolving(false);
      return;
    }
    // /auth/me will use access token; if it's expired, the response interceptor
    // automatically refreshes via the cookie refresh token and retries.
    authApi.me()
      .then((u) => {
        if (cancelled) return;
        login(u, tokenStore.getAccess());
      })
      .catch(() => {
        if (cancelled) return;
        tokenStore.clear();
        setAuthResolving(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (user) {
      ensurePushSubscription().catch(() => {});
    }
  }, [user?.id]);

  const defaultPath = user?.role === 'admin' ? '/admin' : user?.role === 'teacher' ? '/teacher' : user?.role === 'student' ? '/student' : '/login';

  if (authResolving) return <SplashLoader />;

  return (
    <>
      <Toast />
      <IncomingCall />
      {user?.role === 'student' && <AiTutorWidget />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auto-join" element={<AutoJoin />} />

        <Route path="/teacher" element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <Shell role="teacher" />
          </ProtectedRoute>
        }>
          <Route index element={<TeacherDashboard />} />
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="curricula" element={<Curricula />} />
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
          <Route path="flashcards" element={<TeacherFlashcards />} />
          <Route path="analytics" element={<TeacherAnalytics />} />
          <Route path="groups" element={<TeacherGroups />} />
          <Route path="exams" element={<TeacherExams />} />
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
          <Route path="flashcards" element={<StudentFlashcards />} />
          <Route path="gamification" element={<StudentGamification />} />
          <Route path="meetings" element={<StudentMeetings />} />
          <Route path="chat" element={<StudentChat />} />
          <Route path="schedule" element={<StudentSchedule />} />
          <Route path="exams" element={<StudentExams />} />
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
          <Route path="groups" element={<AdminGroups />} />
        </Route>

        <Route path="/parent/dashboard" element={<ParentDashboard />} />
        <Route path="/parent" element={<Navigate to="/parent/dashboard" replace />} />

        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        <Route path="*" element={user ? <NotFound /> : <Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
