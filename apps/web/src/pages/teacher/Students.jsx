import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { courses as coursesApi } from '../../api';
import useStore from '../../store/useStore';
import { SkeletonGrid } from '../../components/ui/Loading';

const COLORS = [
  ['#E8EDFB', '#1B2A6B'], ['#FEF3DC', '#B87A10'], ['#ECFDF3', '#027A48'],
  ['#FEF3F2', '#B42318'], ['#F5EAFB', '#534AB7'],
];

export default function TeacherStudents() {
  const navigate = useNavigate();
  const { showToast } = useStore();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('active');
  const { t } = useTranslation();

  useEffect(() => {
    coursesApi.myStudents()
      .then(setStudents)
      .catch(() => showToast(t('teacher.students.loadError')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s => {
    const isActive = s.is_active;
    if (tab === 'active' && !isActive) return false;
    if (tab === 'inactive' && isActive) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    );
  });

  const activeCount = students.filter(s => s.is_active).length;
  const inactiveCount = students.filter(s => !s.is_active).length;

  if (loading) {
    return (
      <div className="page">
        <SkeletonGrid count={8} minWidth={200} />
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t('teacher.students.title')}</h2>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {t('teacher.students.total', { count: students.length })}
          </div>
        </div>
        <input
          className="finput"
          placeholder={t('teacher.students.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220, fontSize: 13 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'active', label: t('teacher.students.activeTab', { count: activeCount }) },
          { key: 'inactive', label: t('teacher.students.inactiveTab', { count: inactiveCount }) },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: tab === item.key ? 'var(--navy)' : 'var(--bg)',
              color: tab === item.key ? '#fff' : 'var(--muted)',
              transition: 'all .15s',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--hint)', fontSize: 13 }}>
            {tab === 'active' ? t('teacher.students.noActive') : t('teacher.students.noInactive')}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {filtered.map((s, i) => {
            const [bg, tc] = COLORS[i % COLORS.length];
            return (
              <div
                key={s.id}
                className="card"
                style={{ cursor: 'pointer', transition: 'transform .15s', padding: 0 }}
                onClick={() => navigate(`/teacher/students/${s.id}`)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
                  <div style={{ width: 52, height: 52, background: bg, color: tc, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                    {s.first_name?.[0]}{s.last_name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.first_name} {s.last_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.phone}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--bg)', borderRadius: 6, padding: '3px 8px' }}>
                    {s.course_title}
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                    <span style={{ color: 'var(--muted)' }}>📚 {s.completed_lessons}/{s.total_lessons}</span>
                    <span style={{ color: s.avg_score >= 70 ? 'var(--green)' : s.avg_score >= 50 ? 'var(--amber)' : 'var(--muted)' }}>
                      ⭐ {s.avg_score ? `${Math.round(s.avg_score)}%` : '—'}
                    </span>
                  </div>
                  {!s.is_active && (
                    <span style={{ fontSize: 10, background: '#FEF3F2', color: '#B42318', borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>
                      {t('teacher.students.inactive')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
