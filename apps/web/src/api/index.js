import axios from 'axios';
import useStore, { tokenStore } from '../store/useStore';

const baseURL = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((p) => error ? p.reject(error) : p.resolve(token));
  refreshQueue = [];
};

api.interceptors.response.use(
  (r) => r.data,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) {
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(err.response?.data || err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const newToken = data.accessToken;
        tokenStore.setAccess(newToken);
        useStore.getState().setToken(newToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;

export const auth = {
  login: (d) => api.post('/auth/login', d),
  register: (d) => api.post('/auth/register', d),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  verifyStatus: (phone) => api.get(`/auth/verify-status/${encodeURIComponent(phone)}`),
};

export const courses = {
  list: () => api.get('/courses'),
  myStudents: () => api.get('/courses/teacher/my-students'),
  studentDetail: (studentId) => api.get(`/courses/teacher/student/${studentId}`),
  get: (id) => api.get(`/courses/${id}`),
  create: (d) => api.post('/courses', d),
  update: (id, d) => api.patch(`/courses/${id}`, d),
  remove: (id) => api.delete(`/courses/${id}`),
  uploadIntroVideo: (id, file, onProgress) => {
    const fd = new FormData();
    fd.append('video', file);
    return api.post(`/courses/${id}/intro-video`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    });
  },
  enroll: (id) => api.post(`/courses/${id}/enroll`),
  students: (id) => api.get(`/courses/${id}/students`),
};

export const lessons = {
  list: (courseId) => api.get(`/courses/${courseId}/lessons`),
  get: (id) => api.get(`/lessons/${id}`),
  create: (courseId, d) => api.post(`/courses/${courseId}/lessons`, d),
  update: (id, d) => api.patch(`/lessons/${id}`, d),
  remove: (id) => api.delete(`/lessons/${id}`),
  progress: (id, watchedSeconds) => api.post(`/lessons/${id}/progress`, { watchedSeconds }),
  uploadVideo: (id, file, onProgress) => {
    const fd = new FormData();
    fd.append('video', file);
    return api.post(`/lessons/${id}/video`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    });
  },
};

export const tests = {
  get: (id) => api.get(`/tests/${id}`),
  save: (lessonId, d) => api.post(`/tests/lesson/${lessonId}`, d),
  parseDocument: (lessonId, file, onProgress) => {
    const fd = new FormData();
    fd.append('document', file);
    return api.post(`/tests/lesson/${lessonId}/parse-document`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    });
  },
  start: (id) => api.post(`/tests/${id}/start`),
  submit: (attemptId, answers) => api.post(`/tests/attempt/${attemptId}/submit`, { answers }),
};

export const assignments = {
  pending: () => api.get('/assignments/pending'),
  create: (lessonId, d) => api.post(`/assignments/lesson/${lessonId}`, d),
  update: (id, d) => api.patch(`/assignments/${id}`, d),
  delete: (id) => api.delete(`/assignments/${id}`),
  getByLesson: (lessonId) => api.get(`/assignments/lesson/${lessonId}`),
  getWithSubmission: (lessonId) => api.get(`/assignments/lesson/${lessonId}/my`),
  submit: (id, d) => api.post(`/assignments/${id}/submit`, d),
  grade: (submissionId, d) => api.patch(`/assignments/submission/${submissionId}/grade`, d),
};

export const meetings = {
  list: () => api.get('/meetings'),
  create: (d) => api.post('/meetings', d),
  updateStatus: (id, status) => api.patch(`/meetings/${id}/status`, { status }),
  students: (id) => api.get(`/meetings/${id}/students`),
  getJoinUrl: (id) => api.get(`/meetings/${id}/join`),
  addParticipant: (id, participantId) => api.post(`/meetings/${id}/participants`, { participantId }),
  removeParticipant: (id, participantId) => api.delete(`/meetings/${id}/participants`, { participantId }),
};

export const library = {
  list: (params) => api.get('/library', { params }),
  upload: (d) => api.post('/library', d),
  uploadFile: (file, fileType) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('fileType', fileType);
    return api.post('/library/file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  remove: (id) => api.delete(`/library/${id}`),
};

export const chat = {
  contacts: () => api.get('/chat/contacts'),
  messages: (contactId) => api.get(`/chat/${contactId}/messages`),
  send: (contactId, content) => api.post(`/chat/${contactId}/send`, { content }),
};

export const groups = {
  list: () => api.get('/groups'),
  get: (id) => api.get(`/groups/${id}`),
  create: (d) => api.post('/groups', d),
  update: (id, d) => api.patch(`/groups/${id}`, d),
  remove: (id) => api.delete(`/groups/${id}`),
  addStudent: (id, userId) => api.post(`/groups/${id}/students`, { userId }),
  removeStudent: (id, userId) => api.delete(`/groups/${id}/students/${userId}`),
  setSchedule: (id, slots) => api.put(`/groups/${id}/schedule`, { slots }),
};

export const attendance = {
  getForDate: (groupId, date) => api.get(`/attendance/group/${groupId}/date/${date}`),
  markBulk: (groupId, date, records) => api.post(`/attendance/group/${groupId}/date/${date}`, { records }),
  getStudentHistory: (groupId, studentId) => api.get(`/attendance/group/${groupId}/student/${studentId}`),
  getGroupStats: (groupId) => api.get(`/attendance/group/${groupId}/stats`),
  myHistory: () => api.get('/attendance/my'),
};

export const grades = {
  getForDate: (groupId, date) => api.get(`/grades/group/${groupId}/date/${date}`),
  markBulk: (groupId, date, records) => api.post(`/grades/group/${groupId}/date/${date}`, { records }),
  getStudentHistory: (groupId, studentId) => api.get(`/grades/group/${groupId}/student/${studentId}`),
  getGroupStats: (groupId) => api.get(`/grades/group/${groupId}/stats`),
  myHistory: () => api.get('/grades/my'),
};

export const ai = {
  generateQuiz:  (data) => api.post('/ai/generate-quiz', data),
  checkHomework: (data) => api.post('/ai/check-homework', data),
};

export const exams = {
  list: () => api.get('/exams'),
  create: (d) => api.post('/exams', d),
  update: (id, d) => api.patch(`/exams/${id}`, d),
  remove: (id) => api.delete(`/exams/${id}`),
  students: (id) => api.get(`/exams/${id}/students`),
  postResults: (id, results) => api.post(`/exams/${id}/results`, { results }),
};

export const push = {
  publicKey: () => api.get('/push/public-key'),
  subscribe: (subscription) => api.post('/push/subscribe', { subscription }),
  unsubscribe: (endpoint) => api.post('/push/unsubscribe', { endpoint }),
};

export const admin = {
  stats: () => api.get('/admin/stats'),
  studentStats: () => api.get('/admin/student-stats'),
  teacherStats: () => api.get('/admin/teacher-stats'),
  telegramConversations: () => api.get('/admin/telegram-conversations'),
  telegramMessages: (chatId) => api.get(`/admin/telegram-messages/${chatId}`),
  users: (params) => api.get('/admin/users', { params }),
  createUser: (d) => api.post('/admin/users', d),
  updateUser: (id, d) => api.patch(`/admin/users/${id}`, d),
  updateRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  toggleActive: (id) => api.patch(`/admin/users/${id}/toggle-active`),
  userDetails: (id) => api.get(`/admin/users/${id}`),
  payments: () => api.get('/admin/payments'),
  createPayment: (d) => api.post('/admin/payments', d),
  salaries: () => api.get('/admin/salaries'),
  createSalary: (d) => api.post('/admin/salaries', d),
};
