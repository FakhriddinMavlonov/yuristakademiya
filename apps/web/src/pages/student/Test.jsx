import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tests as testsApi } from '../../api';

export default function StudentTest() {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('loading');
  const [testData, setTestData] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    testsApi.get(testId)
      .then((d) => { setTestData(d); setPhase('intro'); })
      .catch(() => navigate(-1));
  }, [testId]);

  const startTest = async () => {
    try {
      const attempt = await testsApi.start(testId);
      setAttemptId(attempt.attemptId);  // ← fixed: was attempt.id
      setAnswers({});
      if (testData.time_limit_minutes) setTimeLeft(testData.time_limit_minutes * 60);
      setPhase('active');
    } catch (err) {
      alert(err?.error || 'Test boshlashda xatolik');
    }
  };

  useEffect(() => {
    if (phase !== 'active' || timeLeft === null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); submitTest(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, timeLeft !== null]);

  const submitTest = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    try {
      // ← fixed: selectedOptionId was optionId
      const answerArray = Object.entries(answers).map(([questionId, optionId]) => ({
        questionId: parseInt(questionId),
        selectedOptionId: parseInt(optionId),
      }));
      const res = await testsApi.submit(attemptId, answerArray);
      setResult(res);
      setPhase('result');
    } catch (err) {
      alert(err?.error || 'Yuborishda xatolik');
      setSubmitting(false);
    }
  }, [attemptId, answers, submitting]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const answered = Object.keys(answers).length;
  const total = testData?.questions?.length || 0;

  if (phase === 'loading') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ color: 'var(--hint)', fontSize: 13 }}>Yuklanmoqda...</div>
      </div>
    );
  }

  if (phase === 'intro' && testData) {
    return (
      <div className="page" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <h2 style={{ fontFamily: 'Sora', fontSize: 20, marginBottom: 8 }}>{testData.title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '20px 0' }}>
              <div className="stat-card">
                <div className="stat-num" style={{ fontSize: 22, color: 'var(--navy)' }}>{total}</div>
                <div className="stat-lbl">Savol</div>
              </div>
              <div className="stat-card">
                <div className="stat-num" style={{ fontSize: 22, color: 'var(--amber)' }}>
                  {testData.time_limit_minutes || '∞'}
                </div>
                <div className="stat-lbl">{testData.time_limit_minutes ? 'Daqiqa' : 'Vaqt yo\'q'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-num" style={{ fontSize: 22, color: 'var(--green)' }}>{testData.pass_score_pct || 90}%</div>
                <div className="stat-lbl">O'tish balli</div>
              </div>
            </div>
            {testData.passed && (
              <div style={{ padding: '10px 14px', background: 'var(--green-bg)', borderRadius: 8, fontSize: 12, color: 'var(--green)', marginBottom: 16, fontWeight: 600 }}>
                ✓ Siz bu testni allaqachon muvaffaqiyatli topshirgansiz
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => navigate(-1)}>Orqaga</button>
              <button className="btn btn-gold" style={{ minWidth: 140 }} onClick={startTest}>▶ Boshlash</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'active' && testData) {
    const timerColor = timeLeft !== null && timeLeft < 60 ? 'var(--red)' : timeLeft < 300 ? 'var(--amber)' : 'var(--navy)';
    return (
      <div className="page" style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Sora' }}>{testData.title}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{answered}/{total} javob berildi</div>
            </div>
            {timeLeft !== null && (
              <div style={{ fontFamily: 'Sora', fontSize: 22, fontWeight: 800, color: timerColor, minWidth: 60, textAlign: 'center' }}>
                {formatTime(timeLeft)}
              </div>
            )}
            <div className="pb-wrap" style={{ width: 80 }}>
              <div className="pb-fill" style={{ width: `${total ? (answered / total) * 100 : 0}%`, background: 'var(--blue)' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {testData.questions.map((q, qi) => {
            const passage = (testData.passages || []).find((p) => p.beforeIndex === qi);
            return (<React.Fragment key={q.id}>
            {passage && (
              <div style={{ background: '#F0F4FF', border: '.5px solid rgba(27,42,107,.15)', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>
                  📖 Matnni o'qing
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{passage.text}</div>
              </div>
            )}
            <div className="card">
              <div className="card-body">
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--muted)', marginRight: 6 }}>{qi + 1}.</span>{q.question_text}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {(q.options || []).map((opt) => {
                    const selected = answers[q.id] === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt.id }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          borderRadius: 9, cursor: 'pointer', transition: 'all .15s',
                          border: `.5px solid ${selected ? 'var(--navy)' : 'var(--line-2)'}`,
                          background: selected ? 'var(--navy)' : 'var(--bg)',
                          color: selected ? '#fff' : 'var(--ink)',
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          border: `.5px solid ${selected ? 'rgba(255,255,255,.5)' : 'var(--line-2)'}`,
                          background: selected ? 'rgba(255,255,255,.2)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        {/* ← fixed: was opt.option_text, backend returns opt.text */}
                        <span style={{ fontSize: 13 }}>{opt.text || opt.option_text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </React.Fragment>);
          })}
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {answered < total && (
            <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>
              {total - answered} ta savol qoldi
            </span>
          )}
          <button
            className="btn btn-gold"
            style={{ minWidth: 160 }}
            disabled={answered < total || submitting}
            onClick={submitTest}
          >
            {submitting ? 'Tekshirilmoqda...' : 'Yakunlash →'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const passed = result.passed;
    // ← fixed: result.scorePct (not score_pct), result.passScorePct (not pass_score_pct)
    const scorePct = result.scorePct ?? 0;
    const passScorePct = result.passScorePct || testData?.pass_score_pct || 90;

    return (
      <div className="page" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '36px 24px' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>{passed ? '🏆' : '😔'}</div>
            <h2 style={{ fontFamily: 'Sora', fontSize: 22, marginBottom: 6, color: passed ? 'var(--green)' : 'var(--red)' }}>
              {passed ? 'Tabriklaymiz!' : 'Muvaffaqiyatsiz'}
            </h2>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
              {passed
                ? 'Test muvaffaqiyatli topshirildi! Keyingi dars ochildi.'
                : `O'tish uchun ${passScorePct}% kerak edi.`
              }
            </div>

            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Sora', fontSize: 64, fontWeight: 800, color: passed ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>
                {scorePct}%
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {result.earnedPoints} / {result.totalPoints} ball
              </div>
            </div>

            <div className="pb-wrap" style={{ height: 10, marginBottom: 24 }}>
              <div className="pb-fill" style={{
                width: `${scorePct}%`,
                background: passed ? 'var(--green)' : 'var(--red)',
                transition: 'width 1s ease',
              }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {!passed && (
                <button className="btn btn-gold" onClick={() => { setPhase('intro'); setAnswers({}); setResult(null); }}>
                  Qayta urinish
                </button>
              )}
              <button className="btn btn-navy" onClick={() => navigate(-1)}>
                {passed ? '→ Davom ettirish' : '← Darslarga qaytish'}
              </button>
            </div>
          </div>
        </div>

        {result.showAnswers && result.answers?.length > 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-hd"><h3>Javoblar ko'rinishi</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.answers.map((a, i) => (
                <div key={i} style={{
                  padding: '10px 12px', borderRadius: 9,
                  background: a.correct ? 'var(--green-bg)' : 'var(--red-bg)',
                  border: `.5px solid ${a.correct ? 'rgba(5,150,105,.2)' : 'rgba(229,57,53,.2)'}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{i + 1}. {a.question_text}</div>
                  <div style={{ fontSize: 11, color: a.correct ? 'var(--green)' : 'var(--red)' }}>
                    {a.correct ? '✓' : '✗'} {a.selected_option}
                    {!a.correct && <span style={{ color: 'var(--muted)', marginLeft: 6 }}>· To'g'ri: {a.correct_option}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
