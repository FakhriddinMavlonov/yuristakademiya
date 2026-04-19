import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courses as coursesApi } from '../../api';
import useStore from '../../store/useStore';

const GRADIENTS = [
  'linear-gradient(135deg,#0C1A52,#1E2D8A)',
  'linear-gradient(135deg,#1B4332,#2D6A4F)',
  'linear-gradient(135deg,#7B2D00,#C0392B)',
  'linear-gradient(135deg,#4A235A,#7D3C98)',
  'linear-gradient(135deg,#1A3A5C,#2980B9)',
  'linear-gradient(135deg,#78350F,#D97706)',
  'linear-gradient(135deg,#1C1C2E,#4A4A8A)',
  'linear-gradient(135deg,#0D3B2E,#1A7A5E)',
];

const LEVEL_LABELS = { beginner: 'Boshlang\'ich', intermediate: 'O\'rta', advanced: 'Yuqori' };
const LEVEL_COLORS = { beginner: 'pill-green', intermediate: 'pill-blue', advanced: 'pill-amber' };

export default function TeacherCourses() {
  const [list, setList] = useState([]);
  const [tab, setTab] = useState('list');
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Fuqarolik huquqi',
    level: 'beginner', status: 'draft',
    banner_gradient: GRADIENTS[0],
  });
  const { showToast } = useStore();
  const navigate = useNavigate();

  useEffect(() => { coursesApi.list().then(setList).catch(() => {}); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ title: '', description: '', category: 'Fuqarolik huquqi', level: 'beginner', status: 'draft', banner_gradient: GRADIENTS[0] });
    setTab('create');
  };

  const openEdit = (e, c) => {
    e.stopPropagation();
    setEditTarget(c);
    setForm({ title: c.title, description: c.description || '', category: c.category || 'Fuqarolik huquqi', level: c.level || 'beginner', status: c.status, banner_gradient: c.banner_gradient || GRADIENTS[0] });
    setTab('create');
  };

  const deleteCourse = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Kursni o\'chirmoqchimisiz? Bu amalni qaytarib bo\'lmaydi.')) return;
    try {
      await coursesApi.remove(id);
      setList((p) => p.filter((c) => c.id !== id));
      showToast('Kurs o\'chirildi');
    } catch { showToast('O\'chirishda xatolik!'); }
  };

  const submit = async (status) => {
    if (!form.title.trim()) return showToast('Kurs nomini kiriting');
    try {
      if (editTarget) {
        const updated = await coursesApi.update(editTarget.id, { ...form, status });
        setList((p) => p.map((c) => c.id === editTarget.id ? { ...c, ...updated } : c));
        showToast('Kurs yangilandi!');
      } else {
        const c = await coursesApi.create({ ...form, status });
        setList((p) => [c, ...p]);
        showToast(status === 'published' ? 'Kurs nashr etildi!' : 'Qoralama saqlandi!');
      }
      setTab('list');
      setEditTarget(null);
    } catch { showToast('Xatolik!'); }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div className="tabs">
          <button className={`tab${tab === 'list' ? ' active' : ''}`} onClick={() => setTab('list')}>
            Kurslar ro'yxati
          </button>
          <button className={`tab${tab === 'create' ? ' active' : ''}`} onClick={openCreate}>
            + Yangi kurs
          </button>
        </div>
      </div>

      {tab === 'list' && (
        <>
          {list.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--hint)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 14, marginBottom: 16 }}>Hali kurs yaratilmagan</div>
              <button className="btn btn-navy" onClick={openCreate}>+ Birinchi kursni yarating</button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {list.map((c) => {
              const score = parseFloat(c.avg_score) || 0;
              const scoreColor = score >= 90 ? 'var(--green)' : score >= 75 ? 'var(--amber)' : 'var(--blue)';
              return (
                <div className="course-card" key={c.id} onClick={() => navigate(`/teacher/courses/${c.id}/lessons`)}>
                  <div className="cc-banner" style={{ background: c.banner_gradient || GRADIENTS[0] }}>
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      <span className={`pill ${c.status === 'published' ? 'pill-green' : 'pill-amber'}`}>
                        {c.status === 'published' ? 'Nashr etilgan' : 'Qoralama'}
                      </span>
                    </div>
                    <div style={{ color: '#fff', zIndex: 1, position: 'relative' }}>
                      <div style={{ fontSize: 10, opacity: .6, marginBottom: 3 }}>
                        {c.enrolled_count || 0} o'quvchi · {c.lesson_count || 0} dars
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{c.title}</div>
                      <span className={`pill ${LEVEL_COLORS[c.level] || 'pill-blue'}`} style={{ marginTop: 6, display: 'inline-block', fontSize: 10 }}>
                        {LEVEL_LABELS[c.level] || c.level}
                      </span>
                    </div>
                  </div>
                  <div className="cc-body">
                    {c.description && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: 'var(--muted)' }}>O'rtacha natija</span>
                      <span style={{ fontWeight: 700, color: scoreColor }}>{score ? `${score}%` : '—'}</span>
                    </div>
                    <div className="pb-wrap"><div className="pb-fill" style={{ width: `${score}%`, background: scoreColor }} /></div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/teacher/courses/${c.id}/lessons`); }}>
                        Darslar
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={(e) => openEdit(e, c)}>
                        Tahrirlash
                      </button>
                      <button className="btn btn-red btn-sm" onClick={(e) => deleteCourse(e, c.id)}>
                        O'chirish
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
          <div className="card">
            <div className="card-hd">
              <h3>{editTarget ? 'Kursni tahrirlash' : 'Yangi kurs yaratish'}</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fgroup">
                <div className="flabel">Kurs nomi *</div>
                <input
                  className="finput"
                  placeholder="Masalan: Fuqarolik huquqi asoslari"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="fgroup">
                <div className="flabel">Tavsif</div>
                <textarea
                  className="finput"
                  rows={4}
                  placeholder="Kurs nima haqida? O'quvchilar nimani o'rganadi?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fgroup">
                  <div className="flabel">Kategoriya</div>
                  <select className="finput" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option>Fuqarolik huquqi</option>
                    <option>Jinoyat huquqi</option>
                    <option>Mehnat huquqi</option>
                    <option>Soliq huquqi</option>
                    <option>Ma'muriy huquq</option>
                    <option>Xalqaro huquq</option>
                    <option>Tadbirkorlik huquqi</option>
                  </select>
                </div>
                <div className="fgroup">
                  <div className="flabel">Daraja</div>
                  <select className="finput" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    <option value="beginner">Boshlang'ich</option>
                    <option value="intermediate">O'rta</option>
                    <option value="advanced">Yuqori</option>
                  </select>
                </div>
              </div>

              <div className="fgroup">
                <div className="flabel">Banner rangi</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {GRADIENTS.map((g) => (
                    <div
                      key={g}
                      onClick={() => setForm({ ...form, banner_gradient: g })}
                      style={{
                        width: 44, height: 44, borderRadius: 10, background: g, cursor: 'pointer',
                        border: form.banner_gradient === g ? '2.5px solid var(--navy)' : '2.5px solid transparent',
                        boxShadow: form.banner_gradient === g ? '0 0 0 2px var(--gold)' : 'none',
                        transition: 'all .15s',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button className="btn btn-ghost" onClick={() => { setTab('list'); setEditTarget(null); }}>Bekor qilish</button>
                <button className="btn btn-navy" onClick={() => submit('draft')}>Qoralama saqlash</button>
                <button className="btn btn-gold" onClick={() => submit('published')}>Nashr etish</button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--hint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Ko'rinish</div>
            <div className="course-card" style={{ cursor: 'default' }}>
              <div className="cc-banner" style={{ background: form.banner_gradient }}>
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <span className="pill pill-amber">Qoralama</span>
                </div>
                <div style={{ color: '#fff', zIndex: 1, position: 'relative' }}>
                  <div style={{ fontSize: 10, opacity: .6, marginBottom: 3 }}>0 o'quvchi</div>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{form.title || 'Kurs nomi...'}</div>
                  <span className={`pill ${LEVEL_COLORS[form.level]}`} style={{ marginTop: 6, display: 'inline-block', fontSize: 10 }}>
                    {LEVEL_LABELS[form.level]}
                  </span>
                </div>
              </div>
              <div className="cc-body">
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, minHeight: 32 }}>
                  {form.description || 'Tavsif bu yerda ko\'rinadi...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
