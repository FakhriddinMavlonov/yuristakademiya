import React, { useEffect, useState } from 'react';
import useStore from '../../store/useStore';
import { admin as adminApi } from '../../api';

export default function AdminUsers() {
  const { showToast } = useStore();
  const [activeTab, setActiveTab] = useState('students'); // students | teachers | create
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', secondPhone: '', thirdPhone: '', password: '', role: 'teacher' });
  const [saving, setSaving] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editingSaving, setEditingSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const studentList = await adminApi.users({ role: 'student' });
      const teacherList = await adminApi.users({ role: 'teacher' });
      setStudents(studentList);
      setTeachers(teacherList);
    } catch (e) {
      showToast('Foydalanuvchilarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!form.firstName || !form.lastName || !form.phone || !form.password) {
      return showToast('Barcha maydonlarni to\'ldiring');
    }
    setSaving(true);
    try {
      await adminApi.createUser(form);
      showToast('Foydalanuvchi yaratildi');
      setForm({ firstName: '', lastName: '', phone: '', secondPhone: '', thirdPhone: '', password: '', role: 'teacher' });
      setActiveTab(form.role === 'teacher' ? 'teachers' : 'students');
      loadUsers();
    } catch (e) {
      showToast(e?.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      email: user.email || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.firstName || !editForm.lastName) {
      return showToast('Ismi va familiyasi majbur');
    }
    setEditingSaving(true);
    try {
      await adminApi.updateUser(editingUser.id, editForm);
      showToast('Foydalanuvchi yangilandi');
      setEditingUser(null);
      loadUsers();
    } catch (e) {
      showToast(e?.message || 'Xatolik yuz berdi');
    } finally {
      setEditingSaving(false);
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      await adminApi.toggleActive(userId);
      loadUsers();
      showToast('Holat o\'zgartirildi');
    } catch (e) {
      showToast('Xatolik yuz berdi');
    }
  };


  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'students' ? 'btn-navy' : 'btn-ghost'}`}
          onClick={() => setActiveTab('students')}
        >
          👥 O'quvchilar ({students.length})
        </button>
        <button
          className={`btn ${activeTab === 'teachers' ? 'btn-navy' : 'btn-ghost'}`}
          onClick={() => setActiveTab('teachers')}
        >
          👨‍🏫 Ustozlar ({teachers.length})
        </button>
        <button
          className={`btn ${activeTab === 'create' ? 'btn-navy' : 'btn-ghost'}`}
          onClick={() => setActiveTab('create')}
        >
          + Yangi foydalanuvchi
        </button>
      </div>

      {activeTab === 'students' ? (
        <div className="card">
          <div className="card-hd">
            <h3>O'quvchilar ro'yxati ({students.length})</h3>
          </div>
          <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Ismi</th><th>Telefon</th><th>2-telefon</th><th>3-telefon</th><th>Email</th><th>TG Chat ID</th><th>Holat</th><th>Amallar</th></tr>
              </thead>
              <tbody>
                {students.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.phone}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.second_phone || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.third_phone || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{u.telegram_chat_id ? u.telegram_chat_id.substring(0, 8) + '...' : '—'}</td>
                    <td>
                      <span className={`pill ${u.is_active ? 'pill-green' : 'pill-red'}`}>
                        {u.is_active ? '✓ Faol' : '✗ Faol emas'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleOpenEdit(u)}
                      >
                        ✎ Tahrir
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleToggleActive(u.id)}
                      >
                        {u.is_active ? 'Blokirovka' : 'Faollashtirish'}
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                    {loading ? 'Yuklanyapti...' : 'O\'quvchi topilmadi'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'teachers' ? (
        <div className="card">
          <div className="card-hd">
            <h3>Ustozlar ro'yxati ({teachers.length})</h3>
          </div>
          <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Ismi</th><th>Telefon</th><th>2-telefon</th><th>3-telefon</th><th>Email</th><th>TG Chat ID</th><th>Holat</th><th>Amallar</th></tr>
              </thead>
              <tbody>
                {teachers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.phone}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.second_phone || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.third_phone || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{u.telegram_chat_id ? u.telegram_chat_id.substring(0, 8) + '...' : '—'}</td>
                    <td>
                      <span className={`pill ${u.is_active ? 'pill-green' : 'pill-red'}`}>
                        {u.is_active ? '✓ Faol' : '✗ Faol emas'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleOpenEdit(u)}
                      >
                        ✎ Tahrir
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleToggleActive(u.id)}
                      >
                        {u.is_active ? 'Blokirovka' : 'Faollashtirish'}
                      </button>
                    </td>
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                    {loading ? 'Yuklanyapti...' : 'Ustoz topilmadi'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-hd"><h3>Yangi foydalanuvchi yaratish</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Ismi</label>
              <input
                type="text"
                className="finput"
                placeholder="Ismi"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Familiyasi</label>
              <input
                type="text"
                className="finput"
                placeholder="Familiyasi"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Telefon raqami</label>
              <input
                type="text"
                className="finput"
                placeholder="+998..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>2-telefon (ixtiyoriy)</label>
              <input
                type="text"
                className="finput"
                placeholder="+998..."
                value={form.secondPhone}
                onChange={(e) => setForm({ ...form, secondPhone: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>3-telefon (ixtiyoriy)</label>
              <input
                type="text"
                className="finput"
                placeholder="+998..."
                value={form.thirdPhone}
                onChange={(e) => setForm({ ...form, thirdPhone: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Parol</label>
              <input
                type="password"
                className="finput"
                placeholder="Parol"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Rol</label>
              <select
                className="finput"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="teacher">Ustoz</option>
                <option value="student">O'quvchi</option>
              </select>
            </div>
            <button
              className="btn btn-navy"
              disabled={saving}
              onClick={handleCreateUser}
            >
              {saving ? 'Yaratilmoqda...' : 'Yaratish'}
            </button>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setEditingUser(null)}>
          <div
            className="card"
            style={{ maxWidth: 420, width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-hd" style={{ position: 'relative' }}>
              <h3>Foydalanuvchini tahrir qilish</h3>
              <button
                style={{
                  position: 'absolute', right: 12, top: 12, background: 'none', border: 'none',
                  font: 'inherit', cursor: 'pointer', fontSize: 20, color: 'var(--muted)',
                }}
                onClick={() => setEditingUser(null)}
              >
                ✕
              </button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Ismi</label>
                <input
                  type="text"
                  className="finput"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Familiyasi</label>
                <input
                  type="text"
                  className="finput"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Telefon raqami</label>
                <input
                  type="text"
                  className="finput"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Email</label>
                <input
                  type="email"
                  className="finput"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <button
                className="btn btn-navy"
                disabled={editingSaving}
                onClick={handleSaveEdit}
              >
                {editingSaving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
