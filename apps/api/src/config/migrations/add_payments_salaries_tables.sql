-- Create payments table for course payments tracking
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'UZS',
  description TEXT,
  status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid','pending','refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create salaries table for staff salary tracking
CREATE TABLE IF NOT EXISTS salaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'UZS',
  description TEXT,
  period_month DATE,
  status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid','pending')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_salaries_user_id ON salaries(user_id);
CREATE INDEX IF NOT EXISTS idx_salaries_period_month ON salaries(period_month);
CREATE INDEX IF NOT EXISTS idx_salaries_created_at ON salaries(created_at);
