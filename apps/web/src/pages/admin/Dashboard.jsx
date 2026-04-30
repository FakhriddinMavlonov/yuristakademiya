import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { admin as adminApi } from '../../api';
import { PageLoader } from '../../components/ui/Loading';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [studentStats, setStudentStats] = useState([]);
  const [teacherStats, setTeacherStats] = useState([]);
  const [payments, setPayments] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const { t } = useTranslation();

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    try {
      const [s, ss, ts, p, sal] = await Promise.all([
        adminApi.stats(), adminApi.studentStats(), adminApi.teacherStats(),
        adminApi.payments(), adminApi.salaries(),
      ]);
      setStats(s); setStudentStats(ss); setTeacherStats(ts);
      setPayments(p); setSalaries(sal);
    } catch (e) {}
  };

  if (!stats) return (
    <div className="page">
      <PageLoader text={t('admin.dashboard.loading')} />
    </div>
  );

  const totalUsers = (stats.admin_count || 0) + (stats.teacher_count || 0) + (stats.student_count || 0);
  const thisMonth = new Date();
  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.created_at);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  });
  const thisMonthRevenue = thisMonthPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const unpaidStudents = studentStats.filter(s => {
    const lastPayment = s.last_payment_date ? new Date(s.last_payment_date) : null;
    return !lastPayment || lastPayment < sevenDaysAgo;
  });

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { key: 'overview', label: t('admin.dashboard.overviewTab') },
          { key: 'students', label: t('admin.dashboard.studentsTab', { count: studentStats.length }) },
          { key: 'teachers', label: t('admin.dashboard.teachersTab', { count: teacherStats.length }) },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`btn ${activeTab === key ? 'btn-navy' : 'btn-ghost'}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="stats-row stagger" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <div className="stat-card">
              <div className="stat-num" style={{ color: 'var(--navy-text)' }}>{totalUsers}</div>
              <div className="stat-lbl">{t('admin.dashboard.totalUsers')}</div>
              <div className="stat-trend" style={{ color: 'var(--green)' }}>👥 {stats.teacher_count} {t('admin.dashboard.teachers')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-num" style={{ color: 'var(--green)' }}>{stats.teacher_count}</div>
              <div className="stat-lbl">{t('admin.dashboard.teachers')}</div>
              <div className="stat-trend" style={{ color: 'var(--muted)' }}>{stats.total_courses} {t('admin.dashboard.coursesCount')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-num" style={{ color: 'var(--blue)' }}>{stats.student_count}</div>
              <div className="stat-lbl">{t('admin.dashboard.students')}</div>
              <div className="stat-trend" style={{ color: 'var(--red)' }}>⚠️ {unpaidStudents.length} {t('admin.dashboard.toArchive')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-num" style={{ color: 'var(--amber)', fontSize: 20 }}>{(stats.total_revenue || 0).toLocaleString('uz')}</div>
              <div className="stat-lbl">{t('admin.dashboard.revenue')}</div>
              <div className="stat-trend" style={{ color: 'var(--green)' }}>💰 {thisMonthRevenue.toLocaleString('uz')} {t('admin.dashboard.thisMonth')}</div>
            </div>
          </div>

          <div className="r-2col-eq">
            <div className="card">
              <div className="card-hd"><h3>{t('admin.dashboard.recentPayments')}</h3></div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t('admin.dashboard.studentCol')}</th>
                      <th>{t('admin.dashboard.courseCol')}</th>
                      <th>{t('admin.dashboard.amountCol')}</th>
                      <th>{t('admin.dashboard.dateCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 8).map((p, i) => (
                      <tr key={p.id} style={{ animation: `fadeSlideUp 0.18s ease-out ${i * 30}ms both` }}>
                        <td style={{ fontWeight: 600 }}>{p.first_name} {p.last_name?.[0]}.</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.course_title || '—'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--green)' }}>{p.amount.toLocaleString('uz')} UZS</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString('uz')}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>{t('admin.dashboard.noPayments')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-hd"><h3>{t('admin.dashboard.recentSalaries')}</h3></div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t('admin.dashboard.nameCol')}</th>
                      <th>{t('admin.dashboard.roleCol')}</th>
                      <th>{t('admin.dashboard.amountCol')}</th>
                      <th>{t('admin.dashboard.monthCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaries.slice(0, 8).map((s, i) => (
                      <tr key={s.id} style={{ animation: `fadeSlideUp 0.18s ease-out ${i * 30}ms both` }}>
                        <td style={{ fontWeight: 600 }}>{s.first_name} {s.last_name?.[0]}.</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {s.role === 'teacher' ? t('status.teacher') : t('status.employee')}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--navy-text)' }}>{s.amount.toLocaleString('uz')} UZS</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(s.period_month).toLocaleDateString('uz', { month: 'long', year: 'numeric' })}</td>
                      </tr>
                    ))}
                    {salaries.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>{t('admin.dashboard.noSalaries')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'students' && (
        <div className="card" style={{ animation: 'fadeSlideUp 0.2s ease-out' }}>
          <div className="card-hd"><h3>{t('admin.dashboard.studentStats')}</h3></div>
          <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t('admin.dashboard.nameCol')}</th>
                  <th>{t('admin.dashboard.phoneCol')}</th>
                  <th>{t('admin.dashboard.enrolledCol')}</th>
                  <th>{t('admin.dashboard.completedLessonsCol')}</th>
                  <th>{t('admin.dashboard.completionCol')}</th>
                  <th>{t('admin.dashboard.lastPaymentCol')}</th>
                  <th>{t('admin.dashboard.totalPaidCol')}</th>
                  <th>{t('admin.dashboard.statusCol')}</th>
                </tr>
              </thead>
              <tbody>
                {studentStats.map((s, i) => {
                  const completion = s.total_lessons > 0 ? Math.round((s.completed_lessons / s.total_lessons) * 100) : 0;
                  const shouldArchive = !s.last_payment_date || new Date(s.last_payment_date) < sevenDaysAgo;
                  const barColor = completion >= 75 ? 'var(--green)' : completion >= 50 ? 'var(--amber)' : 'var(--blue)';
                  return (
                    <tr key={s.id} style={{ animation: `fadeSlideUp 0.18s ease-out ${Math.min(i * 25, 300)}ms both` }}>
                      <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.first_name} {s.last_name}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{s.phone}</td>
                      <td style={{ textAlign: 'center', color: 'var(--ink)' }}>{s.enrolled_courses}</td>
                      <td style={{ textAlign: 'center', color: 'var(--ink)' }}>{s.completed_lessons}/{s.total_lessons}</td>
                      <td>
                        <div style={{ width: 60, height: 6, background: 'var(--line-2)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${completion}%`, height: '100%', background: barColor, transition: 'width 0.8s ease', borderRadius: 4 }} />
                        </div>
                        <div style={{ fontSize: 11, marginTop: 3, color: 'var(--muted)' }}>{completion}%</div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {s.last_payment_date ? new Date(s.last_payment_date).toLocaleDateString('uz') : '—'}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.total_paid.toLocaleString('uz')} UZS</td>
                      <td>
                        <span className={`pill ${shouldArchive ? 'pill-red' : s.is_active ? 'pill-green' : 'pill-amber'}`}>
                          {shouldArchive ? t('status.toArchive') : s.is_active ? t('status.active') : t('status.inactive')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'teachers' && (
        <div className="card" style={{ animation: 'fadeSlideUp 0.2s ease-out' }}>
          <div className="card-hd"><h3>{t('admin.dashboard.teacherStats')}</h3></div>
          <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t('admin.dashboard.nameCol')}</th>
                  <th>{t('admin.dashboard.phoneCol')}</th>
                  <th>{t('admin.dashboard.coursesCol')}</th>
                  <th>{t('admin.dashboard.studentCountCol')}</th>
                  <th>{t('admin.dashboard.videoGbCol')}</th>
                  <th>{t('admin.dashboard.statusCol')}</th>
                </tr>
              </thead>
              <tbody>
                {teacherStats.map((teacher, i) => (
                  <tr key={teacher.id} style={{ animation: `fadeSlideUp 0.18s ease-out ${Math.min(i * 25, 300)}ms both` }}>
                    <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{teacher.first_name} {teacher.last_name}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{teacher.phone}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--navy-text)' }}>{teacher.course_count}</td>
                    <td style={{ textAlign: 'center', color: 'var(--ink)' }}>{teacher.student_count}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--ink)' }}>{teacher.total_video_gb} GB</td>
                    <td>
                      <span className={`pill ${teacher.is_active ? 'pill-green' : 'pill-red'}`}>
                        {teacher.is_active ? t('status.active') : t('status.inactive')}
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
