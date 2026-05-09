import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { courses as coursesApi } from '../../api';
import useStore from '../../store/useStore';
import Modal from '../../components/ui/Modal';
import { SkeletonGrid } from '../../components/ui/Loading';

const COLORS = [
  ['#E8EDFB', '#1B2A6B'], ['#FEF3DC', '#B87A10'], ['#ECFDF3', '#027A48'],
  ['#FEF3F2', '#B42318'], ['#F5EAFB', '#534AB7'],
];

// ─── ONLINE: students enrolled in teacher's courses ───────────────────────────
function OnlineStudents() {
  const navigate = useNavigate();
  const { showToast } = useStore();
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('active');

  useEffect(() => {
    coursesApi.myStudents()
      .then(setStudents)
      .catch(() => showToast(t('teacher.students.loadError')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter((s) => {
    if (tab === 'active' && !s.is_active) return false;
    if (tab === 'inactive' && s.is_active) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    );
  });

  if (loading) return <SkeletonGrid count={8} minWidth={200} />;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t('teacher.students.title')}</h2>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {t('teacher.students.total', { count: students.length })}
          </div>
        </div>
        <input className="finput" placeholder={t('teacher.students.searchPlaceholder')} value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ width: 220, fontSize: 13 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'active', label: t('teacher.students.activeTab', { count: students.filter((s) => s.is_active).length }) },
          { key: 'inactive', label: t('teacher.students.inactiveTab', { count: students.filter((s) => !s.is_active).length }) },
        ].map((item) => (
          <button key={item.key} onClick={() => setTab(item.key)} style={{
            padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            background: tab === item.key ? 'var(--navy)' : 'var(--bg)',
            color: tab === item.key ? '#fff' : 'var(--muted)', transition: 'all .15s',
          }}>{item.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--hint)', fontSize: 13 }}>
            {tab === 'active' ? t('teacher.students.noActive') : t('teacher.students.noInactive')}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {filtered.map((s, i) => {
            const [bg, tc] = COLORS[i % COLORS.length];
            return (
              <div key={s.id} className="card" style={{ cursor: 'pointer', transition: 'transform .15s', padding: 0 }}
                onClick={() => navigate(`/teacher/students/${s.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
                  <div style={{ width: 52, height: 52, background: bg, color: tc, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                    {s.first_name?.[0]}{s.last_name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.first_name} {s.last_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.phone}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--bg)', borderRadius: 6, padding: '3px 8px' }}>
                    {s.course_title}
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                    <span style={{ color: 'var(--muted)' }}>📚 {s.completed_lessons}/{s.total_lessons}</span>
                    <span style={{ color: s.avg_score >= 70 ? 'var(--green)' : s.avg_score >= 50 ? 'var(--amber)' : 'var(--muted)' }}>
                      ⭐ {s.avg_score ? `${Math.round(s.avg_score)}%` : '—'}
                    </span>
                  </div>
                  {!s.is_active && (
                    <span style={{ fontSize: 10, background: '#FEF3F2', color: '#B42318', borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>
                      {t('teacher.students.inactive')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── OFFLINE: teacher's own registered students ───────────────────────────────
function OfflineStudents() {
  const navigate = useNavigate();
  const { showToast } = useStore();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', secondPhone: '', password: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    coursesApi.offlineStudents()
      .then(setStudents)
      .catch(() => showToast('O\'quvchilarni yuklashda xatolik'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const register = async () => {
    if (!form.firstName || !form.lastName || !form.phone || !form.password) {
      return showToast('Barcha majburiy maydonlarni to\'ldiring');
    }
    setSaving(true);
    try {
      const student = await coursesApi.registerOfflineStudent(form);
      setStudents((p) => [student, ...p]);
      setModal(false);
      setForm({ firstName: '', lastName: '', phone: '', secondPhone: '', password: '' });
      showToast('O\'quvchi ro\'yxatdan o\'tkazildi');
    } catch (e) {
      showToast(e?.error || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    );
  });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Mening o'quvchilarim</h2>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            Jami: {students.length} ta
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="finput" placeholder="Ism, telefon..." value={search}
            onChange={(e) => setSearch(e.target.value)} style={{ width: 200, fontSize: 13 }} />
          <button className="btn btn-navy" onClick={() => setModal(true)}>+ O'quvchi qo'shish</button>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={6} minWidth={200} />
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--hint)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
          <div style={{ marginBottom: 12 }}>Hali o'quvchi yo'q</div>
          <button className="btn btn-navy" onClick={() => setModal(true)}>+ O'quvchi qo'shish</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {filtered.map((s, i) => {
            const [bg, tc] = COLORS[i % COLORS.length];
            return (
              <div key={s.id} className="card" style={{ cursor: 'pointer', transition: 'transform .15s', padding: 0 }}
                onClick={() => navigate(`/teacher/students/${s.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
                  <div style={{ width: 52, height: 52, background: bg, color: tc, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                    {s.first_name?.[0]}{s.last_name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.first_name} {s.last_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.phone}</div>
                  </div>
                  {s.second_phone && (
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{s.second_phone}</div>
                  )}
                  <div style={{ display: 'flex', gap: 6, fontSize: 11, alignItems: 'center' }}>
                    <span className={`pill ${s.is_active ? 'pill-green' : 'pill-red'}`} style={{ fontSize: 9 }}>
                      {s.is_active ? 'Faol' : 'Bloklangan'}
                    </span>
                    <span style={{ color: 'var(--muted)', fontSize: 9 }}>
                      {new Date(s.created_at).toLocaleDateString('uz')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Yangi o'quvchi qo'shish" icon="👤"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(false)} disabled={saving}>Bekor</button>
          <button className="btn btn-navy" onClick={register} disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'Ro\'yxatdan o\'tkazish'}
          </button>
        </>}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="fgroup" style={{ flex: 1 }}>
            <div className="flabel">Ism *</div>
            <input className="finput" placeholder="Alisher" value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div className="fgroup" style={{ flex: 1 }}>
            <div className="flabel">Familiya *</div>
            <input className="finput" placeholder="Valiyev" value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          </div>
        </div>
        <div className="fgroup">
          <div className="flabel">Telefon raqam *</div>
          <input className="finput" placeholder="+998 90 123 45 67" value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="fgroup">
          <div className="flabel">Qo'shimcha telefon</div>
          <input className="finput" placeholder="+998 91 ..." value={form.secondPhone}
            onChange={(e) => setForm((f) => ({ ...f, secondPhone: e.target.value }))} />
        </div>
        <div className="fgroup">
          <div className="flabel">Parol * (kamida 6 belgi)</div>
          <input className="finput" type="password" placeholder="••••••" value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </div>
        <div style={{ padding: '8px 12px', background: 'var(--blue-bg)', borderRadius: 8, fontSize: 11, color: 'var(--navy)' }}>
          ℹ️ O'quvchi bu login/parol bilan platforma orqali kirishi mumkin bo'ladi
        </div>
      </Modal>
    </>
  );
}

export default function TeacherStudents() {
  const { mode } = useStore();

  return (
    <div className="page">
      {mode === 'offline' ? <OfflineStudents /> : <OnlineStudents />}
    </div>
  );
}
