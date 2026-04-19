import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { meetings as meetingsApi } from '../../api';
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
        const students = await meetingsApi.students(meetingId);
        const found = students.find(s => s.id == studentId);
        if (found) setStudent(found);
        else showToast('O\'quvchi topilmadi');
      } catch (e) {
        showToast('Xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    };

    if (meetingId && studentId) loadStudent();
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

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ width: 60, height: 60, background: '#E8EDFB', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#1B2A6B' }}>
          {student.first_name?.[0]}{student.last_name?.[0]}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>{student.first_name} {student.last_name}</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>O'rtacha ball: {score}%</div>
        </div>
      </div>

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
      <div className="card">
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

      {/* Weak topics */}
      {student.weak_topics?.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-hd"><h3>Qiynalayotgan mavzular</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {student.weak_topics.filter(Boolean).map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--red-bg)', borderRadius: 8 }}>
                <span style={{ color: 'var(--red)', fontSize: 16 }}>⚠</span>
                <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Orqaga</button>
        <button className="btn btn-navy" onClick={() => navigate(`/teacher/chat/${student.id}`)}>💬 Chat →</button>
      </div>
    </div>
  );
}
