import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { courses as coursesApi } from '../../api';
import useStore from '../../store/useStore';
import { SkeletonGrid } from '../../components/ui/Loading';

const LEVEL_PILL = { beginner: 'pill-green', intermediate: 'pill-blue', advanced: 'pill-amber' };
const CATEGORY_COLORS = {
  'Fuqarolik huquqi': ['#E8EDFB', '#1B2A6B'],
  'Mehnat huquqi': ['#ECFDF3', '#027A48'],
  'Jinoyat huquqi': ['#FEF3F2', '#B42318'],
  'default': ['#F5EAFB', '#534AB7'],
};

export default function StudentCourses() {
  const [courseList, setCourseList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);
  const { showToast, mode } = useStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    setLoading(true);
    coursesApi.list(mode).then((d) => { setCourseList(d); setLoading(false); }).catch(() => setLoading(false));
  }, [mode]);

  const enroll = async (e, courseId) => {
    e.stopPropagation();
    setEnrollingId(courseId);
    try {
      await coursesApi.enroll(courseId);
      setCourseList((p) => p.map((c) => c.id === courseId ? { ...c, enrolled_at: new Date().toISOString() } : c));
      showToast(t('student.courses.enrolled'));
    } catch { showToast(t('common.error')); }
    setEnrollingId(null);
  };

  const enrolled = courseList.filter((c) => c.enrolled_at);
  const available = courseList.filter((c) => !c.enrolled_at);

  const getCourseBtn = (progress) => {
    if (progress === 100) return t('student.courses.completed');
    if (progress > 0) return t('student.courses.continue');
    return t('student.courses.start');
  };

  if (loading) {
    return (
      <div className="page">
        <SkeletonGrid count={6} minWidth={280} />
      </div>
    );
  }

  return (
    <div className="page">
      {enrolled.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', fontFamily: 'Sora' }}>{t('student.courses.myCourses')}</h3>
            <span className="pill pill-navy" style={{ background: 'var(--navy)', color: '#fff' }}>{enrolled.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
            {enrolled.map((c) => {
              const progress = c.lesson_count ? Math.round(((c.completed_lessons || 0) / c.lesson_count) * 100) : 0;
              const color = progress >= 80 ? 'var(--green)' : progress >= 40 ? 'var(--blue)' : 'var(--amber)';
              const [bg, tc] = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.default;
              return (
                <div
                  key={c.id}
                  className="card"
                  style={{ cursor: 'pointer', transition: 'transform .15s' }}
                  onClick={() => navigate(`/student/courses/${c.id}/lessons`)}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ height: 90, background: c.banner_gradient || `linear-gradient(135deg, ${bg}, ${tc}20)`, borderRadius: 'var(--r-md) var(--r-md) 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 36 }}>⚖️</span>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Sora', lineHeight: 1.3 }}>{c.title}</div>
                      <span className={`pill ${LEVEL_PILL[c.level] || 'pill-blue'}`} style={{ flexShrink: 0 }}>
                        {t(`levels.${c.level}`) || c.level}
                      </span>
                    </div>
                    <div className="pb-wrap" style={{ marginBottom: 4 }}>
                      <div className="pb-fill" style={{ width: `${progress}%`, background: color }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                      <span>{c.completed_lessons || 0}/{c.lesson_count || 0} {t('common.lessons')}</span>
                      <span style={{ fontWeight: 700, color }}>{progress}%</span>
                    </div>
                    <button
                      className="btn btn-navy"
                      style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/student/courses/${c.id}/lessons`); }}
                    >
                      {getCourseBtn(progress)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {available.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', fontFamily: 'Sora' }}>{t('student.courses.availableCourses')}</h3>
            <span className="pill pill-amber">{available.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {available.map((c) => {
              const [bg, tc] = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.default;
              return (
                <div key={c.id} className="card" style={{ opacity: .92 }}>
                  <div style={{ height: 90, background: c.banner_gradient || `linear-gradient(135deg, ${bg}, ${tc}20)`, borderRadius: 'var(--r-md) var(--r-md) 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 36 }}>⚖️</span>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Sora', lineHeight: 1.3 }}>{c.title}</div>
                      <span className={`pill ${LEVEL_PILL[c.level] || 'pill-blue'}`} style={{ flexShrink: 0 }}>
                        {t(`levels.${c.level}`) || c.level}
                      </span>
                    </div>
                    {c.description && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                      <span style={{ background: bg, color: tc, padding: '2px 7px', borderRadius: 5, fontWeight: 600 }}>{c.category}</span>
                      {c.lesson_count > 0 && <span>{c.lesson_count} {t('common.lessons')}</span>}
                    </div>
                    <button
                      className="btn btn-gold"
                      style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                      disabled={enrollingId === c.id}
                      onClick={(e) => enroll(e, c.id)}
                    >
                      {enrollingId === c.id ? t('student.courses.enrolling') : t('student.courses.enroll')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {courseList.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--hint)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: 14 }}>{t('student.courses.noCourses')}</div>
        </div>
      )}
    </div>
  );
}
