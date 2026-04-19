import React, { useEffect, useState } from 'react';
import useStore from '../../store/useStore';
import { admin as adminApi, courses as coursesApi } from '../../api';

export default function AdminPayments() {
  const { showToast } = useStore();
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    userId: '',
    courseId: '',
    amount: '',
    description: '',
    status: 'paid',
  });

  useEffect(() => {
    loadPayments();
    loadUsers();
    loadCourses();
  }, []);

  const loadPayments = async () => {
    try {
      const result = await adminApi.payments();
      setPayments(result);
    } catch (e) {
      showToast('To\'lovlarni yuklashda xatolik');
    }
  };

  const loadUsers = async () => {
    try {
      const result = await adminApi.users({ role: 'student' });
      setUsers(result);
    } catch (e) {}
  };

  const loadCourses = async () => {
    try {
      const result = await coursesApi.list();
      setCourses(result);
    } catch (e) {}
  };

  const handleCreatePayment = async () => {
    if (!form.userId || !form.courseId || !form.amount) {
      return showToast('Barcha maydonlarni to\'ldiring');
    }
    setSaving(true);
    try {
      await adminApi.createPayment(form);
      showToast('To\'lov qo\'shildi');
      setForm({ userId: '', courseId: '', amount: '', description: '', status: 'paid' });
      setShowModal(false);
      loadPayments();
    } catch (e) {
      showToast(e?.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const thisMonth = new Date();
  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.created_at);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  });
  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const monthRevenue = thisMonthPayments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="page">
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--green)' }}>{totalRevenue.toLocaleString('uz')}</div>
          <div className="stat-lbl">Jami tushum (UZS)</div>
          <div className="stat-trend" style={{ color: 'var(--muted)' }}>{payments.length} ta to'lov</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--gold-3)' }}>{monthRevenue.toLocaleString('uz')}</div>
          <div className="stat-lbl">Bu oyning tushumi (UZS)</div>
          <div className="stat-trend" style={{ color: 'var(--muted)' }}>{thisMonthPayments.length} ta to'lov</div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>To'lovlar</h3>
          <button className="btn btn-gold btn-sm" onClick={() => setShowModal(true)}>+ To'lov qo'shish</button>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>O'quvchi</th><th>Kurs</th><th>Miqdor</th><th>Sana</th><th>Holat</th></tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</td>
                <td style={{ fontSize: 12 }}>{p.course_title || '—'}</td>
                <td style={{ fontWeight: 600 }}>{p.amount.toLocaleString('uz')} UZS</td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString('uz')}</td>
                <td>
                  <span className={`pill ${p.status === 'paid' ? 'pill-green' : p.status === 'pending' ? 'pill-amber' : 'pill-red'}`}>
                    {p.status === 'paid' ? '✓ To\'langan' : p.status === 'pending' ? '⏳ Kutmoqda' : '✗ Qaytartoq'}
                  </span>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>To'lov yo'q</td></tr>
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
              <h3>To'lov qo'shish</h3>
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
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>O'quvchi</label>
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
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Kurs</label>
                <select
                  className="finput"
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                >
                  <option value="">Tanlang</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Miqdor (UZS)</label>
                <input
                  type="number"
                  className="finput"
                  placeholder="1000000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
                  <option value="refunded">Qaytartoq</option>
                </select>
              </div>
              <button
                className="btn btn-navy"
                disabled={saving}
                onClick={handleCreatePayment}
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
