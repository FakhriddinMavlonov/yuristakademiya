require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hash = (pw) => bcrypt.hashSync(pw, 10);

    // Admin (temporary account for initial setup)
    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, phone, is_verified)
      VALUES ($1,$2,$3,$4,'admin',$5,true)
      ON CONFLICT (email) DO UPDATE SET first_name=EXCLUDED.first_name, is_verified=true
      RETURNING id
    `, ['admin@ya.uz', hash('admin123'), 'Admin', 'User', '+998901234560']);

    // Teacher
    const { rows: [teacher] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, phone, is_verified)
      VALUES ($1,$2,$3,$4,'teacher',$5,true)
      ON CONFLICT (email) DO UPDATE SET first_name=EXCLUDED.first_name, is_verified=true
      RETURNING id
    `, ['teacher@ya.uz', hash('teacher123'), 'Aziz', 'Karimov', '+998901234567']);

    // Students — 6 demo + 100 bulk test students
    const demoStudents = [
      ['alisher@ya.uz', 'Alisher', 'Fozilov', '+998901111111'],
      ['barno@ya.uz', 'Barno', 'Mirzayeva', '+998902222222'],
      ['doniyor@ya.uz', 'Doniyor', 'Karimov', '+998903333333'],
      ['zulfiya@ya.uz', 'Zulfiya', 'Nazarova', '+998904444444'],
      ['otabek@ya.uz', 'Otabek', 'Mirsaidov', '+998905555555'],
      ['sarvinoz@ya.uz', 'Sarvinoz', 'Holiqova', '+998906666666'],
    ];

    const studentIds = [];
    for (const [email, fn, ln, phone] of demoStudents) {
      const { rows: [s] } = await client.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, phone, is_verified)
        VALUES ($1,$2,$3,$4,'student',$5,true)
        ON CONFLICT (email) DO UPDATE SET first_name=EXCLUDED.first_name, is_verified=true
        RETURNING id
      `, [email, hash('student123'), fn, ln, phone]);
      studentIds.push(s.id);
    }

    // 100 test students
    const firstNames = [
      'Alisher','Bobur','Jasur','Kamol','Laziz','Mirzo','Nodir','Otabek','Sardor','Timur',
      'Ulugbek','Vohid','Xurshid','Yorqin','Zafar','Akbar','Behruz','Dilshod','Eldor','Farrux',
      'Humoyun','Ibrohim','Jamshid','Komiljon','Mansur','Nurbek','Oybek','Parviz','Sherzod','Tohir',
      'Nodira','Barno','Zulfiya','Sarvinoz','Mohira','Dilorom','Nilufar','Feruza','Maftuna','Saodat',
      'Gulnora','Muazzam','Nasiba','Oydin','Shahnoza','Lobar','Kamola','Hulkar','Iroda','Gavhar',
    ];
    const lastNames = [
      'Karimov','Rahimov','Hasanov','Toshmatov','Mirzayev','Yusupov','Nazarov','Sultonov','Ismoilov','Xoliqov',
      'Umarov','Abdullayev','Qodirov','Sobirov','Holiqov','Mamatov','Boymurodov','Ergashev','Jumayev','Komilov',
      'Ahmedov','Baxtiyorov','Choriyev','Davlatov','Eshmatov','Fayzullayev','Hamidov','Isoqov','Jalilов','Latipov',
    ];

    const bulkStudentIds = [];
    for (let n = 1; n <= 100; n++) {
      const fn = firstNames[(n - 1) % firstNames.length];
      const ln = lastNames[Math.floor((n - 1) / firstNames.length) % lastNames.length];
      const email = `s${n}@ya.uz`;
      const phone = `+99877${String(n).padStart(7, '0')}`;
      const { rows } = await client.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, phone, is_verified)
        VALUES ($1,$2,$3,$4,'student',$5,true)
        ON CONFLICT (email) DO UPDATE SET first_name=EXCLUDED.first_name, is_verified=true
        RETURNING id
      `, [email, hash('student123'), fn, ln, phone]);
      if (rows[0]) bulkStudentIds.push(rows[0].id);
    }

    // Courses
    const courseData = [
      ['Fuqarolik huquqi', 'Fuqarolik huquqining asosiy tushunchalari va institutlari', 'Fuqarolik huquqi', 'beginner', 'linear-gradient(135deg,#0C1A52,#1E2D8A)'],
      ['Mehnat huquqi', "Mehnat munosabatlarini huquqiy tartibga solish", 'Mehnat huquqi', 'intermediate', 'linear-gradient(135deg,#1a4d3a,#0d7a55)'],
      ['Jinoyat huquqi', "Jinoyat va jinoyatchilik muammolari", 'Jinoyat huquqi', 'advanced', 'linear-gradient(135deg,#3D1D7A,#6B3FA0)'],
    ];

    const courseIds = [];
    for (const [title, desc, cat, level, grad] of courseData) {
      const { rows: [c] } = await client.query(`
        INSERT INTO courses (title, description, category, level, banner_gradient, teacher_id, status)
        VALUES ($1,$2,$3,$4,$5,$6,'published')
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [title, desc, cat, level, grad, teacher.id]);
      if (c) courseIds.push(c.id);
    }

    if (courseIds.length === 0) {
      console.log('ℹ️  Seed data already exists, skipping.');
      await client.query('ROLLBACK');
      return;
    }

    // Enroll all students in first course
    for (const sid of [...studentIds, ...bulkStudentIds]) {
      await client.query(`
        INSERT INTO enrollments (user_id, course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING
      `, [sid, courseIds[0]]);
    }

    // Lessons for first course (Fuqarolik huquqi)
    const lessonTitles = [
      "Fuqarolik huquqiga kirish",
      "Huquqiy munosabatlar",
      "Shaxslar va obyektlar",
      "Mulk huquqi asoslari",
      "Shartnoma tushunchasi",
      "Shartnoma turlari",
      "Majburiyat huquqi",
      "Meros huquqi asoslari",
      "Vasiyat va qonuniy meros",
      "Tort huquqi",
      "Intellektual mulk",
      "Xalqaro fuqarolik huquqi",
    ];

    const lessonIds = [];
    for (let i = 0; i < lessonTitles.length; i++) {
      const { rows: [l] } = await client.query(`
        INSERT INTO lessons (course_id, order_num, title, duration_seconds, is_published)
        VALUES ($1,$2,$3,$4,true) RETURNING id
      `, [courseIds[0], i + 1, lessonTitles[i], 1500 + i * 120]);
      lessonIds.push(l.id);
    }

    // Add test for first lesson
    const { rows: [test] } = await client.query(`
      INSERT INTO tests (lesson_id, title, time_limit_minutes, pass_score_pct, max_attempts)
      VALUES ($1,'Nazorat testi — 1-dars',30,90,3) RETURNING id
    `, [lessonIds[0]]);

    const questions = [
      { q: "Fuqarolik huquqiy munosabatining subyektlari kimlar?", opts: ["Faqat jismoniy shaxslar", "Jismoniy va yuridik shaxslar", "Faqat davlat organlari", "Yuridik shaxslar va davlat"], c: 1 },
      { q: "Shartnoma deganda nima tushuniladi?", opts: ["Bir tomonlama akt", "Ikki yoki ko'p tomonlama kelishuv", "Davlat farmonlari", "Sud qarori"], c: 1 },
      { q: "Mulk huquqi qanday turlarga bo'linadi?", opts: ["Faqat shaxsiy va davlat", "Shaxsiy, jamoa va davlat", "Faqat umumiy mulk", "Xususiy va umumiy"], c: 3 },
    ];

    for (let i = 0; i < questions.length; i++) {
      const { rows: [q] } = await client.query(`
        INSERT INTO test_questions (test_id, question_text, points, order_num) VALUES ($1,$2,2,$3) RETURNING id
      `, [test.id, questions[i].q, i + 1]);
      for (let j = 0; j < questions[i].opts.length; j++) {
        await client.query(`
          INSERT INTO test_options (question_id, option_text, is_correct, order_num) VALUES ($1,$2,$3,$4)
        `, [q.id, questions[i].opts[j], j === questions[i].c, j + 1]);
      }
    }

    // Assignment for first lesson
    await client.query(`
      INSERT INTO assignments (lesson_id, title, description, deadline_days, submission_type)
      VALUES ($1,'1-dars uy ishi','Shartnoma turlari bo''yicha qisqacha tahlil yozing (500-700 so''z).',3,'both')
    `, [lessonIds[0]]);

    // Add progress for students (first 7 lessons completed)
    const scores = [94, 88, 96, 91, 87, 93, 89];
    for (const sid of studentIds) {
      for (let i = 0; i < Math.min(7, lessonIds.length); i++) {
        await client.query(`
          INSERT INTO lesson_progress (user_id, lesson_id, watched_seconds, is_completed, completed_at)
          VALUES ($1,$2,$3,true,NOW()) ON CONFLICT DO NOTHING
        `, [sid, lessonIds[i], 1500 + i * 120]);
      }
    }

    // Meeting
    await client.query(`
      INSERT INTO meetings (course_id, teacher_id, title, description, scheduled_at, duration_minutes, audience_type, status)
      VALUES ($1,$2,'Fuqarolik huquqi — 3-guruh','Haftalik video uchrashuv',NOW() + INTERVAL '2 hours',90,'all','scheduled')
    `, [courseIds[0], teacher.id]);

    await client.query('COMMIT');
    console.log('✅ Seed completed');
    console.log('   Admin:   admin@ya.uz / admin123');
    console.log('   Teacher: teacher@ya.uz / teacher123');
    console.log('   Demo students: alisher@ya.uz ... sarvinoz@ya.uz / student123');
    console.log('   Bulk students: s1@ya.uz ... s100@ya.uz / student123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
