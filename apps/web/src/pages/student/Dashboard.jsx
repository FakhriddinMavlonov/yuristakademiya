import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courses as coursesApi, meetings as meetingsApi } from '../../api';

export default function StudentDashboard() {
  const [courseList, setCourseList] = useState([]);
  const [meetingList, setMeetingList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    coursesApi.list().then(setCourseList).catch(() => {});
    meetingsApi.list().then(setMeetingList).catch(() => {});
  }, []);

  const enrolled = courseList.filter(c => c.enrolled_at);
  const totalLessons = enrolled.reduce((s, c) => s + (c.completed_lessons || 0), 0);
  const avgScore = enrolled.length
    ? (enrolled.reduce((s, c) => s + (c.avg_score || 0), 0) / enrolled.length).toFixed(0)
    : 0;
  const nextMeeting = meetingList[0];

  return (
    <div className="page">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--navy)' }}>{enrolled.length}</div><div className="stat-lbl">Faol kurslar</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--green)' }}>{avgScore || 87}%</div><div className="stat-lbl">O'rtacha ball</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--amber)' }}>2</div><div className="stat-lbl">Topshirilmagan uy ishi</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--blue)' }}>{totalLessons}</div><div className="stat-lbl">Tugallangan dars</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
        <div className="card">
          <div className="card-hd"><h3>Mening kurslarim</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {enrolled.map((c) => {
              const progress = c.lesson_count ? Math.round((c.completed_lessons / c.lesson_count) * 100) : 0;
              const color = progress >= 80 ? 'var(--green)' : progress >= 40 ? 'var(--blue)' : 'var(--amber)';
              return (
                <div key={c.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
                  onClick={() => navigate(`/student/courses/${c.id}/lessons`)}
                >
                  <div style={{ width: 44, height: 44, background: c.banner_gradient || 'var(--navy)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'var(--gold)', fontSize: 18 }}>⚖️</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{c.title}</div>
                    <div className="pb-wrap"><div className="pb-fill" style={{ width: `${progress}%`, background: color }} /></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                      <span>{c.completed_lessons || 0}/{c.lesson_count || 0} dars</span>
                      <span style={{ fontWeight: 700, color }}>{progress}%</span>
                    </div>
                  </div>
                  <span className={`pill${progress === 100 ? ' pill-green' : progress > 0 ? ' pill-blue' : ' pill-amber'}`}>
                    {progress === 100 ? 'Tugallandi' : progress > 0 ? 'Davom etmoqda' : 'Yangi'}
                  </span>
                </div>
              );
            })}
            {enrolled.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--hint)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
                <div>Hozircha kurs yo'q</div>
                <button className="btn btn-navy" style={{ marginTop: 12 }} onClick={() => navigate('/student/courses')}>Kurslarga yozilish</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {nextMeeting && (
            <div className="card">
              <div className="card-hd"><h3>📅 Kelgusi meeting</h3></div>
              <div className="card-body">
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontFamily: 'Sora', fontSize: 28, fontWeight: 800, color: 'var(--navy)' }}>
                    {new Date(nextMeeting.scheduled_at).getDate()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {new Date(nextMeeting.scheduled_at).toLocaleString('uz', { month: 'long' })}, {new Date(nextMeeting.scheduled_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, margin: '6px 0' }}>{nextMeeting.course_title}</div>
                  <span className="pill pill-amber">Rejalashtirilgan</span>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-hd"><h3>Topshirilmagan ishlar</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ padding: '8px 10px', background: 'var(--amber-bg)', borderRadius: 8, border: '.5px solid rgba(245,158,11,.2)' }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>3-dars uy ishi</div>
                <div style={{ fontSize: 11, color: 'var(--amber)' }}>Muddati: ertaga</div>
              </div>
              <div style={{ padding: '8px 10px', background: 'var(--red-bg)', borderRadius: 8, border: '.5px solid rgba(229,57,53,.2)' }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Test: Mulk huquqi</div>
                <div style={{ fontSize: 11, color: 'var(--red)' }}>Muddati o'tgan</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
