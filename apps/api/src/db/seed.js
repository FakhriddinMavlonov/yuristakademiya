require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hash = (pw) => bcrypt.hashSync(pw, 10);

    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified)
      VALUES ($1,$2,$3,$4,'admin',true)
      ON CONFLICT (email) DO UPDATE SET
        password_hash=EXCLUDED.password_hash,
        first_name=EXCLUDED.first_name,
        last_name=EXCLUDED.last_name,
        role='admin',
        is_verified=true
    `, ['yuristadmin@gmail.com', hash('yuristPass123'), 'Admin', 'Yurist']);

    await client.query('COMMIT');
    console.log('✅ Seed completed');
    console.log('   Admin: yuristadmin@gmail.com / yuristPass123');
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
