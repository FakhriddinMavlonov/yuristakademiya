import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { meetings as meetingsApi, courses as coursesApi } from '../../api';
import useStore from '../../store/useStore';

function ScoreColor(s) {
  return s >= 85 ? 'var(--green)' : s >= 65 ? 'var(--amber)' : 'var(--red)';
}

export default function StudentDetail() {
  const { meetingId, studentId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useStore();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudent = async () => {
      try {
        let found = null;
        if (meetingId) {
          const students = await meetingsApi.students(meetingId);
          found = students.find(s => s.id == studentId);
        } else {
          found = await coursesApi.studentDetail(studentId);
        }
        if (found) setStudent(found);
        else showToast('O\'quvchi topilmadi');
      } catch (e) {
        showToast('Xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    };

    if (studentId) loadStudent();
  }, [meetingId, studentId]);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--muted)' }}>
        Yuklanyapti...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', color: 'var(--hint)' }}>O'quvchi topilmadi</div>
      </div>
    );
  }

  const score = Math.round(student.avg_score || 0);
  const telegramUrl = student.telegram_chat_id ? `https://t.me/${student.telegram_chat_id}` : null;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ width: 60, height: 60, background: '#E8EDFB', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#1B2A6B' }}>
          {student.first_name?.[0]}{student.last_name?.[0]}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>{student.first_name} {student.last_name}</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {student.phone && <div>📱 {student.phone}</div>}
            {student.email && <div>✉️ {student.email}</div>}
          </div>
        </div>
        {!student.is_active && (
          <span style={{ marginLeft: 'auto', background: '#FEF3F2', color: '#B42318', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
            ❌ Nofaol
          </span>
        )}
      </div>

      {/* Personal info + Telegram */}
      {!meetingId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-hd"><h3>Shaxsiy ma'lumotlar</h3></div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Asosiy telefon</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{student.phone || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Email</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{student.email || '—'}</div>
            </div>
            {student.second_phone && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>2-chi telefon</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{student.second_phone}</div>
              </div>
            )}
            {student.third_phone && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>3-chi telefon</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{student.third_phone}</div>
              </div>
            )}
            {telegramUrl && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Telegram</div>
                <a href={telegramUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 600, color: '#0088cc', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>💬</span> Telegram ga o'tish
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: ScoreColor(score) }}>{score}%</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>O'rtacha ball</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>{student.completed_lessons || 0}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Tugallangan darslar</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>{student.total_lessons || 0}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Jami darslar</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-hd"><h3>Darslarni tugallash progessi</h3></div>
        <div className="card-body">
          <div className="pb-wrap" style={{ height: 12, marginBottom: 8 }}>
            <div className="pb-fill" style={{ width: `${(student.completed_lessons / student.total_lessons * 100) || 0}%`, background: 'var(--green)' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {student.completed_lessons || 0} / {student.total_lessons || 0} dars ({Math.round((student.completed_lessons / student.total_lessons * 100) || 0)}%)
          </div>
        </div>
      </div>

      {/* Test attempts - Xato savollari */}
      {student.test_attempts && student.test_attempts.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-hd"><h3>Testda xato qilgan savollar</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {student.test_attempts.map((attempt, idx) => (
              <div key={idx} style={{ padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>📚 {attempt.lesson_title}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: ScoreColor(attempt.score_pct), background: ScoreColor(attempt.score_pct) === 'var(--red)' ? '#FEF3F2' : ScoreColor(attempt.score_pct) === 'var(--amber)' ? '#FEF3DC' : '#ECFDF3', padding: '2px 8px', borderRadius: 4 }}>
                    {Math.round(attempt.score_pct)}%
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                  {new Date(attempt.submitted_at).toLocaleDateString('uz', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Orqaga</button>
        <button className="btn btn-navy" onClick={() => navigate(`/teacher/chat/${student.id}`)}>💬 Chat →</button>
      </div>
    </div>
  );
}
