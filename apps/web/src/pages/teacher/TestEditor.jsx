import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tests as testsApi, lessons as lessonsApi, ai as aiApi } from '../../api';
import useStore from '../../store/useStore';

const emptyQ = () => ({ questionText: '', points: 2, options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }], correctIndex: 0 });
const genId  = () => Math.random().toString(36).slice(2);

const OPT_COLORS = ['ai-opt-A', 'ai-opt-B', 'ai-opt-C', 'ai-opt-D'];
const OPT_ICONS  = ['▲', '◆', '●', '■'];
const COUNTS     = [5, 10, 15, 20, 25, 30];
const DIFFS = [
  { key: 'easy',   icon: '🐢', label: 'Oson',    pts: '1 ball',  cls: 'easy'   },
  { key: 'medium', icon: '🦊', label: "O'rta",   pts: '2 ball',  cls: 'medium' },
  { key: 'hard',   icon: '🦁', label: 'Qiyin',   pts: '3 ball',  cls: 'hard'   },
];

export default function TestEditor() {
  const { lessonId } = useParams();
  const navigate     = useNavigate();
  const { showToast } = useStore();

  const [loading, setLoading]   = useState(true);
  const [testId, setTestId]     = useState(null);
  const [tab, setTab]           = useState('manual');
  const [meta, setMeta]         = useState({ title: 'Nazorat testi', timeLimitMinutes: 30, passScorePct: 90, maxAttempts: 3, shuffleQuestions: true, showAnswersAfter: true });

  // Manual mode
  const [questions, setQuestions] = useState([emptyQ()]);
  const [passages,  setPassages]  = useState([]);

  // Document mode
  const [docState,         setDocState]         = useState({ status: 'idle', progress: 0 });
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [previewPassages,  setPreviewPassages]  = useState([]);

  // AI mode
  const [aiForm,      setAiForm]      = useState({ topic: '', count: 10, difficulty: 'medium' });
  const [aiState,     setAiState]     = useState('idle'); // idle | loading | preview
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiError,     setAiError]     = useState('');

  // Drag state
  const [draggingId,  setDraggingId]  = useState(null);
  const [dragOverPos, setDragOverPos] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const lesson = await lessonsApi.get(lessonId);
        if (lesson.test?.id) {
          const test = await testsApi.get(lesson.test.id);
          setTestId(test.id);
          setMeta({ title: test.title, timeLimitMinutes: test.time_limit_minutes, passScorePct: test.pass_score_pct, maxAttempts: test.max_attempts, shuffleQuestions: test.shuffle_questions, showAnswersAfter: test.show_answers_after });
          const qs = (test.questions || []).map((q) => {
            const opts = [...(q.options || [])].sort((a, b) => a.order_num - b.order_num);
            return { questionText: q.question_text, points: q.points, options: opts.map((o) => ({ text: o.option_text })), correctIndex: opts.findIndex((o) => o.is_correct) };
          });
          setQuestions(qs.length ? qs : [emptyQ()]);
          setPassages((test.passages || []).map((p) => ({ ...p, id: genId() })));
        }
      } catch { /* new test */ }
      setLoading(false);
    })();
  }, [lessonId]);

  // ── question/option helpers ──────────────────────────────────────────────
  const updateQ    = (i, f, v) => setQuestions((p) => p.map((q, idx) => idx === i ? { ...q, [f]: v } : q));
  const updateOpt  = (qi, oi, v) => setQuestions((p) => p.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? { ...o, text: v } : o) } : q));
  const updatePQ   = (i, f, v) => setPreviewQuestions((p) => p.map((q, idx) => idx === i ? { ...q, [f]: v } : q));
  const updatePOpt = (qi, oi, v) => setPreviewQuestions((p) => p.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? { ...o, text: v } : o) } : q));
  const updateAQ   = (i, f, v) => setAiQuestions((p) => p.map((q, idx) => idx === i ? { ...q, [f]: v } : q));
  const updateAOpt = (qi, oi, v) => setAiQuestions((p) => p.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? { ...o, text: v } : o) } : q));

  // ── passage helpers ──────────────────────────────────────────────────────
  const addPassageFn    = (set, beforeIndex) => set((p) => [...p, { id: genId(), text: '', beforeIndex }]);
  const updatePassageFn = (set, id, text)    => set((p) => p.map((x) => x.id === id ? { ...x, text } : x));
  const removePassageFn = (set, id)          => set((p) => p.filter((x) => x.id !== id));

  // ── save ─────────────────────────────────────────────────────────────────
  const save = async (qs, passagesToSave) => {
    const finalQs  = qs || questions;
    const finalPas = passagesToSave || passages;
    if (!finalQs.length) return showToast('Savollar qo\'shing');
    if (finalQs.some((q) => q.correctIndex === -1)) return showToast('Barcha savollarda to\'g\'ri javobni belgilang!');
    try {
      await testsApi.save(lessonId, { id: testId, ...meta, questions: finalQs, passages: finalPas.map(({ text, beforeIndex }) => ({ text, beforeIndex })) });
      showToast(testId ? 'Test yangilandi!' : 'Test saqlandi!');
      navigate(-1);
    } catch { showToast('Saqlashda xatolik!'); }
  };

  // ── AI generate ──────────────────────────────────────────────────────────
  const handleAiGenerate = async () => {
    if (!aiForm.topic.trim()) return showToast('Mavzu nomini kiriting');
    setAiState('loading');
    setAiError('');
    try {
      const res = await aiApi.generateQuiz({ topic: aiForm.topic, count: aiForm.count, difficulty: aiForm.difficulty });
      setAiQuestions(res.questions || []);
      setAiState('preview');
    } catch (e) {
      setAiError(e?.message || 'Xatolik yuz berdi. Qayta urinib ko\'ring.');
      setAiState('idle');
    }
  };

  const handleAiAddToTest = () => {
    if (!aiQuestions.length) return;
    save(aiQuestions, []);
  };

  // ── document upload ──────────────────────────────────────────────────────
  const onDocumentSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocState({ status: 'uploading', progress: 0 });
    try {
      const result = await testsApi.parseDocument(lessonId, file, (pct) => setDocState({ status: 'uploading', progress: pct }));
      const parsed = (result.questions || []).map((q) => ({
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        points: 2,
        options: (q.options || []).map((text) => ({ text })),
        correctIndex: q.correctIndex ?? -1,
      }));
      const parsedPassages = (result.passages || []).map((p) => {
        const idx = parsed.findIndex((q) => (q.questionNumber ?? 0) === p.beforeQuestion);
        return { id: genId(), text: p.text, beforeIndex: idx >= 0 ? idx : 0 };
      });
      setPreviewQuestions(parsed);
      setPreviewPassages(parsedPassages);
      setDocState({ status: 'preview', progress: 100 });
    } catch {
      setDocState({ status: 'error', progress: 0 });
    }
    e.target.value = '';
  };

  // ── drag events ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, id) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); setDraggingId(id); }, []);
  const handleDragEnd   = useCallback(() => { setDraggingId(null); setDragOverPos(null); }, []);
  const handleDragOver  = useCallback((e, pos) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverPos(pos); }, []);
  const handleDragLeave = useCallback(() => setDragOverPos(null), []);
  const handleDrop      = useCallback((e, pos, set) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    if (id) set((p) => p.map((x) => x.id === id ? { ...x, beforeIndex: pos } : x));
    setDraggingId(null); setDragOverPos(null);
  }, [draggingId]);

  // ── sub-components ───────────────────────────────────────────────────────
  const DropZone = useCallback(({ pos, set }) => {
    const isActive = draggingId !== null;
    const isOver   = dragOverPos === pos && isActive;
    return (
      <div onDragOver={(e) => handleDragOver(e, pos)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, pos, set)}
        style={{ height: isActive ? (isOver ? 44 : 20) : 0, overflow: 'hidden', margin: isActive ? '2px 0' : 0, borderRadius: 8, border: isActive ? (isOver ? '2px dashed var(--navy)' : '1.5px dashed rgba(27,42,107,.25)') : 'none', background: isOver ? 'rgba(27,42,107,.06)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'height .15s, background .1s', cursor: 'copy' }}>
        {isOver && <span style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 700 }}>📌 Maqolani bu yerga tashlang</span>}
      </div>
    );
  }, [draggingId, dragOverPos, handleDragOver, handleDragLeave, handleDrop]);

  const PassageCard = useCallback(({ p, set }) => (
    <div draggable onDragStart={(e) => handleDragStart(e, p.id)} onDragEnd={handleDragEnd}
      style={{ background: '#F0F4FF', border: `.5px solid ${draggingId === p.id ? 'var(--navy)' : 'rgba(27,42,107,.2)'}`, borderRadius: 12, padding: '14px 16px', opacity: draggingId === p.id ? 0.5 : 1, cursor: draggingId === p.id ? 'grabbing' : 'auto', transition: 'opacity .15s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div title="Sudrab ko'chirish" style={{ cursor: 'grab', color: 'var(--navy)', fontSize: 20, lineHeight: '24px', flexShrink: 0, userSelect: 'none', opacity: .5 }} onMouseDown={(e) => e.currentTarget.closest('[draggable]').setAttribute('draggable', 'true')}>⠿</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            📖 Matn parchasi
            <span style={{ fontSize: 10, color: 'var(--hint)', fontWeight: 400 }}>· ⠿ belgisini sudrab joyini o'zgartiring</span>
            <button style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 8px', borderRadius: 4 }}
              onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removePassageFn(set, p.id); }}>✕ O'chirish</button>
          </div>
          <textarea className="finput" rows={4} value={p.text} onChange={(e) => updatePassageFn(set, p.id, e.target.value)} onMouseDown={(e) => e.stopPropagation()} style={{ resize: 'vertical', width: '100%' }} placeholder="Matn parchasi..." />
        </div>
      </div>
    </div>
  ), [draggingId, handleDragStart, handleDragEnd]);

  // ── question list renderer (manual/document) ─────────────────────────────
  const renderQuestionList = (qs, passagesState, set, isPreview) => {
    const updateQFn   = isPreview ? updatePQ   : updateQ;
    const updateOptFn = isPreview ? updatePOpt : updateOpt;
    const elements    = [];
    for (let qi = 0; qi <= qs.length; qi++) {
      elements.push(<DropZone key={`dz-${qi}`} pos={qi} set={set} />);
      passagesState.filter((p) => p.beforeIndex === qi).forEach((p) => elements.push(<PassageCard key={p.id} p={p} set={set} />));
      if (qi === qs.length) break;
      const q = qs[qi];
      elements.push(
        <div className="q-card" key={`q-${qi}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div className="q-num" style={isPreview ? { background: 'var(--navy)', color: '#fff' } : {}}>{(q.questionNumber ?? qi + 1)}-savol</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <select style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '.5px solid var(--line-2)', background: 'var(--bg)' }}
                value={q.points} onChange={(e) => updateQFn(qi, 'points', parseInt(e.target.value))}>
                {[1,2,3].map((v) => <option key={v} value={v}>{v} ball</option>)}
              </select>
              {(isPreview || qs.length > 1) && (
                <button className="btn btn-red btn-sm" onClick={() => {
                  if (isPreview) setPreviewQuestions((p) => p.filter((_, i) => i !== qi));
                  else setQuestions((p) => p.filter((_, i) => i !== qi));
                }}>O'chirish</button>
              )}
            </div>
          </div>
          <input className="finput" value={q.questionText} placeholder="Savol matni..." onChange={(e) => updateQFn(qi, 'questionText', e.target.value)} style={{ marginBottom: 10 }} />
          {q.options.map((opt, oi) => (
            <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input type="radio" name={`correct-${isPreview ? 'p' : 'm'}-${qi}`} checked={q.correctIndex === oi} onChange={() => updateQFn(qi, 'correctIndex', oi)} style={{ flexShrink: 0, accentColor: 'var(--navy)' }} />
              <input className="finput" placeholder={`${'ABCD'[oi]} variant`} value={opt.text} onChange={(e) => updateOptFn(qi, oi, e.target.value)} style={{ flex: 1 }} />
            </div>
          ))}
          {q.correctIndex === -1
            ? <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4, fontWeight: 600 }}>⚠ To'g'ri javobni radio button bilan belgilang</div>
            : <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4, fontWeight: 600 }}>✓ To'g'ri javob: {['A','B','C','D'][q.correctIndex]}</div>
          }
        </div>
      );
    }
    return elements;
  };

  // ── AI question card (Kahoot style) ──────────────────────────────────────
  const renderAiQuestion = (q, qi) => {
    const diff = DIFFS.find((d) => d.key === aiForm.difficulty) || DIFFS[1];
    return (
      <div className="ai-q-card" key={qi} style={{ animationDelay: `${qi * 0.06}s` }}>
        <div className="ai-q-header">
          <div className={`ai-q-badge ${diff.cls}`}>{qi + 1}</div>
          <div className="ai-q-text">
            <input value={q.questionText} onChange={(e) => updateAQ(qi, 'questionText', e.target.value)} placeholder="Savol matni..." />
          </div>
          <select style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '.5px solid var(--line-2)', background: 'var(--bg)', flexShrink: 0 }}
            value={q.points} onChange={(e) => updateAQ(qi, 'points', parseInt(e.target.value))}>
            {[1,2,3].map((v) => <option key={v} value={v}>{v} ball</option>)}
          </select>
          {aiQuestions.length > 1 && (
            <button onClick={() => setAiQuestions((p) => p.filter((_, i) => i !== qi))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: '2px 4px', flexShrink: 0 }}>✕</button>
          )}
        </div>
        <div className="ai-opts-grid">
          {q.options.map((opt, oi) => (
            <div key={oi} className={`ai-opt ${OPT_COLORS[oi]}${q.correctIndex === oi ? ' correct' : ''}`}
              onClick={() => updateAQ(qi, 'correctIndex', oi)}>
              <span className="ai-opt-icon">{OPT_ICONS[oi]}</span>
              <input className="ai-opt-input" value={opt.text} onChange={(e) => { e.stopPropagation(); updateAOpt(qi, oi, e.target.value); }}
                onClick={(e) => e.stopPropagation()} placeholder={`${'ABCD'[oi]} variant...`} />
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 16px', background: 'var(--bg)', fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>To'g'ri javob tanlash uchun variantga bosing</span>
          {q.correctIndex !== -1 && (
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: ['#e21b3c','#1368ce','#d89e00','#26890c'][q.correctIndex] }}>
              ✓ {['A','B','C','D'][q.correctIndex]} varianti
            </span>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ color: 'var(--hint)', fontSize: 13 }}>Yuklanmoqda...</div>
      </div>
    );
  }

  const unmarkPreview = previewQuestions.filter((q) => q.correctIndex === -1).length;

  return (
    <div className="page">
      <input ref={fileInputRef} type="file" style={{ display: 'none' }}
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={onDocumentSelected}
      />

      <div className="r-2col-side">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Header card with tabs */}
          <div className="card">
            <div className="card-hd">
              <h3>{testId ? 'Test tahrirlash' : 'Test muharriri'}</h3>
              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                {tab === 'manual' && (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => addPassageFn(setPassages, questions.length)}>+ Maqola</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setQuestions((p) => [...p, emptyQ()])}>+ Savol</button>
                  </>
                )}
                {tab !== 'ai' && (
                  <button className="btn btn-gold btn-sm"
                    onClick={() => save(
                      tab === 'document' && docState.status === 'preview' ? previewQuestions : undefined,
                      tab === 'document' && docState.status === 'preview' ? previewPassages  : undefined,
                    )}>
                    {testId ? '✓ Yangilash' : 'Saqlash'}
                  </button>
                )}
              </div>
            </div>
            <div className="card-body" style={{ paddingBottom: 0 }}>
              {/* Tab switcher */}
              <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 10, padding: 3, marginBottom: 14, width: 'fit-content', gap: 2 }}>
                {[
                  ['manual',   '✏️ Qo\'lda'],
                  ['document', '📄 Hujjat'],
                  ['ai',       '🤖 AI bilan'],
                ].map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)} style={{
                    padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: tab === key ? (key === 'ai' ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#fff') : 'transparent',
                    color: tab === key ? (key === 'ai' ? '#fff' : 'var(--navy)') : 'var(--muted)',
                    boxShadow: tab === key && key !== 'ai' ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                    transition: 'all .15s',
                  }}>{label}</button>
                ))}
              </div>

              {/* Meta row */}
              <div className="frow" style={{ gridTemplateColumns: '1fr 120px 120px', paddingBottom: 14 }}>
                <div className="fgroup">
                  <div className="flabel">Test nomi</div>
                  <input className="finput" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
                </div>
                <div className="fgroup">
                  <div className="flabel">Vaqt (min)</div>
                  <input className="finput" type="number" value={meta.timeLimitMinutes} onChange={(e) => setMeta({ ...meta, timeLimitMinutes: parseInt(e.target.value) })} />
                </div>
                <div className="fgroup">
                  <div className="flabel">O'tish ball (%)</div>
                  <input className="finput" type="number" value={meta.passScorePct} onChange={(e) => setMeta({ ...meta, passScorePct: parseInt(e.target.value) })} />
                </div>
              </div>
            </div>
          </div>

          {/* ── AI TAB ── */}
          {tab === 'ai' && (
            <>
              {/* Hero */}
              <div className="ai-hero">
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 40, animation: 'aiFloat 3s ease-in-out infinite' }}>🤖</div>
                  <div>
                    <div className="ai-hero-title">AI bilan Test Yaratish</div>
                    <div className="ai-hero-sub">Groq · llama-3.3-70b · O'zbek tilida · Sekundlar ichida</div>
                  </div>
                </div>
              </div>

              {/* Setup form */}
              {aiState !== 'preview' && (
                <div className="card">
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Topic */}
                    <div className="fgroup">
                      <div className="flabel" style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>✨ Mavzu nomi</div>
                      <input className="finput" value={aiForm.topic}
                        onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                        placeholder="Masalan: Fuqarolik huquqi asoslari, Jinoyat kodeksi 97-modda..."
                        style={{ fontSize: 14, padding: '12px 14px', borderRadius: 10 }}
                        disabled={aiState === 'loading'}
                      />
                    </div>

                    {/* Count */}
                    <div>
                      <div className="flabel" style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🔢 Savollar soni</div>
                      <div className="ai-count-grid">
                        {COUNTS.map((n) => (
                          <button key={n} className={`ai-count-btn${aiForm.count === n ? ' selected' : ''}`}
                            onClick={() => setAiForm({ ...aiForm, count: n })}
                            disabled={aiState === 'loading'}>{n}</button>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div>
                      <div className="flabel" style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🎯 Qiyinlik darajasi</div>
                      <div className="ai-diff-grid">
                        {DIFFS.map((d) => (
                          <div key={d.key}
                            className={`ai-diff-card ${d.cls}${aiForm.difficulty === d.key ? ' selected' : ''}`}
                            onClick={() => !aiState === 'loading' && setAiForm({ ...aiForm, difficulty: d.key })}>
                            <div className="ai-diff-icon">{d.icon}</div>
                            <div className="ai-diff-label">{d.label}</div>
                            <div className="ai-diff-pts">{d.pts}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {aiError && (
                      <div style={{ padding: '10px 14px', background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                        ❌ {aiError}
                      </div>
                    )}

                    <button className="ai-gen-btn" onClick={handleAiGenerate} disabled={aiState === 'loading'}>
                      {aiState === 'loading' ? '⏳ Yaratilmoqda...' : `✨ ${aiForm.count} ta savol yaratish`}
                    </button>
                  </div>
                </div>
              )}

              {/* Loading */}
              {aiState === 'loading' && (
                <div className="card">
                  <div className="ai-loading">
                    <div style={{ fontSize: 48, animation: 'aiFloat 2s ease-in-out infinite' }}>🤖</div>
                    <div className="ai-loading-dots">
                      <span /><span /><span />
                    </div>
                    <div className="ai-loading-text">AI savollar yaratmoqda...</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>"{aiForm.topic}" · {aiForm.count} ta savol · Groq llama-3.3-70b</div>
                  </div>
                </div>
              )}

              {/* Preview */}
              {aiState === 'preview' && (
                <>
                  <div className="ai-success-banner">
                    <span style={{ fontSize: 20 }}>🎉</span>
                    <span>{aiQuestions.length} ta savol yaratildi! Tahrirlang va testga qo'shing.</span>
                    <button style={{ marginLeft: 'auto', fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: '4px 8px' }}
                      onClick={() => { setAiState('idle'); setAiQuestions([]); }}>
                      ↺ Qayta yaratish
                    </button>
                  </div>

                  {aiQuestions.map((q, qi) => renderAiQuestion(q, qi))}

                  <button className="btn btn-ghost"
                    onClick={() => setAiQuestions((p) => [...p, emptyQ()])}
                    style={{ border: '1.5px dashed rgba(124,58,237,.4)', color: '#7c3aed', justifyContent: 'center' }}>
                    + Savol qo'shish
                  </button>

                  <button className="ai-gen-btn" onClick={handleAiAddToTest}
                    style={{ marginTop: 4 }}>
                    ✓ Testga qo'shish va saqlash
                  </button>
                </>
              )}
            </>
          )}

          {/* ── DOCUMENT TAB ── */}
          {tab === 'document' && (
            <>
              {(docState.status === 'idle' || docState.status === 'error') && (
                <div className="card">
                  <div className="card-body" style={{ textAlign: 'center', padding: 32 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Test faylini yuklang</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>PDF, DOCX yoki TXT formatida test faylini yuklang.<br />Tizim savollarni avtomatik ajratib chiqaradi.</div>
                    {docState.status === 'error' && (
                      <div style={{ padding: '8px 12px', background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>❌ Xatolik yuz berdi. Qayta urinib ko'ring.</div>
                    )}
                    <button className="btn btn-navy" onClick={() => fileInputRef.current?.click()}>📤 Fayl yuklash</button>
                    <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 8 }}>PDF, DOCX, TXT · Max 20MB</div>
                  </div>
                </div>
              )}
              {docState.status === 'uploading' && (
                <div className="card">
                  <div className="card-body" style={{ padding: 28 }}>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>⚙️</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Tahlil qilinmoqda...</div>
                    </div>
                    <div style={{ background: 'var(--line)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: 'var(--navy)', width: `${docState.progress}%`, transition: 'width .3s' }} />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--navy)', fontWeight: 700, marginTop: 6 }}>{docState.progress}%</div>
                  </div>
                </div>
              )}
              {docState.status === 'preview' && (
                <>
                  <div style={{ padding: '10px 14px', background: '#EFF4FF', borderRadius: 10, border: '.5px solid rgba(27,42,107,.15)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>✓ {previewQuestions.length} ta savol yuklandi</span>
                    {previewPassages.length > 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {previewPassages.length} ta matn parchasi</span>}
                    {unmarkPreview > 0 && <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600, marginLeft: 'auto' }}>⚠ {unmarkPreview} ta savolda to'g'ri javob belgilanmagan</span>}
                  </div>
                  {renderQuestionList(previewQuestions, previewPassages, setPreviewPassages, true)}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={() => { setDocState({ status: 'idle', progress: 0 }); setPreviewQuestions([]); setPreviewPassages([]); }}>Qayta yuklash</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPreviewQuestions((p) => [...p, emptyQ()])}>+ Savol</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => addPassageFn(setPreviewPassages, previewQuestions.length)}>+ Maqola</button>
                    <button className="btn btn-gold" style={{ marginLeft: 'auto' }} onClick={() => save(previewQuestions, previewPassages)}>✓ Saqlash va nashr etish</button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── MANUAL TAB ── */}
          {tab === 'manual' && (
            <>
              {renderQuestionList(questions, passages, setPassages, false)}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1, border: '.5px dashed var(--line-2)', justifyContent: 'center' }} onClick={() => setQuestions((p) => [...p, emptyQ()])}>
                  + Savol qo'shish
                </button>
                <button className="btn btn-ghost" style={{ flex: 1, border: '.5px dashed rgba(27,42,107,.25)', justifyContent: 'center', color: 'var(--navy)' }} onClick={() => addPassageFn(setPassages, questions.length)}>
                  + Maqola qo'shish
                </button>
              </div>
            </>
          )}
        </div>

        {/* Settings sidebar */}
        <div className="card">
          <div className="card-hd"><h3>Test sozlamalari</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="fgroup">
              <div className="flabel">Urinishlar soni</div>
              <select className="finput" value={meta.maxAttempts} onChange={(e) => setMeta({ ...meta, maxAttempts: parseInt(e.target.value) })}>
                <option value={0}>Cheklanmagan</option>
                <option value={1}>1 ta</option>
                <option value={3}>3 ta</option>
                <option value={5}>5 ta</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Savollarni aralashtirish</span>
              <div style={{ width: 36, height: 20, background: meta.shuffleQuestions ? 'var(--navy)' : 'var(--hint)', borderRadius: 10, position: 'relative', cursor: 'pointer' }}
                onClick={() => setMeta({ ...meta, shuffleQuestions: !meta.shuffleQuestions })}>
                <div style={{ position: 'absolute', right: meta.shuffleQuestions ? 2 : 'auto', left: meta.shuffleQuestions ? 'auto' : 2, top: 2, width: 16, height: 16, background: '#fff', borderRadius: 8 }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '.5px solid var(--line)' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Javoblarni ko'rsatish</span>
              <div style={{ width: 36, height: 20, background: meta.showAnswersAfter ? 'var(--green)' : 'var(--hint)', borderRadius: 10, position: 'relative', cursor: 'pointer' }}
                onClick={() => setMeta({ ...meta, showAnswersAfter: !meta.showAnswersAfter })}>
                <div style={{ position: 'absolute', right: meta.showAnswersAfter ? 2 : 'auto', left: meta.showAnswersAfter ? 'auto' : 2, top: 2, width: 16, height: 16, background: '#fff', borderRadius: 8 }} />
              </div>
            </div>
            <div style={{ borderTop: '.5px solid var(--line)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>Savollar soni</span>
                <span style={{ fontWeight: 700 }}>
                  {tab === 'ai' ? aiQuestions.length : tab === 'document' ? previewQuestions.length : questions.length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>O'tish chegarasi</span>
                <span style={{ fontWeight: 700, color: 'var(--amber)' }}>{meta.passScorePct}%</span>
              </div>
              {tab === 'ai' && aiState === 'preview' && (
                <div style={{ marginTop: 6, padding: '8px 10px', background: 'linear-gradient(135deg,rgba(79,70,229,.08),rgba(168,85,247,.08))', borderRadius: 8, border: '1px solid rgba(124,58,237,.2)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>🤖 AI sessiya</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{aiForm.topic}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{DIFFS.find(d => d.key === aiForm.difficulty)?.icon} {DIFFS.find(d => d.key === aiForm.difficulty)?.label} daraja</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
