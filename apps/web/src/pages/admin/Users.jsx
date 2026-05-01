import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../../store/useStore';
import { admin as adminApi } from '../../api';

export default function AdminUsers() {
  const { showToast } = useStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      showToast(t('admin.users.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Search filter
  const filterUsers = (list) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => {
      const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      const phone2 = (u.second_phone || '').toLowerCase();
      const phone3 = (u.third_phone || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return (
        fullName.includes(q) ||
        phone.includes(q) ||
        phone2.includes(q) ||
        phone3.includes(q) ||
        email.includes(q)
      );
    });
  };

  const filteredStudents = useMemo(() => filterUsers(students), [students, searchQuery]);
  const filteredTeachers = useMemo(() => filterUsers(teachers), [teachers, searchQuery]);

  const allUsers = useMemo(() => filterUsers([...students, ...teachers]), [students, teachers, searchQuery]);

  const handleCreateUser = async () => {
    if (!form.firstName || !form.lastName || !form.phone || !form.password) {
      return showToast(t('admin.users.fillAll'));
    }
    setSaving(true);
    try {
      await adminApi.createUser(form);
      showToast(t('admin.users.created'));
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
      newPassword: '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.firstName || !editForm.lastName) {
      return showToast(t('admin.users.nameRequired'));
    }
    if (editForm.newPassword && editForm.newPassword.length < 6) {
      return showToast(t('admin.users.passwordShort'));
    }
    setEditingSaving(true);
    try {
      const payload = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        email: editForm.email,
      };
      if (editForm.newPassword) payload.password = editForm.newPassword;
      await adminApi.updateUser(editingUser.id, payload);
      showToast(editForm.newPassword ? t('admin.users.passwordChanged') : t('admin.users.updated'));
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
      showToast(t('admin.users.statusChanged'));
    } catch (e) {
      showToast('Xatolik yuz berdi');
    }
  };

  // Highlight matched text
  const highlight = (text, query) => {
    if (!query || !text) return text || '—';
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: '#FEF08A', borderRadius: 2, padding: '0 1px' }}>
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const UserTable = ({ list, colSpan = 8 }) => (
    <table className="tbl">
      <thead>
        <tr>
          <th>{t('admin.users.nameCol')}</th>
          <th>{t('admin.users.phoneCol')}</th>
          <th>{t('admin.users.phone2Col')}</th>
          <th>{t('admin.users.phone3Col')}</th>
          <th>{t('admin.users.emailCol')}</th>
          <th>{t('admin.users.tgCol')}</th>
          <th>{t('admin.users.statusCol')}</th>
          <th>{t('admin.users.actionsCol')}</th>
        </tr>
      </thead>
      <tbody>
        {list.map((u) => (
          <tr key={u.id}>
            <td style={{ fontWeight: 600 }}>
              {highlight(`${u.first_name} ${u.last_name}`, searchQuery)}
            </td>
            <td style={{ fontSize: 12, color: 'var(--muted)' }}>
              {highlight(u.phone, searchQuery)}
            </td>
            <td style={{ fontSize: 12, color: 'var(--muted)' }}>
              {highlight(u.second_phone || '—', searchQuery)}
            </td>
            <td style={{ fontSize: 12, color: 'var(--muted)' }}>
              {highlight(u.third_phone || '—', searchQuery)}
            </td>
            <td style={{ fontSize: 12, color: 'var(--muted)' }}>
              {highlight(u.email || '—', searchQuery)}
            </td>
            <td style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>
              {u.telegram_chat_id ? u.telegram_chat_id.substring(0, 8) + '...' : '—'}
            </td>
            <td>
              <span className={`pill ${u.is_active ? 'pill-green' : 'pill-red'}`}>
                {u.is_active ? t('admin.users.active') : t('admin.users.inactive')}
              </span>
            </td>
            <td style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEdit(u)}>
                {t('admin.users.editBtn')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(u.id)}>
                {u.is_active ? t('admin.users.blockBtn') : t('admin.users.activateBtn')}
              </button>
            </td>
          </tr>
        ))}
        {list.length === 0 && (
          <tr>
            <td colSpan={colSpan} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
              {loading
                ? t('admin.users.loadingRow')
                : searchQuery
                ? `"${searchQuery}" bo'yicha natija topilmadi`
                : t('admin.users.noStudents')}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="page">
      {/* Tabs + Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className={`btn ${activeTab === 'students' ? 'btn-navy' : 'btn-ghost'}`}
          onClick={() => setActiveTab('students')}
        >
          {t('admin.users.studentsTab', { count: students.length })}
        </button>
        <button
          className={`btn ${activeTab === 'teachers' ? 'btn-navy' : 'btn-ghost'}`}
          onClick={() => setActiveTab('teachers')}
        >
          {t('admin.users.teachersTab', { count: teachers.length })}
        </button>
        <button
          className={`btn ${activeTab === 'all' ? 'btn-navy' : 'btn-ghost'}`}
          onClick={() => setActiveTab('all')}
        >
          Barchasi ({students.length + teachers.length})
        </button>
        <button
          className={`btn ${activeTab === 'create' ? 'btn-navy' : 'btn-ghost'}`}
          onClick={() => setActiveTab('create')}
        >
          {t('admin.users.createTab')}
        </button>

        {/* Search box — tabs ichida emas */}
        {activeTab !== 'create' && (
          <div style={{ marginLeft: 'auto', position: 'relative', minWidth: 240 }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--muted)', fontSize: 14, pointerEvents: 'none',
            }}>🔍</span>
            <input
              type="text"
              className="finput"
              style={{ paddingLeft: 32, paddingRight: searchQuery ? 32 : 10, margin: 0 }}
              placeholder="Ism, telefon, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--muted)',
                }}
              >✕</button>
            )}
          </div>
        )}
      </div>

      {/* Search result badge */}
      {searchQuery && activeTab !== 'create' && (
        <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--muted)' }}>
          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>"{searchQuery}"</span> bo'yicha{' '}
          {activeTab === 'students'
            ? filteredStudents.length
            : activeTab === 'teachers'
            ? filteredTeachers.length
            : allUsers.length}{' '}
          ta natija topildi
        </div>
      )}

      {activeTab === 'students' ? (
        <div className="card">
          <div className="card-hd">
            <h3>{t('admin.users.studentsHeading', { count: filteredStudents.length })}</h3>
          </div>
          <div className="tbl-wrap" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            <UserTable list={filteredStudents} />
          </div>
        </div>

      ) : activeTab === 'teachers' ? (
        <div className="card">
          <div className="card-hd">
            <h3>{t('admin.users.teachersHeading', { count: filteredTeachers.length })}</h3>
          </div>
          <div className="tbl-wrap" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            <UserTable list={filteredTeachers} />
          </div>
        </div>

      ) : activeTab === 'all' ? (
        <div className="card">
          <div className="card-hd">
            <h3>Barcha foydalanuvchilar ({allUsers.length})</h3>
          </div>
          <div className="tbl-wrap" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            <UserTable list={allUsers} />
          </div>
        </div>

      ) : (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-hd"><h3>{t('admin.users.createHeading')}</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('admin.users.firstNameLabel')}</label>
              <input type="text" className="finput" placeholder={t('admin.users.firstNameLabel')} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('admin.users.lastNameLabel')}</label>
              <input type="text" className="finput" placeholder={t('admin.users.lastNameLabel')} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('admin.users.phoneLabel')}</label>
              <input type="text" className="finput" placeholder="+998..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('admin.users.phone2Label')}</label>
              <input type="text" className="finput" placeholder="+998..." value={form.secondPhone} onChange={(e) => setForm({ ...form, secondPhone: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('admin.users.phone3Label')}</label>
              <input type="text" className="finput" placeholder="+998..." value={form.thirdPhone} onChange={(e) => setForm({ ...form, thirdPhone: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('admin.users.passwordLabel')}</label>
              <input type="password" className="finput" placeholder={t('admin.users.passwordLabel')} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('admin.users.roleLabel')}</label>
              <select className="finput" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="teacher">{t('admin.users.teacherRole')}</option>
                <option value="student">{t('admin.users.studentRole')}</option>
              </select>
            </div>
            <button className="btn btn-navy" disabled={saving} onClick={handleCreateUser}>
              {saving ? t('admin.users.creatingBtn') : t('admin.users.createBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setEditingUser(null)}>
          <div className="card" style={{ maxWidth: 420, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="card-hd" style={{ position: 'relative' }}>
              <h3>{t('admin.users.editHeading')}</h3>
              <button style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', fontSize: 20, color: 'var(--muted)' }} onClick={() => setEditingUser(null)}>✕</button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('admin.users.firstNameLabel')}</label>
                <input type="text" className="finput" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('admin.users.lastNameLabel')}</label>
                <input type="text" className="finput" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('admin.users.phoneLabel')}</label>
                <input type="text" className="finput" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('admin.users.emailLabel')}</label>
                <input type="email" className="finput" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div style={{ borderTop: '.5px solid var(--line)', paddingTop: 12, marginTop: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{t('admin.users.newPasswordLabel')}</label>
                <div style={{ position: 'relative' }}>
                  <input type="password" className="finput" placeholder={t('admin.users.newPasswordPlaceholder')} value={editForm.newPassword} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} style={{ paddingRight: 38 }} />
                  {editForm.newPassword && (
                    <button type="button" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--hint)' }} onClick={() => setEditForm({ ...editForm, newPassword: '' })}>✕</button>
                  )}
                </div>
                {editForm.newPassword && editForm.newPassword.length < 6 && (
                  <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{t('admin.users.passwordShort')}</div>
                )}
                {editForm.newPassword && editForm.newPassword.length >= 6 && (
                  <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>✓ {t('admin.users.passwordOk')}</div>
                )}
              </div>
              <button className="btn btn-navy" disabled={editingSaving} onClick={handleSaveEdit}>
                {editingSaving ? t('admin.users.savingBtn') : t('admin.users.saveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}