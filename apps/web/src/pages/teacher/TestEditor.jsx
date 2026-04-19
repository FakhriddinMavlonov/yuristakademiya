import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tests as testsApi, lessons as lessonsApi } from '../../api';
import useStore from '../../store/useStore';

const emptyQ = () => ({ questionText: '', points: 2, options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }], correctIndex: 0 });
const genId = () => Math.random().toString(36).slice(2);

export default function TestEditor() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useStore();

  const [loading, setLoading] = useState(true);
  const [testId, setTestId] = useState(null);
  const [tab, setTab] = useState('manual');
  const [meta, setMeta] = useState({ title: 'Nazorat testi', timeLimitMinutes: 30, passScorePct: 90, maxAttempts: 3, shuffleQuestions: true, showAnswersAfter: true });

  // Manual mode state
  const [questions, setQuestions] = useState([emptyQ()]);
  const [passages, setPassages] = useState([]);

  // Document mode state
  const [docState, setDocState] = useState({ status: 'idle', progress: 0 });
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [previewPassages, setPreviewPassages] = useState([]);

  // Drag state
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverPos, setDragOverPos] = useState(null);

  const fileInputRef = useRef(null);

  // Load existing test on mount
  useEffect(() => {
    (async () => {
      try {
        const lesson = await lessonsApi.get(lessonId);
        if (lesson.test?.id) {
          const test = await testsApi.get(lesson.test.id);
          setTestId(test.id);
          setMeta({
            title: test.title,
            timeLimitMinutes: test.time_limit_minutes,
            passScorePct: test.pass_score_pct,
            maxAttempts: test.max_attempts,
            shuffleQuestions: test.shuffle_questions,
            showAnswersAfter: test.show_answers_after,
          });
          const qs = (test.questions || []).map((q) => {
            const opts = [...(q.options || [])].sort((a, b) => a.order_num - b.order_num);
            return {
              questionText: q.question_text,
              points: q.points,
              options: opts.map((o) => ({ text: o.option_text })),
              correctIndex: opts.findIndex((o) => o.is_correct),
            };
          });
          setQuestions(qs.length ? qs : [emptyQ()]);
          setPassages((test.passages || []).map((p) => ({ ...p, id: genId() })));
        }
      } catch { /* new test */ }
      setLoading(false);
    })();
  }, [lessonId]);

  // ── question/option helpers ──────────────────────────────────────────────
  const updateQ = (i, f, v) => setQuestions((p) => p.map((q, idx) => idx === i ? { ...q, [f]: v } : q));
  const updateOpt = (qi, oi, v) => setQuestions((p) => p.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? { ...o, text: v } : o) } : q));
  const updatePQ = (i, f, v) => setPreviewQuestions((p) => p.map((q, idx) => idx === i ? { ...q, [f]: v } : q));
  const updatePOpt = (qi, oi, v) => setPreviewQuestions((p) => p.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? { ...o, text: v } : o) } : q));

  // ── passage helpers ──────────────────────────────────────────────────────
  const addPassageFn = (setPassagesState, beforeIndex) =>
    setPassagesState((p) => [...p, { id: genId(), text: '', beforeIndex }]);

  const updatePassageFn = (setPassagesState, id, text) =>
    setPassagesState((p) => p.map((x) => x.id === id ? { ...x, text } : x));

  const removePassageFn = (setPassagesState, id) =>
    setPassagesState((p) => p.filter((x) => x.id !== id));

  // ── save ─────────────────────────────────────────────────────────────────
  const save = async (qs, passagesToSave) => {
    const finalQs = qs || questions;
    const finalPassages = passagesToSave || passages;
    if (!finalQs.length) return showToast('Savollar qo\'shing');
    if (finalQs.some((q) => q.correctIndex === -1)) return showToast('Barcha savollarda to\'g\'ri javobni belgilang!');
    try {
      await testsApi.save(lessonId, {
        id: testId,
        ...meta,
        questions: finalQs,
        passages: finalPassages.map(({ text, beforeIndex }) => ({ text, beforeIndex })),
      });
      showToast(testId ? 'Test yangilandi!' : 'Test saqlandi!');
      navigate(-1);
    } catch { showToast('Saqlashda xatolik!'); }
  };

  // ── document upload ──────────────────────────────────────────────────────
  const onDocumentSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocState({ status: 'uploading', progress: 0 });
    try {
      const result = await testsApi.parseDocument(lessonId, file, (pct) => {
        setDocState({ status: 'uploading', progress: pct });
      });
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
  const handleDragStart = useCallback((e, id) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverPos(null);
  }, []);

  const handleDragOver = useCallback((e, pos) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPos(pos);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverPos(null);
  }, []);

  const handleDrop = useCallback((e, pos, setPassagesState) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    if (id) {
      setPassagesState((p) => p.map((x) => x.id === id ? { ...x, beforeIndex: pos } : x));
    }
    setDraggingId(null);
    setDragOverPos(null);
  }, [draggingId]);

  // ── sub-components ───────────────────────────────────────────────────────
  const DropZone = useCallback(({ pos, setPassagesState }) => {
    const isActive = draggingId !== null;
    const isOver = dragOverPos === pos && isActive;
    return (
      <div
        onDragOver={(e) => handleDragOver(e, pos)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, pos, setPassagesState)}
        style={{
          height: isActive ? (isOver ? 44 : 20) : 0,
          overflow: 'hidden',
          margin: isActive ? '2px 0' : 0,
          borderRadius: 8,
          border: isActive ? (isOver ? '2px dashed var(--navy)' : '1.5px dashed rgba(27,42,107,.25)') : 'none',
          background: isOver ? 'rgba(27,42,107,.06)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'height .15s, background .1s',
          cursor: 'copy',
        }}
      >
        {isOver && (
          <span style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 700 }}>
            📌 Maqolani bu yerga tashlang
          </span>
        )}
      </div>
    );
  }, [draggingId, dragOverPos, handleDragOver, handleDragLeave, handleDrop]);

  const PassageCard = useCallback(({ p, setPassagesState }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, p.id)}
      onDragEnd={handleDragEnd}
      style={{
        background: '#F0F4FF',
        border: `.5px solid ${draggingId === p.id ? 'var(--navy)' : 'rgba(27,42,107,.2)'}`,
        borderRadius: 12,
        padding: '14px 16px',
        opacity: draggingId === p.id ? 0.5 : 1,
        cursor: draggingId === p.id ? 'grabbing' : 'auto',
        transition: 'opacity .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div
          title="Sudrab ko'chirish"
          style={{ cursor: 'grab', color: 'var(--navy)', fontSize: 20, lineHeight: '24px', flexShrink: 0, userSelect: 'none', opacity: .5 }}
          onMouseDown={(e) => e.currentTarget.closest('[draggable]').setAttribute('draggable', 'true')}
        >
          ⠿
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            📖 Matn parchasi
            <span style={{ fontSize: 10, color: 'var(--hint)', fontWeight: 400 }}>· ⠿ belgisini sudrab joyini o'zgartiring</span>
            <button
              style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 8px', borderRadius: 4 }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); removePassageFn(setPassagesState, p.id); }}
            >✕ O'chirish</button>
          </div>
          <textarea
            className="finput"
            rows={4}
            value={p.text}
            onChange={(e) => updatePassageFn(setPassagesState, p.id, e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ resize: 'vertical', width: '100%' }}
            placeholder="Matn parchasi..."
          />
        </div>
      </div>
    </div>
  ), [draggingId, handleDragStart, handleDragEnd]);

  // ── question list renderer ───────────────────────────────────────────────
  const renderQuestionList = (qs, passagesState, setPassagesState, isPreview) => {
    const updateQFn = isPreview ? updatePQ : updateQ;
    const updateOptFn = isPreview ? updatePOpt : updateOpt;

    const elements = [];
    for (let qi = 0; qi <= qs.length; qi++) {
      // Drop zone
      elements.push(<DropZone key={`dz-${qi}`} pos={qi} setPassagesState={setPassagesState} />);

      // Passages at this position
      passagesState.filter((p) => p.beforeIndex === qi).forEach((p) => {
        elements.push(<PassageCard key={p.id} p={p} setPassagesState={setPassagesState} />);
      });

      if (qi === qs.length) break;
      const q = qs[qi];

      elements.push(
        <div className="q-card" key={`q-${qi}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div className="q-num" style={isPreview ? { background: 'var(--navy)', color: '#fff' } : {}}>
              {(q.questionNumber ?? qi + 1)}-savol
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <select style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '.5px solid var(--line-2)', background: 'var(--bg)' }}
                value={q.points} onChange={(e) => updateQFn(qi, 'points', parseInt(e.target.value))}>
                <option value={1}>1 ball</option>
                <option value={2}>2 ball</option>
                <option value={3}>3 ball</option>
              </select>
              {(isPreview || qs.length > 1) && (
                <button className="btn btn-red btn-sm" onClick={() => {
                  if (isPreview) setPreviewQuestions((p) => p.filter((_, i) => i !== qi));
                  else setQuestions((p) => p.filter((_, i) => i !== qi));
                }}>O'chirish</button>
              )}
            </div>
          </div>
          <input className="finput" value={q.questionText} placeholder="Savol matni..."
            onChange={(e) => updateQFn(qi, 'questionText', e.target.value)} style={{ marginBottom: 10 }} />
          {q.options.map((opt, oi) => (
            <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input type="radio" name={`correct-${isPreview ? 'p' : 'm'}-${qi}`}
                checked={q.correctIndex === oi}
                onChange={() => updateQFn(qi, 'correctIndex', oi)}
                style={{ flexShrink: 0, accentColor: 'var(--navy)' }} />
              <input className="finput" placeholder={`${'ABCD'[oi]} variant`} value={opt.text}
                onChange={(e) => updateOptFn(qi, oi, e.target.value)} style={{ flex: 1 }} />
            </div>
          ))}
          {q.correctIndex === -1
            ? <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4, fontWeight: 600 }}>⚠ To'g'ri javobni radio button bilan belgilang</div>
            : <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4, fontWeight: 600 }}>✓ To'g'ri javob: {['A', 'B', 'C', 'D'][q.correctIndex]}</div>
          }
        </div>
      );
    }
    return elements;
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Header */}
          <div className="card">
            <div className="card-hd">
              <h3>{testId ? 'Test tahrirlash' : 'Test muharriri'}</h3>
              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                {tab === 'manual' && (
                  <>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => addPassageFn(setPassages, questions.length)}>
                      + Maqola
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setQuestions((p) => [...p, emptyQ()])}>
                      + Savol
                    </button>
                  </>
                )}
                <button className="btn btn-gold btn-sm"
                  onClick={() => save(
                    tab === 'document' && docState.status === 'preview' ? previewQuestions : undefined,
                    tab === 'document' && docState.status === 'preview' ? previewPassages : undefined,
                  )}>
                  {testId ? '✓ Yangilash' : 'Saqlash'}
                </button>
              </div>
            </div>
            <div className="card-body" style={{ paddingBottom: 0 }}>
              <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 8, padding: 3, marginBottom: 14, width: 'fit-content' }}>
                {[['manual', '✏️ Qo\'lda kiritish'], ['document', '📄 Hujjatdan yuklash']].map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)} style={{
                    padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: tab === key ? '#fff' : 'transparent',
                    color: tab === key ? 'var(--navy)' : 'var(--muted)',
                    boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                  }}>{label}</button>
                ))}
              </div>
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

          {/* Document tab */}
          {tab === 'document' && (
            <>
              {(docState.status === 'idle' || docState.status === 'error') && (
                <div className="card">
                  <div className="card-body" style={{ textAlign: 'center', padding: 32 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Test faylini yuklang</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
                      PDF, DOCX yoki TXT formatida test faylini yuklang.<br />Tizim savollarni avtomatik ajratib chiqaradi.
                    </div>
                    {docState.status === 'error' && (
                      <div style={{ padding: '8px 12px', background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                        ❌ Xatolik yuz berdi. Qayta urinib ko'ring.
                      </div>
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
                    {previewPassages.length > 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {previewPassages.length} ta matn parchasi (sudrab joyini o'zgartiring)</span>}
                    {unmarkPreview > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600, marginLeft: 'auto' }}>
                        ⚠ {unmarkPreview} ta savolda to'g'ri javob belgilanmagan
                      </span>
                    )}
                  </div>

                  {renderQuestionList(previewQuestions, previewPassages, setPreviewPassages, true)}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost"
                      onClick={() => { setDocState({ status: 'idle', progress: 0 }); setPreviewQuestions([]); setPreviewPassages([]); }}>
                      Qayta yuklash
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPreviewQuestions((p) => [...p, emptyQ()])}>+ Savol</button>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => addPassageFn(setPreviewPassages, previewQuestions.length)}>
                      + Maqola
                    </button>
                    <button className="btn btn-gold" style={{ marginLeft: 'auto' }}
                      onClick={() => save(previewQuestions, previewPassages)}>
                      ✓ Saqlash va nashr etish
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Manual tab */}
          {tab === 'manual' && (
            <>
              {renderQuestionList(questions, passages, setPassages, false)}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1, border: '.5px dashed var(--line-2)', justifyContent: 'center' }}
                  onClick={() => setQuestions((p) => [...p, emptyQ()])}>
                  + Savol qo'shish
                </button>
                <button className="btn btn-ghost" style={{ flex: 1, border: '.5px dashed rgba(27,42,107,.25)', justifyContent: 'center', color: 'var(--navy)' }}
                  onClick={() => addPassageFn(setPassages, questions.length)}>
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
                <span style={{ fontWeight: 700 }}>{tab === 'document' ? previewQuestions.length : questions.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>Matn parchalari</span>
                <span style={{ fontWeight: 700 }}>{tab === 'document' ? previewPassages.length : passages.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>O'tish chegarasi</span>
                <span style={{ fontWeight: 700, color: 'var(--amber)' }}>{meta.passScorePct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
