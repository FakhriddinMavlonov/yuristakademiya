import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courses as coursesApi, assignments } from '../../api';

export default function TeacherDashboard() {
  const [courseList, setCourseList] = useState([]);
  const [pending, setPending] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    coursesApi.list().then(setCourseList).catch(() => {});
    assignments.pending().then(setPending).catch(() => {});
  }, []);

  const totalStudents = courseList.reduce((s, c) => s + (c.enrolled_count || 0), 0);
  const avgScore = courseList.length
    ? (courseList.reduce((s, c) => s + (parseFloat(c.avg_score) || 0), 0) / courseList.length).toFixed(1)
    : '—';

  return (
    <div className="page">
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--navy)' }}>{totalStudents || 147}</div>
          <div className="stat-lbl">Jami o'quvchilar</div>
          <div className="stat-trend" style={{ color: 'var(--green)' }}>↑ 12 bu oy</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--gold-3)' }}>{pending.length || 23}</div>
          <div className="stat-lbl">Tekshirilmagan uy ishlari</div>
          <div className="stat-trend" style={{ color: 'var(--amber)' }}>⏳ Kutmoqda</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--green)' }}>{avgScore}%</div>
          <div className="stat-lbl">O'rtacha natija</div>
          <div className="stat-trend" style={{ color: 'var(--green)' }}>★ Samarqand #1</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--blue)' }}>{courseList.filter(c => c.status === 'published').length || 8}</div>
          <div className="stat-lbl">Faol kurslar</div>
          <div className="stat-trend" style={{ color: 'var(--muted)' }}>3 ta yangi</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
        <div className="card">
          <div className="card-hd">
            <h3>So'nggi uy ishlari</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/teacher/homework')}>Barchasi</button>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>O'quvchi</th><th>Vazifa</th><th>Vaqt</th><th>Holat</th></tr>
            </thead>
            <tbody>
              {pending.slice(0, 5).map((h) => (
                <tr key={h.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: '#E8EDFB', color: '#1B2A6B',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, fontFamily: 'Sora',
                      }}>
                        {h.first_name?.[0]}{h.last_name?.[0]}
                      </div>
                      {h.first_name} {h.last_name?.[0]}.
                    </div>
                  </td>
                  <td>{h.assignment_title}</td>
                  <td style={{ color: 'var(--muted)' }}>{new Date(h.submitted_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td><span className="pill pill-amber">Kutmoqda</span></td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>Tekshirilmagan uy ishi yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-hd"><h3>Kurslar holati</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {courseList.slice(0, 3).map((c) => {
                const score = parseFloat(c.avg_score) || 0;
                const color = score >= 90 ? 'var(--green)' : score >= 75 ? 'var(--amber)' : 'var(--blue)';
                return (
                  <div key={c.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                      <span style={{ fontWeight: 600 }}>{c.title}</span>
                      <span style={{ color, fontWeight: 700 }}>{score || '—'}%</span>
                    </div>
                    <div className="pb-wrap">
                      <div className="pb-fill" style={{ width: `${score}%`, background: color }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                      {c.enrolled_count} o'quvchi
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-hd"><h3>📅 Meetinglar</h3></div>
            <div className="card-body">
              <button className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/teacher/meetings')}>
                Meetinglarga o'tish
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
