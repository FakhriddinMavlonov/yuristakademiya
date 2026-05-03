import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tests as testsApi } from '../../api';
import { SkeletonCard, SkeletonStatCards } from '../../components/ui/Loading';

export default function StudentTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [phase, setPhase] = useState('loading');
  const [testData, setTestData] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    testsApi.get(testId)
      .then((d) => { setTestData(d); setPhase('intro'); })
      .catch(() => navigate(-1));
  }, [testId]);

  const startTest = async () => {
    try {
      const attempt = await testsApi.start(testId);
      setAttemptId(attempt.attemptId);
      setAnswers({});
      setCurrentQ(0);
      if (testData.time_limit_minutes) setTimeLeft(testData.time_limit_minutes * 60);
      setPhase('active');
    } catch (err) {
      alert(err?.error || t('student.test.startError'));
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
      alert(err?.error || t('student.test.submitError'));
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
      <div className="page" style={{ maxWidth: 560, margin: '0 auto' }}>
        <SkeletonStatCards count={3} />
        <div style={{ marginTop: 14 }}>
          <SkeletonCard rows={5} />
        </div>
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
                <div className="stat-lbl">{t('student.test.questions')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-num" style={{ fontSize: 22, color: 'var(--amber)' }}>
                  {testData.time_limit_minutes || '∞'}
                </div>
                <div className="stat-lbl">{testData.time_limit_minutes ? t('student.test.minutes') : t('student.test.noTime')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-num" style={{ fontSize: 22, color: 'var(--green)' }}>{testData.pass_score_pct || 80}%</div>
                <div className="stat-lbl">{t('student.test.passScore')}</div>
              </div>
            </div>
            {testData.passed && (
              <div style={{ padding: '10px 14px', background: 'var(--green-bg)', borderRadius: 8, fontSize: 12, color: 'var(--green)', marginBottom: 16, fontWeight: 600 }}>
                {t('student.test.alreadyPassed')}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => navigate(-1)}>{t('student.test.backBtn')}</button>
              <button className="btn btn-gold" style={{ minWidth: 140 }} onClick={startTest}>{t('student.test.startBtn')}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'active' && testData) {
    const q = testData.questions[currentQ];
    const timerColor = timeLeft !== null && timeLeft < 60 ? '#ff6b6b' : timeLeft < 300 ? '#ffa94d' : '#fff';
    const OPT_STYLES = [
      { bg: '#c92a2a', hoverBg: '#e03131', icon: '▲' },
      { bg: '#1864ab', hoverBg: '#1971c2', icon: '◆' },
      { bg: '#e67700', hoverBg: '#f59f00', icon: '●' },
      { bg: '#2b8a3e', hoverBg: '#2f9e44', icon: '■' },
    ];
    const passage = (testData.passages || []).find((p) => p.beforeQuestion === currentQ + 1 || p.beforeIndex === currentQ);
    const selectedOpt = answers[q.id];
    const isLastQ = currentQ === testData.questions.length - 1;
    const unanswered = testData.questions.filter(qq => !answers[qq.id]).length;

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg,#0a1628,#0c1a52)', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 10 }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,.1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{testData.title}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.8)', fontFamily: 'Sora', whiteSpace: 'nowrap' }}>
              {currentQ + 1} / {testData.questions.length}
            </div>
            {timeLeft !== null && (
              <div style={{ fontFamily: 'Sora', fontSize: 20, fontWeight: 800, color: timerColor, minWidth: 56, textAlign: 'right', transition: 'color .3s' }}>
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,.15)', borderRadius: 99 }}>
            <div style={{ height: '100%', borderRadius: 99, background: 'var(--gold)', transition: 'width .3s ease', width: `${((currentQ + 1) / testData.questions.length) * 100}%` }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
          {passage && (
            <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>📖 Matnni o'qing</div>
              <div style={{ fontSize: 12, lineHeight: 1.8, color: 'rgba(255,255,255,.85)', whiteSpace: 'pre-wrap' }}>{passage.text}</div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: 'var(--gold)', color: '#000', fontWeight: 800, fontFamily: 'Sora', fontSize: 14, marginBottom: 12 }}>{currentQ + 1}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.5, maxWidth: 600, margin: '0 auto' }}>{q.question_text}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 640, margin: '0 auto', paddingBottom: 16 }}>
            {(q.options || []).map((opt, oi) => {
              const style = OPT_STYLES[oi % 4];
              const isSelected = selectedOpt === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setAnswers(p => ({ ...p, [q.id]: opt.id }))}
                  style={{
                    background: isSelected ? style.hoverBg : style.bg,
                    borderRadius: 14,
                    padding: '14px 12px',
                    minHeight: 70,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    transition: 'transform .12s, box-shadow .12s, background .1s',
                    transform: isSelected ? 'scale(0.97)' : 'scale(1)',
                    boxShadow: isSelected ? `0 0 0 3px #fff, 0 4px 20px rgba(0,0,0,.4)` : '0 4px 14px rgba(0,0,0,.35)',
                    color: '#fff',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0, opacity: 0.9 }}>{style.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{opt.text || opt.option_text}</span>
                  {isSelected && <span style={{ marginLeft: 'auto', fontSize: 18, flexShrink: 0 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
            disabled={currentQ === 0}
            style={{ background: 'rgba(255,255,255,.12)', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: currentQ === 0 ? 'not-allowed' : 'pointer', opacity: currentQ === 0 ? 0.4 : 1 }}
          >
            ← Oldingi
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
            {unanswered > 0 ? `${unanswered} ta javobsiz` : '✓ Hammasi javoblandi'}
          </div>
          {!isLastQ ? (
            <button
              onClick={() => setCurrentQ(q => q + 1)}
              style={{ background: 'var(--gold)', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Keyingi →
            </button>
          ) : (
            <button
              onClick={submitTest}
              disabled={unanswered > 0 || submitting}
              style={{ background: unanswered > 0 ? 'rgba(255,255,255,.2)' : 'var(--green)', border: 'none', borderRadius: 10, padding: '10px 20px', color: unanswered > 0 ? 'rgba(255,255,255,.5)' : '#fff', fontSize: 13, fontWeight: 700, cursor: unanswered > 0 ? 'not-allowed' : 'pointer', transition: 'background .2s' }}
            >
              {submitting ? '⏳ Tekshirilmoqda...' : '✓ Testni yakunlash'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const passed = result.passed;
    const scorePct = result.scorePct ?? 0;
    const passScorePct = result.passScorePct || testData?.pass_score_pct || 80;

    return (
      <div className="page" style={{ maxWidth: 520, margin: '0 auto', background: 'var(--bg)', overflowY: 'auto' }}>
        <div className="card" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '36px 24px' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>{passed ? '🏆' : '😔'}</div>
            <h2 style={{ fontFamily: 'Sora', fontSize: 22, marginBottom: 6, color: passed ? 'var(--green)' : 'var(--red)' }}>
              {passed ? t('student.test.passed') : t('student.test.failed')}
            </h2>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
              {passed
                ? t('student.test.passedMsg')
                : t('student.test.failedMsg', { pct: passScorePct })
              }
            </div>

            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Sora', fontSize: 64, fontWeight: 800, color: passed ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>
                {scorePct}%
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {result.earnedPoints} / {result.totalPoints} {t('student.test.points')}
              </div>
            </div>

            <div className="pb-wrap" style={{ height: 10, marginBottom: 24 }}>
              <div className="pb-fill" style={{
                width: `${scorePct}%`,
                background: passed ? 'var(--green)' : 'var(--red)',
                transition: 'width 1s ease',
              }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-gold" onClick={() => { setPhase('intro'); setAnswers({}); setResult(null); setCurrentQ(0); }}>
                {t('student.test.retryBtn')}
              </button>
              <button className="btn btn-navy" onClick={() => navigate(-1)}>
                {passed ? t('student.test.continueBtn') : t('student.test.backToLessons')}
              </button>
            </div>
          </div>
        </div>

        {result.showAnswers && result.answers?.length > 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-hd"><h3>{t('student.test.answersHeading')}</h3></div>
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
