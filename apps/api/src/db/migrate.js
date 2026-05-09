require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const { pool } = require('../config/db');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin','teacher','student')),
        phone VARCHAR(20) UNIQUE,
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        otp_code VARCHAR(6),
        otp_expires_at TIMESTAMPTZ,
        telegram_chat_id VARCHAR(30),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 1b. Add new columns to users if they don't exist (idempotent)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(30)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS second_phone VARCHAR(20)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS third_phone VARCHAR(20)`);
    // New phone columns: clearer separation between call-only and Telegram-verified
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS call_phone VARCHAR(20)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_phone VARCHAR(20)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_call_phone VARCHAR(20)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_telegram_phone VARCHAR(20)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_telegram_chat_id VARCHAR(30)`);
    // Online lesson schedule preference: 'mwf' (Mon/Wed/Fri) or 'tts' (Tue/Thu/Sat)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lesson_days VARCHAR(5)`);
    await client.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`);

    // 2. courses
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        intro_video_url TEXT,
        category VARCHAR(100),
        level VARCHAR(50) DEFAULT 'beginner',
        banner_gradient VARCHAR(255) DEFAULT 'linear-gradient(135deg,#0C1A52,#1E2D8A)',
        teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add intro_video_url column if it doesn't exist
    await client.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS intro_video_url TEXT`);
    // Course delivery mode: 'online' (self-paced video lessons) or 'offline' (in-person classroom)
    await client.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS mode VARCHAR(10) DEFAULT 'online' CHECK (mode IN ('online','offline'))`);

    // 3. enrollments
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        UNIQUE(user_id, course_id)
      )
    `);

    // 4. lessons
    await client.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        order_num INTEGER NOT NULL DEFAULT 1,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        video_guid VARCHAR(255),
        video_url TEXT,
        video_thumbnail TEXT,
        duration_seconds INTEGER DEFAULT 0,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 5. lesson_progress
    await client.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        watched_seconds INTEGER DEFAULT 0,
        is_completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, lesson_id)
      )
    `);

    // 6. materials
    await client.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50),
        file_size_bytes BIGINT DEFAULT 0,
        add_to_library BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 7. tests
    await client.query(`
      CREATE TABLE IF NOT EXISTS tests (
        id SERIAL PRIMARY KEY,
        lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        time_limit_minutes INTEGER DEFAULT 30,
        pass_score_pct INTEGER DEFAULT 80,
        max_attempts INTEGER DEFAULT 3,
        shuffle_questions BOOLEAN DEFAULT true,
        show_answers_after BOOLEAN DEFAULT true,
        passages JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 8. test_questions
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_questions (
        id SERIAL PRIMARY KEY,
        test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        points INTEGER DEFAULT 2,
        order_num INTEGER DEFAULT 1
      )
    `);

    // 9. test_options
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_options (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
        option_text TEXT NOT NULL,
        is_correct BOOLEAN DEFAULT false,
        order_num INTEGER DEFAULT 1
      )
    `);

    // 10. test_attempts
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        score_pct NUMERIC(5,2),
        passed BOOLEAN DEFAULT false,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        submitted_at TIMESTAMPTZ
      )
    `);

    // 11. test_attempt_answers
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_attempt_answers (
        id SERIAL PRIMARY KEY,
        attempt_id INTEGER NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES test_questions(id),
        selected_option_id INTEGER REFERENCES test_options(id)
      )
    `);

    // 12. assignments
    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        deadline_days INTEGER DEFAULT 3,
        submission_type VARCHAR(30) DEFAULT 'text' CHECK (submission_type IN ('text','file','both')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 13. assignment_submissions
    await client.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_text TEXT,
        file_url TEXT,
        score INTEGER,
        feedback TEXT,
        graded_by INTEGER REFERENCES users(id),
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        graded_at TIMESTAMPTZ,
        UNIQUE(assignment_id, user_id)
      )
    `);

    // 14. meetings
    await client.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        scheduled_at TIMESTAMPTZ NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        audience_type VARCHAR(20) DEFAULT 'all' CHECK (audience_type IN ('all','selected')),
        status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
        daily_room_name VARCHAR(255),
        daily_room_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add daily.co columns if they don't exist
    await client.query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS daily_room_name VARCHAR(255)`);
    await client.query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS daily_room_url TEXT`);

    // 15. meeting_participants
    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_participants (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(meeting_id, user_id)
      )
    `);

    // 16. messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 17. library_items
    await client.query(`
      CREATE TABLE IF NOT EXISTS library_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(30) DEFAULT 'material' CHECK (type IN ('material','test','video','sample')),
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        file_url TEXT,
        file_type VARCHAR(50),
        file_size_bytes BIGINT DEFAULT 0,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 18. notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        body TEXT,
        data_json JSONB,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 19. payments
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        amount NUMERIC(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'UZS',
        description TEXT,
        status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid','pending','refunded')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 20. salaries
    await client.query(`
      CREATE TABLE IF NOT EXISTS salaries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        amount NUMERIC(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'UZS',
        description TEXT,
        period_month DATE,
        status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid','pending')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 21. telegram_messages (for storing bot conversations)
    await client.query(`
      CREATE TABLE IF NOT EXISTS telegram_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        telegram_chat_id VARCHAR(30) NOT NULL,
        sender VARCHAR(20) NOT NULL CHECK (sender IN ('user','bot')),
        message_text TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text','button','info')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 22. groups (guruhlar)
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        shift VARCHAR(20) DEFAULT 'morning' CHECK (shift IN ('morning','afternoon','evening','weekend')),
        capacity INTEGER DEFAULT 25,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','finished','cancelled')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 23. group_students
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_students (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(group_id, user_id)
      )
    `);

    // 24. schedule_slots (haftalik dars jadvali)
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_slots (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        room VARCHAR(50) DEFAULT 'Online',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 25. attendance (davomat)
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'absent' CHECK (status IN ('present','late','absent','excused')),
        marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(group_id, user_id, date)
      )
    `);

    // 26. daily_grades (kunlik baholar jurnali)
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_grades (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 10),
        comment TEXT,
        marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(group_id, user_id, date)
      )
    `);

    // 27. mock_exams (haftalik mock imtihonlar)
    await client.query(`
      CREATE TABLE IF NOT EXISTS mock_exams (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        topic TEXT,
        scheduled_at TIMESTAMPTZ NOT NULL,
        location VARCHAR(255) DEFAULT 'O''quv markaz',
        duration_minutes INTEGER DEFAULT 90,
        max_score INTEGER DEFAULT 100,
        status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 28. mock_exam_groups (mock_exam <-> group many-to-many)
    await client.query(`
      CREATE TABLE IF NOT EXISTS mock_exam_groups (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        UNIQUE(exam_id, group_id)
      )
    `);

    // 29. mock_exam_results (har bir o'quvchi natijasi)
    await client.query(`
      CREATE TABLE IF NOT EXISTS mock_exam_results (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score NUMERIC(5,2),
        feedback TEXT,
        posted_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(exam_id, user_id)
      )
    `);

    // 30. push_subscriptions (web push notifications)
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // group_id column for meetings (so meeting can be tied to a group, not just course)
    await client.query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL`);

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_course_id ON payments(course_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_salaries_user_id ON salaries(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_salaries_period_month ON salaries(period_month)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_salaries_created_at ON salaries(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_id ON telegram_messages(telegram_chat_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_telegram_messages_user_id ON telegram_messages(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_telegram_messages_created_at ON telegram_messages(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_groups_teacher_id ON groups(teacher_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_group_students_user_id ON group_students(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_group_date ON attendance(group_id, date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_daily_grades_group_date ON daily_grades(group_id, date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_daily_grades_user_id ON daily_grades(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mock_exams_teacher ON mock_exams(teacher_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mock_exams_scheduled ON mock_exams(scheduled_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mock_exam_groups_group ON mock_exam_groups(group_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mock_exam_results_user ON mock_exam_results(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)`);

    // meeting_reminder_log — tracks which reminders have already been sent
    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_reminder_log (
        id           SERIAL PRIMARY KEY,
        meeting_id   INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        reminder_type VARCHAR(10) NOT NULL,
        sent_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(meeting_id, reminder_type)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reminder_log_meeting ON meeting_reminder_log(meeting_id)`);

    // Schema additions for existing DBs
    await client.query(`ALTER TABLE tests ADD COLUMN IF NOT EXISTS passages JSONB DEFAULT '[]'`);
    // Lower default test pass threshold from 90 → 80 (also update existing 90s)
    await client.query(`ALTER TABLE tests ALTER COLUMN pass_score_pct SET DEFAULT 80`);
    await client.query(`UPDATE tests SET pass_score_pct = 80 WHERE pass_score_pct = 90`);
    // Mock exam shared answer key — visible to all students once teacher posts it
    await client.query(`ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS answer_text TEXT`);
    // Link a meeting to its specific lesson (online courses)
    await client.query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_meetings_lesson ON meetings(lesson_id)`);
    // Default meeting time per lesson (HH:MM:SS) — used when auto-scheduling next-day meeting
    await client.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS default_meeting_time TIME DEFAULT '19:00'`);
    // Change the column default and update any existing rows still at 05:30
    await client.query(`ALTER TABLE lessons ALTER COLUMN default_meeting_time SET DEFAULT '19:00'`);
    await client.query(`UPDATE lessons SET default_meeting_time='19:00' WHERE default_meeting_time='05:30:00'`);
    // Track whether a participant actually joined (attended) a meeting — for one-time-per-lesson logic
    await client.query(`ALTER TABLE meeting_participants ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ`);
    // Track which teacher (offline) created/registered this student
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    // Supplementary reading links per lesson stored as [{title,url}] JSON
    await client.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS supplementary_links JSONB DEFAULT '[]'`);

    // ─── OFFLINE MODE: Kurs reja (Curriculum) tables ───────────────────────────────────────

    // Kurs reja shablonlari (shablon sifatida yaratilgan)
    await client.query(`
      CREATE TABLE IF NOT EXISTS curricula (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Shablon darslar (kurs rejada tartiblangan)
    await client.query(`
      CREATE TABLE IF NOT EXISTS curriculum_lessons (
        id SERIAL PRIMARY KEY,
        curriculum_id INTEGER NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
        order_num SMALLINT NOT NULL DEFAULT 1,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Shablon topshiriq/test/vazifa (type: 'task'|'homework'|'test'|'rubric')
    await client.query(`
      CREATE TABLE IF NOT EXISTS curriculum_tasks (
        id SERIAL PRIMARY KEY,
        curriculum_lesson_id INTEGER NOT NULL REFERENCES curriculum_lessons(id) ON DELETE CASCADE,
        type VARCHAR(20) DEFAULT 'task',
        title VARCHAR(300) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Guruh darslar (shablon yoki qo'lda yaratilgan)
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_lessons (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        curriculum_lesson_id INTEGER REFERENCES curriculum_lessons(id) ON DELETE SET NULL,
        order_num SMALLINT NOT NULL DEFAULT 1,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        video_url TEXT,
        video_guid VARCHAR(200),
        extra_tasks TEXT,
        is_completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Guruh dars materiallari (kitoblar, PDF-lar, hujjatlar)
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_lesson_materials (
        id SERIAL PRIMARY KEY,
        group_lesson_id INTEGER NOT NULL REFERENCES group_lessons(id) ON DELETE CASCADE,
        name VARCHAR(300) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50),
        file_size_bytes BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Gamification — XP va streak
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_points (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_xp INTEGER DEFAULT 0,
        current_level INTEGER DEFAULT 1,
        daily_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_active_date DATE,
        streak_freeze_count INTEGER DEFAULT 0,
        UNIQUE(user_id)
      )
    `);

    // Gamification — badges/achievements
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_key VARCHAR(60) NOT NULL,
        earned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, badge_key)
      )
    `);

    // Spaced Repetition — flashcard decks
    await client.query(`
      CREATE TABLE IF NOT EXISTS flashcard_decks (
        id SERIAL PRIMARY KEY,
        lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
        group_lesson_id INTEGER REFERENCES group_lessons(id) ON DELETE SET NULL,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Spaced Repetition — flashcards (savol-javob kartalari)
    await client.query(`
      CREATE TABLE IF NOT EXISTS flashcards (
        id SERIAL PRIMARY KEY,
        deck_id INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Spaced Repetition — user review history (SM-2 algoritm)
    await client.query(`
      CREATE TABLE IF NOT EXISTS flashcard_reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
        ease_factor REAL DEFAULT 2.5,
        interval_days INTEGER DEFAULT 1,
        repetition_count INTEGER DEFAULT 0,
        next_review_date DATE DEFAULT CURRENT_DATE,
        last_reviewed_at TIMESTAMPTZ,
        UNIQUE(user_id, flashcard_id)
      )
    `);

    // Parent Portal — ota-ona va talaba bog'lanish
    await client.query(`
      CREATE TABLE IF NOT EXISTS parent_links (
        id SERIAL PRIMARY KEY,
        parent_phone VARCHAR(20) NOT NULL,
        parent_name VARCHAR(120),
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(parent_phone, student_id)
      )
    `);

    // AI Tutor — conversation history
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
        group_lesson_id INTEGER REFERENCES group_lessons(id) ON DELETE SET NULL,
        messages JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indices for new curriculum/lesson tables
    await client.query(`CREATE INDEX IF NOT EXISTS idx_curricula_teacher ON curricula(teacher_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_curriculum_lessons_curriculum ON curriculum_lessons(curriculum_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_curriculum_tasks_lesson ON curriculum_tasks(curriculum_lesson_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_group_lessons_group ON group_lessons(group_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_group_lessons_curriculum_lesson ON group_lessons(curriculum_lesson_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_group_lesson_materials_lesson ON group_lesson_materials(group_lesson_id)`);

    // Indices for Sprint 1 tables
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_user_next ON flashcard_reviews(user_id, next_review_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_card ON flashcard_reviews(flashcard_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_parent_links_student ON parent_links(student_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id)`);

    await client.query('COMMIT');
    console.log('✅ Migration completed — 38 tables created (Sprint 1: 7 new)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
