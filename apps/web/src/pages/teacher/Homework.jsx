import React, { useEffect, useState } from 'react';
import { assignments as assignmentsApi } from '../../api';
import useStore from '../../store/useStore';

const COLORS = ['#E8EDFB:#1B2A6B','#FEF3DC:#B87A10','#ECFDF3:#027A48','#FEF3F2:#B42318','#F5EAFB:#534AB7'];

export default function Homework() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const { showToast } = useStore();

  useEffect(() => { assignmentsApi.pending().then(setItems).catch(() => {}); }, []);

  const grade = async () => {
    if (!selected) return;
    try {
      await assignmentsApi.grade(selected.id, { score: parseInt(score), feedback });
      setItems((p) => p.filter((x) => x.id !== selected.id));
      setSelected(null);
      setScore(''); setFeedback('');
      showToast("Ball berildi va o'quvchiga yuborildi!");
    } catch { showToast('Xatolik!'); }
  };

  const getColor = (i) => COLORS[i % COLORS.length].split(':');

  return (
    <div className="page">
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 14, minHeight: 0, flex: 1 }}>
        {/* List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-hd" style={{ flexShrink: 0 }}>
            <h3>Uy ishlari</h3>
            <span className="pill pill-amber">{items.length} ta kutmoqda</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {items.map((h, i) => {
              const [bg, tc] = getColor(i);
              return (
                <div key={h.id} className={`hw-row${selected?.id === h.id ? ' selected' : ''}`} onClick={() => { setSelected(h); setScore(''); setFeedback(''); }}>
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

        {/* Detail */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-hd" style={{ flexShrink: 0 }}>
            <h3>{selected ? `${selected.first_name} ${selected.last_name} — ${selected.assignment_title}` : "O'quvchini tanlang"}</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {selected ? (
              <>
                <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 14, fontSize: 13, lineHeight: 1.7, color: 'var(--ink)', minHeight: 80 }}>
                  {selected.content_text || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Matn topshirilmagan. Fayl yuklangan bo'lishi mumkin.</span>}
                </div>
                <div className="fgroup">
                  <div className="flabel">Ball berish (0–100)</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[60, 70, 80, 90, 95, 100].map((s) => (
                      <button
                        key={s}
                        className={`btn btn-sm${score == s ? ' btn-navy' : ' btn-ghost'}`}
                        onClick={() => setScore(String(s))}
                      >{s}</button>
                    ))}
                    <input className="finput" type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="Boshqa" style={{ width: 80 }} />
                  </div>
                </div>
                <div className="fgroup">
                  <div className="flabel">Feedback</div>
                  <textarea className="finput" rows={4} placeholder="O'quvchiga izoh va tavsiya..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => setSelected(null)}>Keyinroq</button>
                  <button className="btn btn-navy" onClick={grade}>Ball berish va yuborish</button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--hint)', gap: 8 }}>
                <span style={{ fontSize: 36 }}>📝</span>
                <span style={{ fontSize: 13 }}>Tekshirish uchun uy ishini tanlang</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
