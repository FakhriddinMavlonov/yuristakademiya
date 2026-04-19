import React, { useEffect, useState } from 'react';
import { library as libraryApi } from '../../api';
import Modal from '../../components/ui/Modal';
import useStore from '../../store/useStore';

const TYPE_ICONS = { material: '📄', test: '🎯', video: '🎥', sample: '📝' };
const TYPE_BG = { material: '#FEF3DC', test: '#EFF4FF', video: '#F5EAFB', sample: '#E8F8EF' };

export default function Library() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'material', fileUrl: '', fileType: '' });
  const { showToast } = useStore();

  const load = () => {
    libraryApi.list({ type: filter !== 'all' ? filter : undefined, search: search || undefined })
      .then(setItems).catch(() => {});
  };

  useEffect(() => { load(); }, [filter, search]);

  const upload = async () => {
    try {
      const item = await libraryApi.upload(form);
      setItems((p) => [item, ...p]);
      setModal(false);
      showToast('Kutubxonaga yuklandi!');
    } catch { showToast('Xatolik!'); }
  };

  const remove = async (id) => {
    await libraryApi.remove(id).catch(() => {});
    setItems((p) => p.filter((x) => x.id !== id));
    showToast("O'chirildi");
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div className="tabs">
          {['all', 'material', 'test', 'video', 'sample'].map((t) => (
            <button key={t} className={`tab${filter === t ? ' active' : ''}`} onClick={() => setFilter(t)}>
              {t === 'all' ? 'Barchasi' : t === 'material' ? 'Materiallar' : t === 'test' ? 'Testlar' : t === 'video' ? 'Video' : 'Namunalar'}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <input className="finput" placeholder="Qidirish..." style={{ width: 200 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-navy" onClick={() => setModal(true)}>+ Yuklash</button>
        </div>
      </div>

      <div className="lib-grid">
        {items.map((item) => (
          <div className="lib-card" key={item.id}>
            <div className="lib-icon" style={{ background: TYPE_BG[item.type] || '#EEE' }}>{TYPE_ICONS[item.type] || '📄'}</div>
            <div className="lib-name">{item.name}</div>
            <div className="lib-meta">{item.type} · {item.course_title || 'Umumiy'}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
              <a href={item.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Ko'rish</a>
              <button className="btn btn-red btn-sm" onClick={() => remove(item.id)}>O'chirish</button>
            </div>
          </div>
        ))}
        <div className="lib-card" onClick={() => setModal(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
          <div className="lib-icon" style={{ background: 'var(--bg2)' }}>+</div>
          <div className="lib-name" style={{ color: 'var(--muted)' }}>Yangi fayl yuklash</div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Kutubxonaga yuklash" icon="📁"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Bekor</button>
          <button className="btn btn-navy" onClick={upload}>Yuklash</button>
        </>}
      >
        <div className="fgroup">
          <div className="flabel">Fayl nomi</div>
          <input className="finput" placeholder="Masalan: Fuqarolik kodeksi 2024" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="fgroup">
          <div className="flabel">Tur</div>
          <select className="finput" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="material">Material</option>
            <option value="test">Test</option>
            <option value="video">Video</option>
            <option value="sample">Namuna</option>
          </select>
        </div>
        <div className="fgroup">
          <div className="flabel">Fayl URL (Bunny.net yoki boshqa)</div>
          <input className="finput" placeholder="https://..." value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
        </div>
        <div className="upload-zone">
          <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Faylni bu yerga tashlang yoki bosing</div>
          <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 3 }}>PDF, DOCX, PPTX, MP4 qo'llab-quvvatlanadi</div>
        </div>
      </Modal>
    </div>
  );
}
