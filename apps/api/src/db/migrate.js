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
        pass_score_pct INTEGER DEFAULT 90,
        max_attempts INTEGER DEFAULT 3,
        shuffle_questions BOOLEAN DEFAULT true,
        show_answers_after BOOLEAN DEFAULT true,
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

    await client.query('COMMIT');
    console.log('✅ Migration completed — 26 tables created');
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
