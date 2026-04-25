import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { courses as coursesApi } from '../../api';
import useStore from '../../store/useStore';
import { PageLoader } from '../../components/ui/Loading';

export default function CourseOverview() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useStore();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const { t } = useTranslation();

  useEffect(() => { loadCourse(); }, [courseId]);

  const loadCourse = async () => {
    setLoading(true);
    try {
      const result = await coursesApi.get(courseId);
      setCourse(result);
    } catch (e) {
      showToast(t('student.course.notFound'));
      navigate('/student/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await coursesApi.enroll(courseId);
      showToast(t('student.courses.enrolled'));
      navigate(`/student/courses/${courseId}/lessons`);
    } catch (e) {
      showToast(e?.message || t('common.error'));
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <PageLoader text={t('common.loading')} />
      </div>
    );
  }

  if (!course) {
    return <div className="page"><div style={{ textAlign: 'center', color: 'var(--muted)' }}>{t('student.course.notFound')}</div></div>;
  }

  const levelLabel = t(`levels.${course.level}`) || course.level;

  return (
    <div className="page" style={{ maxWidth: '100%', padding: 0 }}>
      <div style={{
        background: course.banner_gradient || 'linear-gradient(135deg,#0C1A52,#1E2D8A)',
        padding: '40px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        <div style={{ maxWidth: 900, width: '100%' }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff', margin: '0 0 12px', fontFamily: 'Sora' }}>
            {course.title}
          </h1>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>
            📚 {course.category || 'Huquq'} • 📊 {levelLabel}
          </div>
        </div>

        {course.intro_video_url && (
          <div style={{
            maxWidth: 900, width: '100%',
            background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9',
          }}>
            <video src={course.intro_video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
          </div>
        )}
      </div>

      <div style={{ padding: '40px 20px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
          <div>
            <div className="card">
              <div className="card-hd"><h2>{t('student.course.about')}</h2></div>
              <div className="card-body" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--ink)' }}>
                {course.description || t('student.course.noInfo')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  className="btn btn-gold"
                  onClick={handleEnroll}
                  disabled={enrolling}
                  style={{ justifyContent: 'center', padding: '12px' }}
                >
                  {enrolling ? t('student.course.enrolling') : t('student.course.enrollBtn')}
                </button>
                <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 8, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                  {t('student.course.freeEnroll')}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-hd"><h3 style={{ margin: 0, fontSize: 13 }}>{t('student.course.courseInfo')}</h3></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>{t('student.course.lessonsLabel')}</span>
                  <span style={{ fontWeight: 600 }}>—</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>{t('student.course.testsLabel')}</span>
                  <span style={{ fontWeight: 600 }}>—</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>{t('student.course.levelLabel')}</span>
                  <span style={{ fontWeight: 600 }}>{levelLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
