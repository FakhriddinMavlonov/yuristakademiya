import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { curricula as curriculaApi } from '../../api';
import useStore from '../../store/useStore';
import Modal from '../../components/ui/Modal';
import { SkeletonGrid } from '../../components/ui/Loading';

export default function Curricula() {
  const { showToast } = useStore();
  const { t } = useTranslation();
  const [curricula, setCurricula] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [lessonModal, setLessonModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [taskLessonId, setTaskLessonId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [lessonForm, setLessonForm] = useState({ title: '', description: '' });
  const [taskForm, setTaskForm] = useState({ type: 'task', title: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = () => {
    setLoading(true);
    curriculaApi.list()
      .then(setCurricula)
      .catch(() => showToast('Kurs rejalarni yuklashda xatolik'))
      .finally(() => setLoading(false));
  };

  const selectCurriculum = (c) => {
    setSelected(c.id);
    setDetail(null);
    curriculaApi.get(c.id)
      .then(setDetail)
      .catch(() => showToast('Kurs rejani yuklashda xatolik'));
  };

  const createCurriculum = async () => {
    if (!form.name.trim()) return showToast('Kurs reja nomini kiriting');
    setSaving(true);
    try {
      const newC = await curriculaApi.create(form);
      setCurricula(p => [newC, ...p]);
      setForm({ name: '', description: '' });
      setCreateModal(false);
      selectCurriculum(newC);
      showToast('Kurs reja yaratildi');
    } catch (e) {
      showToast(e?.error || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const deleteCurriculum = async () => {
    if (!window.confirm('Rostanam o\'chirmoqchisiz?')) return;
    setSaving(true);
    try {
      await curriculaApi.remove(selected);
      setCurricula(p => p.filter(c => c.id !== selected));
      setSelected(null);
      setDetail(null);
      showToast('Kurs reja o\'chirildi');
    } catch (e) {
      showToast(e?.error || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const addLesson = async () => {
    if (!lessonForm.title.trim()) return showToast('Dars nomini kiriting');
    setSaving(true);
    try {
      const newL = await curriculaApi.addLesson(selected, lessonForm);
      setDetail(p => ({
        ...p,
        lessons: [...p.lessons, { ...newL, tasks: [] }],
      }));
      setLessonForm({ title: '', description: '' });
      setLessonModal(false);
      showToast('Dars qo\'shildi');
    } catch (e) {
      showToast(e?.error || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const deleteLesson = async (lessonId) => {
    if (!window.confirm('Rostanam o\'chirmoqchisiz?')) return;
    setSaving(true);
    try {
      await curriculaApi.removeLesson(selected, lessonId);
      setDetail(p => ({
        ...p,
        lessons: p.lessons.filter(l => l.id !== lessonId),
      }));
      showToast('Dars o\'chirildi');
    } catch (e) {
      showToast(e?.error || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const addTask = async () => {
    if (!taskForm.title.trim()) return showToast('Topshiriq nomini kiriting');
    setSaving(true);
    try {
      const newT = await curriculaApi.addTask(selected, taskLessonId, taskForm);
      setDetail(p => ({
        ...p,
        lessons: p.lessons.map(l => l.id === taskLessonId ? { ...l, tasks: [...l.tasks, newT] } : l),
      }));
      setTaskForm({ type: 'task', title: '', description: '' });
      setTaskModal(false);
      setTaskLessonId(null);
      showToast('Topshiriq qo\'shildi');
    } catch (e) {
      showToast(e?.error || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (lessonId, taskId) => {
    if (!window.confirm('Rostanam o\'chirmoqchisiz?')) return;
    setSaving(true);
    try {
      await curriculaApi.removeTask(selected, lessonId, taskId);
      setDetail(p => ({
        ...p,
        lessons: p.lessons.map(l => l.id === lessonId ? { ...l, tasks: l.tasks.filter(t => t.id !== taskId) } : l),
      }));
      showToast('Topshiriq o\'chirildi');
    } catch (e) {
      showToast(e?.error || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page"><SkeletonGrid count={4} minWidth={200} /></div>;

  return (
    <div className="page" style={{ display: 'flex', gap: 16, height: 'calc(100vh - 120px)' }}>
      {/* Chap: Kurs rejalar ro'yxati */}
      <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Kurs rejalar</h3>
          <button className="btn btn-sm btn-navy" onClick={() => setCreateModal(true)}>+ Yangi</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {curricula.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              Hali kurs reja yo'q
            </div>
          ) : (
            curricula.map(c => (
              <div
                key={c.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  padding: 12,
                  marginBottom: 8,
                  background: selected === c.id ? 'var(--navy)' : 'var(--bg)',
                  color: selected === c.id ? '#fff' : 'var(--text)',
                  transition: 'all .15s',
                }}
                onClick={() => selectCurriculum(c)}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                  {c.lesson_count} ta dars
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* O'ng: Tanlangan kurs rejaning darslar */}
      {!detail ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
          Kurs rejani tanlang
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{detail.name}</h2>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{detail.description}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-navy" onClick={() => setLessonModal(true)}>+ Dars</button>
              <button className="btn btn-sm btn-ghost" onClick={deleteCurriculum} disabled={saving}>O'chirish</button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {detail.lessons?.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--hint)' }}>
                Darslar yo'q
              </div>
            ) : (
              detail.lessons?.map((lesson, idx) => (
                <div key={lesson.id} className="card" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>#{idx + 1}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{lesson.title}</div>
                        {lesson.description && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{lesson.description}</div>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => deleteLesson(lesson.id)}
                      disabled={saving}
                    >
                      ×
                    </button>
                  </div>

                  {lesson.tasks && lesson.tasks.length > 0 && (
                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        {lesson.tasks.map(task => (
                          <div
                            key={task.id}
                            style={{
                              padding: '4px 10px',
                              background: 'var(--bg)',
                              borderRadius: 6,
                              fontSize: 11,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span style={{ fontWeight: 600, color: 'var(--navy)' }}>
                              {task.type === 'homework' ? '📝' : task.type === 'test' ? '✓' : task.type === 'rubric' ? '⭐' : '✏️'}
                            </span>
                            {task.title}
                            <button
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--muted)',
                                padding: 0,
                                fontSize: 11,
                              }}
                              onClick={() => deleteTask(lesson.id, task.id)}
                              disabled={saving}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ fontSize: 11, padding: '4px 8px' }}
                        onClick={() => {
                          setTaskLessonId(lesson.id);
                          setTaskModal(true);
                        }}
                      >
                        + Topshiriq
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modallar */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Yangi kurs reja"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setCreateModal(false)} disabled={saving}>Bekor</button>
          <button className="btn btn-navy" onClick={createCurriculum} disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'Yaratish'}
          </button>
        </>}
      >
        <div className="fgroup">
          <div className="flabel">Nomi *</div>
          <input className="finput" placeholder="Ingliz tili — Boshlang'ich" value={form.name}
            onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="fgroup">
          <div className="flabel">Ta'rifi</div>
          <textarea className="finput" placeholder="Qisqacha ta'rif..." value={form.description}
            onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
        </div>
      </Modal>

      <Modal open={lessonModal} onClose={() => setLessonModal(false)} title="Yangi dars"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setLessonModal(false)} disabled={saving}>Bekor</button>
          <button className="btn btn-navy" onClick={addLesson} disabled={saving}>
            {saving ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
          </button>
        </>}
      >
        <div className="fgroup">
          <div className="flabel">Dars nomi *</div>
          <input className="finput" placeholder="Dars sarlavhasi" value={lessonForm.title}
            onChange={(e) => setLessonForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="fgroup">
          <div className="flabel">Ta'rifi</div>
          <textarea className="finput" placeholder="Dars ta'rifi..." value={lessonForm.description}
            onChange={(e) => setLessonForm(p => ({ ...p, description: e.target.value }))} rows={3} />
        </div>
      </Modal>

      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Yangi topshiriq"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setTaskModal(false)} disabled={saving}>Bekor</button>
          <button className="btn btn-navy" onClick={addTask} disabled={saving}>
            {saving ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
          </button>
        </>}
      >
        <div className="fgroup">
          <div className="flabel">Turi</div>
          <select className="finput" value={taskForm.type}
            onChange={(e) => setTaskForm(p => ({ ...p, type: e.target.value }))}
          >
            <option value="task">✏️ Topshiriq</option>
            <option value="homework">📝 Uyga vazifa</option>
            <option value="test">✓ Test</option>
            <option value="rubric">⭐ Baholash mezonlari</option>
          </select>
        </div>
        <div className="fgroup">
          <div className="flabel">Sarlavhasi *</div>
          <input className="finput" placeholder="Topshiriq nomi" value={taskForm.title}
            onChange={(e) => setTaskForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="fgroup">
          <div className="flabel">Tavsifi</div>
          <textarea className="finput" placeholder="Batafsil..." value={taskForm.description}
            onChange={(e) => setTaskForm(p => ({ ...p, description: e.target.value }))} rows={3} />
        </div>
      </Modal>
    </div>
  );
}
