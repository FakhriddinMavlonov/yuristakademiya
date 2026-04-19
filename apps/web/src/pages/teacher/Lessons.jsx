import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lessons as lessonsApi, assignments as assignmentsApi } from '../../api';
import Modal from '../../components/ui/Modal';
import useStore from '../../store/useStore';

export default function TeacherLessons() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useStore();
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ title: '', orderNum: '', description: '' });
  const [hwModal, setHwModal] = useState(false);
  const [hwForm, setHwForm] = useState({ title: '', description: '', deadlineDays: 3, submissionType: 'text' });
  const [upload, setUpload] = useState({ state: 'idle', progress: 0, fileName: '' });
  const [saving, setSaving] = useState(false);
  const [hwSaving, setHwSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    lessonsApi.list(courseId).then((d) => { setList(d); setSelected(d[0] || null); }).catch(() => {});
  }, [courseId]);

  const addLesson = async () => {
    if (!form.title.trim()) return showToast('Dars nomini kiriting');
    setSaving(true);
    try {
      const l = await lessonsApi.create(courseId, {
        title: form.title,
        orderNum: parseInt(form.orderNum) || list.length + 1,
        description: form.description,
        isPublished: false,
      });
      setList((p) => [...p, l]);
      setSelected(l);
      setAddModal(false);
      setForm({ title: '', orderNum: '', description: '' });
      showToast('Dars qo\'shildi!');
    } catch { showToast('Xatolik!'); }
    finally { setSaving(false); }
  };

  const saveHomework = async () => {
    if (!hwForm.title.trim()) return showToast('Uy ishi nomini kiriting');
    if (!selected) return;
    setHwSaving(true);
    try {
      if (selected.assignment_id) {
        await assignmentsApi.update(selected.assignment_id, hwForm);
        showToast('Uy ishi o\'zgartirildi');
      } else {
        const newAssignment = await assignmentsApi.create(selected.id, hwForm);
        const updated = { ...selected, assignment_id: newAssignment.id, assignment: newAssignment };
        setSelected(updated);
        setList((p) => p.map((l) => l.id === selected.id ? updated : l));
        showToast('Uy ishi qo\'shildi');
      }
      setHwModal(false);
      setHwForm({ title: '', description: '', deadlineDays: 3, submissionType: 'text' });
    } catch { showToast('Xatolik yuz berdi'); }
    finally { setHwSaving(false); }
  };

  const deleteHomework = async () => {
    if (!selected?.assignment_id) return;
    if (!window.confirm('Uy ishini o\'chirmoqchimisiz?')) return;
    try {
      await assignmentsApi.delete(selected.assignment_id);
      const updated = { ...selected, assignment_id: null, assignment: null };
      setSelected(updated);
      setList((p) => p.map((l) => l.id === selected.id ? updated : l));
      showToast('Uy ishi o\'chirildi');
    } catch { showToast('O\'chirishda xatolik'); }
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    if (file.size > 500 * 1024 * 1024) return showToast('Fayl 500MB dan katta bo\'lmasin');

    setUpload({ state: 'uploading', progress: 0, fileName: file.name });
    try {
      const result = await lessonsApi.uploadVideo(selected.id, file, (pct) => {
        setUpload((u) => ({ ...u, progress: pct }));
      });
      const updated = { ...selected, video_url: result.videoUrl, video_guid: result.guid };
      setSelected(updated);
      setList((p) => p.map((l) => l.id === selected.id ? updated : l));
      setUpload({ state: 'done', progress: 100, fileName: file.name });
      showToast('Video muvaffaqiyatli yuklandi!');
    } catch (err) {
      setUpload({ state: 'error', progress: 0, fileName: file.name });
      showToast(err?.error || 'Video yuklanmadi. Bunny.net sozlamalarini tekshiring.');
    }
    e.target.value = '';
  };

  const deleteLesson = async (id) => {
    if (!window.confirm('Darsni o\'chirmoqchimisiz? Bu amalni qaytarib bo\'lmaydi.')) return;
    try {
      await lessonsApi.remove(id);
      const updated = list.filter((l) => l.id !== id);
      setList(updated);
      setSelected(updated.find((l) => l.id === selected?.id) || updated[0] || null);
      showToast('Dars o\'chirildi');
    } catch { showToast('O\'chirishda xatolik!'); }
  };

  const togglePublish = async () => {
    try {
      await lessonsApi.update(selected.id, { isPublished: !selected.is_published });
      const updated = { ...selected, is_published: !selected.is_published };
      setSelected(updated);
      setList((p) => p.map((l) => l.id === selected.id ? updated : l));
      showToast(selected.is_published ? 'Qoralamaga qaytarildi' : 'Nashr etildi!');
    } catch { showToast('Xatolik!'); }
  };

  const fmtDur = (s) => s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '—';
  const fmtSize = (bytes) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

  return (
    <div className="page">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/*"
        style={{ display: 'none' }}
        onChange={onFileSelected}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, minHeight: 0, flex: 1 }}>
        {/* Lesson list */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="card-hd" style={{ flexShrink: 0 }}>
            <h3>Darslar <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>({list.length})</span></h3>
            <button className="btn btn-navy btn-sm" onClick={() => setAddModal(true)}>+ Dars</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {list.map((l) => (
              <div
                key={l.id}
                className={`lesson-row${selected?.id === l.id ? ' active-lesson' : ''}`}
                onClick={() => { setSelected(l); setUpload({ state: 'idle', progress: 0, fileName: '' }); }}
              >
                <div className="lesson-num" style={{
                  background: l.is_published ? 'var(--green-bg)' : 'var(--bg2)',
                  color: l.is_published ? 'var(--green)' : 'var(--muted)',
                }}>
                  {l.is_published ? '✓' : l.order_num}
                </div>
                <div className="lesson-info">
                  <div className="lesson-title">{l.order_num}. {l.title}</div>
                  <div className="lesson-meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {l.video_url
                      ? <span style={{ color: 'var(--green)', fontSize: 10 }}>▶ {fmtDur(l.duration_seconds)}</span>
                      : <span style={{ color: 'var(--amber)', fontSize: 10 }}>⚠ Video yo'q</span>
                    }
                  </div>
                </div>
              </div>
            ))}
            {list.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--hint)', fontSize: 12 }}>
                Hali dars yo'q.<br />+ Dars tugmasini bosing.
              </div>
            )}
          </div>
        </div>

        {/* Lesson detail */}
        {selected ? (
          <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="card-hd" style={{ flexShrink: 0 }}>
              <h3>{selected.order_num}-dars: {selected.title}</h3>
              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                <button
                  className="btn btn-navy btn-sm"
                  onClick={() => navigate(`/teacher/lessons/${selected.id}/test`)}
                >
                  {selected.test_id ? '✏ Test' : '+ Test'}
                </button>
                <button
                  className={`btn btn-sm ${selected.is_published ? 'btn-ghost' : 'btn-gold'}`}
                  onClick={togglePublish}
                >
                  {selected.is_published ? 'Qoralamaga' : 'Nashr etish'}
                </button>
                <button className="btn btn-red btn-sm" onClick={() => deleteLesson(selected.id)}>
                  O'chirish
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Video upload section */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--hint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                  Video dars
                </div>

                {selected.video_url && upload.state !== 'uploading' ? (
                  /* Video uploaded — preview */
                  <div className="card" style={{ background: 'var(--navy)', border: 'none' }}>
                    <div style={{ position: 'relative', paddingBottom: '56.25%', overflow: 'hidden', borderRadius: 'var(--r-md) var(--r-md) 0 0' }}>
                      <iframe
                        src={selected.video_url}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        title={selected.title}
                      />
                    </div>
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>{selected.title}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
                          {fmtDur(selected.duration_seconds)} · Bunny.net CDN ✓
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'rgba(255,255,255,.6)', borderColor: 'rgba(255,255,255,.2)' }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Almashtirish
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Upload zone */
                  <div
                    className="upload-zone"
                    style={{
                      cursor: upload.state === 'uploading' ? 'default' : 'pointer',
                      padding: 24,
                      border: upload.state === 'error' ? '1.5px dashed var(--red)' : undefined,
                    }}
                    onClick={() => upload.state !== 'uploading' && fileInputRef.current?.click()}
                  >
                    {upload.state === 'uploading' ? (
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <div style={{ width: 36, height: 36, background: 'var(--navy)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: 'var(--gold)', fontSize: 16 }}>▶</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {upload.fileName}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Bunny.net CDN ga yuklanmoqda...</div>
                          </div>
                          <div style={{ fontFamily: 'Sora', fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>
                            {upload.progress}%
                          </div>
                        </div>
                        <div style={{ background: 'var(--line)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 99, background: 'var(--navy)',
                            width: `${upload.progress}%`, transition: 'width .3s ease',
                          }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>
                          {upload.state === 'error' ? '❌' : '🎥'}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: upload.state === 'error' ? 'var(--red)' : 'var(--muted)' }}>
                          {upload.state === 'error'
                            ? 'Yuklashda xatolik. Qayta urinish uchun bosing'
                            : 'MP4 video yuklash uchun bosing yoki tashlang'
                          }
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 4 }}>
                          MP4, WebM · Maksimal 500 MB · Bunny.net CDN
                        </div>
                        {upload.state !== 'error' && (
                          <button className="btn btn-navy btn-sm" style={{ marginTop: 12 }}
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                            Fayl tanlash
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              {selected.description && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--hint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                    Dars tavsifi
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.7, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                    {selected.description}
                  </div>
                </div>
              )}

              {/* Test & Homework */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--hint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                  Test & Uy ishi
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selected.test_id ? (
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#EFF4FF', borderRadius: 9, border: '.5px solid rgba(37,99,235,.15)', cursor: 'pointer' }}
                      onClick={() => navigate(`/teacher/lessons/${selected.id}/test`)}
                    >
                      <span style={{ fontSize: 18 }}>🎯</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Nazorat testi</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>90% o'tish chegarasi · Tahrirlash uchun bosing</div>
                      </div>
                      <span className="pill pill-blue">Faol</span>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ justifyContent: 'flex-start', gap: 8 }}
                      onClick={() => navigate(`/teacher/lessons/${selected.id}/test`)}
                    >
                      <span>🎯</span> + Test yaratish
                    </button>
                  )}

                  {selected.assignment_id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--amber-bg)', borderRadius: 9, border: '.5px solid rgba(245,158,11,.2)' }}>
                      <span style={{ fontSize: 18 }}>📝</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Uy ishi</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{selected.assignment_title || 'Uy ishi mavjud'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => {
                          setHwForm({ title: selected.assignment_title || '', description: selected.assignment_description || '', deadlineDays: 3, submissionType: 'text' });
                          setHwModal(true);
                        }}>✏</button>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--red)' }} onClick={deleteHomework}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ justifyContent: 'flex-start', gap: 8 }}
                      onClick={() => setHwModal(true)}
                    >
                      <span>📝</span> + Uy ishi qo'shish
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--hint)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📖</div>
              <div>Chapdan darsni tanlang</div>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Yangi dars qo'shish"
        icon="📖"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setAddModal(false)} disabled={saving}>Bekor</button>
          <button className="btn btn-navy" onClick={addLesson} disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </>}
      >
        <div className="fgroup">
          <div className="flabel">Dars nomi *</div>
          <input
            className="finput"
            placeholder="Masalan: Shartnoma turlari"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="fgroup">
          <div className="flabel">Tartib raqami</div>
          <input
            className="finput"
            type="number"
            min={1}
            value={form.orderNum || list.length + 1}
            onChange={(e) => setForm({ ...form, orderNum: e.target.value })}
          />
        </div>
        <div className="fgroup">
          <div className="flabel">Tavsif (ixtiyoriy)</div>
          <textarea
            className="finput"
            rows={3}
            placeholder="Darsda nima o'rganiladi?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div style={{ padding: '8px 12px', background: '#EFF4FF', borderRadius: 8, fontSize: 11, color: 'var(--navy)' }}>
          ℹ️ Dars yaratilgach, video alohida yuklanadi
        </div>
      </Modal>

      <Modal
        open={hwModal}
        onClose={() => setHwModal(false)}
        title={selected?.assignment_id ? 'Uy ishini tahrirlash' : 'Uy ishi qo\'shish'}
        icon="📝"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setHwModal(false)} disabled={hwSaving}>Bekor</button>
          <button className="btn btn-navy" onClick={saveHomework} disabled={hwSaving}>
            {hwSaving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </>}
      >
        <div className="fgroup">
          <div className="flabel">Uy ishi nomi *</div>
          <input
            className="finput"
            placeholder="Masalan: Shartnoma tahlili"
            value={hwForm.title}
            onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
          />
        </div>
        <div className="fgroup">
          <div className="flabel">Tavsif (ixtiyoriy)</div>
          <textarea
            className="finput"
            rows={3}
            placeholder="Uy ishi bo'yicha yo'riqnoma yoki talabalar nima qilishi kerak"
            value={hwForm.description}
            onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })}
          />
        </div>
        <div className="fgroup">
          <div className="flabel">Topshirish muddati (kunlar)</div>
          <input
            className="finput"
            type="number"
            min={1}
            value={hwForm.deadlineDays}
            onChange={(e) => setHwForm({ ...hwForm, deadlineDays: parseInt(e.target.value) || 3 })}
          />
        </div>
      </Modal>
    </div>
  );
}
