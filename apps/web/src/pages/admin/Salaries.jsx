import React, { useEffect, useState } from 'react';
import useStore from '../../store/useStore';
import { admin as adminApi } from '../../api';

export default function AdminSalaries() {
  const { showToast } = useStore();
  const [salaries, setSalaries] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    userId: '',
    amount: '',
    description: '',
    periodMonth: new Date().toISOString().split('T')[0],
    status: 'paid',
  });

  useEffect(() => {
    loadSalaries();
    loadUsers();
  }, []);

  const loadSalaries = async () => {
    try {
      const result = await adminApi.salaries();
      setSalaries(result);
    } catch (e) {
      showToast('Oyliklarni yuklashda xatolik');
    }
  };

  const loadUsers = async () => {
    try {
      const result = await adminApi.users({ role: 'teacher' });
      setUsers(result);
    } catch (e) {}
  };

  const handleCreateSalary = async () => {
    if (!form.userId || !form.amount) {
      return showToast('Barcha maydonlarni to\'ldiring');
    }
    setSaving(true);
    try {
      await adminApi.createSalary(form);
      showToast('Oylik qo\'shildi');
      setForm({
        userId: '',
        amount: '',
        description: '',
        periodMonth: new Date().toISOString().split('T')[0],
        status: 'paid',
      });
      setShowModal(false);
      loadSalaries();
    } catch (e) {
      showToast(e?.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const thisMonth = new Date();
  const thisMonthSalaries = salaries.filter(s => {
    const d = new Date(s.period_month);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  });
  const totalSalaries = salaries.reduce((s, p) => s + (p.amount || 0), 0);
  const monthSalaries = thisMonthSalaries.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="page">
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--green)' }}>{totalSalaries.toLocaleString('uz')}</div>
          <div className="stat-lbl">Jami to'langan oyliklar (UZS)</div>
          <div className="stat-trend" style={{ color: 'var(--muted)' }}>{salaries.length} ta oylik</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--gold-3)' }}>{monthSalaries.toLocaleString('uz')}</div>
          <div className="stat-lbl">Bu oyning oyliqlari (UZS)</div>
          <div className="stat-trend" style={{ color: 'var(--muted)' }}>{thisMonthSalaries.length} ta oylik</div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>Oyliklar</h3>
          <button className="btn btn-gold btn-sm" onClick={() => setShowModal(true)}>+ Oylik qo'shish</button>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Ismi</th><th>Rol</th><th>Miqdor</th><th>Oy</th><th>Holat</th></tr>
          </thead>
          <tbody>
            {salaries.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{s.role === 'teacher' ? 'Ustoz' : 'Xodim'}</td>
                <td style={{ fontWeight: 600 }}>{s.amount.toLocaleString('uz')} UZS</td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(s.period_month).toLocaleDateString('uz', { month: 'long', year: 'numeric' })}</td>
                <td>
                  <span className={`pill ${s.status === 'paid' ? 'pill-green' : 'pill-amber'}`}>
                    {s.status === 'paid' ? '✓ To\'langan' : '⏳ Kutmoqda'}
                  </span>
                </td>
              </tr>
            ))}
            {salaries.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>Oylik yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div
            className="card"
            style={{ maxWidth: 420, width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-hd" style={{ position: 'relative' }}>
              <h3>Oylik qo'shish</h3>
              <button
                style={{
                  position: 'absolute', right: 12, top: 12, background: 'none', border: 'none',
                  font: 'inherit', cursor: 'pointer', fontSize: 20, color: 'var(--muted)',
                }}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Hodim</label>
                <select
                  className="finput"
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                >
                  <option value="">Tanlang</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Miqdor (UZS)</label>
                <input
                  type="number"
                  className="finput"
                  placeholder="5000000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Oy</label>
                <input
                  type="date"
                  className="finput"
                  value={form.periodMonth}
                  onChange={(e) => setForm({ ...form, periodMonth: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Izoh</label>
                <input
                  type="text"
                  className="finput"
                  placeholder="Izoh..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Holat</label>
                <select
                  className="finput"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="paid">To'langan</option>
                  <option value="pending">Kutmoqda</option>
                </select>
              </div>
              <button
                className="btn btn-navy"
                disabled={saving}
                onClick={handleCreateSalary}
              >
                {saving ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
