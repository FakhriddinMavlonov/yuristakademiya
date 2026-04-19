require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const { initSocket } = require('./config/socket');
const { initTelegramBot } = require('./config/telegram');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

initSocket(server);
if (process.env.NODE_ENV !== 'production') {
  initTelegramBot();
}

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_, res) => res.json({ ok: true, ts: new Date() }));

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

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
