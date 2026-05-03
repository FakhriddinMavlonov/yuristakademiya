import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { courses as coursesApi, meetings as meetingsApi } from '../../api';
import { PageLoader, SkeletonStatCards, SkeletonCard } from '../../components/ui/Loading';
import { ensurePushSubscription, isPushSupported } from '../../lib/push';
import useStore from '../../store/useStore';

function PushPermissionBanner() {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  if (!isPushSupported()) return null;
  if (permission === 'granted' || done) return null;

  const enable = async () => {
    setLoading(true);
    const ok = await ensurePushSubscription();
    setLoading(false);
    if (ok) {
      setDone(true);
      setPermission('granted');
    } else {
      setPermission(Notification.permission);
    }
  };

  if (isIos && !isStandalone) {
    return (
      <div style={{
        background: 'linear-gradient(135deg,#0C1A52,#1E2D8A)', color: '#fff',
        borderRadius: 14, padding: '18px 20px', marginBottom: 20,
        display: 'flex', gap: 14, alignItems: 'flex-start',
      }}>
        <div style={{ fontSize: 32, flexShrink: 0 }}>📱</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
            Qo'ng'iroqni qabul qilish uchun ilovani o'rnating
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.55 }}>
            iPhone/iPad da dars boshlanishi haqida xabar olish uchun:<br />
            <strong>Safari → «Ulashish» tugmasi → «Bosh ekranga qo'shish»</strong>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div style={{
        background: 'var(--red-bg)', border: '1px solid rgba(229,57,53,.2)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 20,
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <div style={{ fontSize: 24 }}>🔕</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--red)', marginBottom: 3 }}>
            Bildirishnomalar bloklangan
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Brauzer sozlamalarida yuristakademiya uchun bildirishnomalarni yoqing, keyin sahifani yangilang.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg,#0C1A52 0%,#1B3A8A 100%)',
      borderRadius: 14, padding: '18px 20px', marginBottom: 20,
      display: 'flex', gap: 16, alignItems: 'center',
      boxShadow: '0 4px 20px rgba(12,26,82,0.25)',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, flexShrink: 0, animation: 'pulse 2s ease-in-out infinite',
      }}>📞</div>
      <div style={{ flex: 1, color: '#fff' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          Dars qo'ng'irog'ini ulash
        </div>
        <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>
          Ustoz darsni boshlaganida telefon/kompyuteringizda bildirishnoma kelsin — dastur yopiq bo'lsa ham.
        </div>
      </div>
      <button
        onClick={enable}
        disabled={loading}
        style={{
          background: '#FFD700', color: '#0C1A52', border: 'none',
          borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
          fontSize: 13, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? '...' : 'Yoqish'}
      </button>
    </div>
  );
}

export default function StudentDashboard() {
  const [courseList, setCourseList] = useState([]);
  const [meetingList, setMeetingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { mode } = useStore();
  useEffect(() => {
    setLoading(true);
    Promise.all([
      coursesApi.list(mode).catch(() => []),
      meetingsApi.list().catch(() => []),
    ]).then(([courses, meetings]) => {
      setCourseList(courses);
      setMeetingList(meetings);
      setLoading(false);
    });
  }, [mode]);

  const enrolled = courseList.filter(c => c.enrolled_at);
  const totalLessons = enrolled.reduce((s, c) => s + (c.completed_lessons || 0), 0);
  const avgScore = enrolled.length
    ? (enrolled.reduce((s, c) => s + (c.avg_score || 0), 0) / enrolled.length).toFixed(0)
    : 0;
  const nextMeeting = meetingList[0];

  const getStatusLabel = (progress) => {
    if (progress === 100) return t('status.completed');
    if (progress > 0) return t('status.inProgress');
    return t('status.new');
  };

  if (loading) {
    return (
      <div className="page">
        <SkeletonStatCards count={4} />
        <div className="r-2col-side">
          <SkeletonCard rows={3} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SkeletonCard rows={1} />
            <SkeletonCard rows={2} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PushPermissionBanner />
      <div className="stats-row stagger" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--navy-text)' }}>{enrolled.length}</div>
          <div className="stat-lbl">{t('student.dashboard.activeCourses')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--green)' }}>{avgScore || 0}%</div>
          <div className="stat-lbl">{t('student.dashboard.avgScore')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--amber)' }}>2</div>
          <div className="stat-lbl">{t('student.dashboard.pendingHomework')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--blue)' }}>{totalLessons}</div>
          <div className="stat-lbl">{t('student.dashboard.completedLessons')}</div>
        </div>
      </div>

      <div className="r-2col-side">
        <div className="card">
          <div className="card-hd"><h3>{t('student.dashboard.myCourses')}</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {enrolled.map((c, i) => {
              const progress = c.lesson_count ? Math.round((c.completed_lessons / c.lesson_count) * 100) : 0;
              const color = progress >= 80 ? 'var(--green)' : progress >= 40 ? 'var(--blue)' : 'var(--amber)';
              return (
                <div key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                    background: 'var(--bg)', borderRadius: 'var(--r-md)', cursor: 'pointer',
                    transition: 'transform .15s, box-shadow .15s',
                    animationDelay: `${i * 40}ms`,
                  }}
                  className="card"
                  onClick={() => navigate(`/student/courses/${c.id}/lessons`)}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.boxShadow = 'var(--sh-md)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = ''; }}
                >
                  <div style={{ width: 44, height: 44, background: c.banner_gradient || 'var(--navy)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'var(--gold)', fontSize: 18 }}>⚖️</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>{c.title}</div>
                    <div className="pb-wrap">
                      <div className="pb-fill" style={{ width: `${progress}%`, background: color, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      <span>{c.completed_lessons || 0}/{c.lesson_count || 0} {t('common.lessons')}</span>
                      <span style={{ fontWeight: 700, color }}>{progress}%</span>
                    </div>
                  </div>
                  <span className={`pill${progress === 100 ? ' pill-green' : progress > 0 ? ' pill-blue' : ' pill-amber'}`}>
                    {getStatusLabel(progress)}
                  </span>
                </div>
              );
            })}
            {enrolled.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--hint)' }}>
                <div style={{ fontSize: 40, marginBottom: 10, animation: 'pulse-soft 2s ease-in-out infinite' }}>📚</div>
                <div style={{ marginBottom: 12, color: 'var(--muted)' }}>{t('student.dashboard.noCourses')}</div>
                <button className="btn btn-navy" onClick={() => navigate('/student/courses')}>{t('student.dashboard.enrollCourses')}</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {nextMeeting && (
            <div className="card">
              <div className="card-hd"><h3>{t('student.dashboard.nextMeeting')}</h3></div>
              <div className="card-body">
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontFamily: 'Sora', fontSize: 32, fontWeight: 800, color: 'var(--navy-text)', lineHeight: 1 }}>
                    {new Date(nextMeeting.scheduled_at).getDate()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {new Date(nextMeeting.scheduled_at).toLocaleString('uz', { month: 'long' })},&nbsp;
                    {new Date(nextMeeting.scheduled_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, margin: '8px 0', color: 'var(--ink)' }}>{nextMeeting.course_title}</div>
                  <span className="pill pill-amber">{t('status.scheduled')}</span>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-hd"><h3>{t('student.dashboard.pendingWork')}</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '10px 12px', background: 'var(--amber-bg)', borderRadius: 10, border: '.5px solid rgba(245,158,11,.25)', transition: 'transform .15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>3-dars uy ishi</div>
                <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>{t('student.dashboard.dueDate')}: {t('student.dashboard.tomorrow')}</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--red-bg)', borderRadius: 10, border: '.5px solid rgba(229,57,53,.25)', transition: 'transform .15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Test: Mulk huquqi</div>
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>{t('student.dashboard.overdue')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
