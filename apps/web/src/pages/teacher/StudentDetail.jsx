import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { meetings as meetingsApi, courses as coursesApi } from '../../api';
import useStore from '../../store/useStore';

function ScoreColor(s) {
  return s >= 85 ? 'var(--green)' : s >= 65 ? 'var(--amber)' : 'var(--red)';
}

export default function StudentDetail() {
  const { meetingId, studentId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useStore();
  const { t } = useTranslation();
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
        else showToast(t('teacher.studentDetail.notFound'));
      } catch (e) {
        showToast(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    if (studentId) loadStudent();
  }, [meetingId, studentId]);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--muted)' }}>
        {t('teacher.studentDetail.loading')}
      </div>
    );
  }

  if (!student) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', color: 'var(--hint)' }}>{t('teacher.studentDetail.notFound')}</div>
      </div>
    );
  }

  const score = Math.round(student.avg_score || 0);
  const handleTelegramClick = () => {
    if (student.telegram_chat_id) {
      const appUrl = `tg://user?id=${student.telegram_chat_id}`;
      const webUrl = `https://t.me/?startattach=start&startapp=1&bot_id=${student.telegram_chat_id}`;
      window.open(appUrl, '_blank');
      setTimeout(() => {
        if (!document.hidden) {
          window.open(webUrl, '_blank');
        }
      }, 500);
    }
  };

  const pct = Math.round((student.completed_lessons / student.total_lessons * 100) || 0);

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
            ❌ {t('teacher.studentDetail.inactive')}
          </span>
        )}
      </div>

      {/* Personal info + Telegram */}
      {!meetingId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-hd"><h3>{t('teacher.studentDetail.personalInfo')}</h3></div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{t('teacher.studentDetail.primaryPhone')}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{student.phone || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Email</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{student.email || '—'}</div>
            </div>
            {student.second_phone && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{t('teacher.studentDetail.phone2')}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{student.second_phone}</div>
              </div>
            )}
            {student.third_phone && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{t('teacher.studentDetail.phone3')}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{student.third_phone}</div>
              </div>
            )}
            {student.telegram_chat_id && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{t('teacher.studentDetail.telegram')}</div>
                <button onClick={handleTelegramClick} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#0088cc', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>💬</span> {t('teacher.studentDetail.telegramLink')}
                </button>
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
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{t('teacher.studentDetail.avgScore')}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>{student.completed_lessons || 0}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{t('teacher.studentDetail.completedLessons')}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>{student.total_lessons || 0}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{t('teacher.studentDetail.totalLessons')}</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-hd"><h3>{t('teacher.studentDetail.progressTitle')}</h3></div>
        <div className="card-body">
          <div className="pb-wrap" style={{ height: 12, marginBottom: 8 }}>
            <div className="pb-fill" style={{ width: `${pct}%`, background: 'var(--green)' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {t('teacher.studentDetail.lessonsProgress', { completed: student.completed_lessons || 0, total: student.total_lessons || 0, pct })}
          </div>
        </div>
      </div>

      {/* Test attempts */}
      {student.test_attempts && student.test_attempts.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-hd"><h3>{t('teacher.studentDetail.wrongAnswers')}</h3></div>
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
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>{t('common.back')}</button>
        {student.telegram_chat_id && (
          <button className="btn btn-navy" onClick={handleTelegramClick}>
            💬 {t('teacher.studentDetail.telegramBtn')} →
          </button>
        )}
        <button className="btn btn-navy" onClick={() => navigate(`/teacher/chat/${student.id}`)}>
          💬 {t('teacher.studentDetail.chatBtn')} →
        </button>
      </div>
    </div>
  );
}
