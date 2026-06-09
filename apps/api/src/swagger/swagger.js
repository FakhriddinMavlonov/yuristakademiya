// We need to output the complete modified file after applying the suggested edit. The suggested edit changes the `apis` array from empty to `[__dirname + '/*.docs.js']`. The original code is given. We must output the file with that change and nothing else. No explanation. Just the code.const swaggerJsdoc = require('swagger-jsdoc');
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Yurist Akademiya API',
      version: '1.0.0',
      description: `# Yurist Akademiya - LMS API

Yurist Akademiya — yuridik ta'lim platformasi. Ushbu API orqali quyidagi imkoniyatlar mavjud:

- 🧑‍🎓 **Auth** - Ro'yxatdan o'tish, kirish, token
- 📚 **Courses / Lessons** - Kurslar va darslar
- ✅ **Lesson Progress** - Dars o'zlashtirish holati
- 🎮 **Gamification** - XP, daraja, badge, leaderboard
- 🧪 **Tests** - Testlar, urinishlar, ball
- 📝 **Assignments** - Uy vazifalari va baholash
- 📖 **Library** - Kutubxona materiallari
- 🤖 **AI** - AI yordamida test va uy ishi tekshirish
- 👥 **Groups** - Guruhlar, guruh darslari
- 📊 **Attendance** - Davomat
- 🆎 **Grades** - Kundalik baholar
- 📋 **Exams** - Imtihonlar va natijalar
- 📞 **Meetings** - Video uchrashuvlar (Daily.co)
- 💬 **Chat** - O'qituvchi-o'quvchi xabarlashuvi
- 🗂️ **Flashcards** - Flashcardlar (SM-2)
- 📈 **Analytics** - O'quvchi va o'qituvchi statistikasi
- 👪 **Parent** - Ota-onalar uchun hisobot
- 🔔 **Push** - Web Push bildirishnomalar
- 🎓 **Admin** - Admin boshqaruv paneli
- 📐 **Curricula** - O'quv rejalari
`,
      contact: {
        name: 'Yurist Akademiya',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token. Kirish uchun: POST /api/auth/login yoki /api/auth/register',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Autentifikatsiya va ro\'yxatdan o\'tish' },
      { name: 'Courses', description: 'Kurslar CRUD' },
      { name: 'Lessons', description: 'Darslar CRUD' },
      { name: 'Lesson Progress', description: 'Dars o\'zlashtirish' },
      { name: 'Gamification', description: 'XP, daraja va badge' },
      { name: 'Tests', description: 'Testlar va urinishlar' },
      { name: 'Assignments', description: 'Uy vazifalari' },
      { name: 'Library', description: 'Kutubxona' },
      { name: 'AI', description: 'AI yordamchisi' },
      { name: 'Groups', description: 'Guruhlar' },
      { name: 'Attendance', description: 'Davomat' },
      { name: 'Grades', description: 'Kundalik baholar' },
      { name: 'Exams', description: 'Imtihonlar' },
      { name: 'Meetings', description: 'Video uchrashuvlar' },
      { name: 'Chat', description: 'Xabarlar' },
      { name: 'Flashcards', description: 'Flashcardlar' },
      { name: 'Analytics', description: 'Analitika' },
      { name: 'Parent', description: 'Ota-onalar paneli' },
      { name: 'Push', description: 'Push bildirishnomalar' },
      { name: 'Admin', description: 'Admin boshqaruvi' },
      { name: 'Curricula', description: 'O\'quv rejalari' },
    ],
  },
  apis: [__dirname + '/*.docs.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;

