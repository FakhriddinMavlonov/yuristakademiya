import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exams as examsApi } from '../../api';
import useStore from '../../store/useStore';

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('uz', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
};

const daysUntil = (iso) => {
  const ms = new Date(iso) - new Date();
  if (ms < 0) return null;
  const d = Math.ceil(ms / 86400000);
  if (d === 0) return 'bugun';
  if (d === 1) return 'ertaga';
  return `${d} kundan keyin`;
};

export default function StudentExams() {
  const { t } = useTranslation();
  const { showToast } = useStore();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examsApi.list()
      .then(setExams)
      .catch(() => showToast('Yuklashda xatolik'))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = useMemo(() => exams.filter((e) => e.my_score === null || e.my_score === undefined), [exams]);
  const completed = useMemo(() => exams.filter((e) => e.my_score !== null && e.my_score !== undefined), [exams]);

  return (
    <div className="page" style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0, marginBottom: 14 }}>📝 Mock imtihonlar</h2>

      {loading ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Yuklanmoqda...</div>
      ) : exams.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.5 }}>📝</div>
          <div style={{ fontSize: 14 }}>Hozircha imtihon yo'q</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Ustozingiz mock imtihon belgilaganda bu yerda ko'rinadi</div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>⏰ Kelgusi imtihonlar</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map((e) => <UpcomingCard key={e.id} exam={e} />)}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>✓ Natijalar</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {completed.map((e) => <ResultCard key={e.id} exam={e} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UpcomingCard({ exam }) {
  const dLeft = daysUntil(exam.scheduled_at);
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{exam.title}</h4>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            👨‍🏫 {exam.teacher_name}
          </div>
        </div>
        {dLeft && (
          <span style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 12,
            background: 'var(--amber-bg)', color: 'var(--amber)', fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            {dLeft}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, fontSize: 12, color: 'var(--ink)' }}>
        <span>📅 {fmtDate(exam.scheduled_at)}</span>
        <span>📍 {exam.location}</span>
        <span>⏱ {exam.duration_minutes} daq</span>
      </div>
      {exam.topic && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--muted)' }}>Mavzu:</div>
          {exam.topic}
        </div>
      )}
      {exam.answer_text && <SharedAnswers text={exam.answer_text} />}
    </div>
  );
}

function SharedAnswers({ text }) {
  // Each line becomes a list item (e.g. "1. B" / "2. C")
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return (
    <div style={{
      marginTop: 12, padding: 12,
      background: 'var(--green-bg)', borderRadius: 10, border: '1px solid rgba(16,185,129,.3)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--green)', marginBottom: 8 }}>
        ✓ Javoblar (ustoz tomonidan e'lon qilingan)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            padding: '6px 10px', background: 'var(--card)', borderRadius: 6,
            fontSize: 13, fontFamily: 'monospace', textAlign: 'center', fontWeight: 600,
          }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultCard({ exam }) {
  const score = +exam.my_score;
  const max = exam.max_score || 100;
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';
  const bg = pct >= 80 ? 'var(--green-bg)' : pct >= 60 ? 'var(--amber-bg)' : 'var(--red-bg)';
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{exam.title}</h4>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            {fmtDate(exam.scheduled_at)} · {exam.teacher_name}
          </div>
        </div>
        <div style={{
          padding: '8px 16px', borderRadius: 12, background: bg, color, textAlign: 'center', minWidth: 90,
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, fontFamily: 'Sora, sans-serif' }}>{score}</div>
          <div style={{ fontSize: 10, opacity: 0.8 }}>/ {max} ball</div>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width .4s' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textAlign: 'right' }}>{pct}%</div>
      </div>
      {exam.my_feedback && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--muted)' }}>Ustozning izohi:</div>
          {exam.my_feedback}
        </div>
      )}
      {exam.answer_text && <SharedAnswers text={exam.answer_text} />}
    </div>
  );
}
