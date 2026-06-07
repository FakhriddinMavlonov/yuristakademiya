require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initSocket } = require('./config/socket');
const { initTelegramBot } = require('./config/telegram');
const { startReminderScheduler } = require('./modules/meetings/meetings.scheduler');
const { startDailyScheduler } = require('./modules/meetings/daily.scheduler');
const { startParentReportScheduler } = require('./modules/parent/parentReport.scheduler');
const { errorHandler } = require('./middleware/errorHandler');

const path = require('path');

const app = express();
const server = http.createServer(app);

// SOCKET + BOT + SCHEDULER
initSocket(server);
if (process.env.TELEGRAM_BOT_ENABLED === 'true') {
  initTelegramBot();
}
startReminderScheduler();
startDailyScheduler();
startParentReportScheduler();

// SECURITY HEADERS — Helmet sets CSP, HSTS, X-Content-Type-Options, X-Frame-Options, etc.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Disabled to allow inline styles used by the app
}));

// MIDDLEWARE
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HEALTH
app.get('/health', (_, res) => res.json({ ok: true, ts: new Date() }));

// API ROUTES
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/courses', require('./modules/courses/courses.routes'));
app.use('/api/courses/:courseId/lessons', require('./modules/lessons/lessons.routes'));
app.use('/api/lessons', require('./modules/lessons/lessons.routes'));
app.use('/api/tests', require('./modules/tests/tests.routes'));
app.use('/api/assignments', require('./modules/assignments/assignments.routes'));
app.use('/api/meetings', require('./modules/meetings/meetings.routes'));
app.use('/api/library', require('./modules/library/library.routes'));
app.use('/api/chat', require('./modules/chat/chat.routes'));
app.use('/api/admin', require('./modules/admin/admin.routes'));
app.use('/api/groups', require('./modules/groups/groups.routes'));
app.use('/api/attendance', require('./modules/attendance/attendance.routes'));
app.use('/api/grades', require('./modules/grades/grades.routes'));
app.use('/api/ai',    require('./modules/ai/ai.routes'));
app.use('/api/exams', require('./modules/exams/exams.routes'));
app.use('/api/push',  require('./modules/push/push.routes'));
app.use('/api/curricula', require('./modules/curricula/curricula.routes'));

// Sprint 1 Features
app.use('/api/gamification', require('./modules/gamification/gamification.routes'));
app.use('/api/flashcards',   require('./modules/flashcards/flashcards.routes'));
app.use('/api/parent',       require('./modules/parent/parent.routes'));
app.use('/api/analytics',    require('./modules/analytics/analytics.routes'));

// 👉 ERROR HANDLER (HAMMASIDAN KEYIN)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
