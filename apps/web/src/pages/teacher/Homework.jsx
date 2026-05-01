import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assignments as assignmentsApi, ai as aiApi } from '../../api';
import useStore from '../../store/useStore';

const COLORS = ['#E8EDFB:#1B2A6B','#FEF3DC:#B87A10','#ECFDF3:#027A48','#FEF3F2:#B42318','#F5EAFB:#534AB7'];

export default function Homework() {
  const [items, setItems]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore]       = useState('');
  const [feedback, setFeedback] = useState('');
  const [aiResult, setAiResult] = useState(null);   // { strengths, weaknesses, recommendations, summary }
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]   = useState('');
  const { showToast } = useStore();
  const { t } = useTranslation();

  useEffect(() => { assignmentsApi.pending().then(setItems).catch(() => {}); }, []);

  const selectItem = (h) => {
    setSelected(h);
    setScore('');
    setFeedback('');
    setAiResult(null);
    setAiError('');
  };

  const grade = async () => {
    if (!selected) return;
    try {
      await assignmentsApi.grade(selected.id, { score: parseInt(score), feedback });
      setItems((p) => p.filter((x) => x.id !== selected.id));
      setSelected(null);
      setScore(''); setFeedback(''); setAiResult(null);
      showToast("Ball berildi va o'quvchiga yuborildi!");
    } catch { showToast('Xatolik!'); }
  };

  const handleAiCheck = async () => {
    if (!selected?.content_text?.trim()) {
      showToast("Uy ishi matni bo'sh — AI tekshira olmaydi");
      return;
    }
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const res = await aiApi.checkHomework({
        content: selected.content_text,
        assignmentTitle: selected.assignment_title || 'Uy ishi',
      });
      setAiResult(res);
      if (!feedback && res.summary) setFeedback(res.summary);
    } catch (e) {
      setAiError(e?.message || 'AI tekshirishda xatolik. Qayta urinib ko\'ring.');
    } finally {
      setAiLoading(false);
    }
  };

  const getColor = (i) => COLORS[i % COLORS.length].split(':');
  const [mobileView, setMobileView] = useState('list');

  const handleSelect = (h) => { selectItem(h); setMobileView('detail'); };

  return (
    <div className="page">
      <div className="r-2col" style={{ minHeight: 0, flex: 1 }}>
        {/* Left: list */}
        <div className={`card${mobileView === 'detail' ? ' panel-hidden' : ''}`} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-hd" style={{ flexShrink: 0 }}>
            <h3>Uy ishlari</h3>
            <span className="pill pill-amber">{items.length} ta kutmoqda</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {items.map((h, i) => {
              const [bg, tc] = getColor(i);
              return (
                <div key={h.id} className={`hw-row${selected?.id === h.id ? ' selected' : ''}`}
                  onClick={() => handleSelect(h)}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, color: tc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, fontFamily: 'Sora' }}>
                    {h.first_name?.[0]}{h.last_name?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{h.first_name} {h.last_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{h.assignment_title}</div>
                  </div>
                  <span className="pill pill-amber">Yangi</span>
                </div>
              );
            })}
            {items.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--hint)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div>Barcha uy ishlari tekshirildi!</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div className={`card${mobileView === 'list' ? ' panel-hidden' : ''}`} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-hd" style={{ flexShrink: 0, flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
            <button className="panel-back-btn" onClick={() => setMobileView('list')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Orqaga
            </button>
            <h3 style={{ margin: 0 }}>{selected ? `${selected.first_name} ${selected.last_name} — ${selected.assignment_title}` : t('teacher.homework.selectStudent')}</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {selected ? (
              <>
                {/* Student answer */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
                    O'quvchi javobi
                  </div>
                  <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 14, fontSize: 13, lineHeight: 1.7, color: 'var(--ink)', minHeight: 80 }}>
                    {selected.content_text || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{t('teacher.homework.noText')}</span>}
                  </div>
                </div>

                {/* AI check button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button className="ai-check-btn" onClick={handleAiCheck} disabled={aiLoading}>
                    {aiLoading
                      ? <><span style={{ animation: 'aiPulse 1s infinite' }}>🤖</span> Tekshirilmoqda...</>
                      : <><span>🤖</span> AI bilan tekshirish</>
                    }
                  </button>
                  {aiResult && (
                    <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>✓ AI tahlil tayyor</span>
                  )}
                </div>

                {/* AI loading */}
                {aiLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'linear-gradient(135deg,rgba(79,70,229,.06),rgba(168,85,247,.06))', borderRadius: 12, border: '1px solid rgba(124,58,237,.15)' }}>
                    <div className="ai-loading-dots"><span /><span /><span /></div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed' }}>AI uy ishini tahlil qilmoqda...</span>
                  </div>
                )}

                {/* AI error */}
                {aiError && (
                  <div style={{ padding: '10px 14px', background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    ❌ {aiError}
                  </div>
                )}

                {/* AI result */}
                {aiResult && (
                  <div className="ai-result-card">
                    <div className="ai-result-header">
                      <span style={{ fontSize: 18 }}>🤖</span>
                      <span>AI Tahlil Natijalari</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.8 }}>Groq · llama-3.3-70b</span>
                    </div>

                    {/* Strengths */}
                    {aiResult.strengths?.length > 0 && (
                      <div className="ai-result-section">
                        <div className="ai-result-section-title" style={{ color: '#059669' }}>
                          <span>✅</span> Kuchli tomonlar
                        </div>
                        {aiResult.strengths.map((s, i) => (
                          <div key={i} className="ai-result-item">
                            <div className="ai-result-dot" style={{ background: '#059669' }} />
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Weaknesses */}
                    {aiResult.weaknesses?.length > 0 && (
                      <div className="ai-result-section">
                        <div className="ai-result-section-title" style={{ color: '#dc2626' }}>
                          <span>⚠️</span> Kamchiliklar
                        </div>
                        {aiResult.weaknesses.map((w, i) => (
                          <div key={i} className="ai-result-item">
                            <div className="ai-result-dot" style={{ background: '#dc2626' }} />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recommendations */}
                    {aiResult.recommendations?.length > 0 && (
                      <div className="ai-result-section">
                        <div className="ai-result-section-title" style={{ color: '#2563eb' }}>
                          <span>💡</span> Maslahatlar
                        </div>
                        {aiResult.recommendations.map((r, i) => (
                          <div key={i} className="ai-result-item">
                            <div className="ai-result-dot" style={{ background: '#2563eb' }} />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Summary */}
                    {aiResult.summary && (
                      <div className="ai-result-section" style={{ background: 'var(--bg)' }}>
                        <div className="ai-result-section-title" style={{ color: 'var(--muted)' }}>
                          <span>📝</span> AI xulosasi
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.7 }}>{aiResult.summary}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div style={{ borderTop: '.5px solid var(--line)', paddingTop: 4 }} />

                {/* Score — teacher manually assigns */}
                <div className="fgroup">
                  <div className="flabel" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t('teacher.homework.gradeLabel')}
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>(Ustoz tomonidan beriladi)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[60,70,80,90,95,100].map((s) => (
                      <button key={s} className={`btn btn-sm${score == s ? ' btn-navy' : ' btn-ghost'}`} onClick={() => setScore(String(s))}>{s}</button>
                    ))}
                    <input className="finput" type="number" min={0} max={100} value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder={t('teacher.homework.otherPlaceholder')} style={{ width: 80 }} />
                  </div>
                </div>

                {/* Feedback — editable, pre-filled from AI */}
                <div className="fgroup">
                  <div className="flabel" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t('teacher.homework.feedbackLabel')}
                    {aiResult?.summary && (
                      <span style={{ fontSize: 10, padding: '1px 6px', background: 'rgba(124,58,237,.1)', color: '#7c3aed', borderRadius: 4, fontWeight: 600 }}>AI to'ldirdi</span>
                    )}
                  </div>
                  <textarea className="finput" rows={4}
                    placeholder={t('teacher.homework.feedbackPlaceholder')}
                    value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => setSelected(null)}>{t('teacher.homework.laterBtn')}</button>
                  <button className="btn btn-navy" onClick={grade} disabled={!score}>
                    {t('teacher.homework.gradeBtn')}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--hint)', gap: 8 }}>
                <span style={{ fontSize: 36 }}>📝</span>
                <span style={{ fontSize: 13 }}>{t('teacher.homework.checkHint')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
