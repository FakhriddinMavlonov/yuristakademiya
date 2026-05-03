import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exams as examsApi, groups as groupsApi } from '../../api';
import useStore from '../../store/useStore';

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('uz', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const isoLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function TeacherExams() {
  const { t } = useTranslation();
  const { showToast } = useStore();
  const [exams, setExams] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', topic: '', scheduledAt: '', location: "O'quv markaz",
    durationMinutes: 90, maxScore: 100, groupIds: [],
  });
  const [resultExam, setResultExam] = useState(null);
  const [resultStudents, setResultStudents] = useState([]);
  const [resultRows, setResultRows] = useState({});
  const [answerText, setAnswerText] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [list, gs] = await Promise.all([examsApi.list(), groupsApi.list()]);
      setExams(list);
      setGroupOptions(gs);
    } catch (e) {
      showToast(t('teacher.exams.loadError') || 'Yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    // Default: next Sunday 10:00
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() + ((7 - day) % 7 || 7));
    d.setHours(10, 0, 0, 0);
    setForm({
      title: '', topic: '', scheduledAt: isoLocal(d.toISOString()),
      location: "O'quv markaz", durationMinutes: 90, maxScore: 100, groupIds: [],
    });
    setShowForm(true);
  };

  const openEdit = (exam) => {
    setEditing(exam);
    setForm({
      title: exam.title, topic: exam.topic || '',
      scheduledAt: isoLocal(exam.scheduled_at),
      location: exam.location || "O'quv markaz",
      durationMinutes: exam.duration_minutes || 90,
      maxScore: exam.max_score || 100,
      groupIds: (exam.groups || []).map((g) => g.id),
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.scheduledAt || !form.groupIds.length) {
      return showToast('Sarlavha, vaqt va kamida bitta guruhni tanlang');
    }
    try {
      const payload = {
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      };
      if (editing) {
        await examsApi.update(editing.id, payload);
        showToast('Imtihon yangilandi');
      } else {
        await examsApi.create(payload);
        showToast('Imtihon yaratildi');
      }
      setShowForm(false);
      load();
    } catch (e) {
      showToast(e?.error || 'Xatolik');
    }
  };

  const remove = async (id) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    try {
      await examsApi.remove(id);
      setExams((p) => p.filter((e) => e.id !== id));
      showToast("O'chirildi");
    } catch { showToast('Xatolik'); }
  };

  const openResults = async (exam) => {
    try {
      const { students } = await examsApi.students(exam.id);
      setResultExam(exam);
      setResultStudents(students);
      setAnswerText(exam.answer_text || '');
      const rows = {};
      students.forEach((s) => {
        rows[s.id] = { score: s.score ?? '', feedback: s.feedback ?? '' };
      });
      setResultRows(rows);
    } catch {
      showToast('Yuklashda xatolik');
    }
  };

  const saveResults = async () => {
    if (!resultExam) return;
    const results = Object.entries(resultRows)
      .filter(([_, v]) => v.score !== '' && v.score !== null && v.score !== undefined)
      .map(([userId, v]) => ({
        userId: +userId,
        score: +v.score,
        feedback: v.feedback || null,
      }));
    if (!results.length) return showToast('Hech kim baholanmagan');
    try {
      await examsApi.postResults(resultExam.id, results);
      showToast('Natijalar e\'lon qilindi');
      setResultExam(null);
      load();
    } catch { showToast('Xatolik'); }
  };

  const upcoming = useMemo(() => exams.filter((e) => e.status !== 'completed'), [exams]);
  const past = useMemo(() => exams.filter((e) => e.status === 'completed'), [exams]);

  // === Results modal ===
  if (resultExam) {
    return (
      <div className="page" style={{ padding: 16 }}>
        <button className="btn-ghost" onClick={() => setResultExam(null)} style={{ marginBottom: 12 }}>
          ← Orqaga
        </button>
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>{resultExam.title}</h3>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            {fmtDate(resultExam.scheduled_at)} · {resultExam.location} · max {resultExam.max_score} ball
          </div>
          {resultStudents.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--muted)' }}>O'quvchi yo'q</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>O'quvchi</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Guruh</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', width: 110 }}>Ball</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {resultStudents.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 8px' }}>{s.first_name} {s.last_name}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--muted)' }}>{s.group_name}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <input
                          type="number" min={0} max={resultExam.max_score}
                          className="finput" style={{ padding: '6px 8px', fontSize: 13, width: 90 }}
                          value={resultRows[s.id]?.score ?? ''}
                          onChange={(e) => setResultRows((p) => ({ ...p, [s.id]: { ...p[s.id], score: e.target.value } }))}
                        />
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <input
                          className="finput" placeholder="Izoh..."
                          style={{ padding: '6px 8px', fontSize: 13, width: '100%' }}
                          value={resultRows[s.id]?.feedback ?? ''}
                          onChange={(e) => setResultRows((p) => ({ ...p, [s.id]: { ...p[s.id], feedback: e.target.value } }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 20, padding: 14, background: 'var(--bg)', borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>📋 Test javoblari (hammaga ko'rinadi)</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
              Har bir javobni alohida qatorga yozing. Masalan: <code>1. B</code>, <code>2. C</code>...
            </div>
            <textarea
              className="finput"
              rows={6}
              placeholder={"1. B\n2. C\n3. A\n4. D\n..."}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 13 }}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
            />
            <button
              className="btn-ghost"
              style={{ marginTop: 8 }}
              onClick={async () => {
                try {
                  await examsApi.update(resultExam.id, { answerText });
                  showToast('Javoblar saqlandi');
                  load();
                } catch { showToast('Xatolik'); }
              }}
            >💾 Javoblarni saqlash</button>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setResultExam(null)}>Bekor</button>
            <button className="btn-primary" onClick={saveResults}>✓ Natijalarni e'lon qilish</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>📝 Mock imtihonlar</h2>
        <button className="btn-primary" onClick={openCreate}>+ Yangi imtihon</button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Yuklanmoqda...</div>
      ) : exams.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>📝</div>
          Hali imtihon yaratilmagan
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>⏰ Kelgusi imtihonlar</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
                {upcoming.map((e) => (
                  <ExamCard key={e.id} exam={e} onEdit={openEdit} onDelete={remove} onResults={openResults} />
                ))}
              </div>
            </>
          )}
          {past.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>✓ Tugagan imtihonlar</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {past.map((e) => (
                  <ExamCard key={e.id} exam={e} onEdit={openEdit} onDelete={remove} onResults={openResults} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setShowForm(false)}>
          <div className="card" style={{ padding: 20, maxWidth: 540, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editing ? 'Imtihonni tahrirlash' : 'Yangi mock imtihon'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="flabel">Sarlavha</label>
                <input className="finput" placeholder="Masalan: Yakuniy mock #1"
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="flabel">Mavzu</label>
                <textarea className="finput" rows={2} placeholder="Mavzular ro'yxati"
                  value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="flabel">Sana va vaqt</label>
                  <input type="datetime-local" className="finput"
                    value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
                </div>
                <div>
                  <label className="flabel">Davomiyligi (min)</label>
                  <input type="number" className="finput" min={15} step={15}
                    value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: +e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="flabel">Joy</label>
                  <input className="finput" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div>
                  <label className="flabel">Maksimal ball</label>
                  <input type="number" className="finput" min={1}
                    value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: +e.target.value })} />
                </div>
              </div>
              <div>
                <label className="flabel">Guruhlar</label>
                {groupOptions.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>
                    Sizga guruh biriktirilmagan
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {groupOptions.map((g) => {
                      const checked = form.groupIds.includes(g.id);
                      return (
                        <label key={g.id} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px', borderRadius: 16, fontSize: 12,
                          background: checked ? 'var(--navy)' : 'var(--bg)',
                          color: checked ? '#fff' : 'var(--ink)',
                          cursor: 'pointer', border: '.5px solid var(--line)',
                        }}>
                          <input type="checkbox" checked={checked} style={{ display: 'none' }}
                            onChange={() => setForm((p) => ({
                              ...p,
                              groupIds: checked
                                ? p.groupIds.filter((x) => x !== g.id)
                                : [...p.groupIds, g.id],
                            }))} />
                          {g.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn-ghost" onClick={() => setShowForm(false)}>Bekor</button>
                <button className="btn-primary" onClick={save}>{editing ? '✓ Yangilash' : '✓ Yaratish'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExamCard({ exam, onEdit, onDelete, onResults }) {
  const isCompleted = exam.status === 'completed';
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{exam.title}</h4>
        {isCompleted ? (
          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: 'var(--green-bg)', color: 'var(--green)', fontWeight: 700 }}>✓ Tugadi</span>
        ) : (
          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: 'var(--amber-bg)', color: 'var(--amber)', fontWeight: 700 }}>⏰ Rejada</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
        📅 {fmtDate(exam.scheduled_at)}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
        📍 {exam.location} · {exam.duration_minutes} daq · max {exam.max_score} ball
      </div>
      {exam.topic && (
        <div style={{ fontSize: 12, marginTop: 8, color: 'var(--ink)' }}>
          {exam.topic}
        </div>
      )}
      {exam.groups?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {exam.groups.map((g) => (
            <span key={g.id} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'var(--blue-bg)', color: 'var(--blue)' }}>
              {g.name}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, padding: '7px 10px', fontSize: 12 }} onClick={() => onResults(exam)}>
          📊 Natija
        </button>
        <button className="btn-ghost" style={{ padding: '7px 10px', fontSize: 12 }} onClick={() => onEdit(exam)}>✎</button>
        <button className="btn-ghost" style={{ padding: '7px 10px', fontSize: 12, color: 'var(--red)' }} onClick={() => onDelete(exam.id)}>✕</button>
      </div>
    </div>
  );
}
