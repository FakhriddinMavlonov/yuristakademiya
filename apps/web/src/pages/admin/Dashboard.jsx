import React, { useEffect, useState } from 'react';
import { admin as adminApi } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [studentStats, setStudentStats] = useState([]);
  const [teacherStats, setTeacherStats] = useState([]);
  const [payments, setPayments] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview | students | teachers

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [s, ss, ts, p, sal] = await Promise.all([
        adminApi.stats(),
        adminApi.studentStats(),
        adminApi.teacherStats(),
        adminApi.payments(),
        adminApi.salaries(),
      ]);
      setStats(s);
      setStudentStats(ss);
      setTeacherStats(ts);
      setPayments(p);
      setSalaries(sal);
    } catch (e) {}
  };

  if (!stats) return <div className="page"><div style={{ textAlign: 'center', padding: 40, color: 'var(--hint)' }}>Yuklanyapti...</div></div>;

  const totalUsers = (stats.admin_count || 0) + (stats.teacher_count || 0) + (stats.student_count || 0);
  const thisMonth = new Date();
  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.created_at);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  });
  const thisMonthRevenue = thisMonthPayments.reduce((s, p) => s + (p.amount || 0), 0);

  // Archive check: students with no payment in 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const unpaidStudents = studentStats.filter(s => {
    const lastPayment = s.last_payment_date ? new Date(s.last_payment_date) : null;
    return !lastPayment || lastPayment < sevenDaysAgo;
  });

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          className={`btn ${activeTab === 'overview' ? 'btn-navy' : 'btn-ghost'}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Umumiy statistika
        </button>
        <button
          className={`btn ${activeTab === 'students' ? 'btn-navy' : 'btn-ghost'}`}
          onClick={() => setActiveTab('students')}
        >
          👥 O'quvchilar ({studentStats.length})
        </button>
        <button
          className={`btn ${activeTab === 'teachers' ? 'btn-navy' : 'btn-ghost'}`}
          onClick={() => setActiveTab('teachers')}
        >
          👨‍🏫 Ustozlar ({teacherStats.length})
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <div className="stat-card">
              <div className="stat-num" style={{ color: 'var(--navy)' }}>{totalUsers}</div>
              <div className="stat-lbl">Jami foydalanuvchilar</div>
              <div className="stat-trend" style={{ color: 'var(--green)' }}>👥 {stats.teacher_count} ustoz</div>
            </div>
            <div className="stat-card">
              <div className="stat-num" style={{ color: 'var(--green)' }}>{stats.teacher_count}</div>
              <div className="stat-lbl">Ustozlar</div>
              <div className="stat-trend" style={{ color: 'var(--muted)' }}>{stats.total_courses} kurs</div>
            </div>
            <div className="stat-card">
              <div className="stat-num" style={{ color: 'var(--blue)' }}>{stats.student_count}</div>
              <div className="stat-lbl">O'quvchilar</div>
              <div className="stat-trend" style={{ color: 'var(--red)' }}>⚠️ {unpaidStudents.length} arxivlanishi kerak</div>
            </div>
            <div className="stat-card">
              <div className="stat-num" style={{ color: 'var(--amber)' }}>{(stats.total_revenue || 0).toLocaleString('uz')}</div>
              <div className="stat-lbl">Daromad (UZS)</div>
              <div className="stat-trend" style={{ color: 'var(--green)' }}>💰 {thisMonthRevenue.toLocaleString('uz')} bu oy</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="card">
              <div className="card-hd">
                <h3>So'nggi to'lovlar</h3>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr><th>O'quvchi</th><th>Kurs</th><th>Miqdor</th><th>Sana</th></tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 8).map((p) => (
                      <tr key={p.id}>
                        <td>{p.first_name} {p.last_name?.[0]}.</td>
                        <td style={{ fontSize: 12 }}>{p.course_title || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{p.amount.toLocaleString('uz')} UZS</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString('uz')}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>To'lov yo'q</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-hd">
                <h3>So'nggi oyliklar</h3>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr><th>Ismi</th><th>Rol</th><th>Miqdor</th><th>Oy</th></tr>
                  </thead>
                  <tbody>
                    {salaries.slice(0, 8).map((s) => (
                      <tr key={s.id}>
                        <td>{s.first_name} {s.last_name?.[0]}.</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{s.role === 'teacher' ? 'Ustoz' : 'Xodim'}</td>
                        <td style={{ fontWeight: 600 }}>{s.amount.toLocaleString('uz')} UZS</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(s.period_month).toLocaleDateString('uz', { month: 'long', year: 'numeric' })}</td>
                      </tr>
                    ))}
                    {salaries.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>Oylik yo'q</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'students' ? (
        <div className="card">
          <div className="card-hd">
            <h3>O'quvchilar statistikasi</h3>
          </div>
          <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Ismi</th><th>Telefon</th><th>Ro'yxatdan o'tgan kurslar</th><th>Tugallagan darslar</th><th>Taqqoslash %</th><th>Oxirgi to'lov</th><th>Jami to'lagan</th><th>Holat</th></tr>
              </thead>
              <tbody>
                {studentStats.map((s) => {
                  const completion = s.total_lessons > 0 ? Math.round((s.completed_lessons / s.total_lessons) * 100) : 0;
                  const shouldArchive = !s.last_payment_date || new Date(s.last_payment_date) < sevenDaysAgo;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{s.phone}</td>
                      <td style={{ textAlign: 'center' }}>{s.enrolled_courses}</td>
                      <td style={{ textAlign: 'center' }}>{s.completed_lessons}/{s.total_lessons}</td>
                      <td>
                        <div style={{ width: 60, height: 24, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${completion}%`, height: '100%', background: completion >= 75 ? 'var(--green)' : completion >= 50 ? 'var(--amber)' : 'var(--blue)', transition: 'width 0.2s' }} />
                        </div>
                        <div style={{ fontSize: 11, marginTop: 2, color: 'var(--muted)' }}>{completion}%</div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {s.last_payment_date ? new Date(s.last_payment_date).toLocaleDateString('uz') : '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.total_paid.toLocaleString('uz')} UZS</td>
                      <td>
                        <span className={`pill ${shouldArchive ? 'pill-red' : s.is_active ? 'pill-green' : 'pill-yellow'}`}>
                          {shouldArchive ? '⚠️ Arxivlanishi kerak' : s.is_active ? '✓ Faol' : '✗ Blokirovka'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-hd">
            <h3>Ustozlar statistikasi</h3>
          </div>
          <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Ismi</th><th>Telefon</th><th>Kurslar</th><th>O'quvchilar soni</th><th>Video hajmi (GB)</th><th>Holat</th></tr>
              </thead>
              <tbody>
                {teacherStats.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.first_name} {t.last_name}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{t.phone}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{t.course_count}</td>
                    <td style={{ textAlign: 'center' }}>{t.student_count}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{t.total_video_gb} GB</td>
                    <td>
                      <span className={`pill ${t.is_active ? 'pill-green' : 'pill-red'}`}>
                        {t.is_active ? '✓ Faol' : '✗ Blokirovka'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
