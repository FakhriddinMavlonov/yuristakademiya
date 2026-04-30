import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { courses as coursesApi, assignments } from '../../api';
import { SkeletonStatCards, SkeletonTable, SkeletonCard } from '../../components/ui/Loading';

export default function TeacherDashboard() {
  const [courseList, setCourseList] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    Promise.all([
      coursesApi.list().catch(() => []),
      assignments.pending().catch(() => []),
    ]).then(([courses, pend]) => {
      setCourseList(courses);
      setPending(pend);
      setLoading(false);
    });
  }, []);

  const totalStudents = courseList.reduce((s, c) => s + (c.enrolled_count || 0), 0);
  const avgScore = courseList.length
    ? (courseList.reduce((s, c) => s + (parseFloat(c.avg_score) || 0), 0) / courseList.length).toFixed(1)
    : '—';

  if (loading) {
    return (
      <div className="page">
        <SkeletonStatCards count={4} />
        <div className="r-2col-side">
          <SkeletonTable rows={5} cols={4} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SkeletonCard rows={3} />
            <SkeletonCard rows={1} hasHeader={false} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="stats-row stagger" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--navy-text)' }}>{totalStudents || 0}</div>
          <div className="stat-lbl">{t('teacher.dashboard.totalStudents')}</div>
          <div className="stat-trend" style={{ color: 'var(--green)' }}>↑ 12 {t('teacher.dashboard.thisMonth')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--amber)' }}>{pending.length || 0}</div>
          <div className="stat-lbl">{t('teacher.dashboard.uncheckedHomework')}</div>
          <div className="stat-trend" style={{ color: 'var(--amber)' }}>{t('teacher.dashboard.waiting')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--green)' }}>{avgScore}%</div>
          <div className="stat-lbl">{t('teacher.dashboard.avgResult')}</div>
          <div className="stat-trend" style={{ color: 'var(--green)' }}>★ Samarqand #1</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--blue)' }}>{courseList.filter(c => c.status === 'published').length || 8}</div>
          <div className="stat-lbl">{t('teacher.dashboard.activeCourses')}</div>
          <div className="stat-trend" style={{ color: 'var(--muted)' }}>3 {t('teacher.dashboard.newCourses')}</div>
        </div>
      </div>

      <div className="r-2col-side">
        <div className="card">
          <div className="card-hd">
            <h3>{t('teacher.dashboard.recentHomework')}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/teacher/homework')}>{t('teacher.dashboard.seeAll')}</button>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t('teacher.dashboard.studentCol')}</th>
                <th>{t('teacher.dashboard.taskCol')}</th>
                <th>{t('teacher.dashboard.timeCol')}</th>
                <th>{t('teacher.dashboard.statusCol')}</th>
              </tr>
            </thead>
            <tbody>
              {pending.slice(0, 5).map((h, i) => (
                <tr key={h.id} style={{ animation: `fadeSlideUp 0.2s ease-out ${i * 40}ms both` }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'var(--blue-bg)', color: 'var(--blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, fontFamily: 'Sora', flexShrink: 0,
                      }}>
                        {h.first_name?.[0]}{h.last_name?.[0]}
                      </div>
                      {h.first_name} {h.last_name?.[0]}.
                    </div>
                  </td>
                  <td style={{ color: 'var(--ink)' }}>{h.assignment_title}</td>
                  <td style={{ color: 'var(--muted)' }}>{new Date(h.submitted_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td><span className="pill pill-amber">{t('status.pending')}</span></td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
                  <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>✅</div>
                  {t('teacher.dashboard.noPending')}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-hd"><h3>{t('teacher.dashboard.courseStatus')}</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {courseList.slice(0, 3).map((c, i) => {
                const score = parseFloat(c.avg_score) || 0;
                const color = score >= 90 ? 'var(--green)' : score >= 75 ? 'var(--amber)' : 'var(--blue)';
                return (
                  <div key={c.id} style={{ animationDelay: `${i * 60}ms` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.title}</span>
                      <span style={{ fontWeight: 700, color }}>{score ? `${score}%` : '—'}</span>
                    </div>
                    <div className="pb-wrap">
                      <div className="pb-fill" style={{ width: `${score}%`, background: color, transition: 'width 1s ease' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                      {c.enrolled_count} {t('common.students')}
                    </div>
                  </div>
                );
              })}
              {courseList.length === 0 && (
                <div style={{ textAlign: 'center', padding: 16, color: 'var(--hint)', fontSize: 12 }}>
                  <span style={{ animation: 'pulse-soft 2s infinite', display: 'inline-block' }}>📊</span>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-hd"><h3>{t('teacher.dashboard.meetings')}</h3></div>
            <div className="card-body">
              <button className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/teacher/meetings')}>
                {t('teacher.dashboard.goToMeetings')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
