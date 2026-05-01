import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { groups as groupsApi, admin as adminApi } from '../../api';
import useStore from '../../store/useStore';
import { SkeletonGrid } from '../../components/ui/Loading';

const STATUSES = ['active', 'finished', 'cancelled'];

export default function AdminGroups() {
  const { t } = useTranslation();
  const { showToast } = useStore();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('list');
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('students');

  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  const [form, setForm] = useState({ name: '', courseId: '', teacherId: '', startDate: '', endDate: '', shift: 'morning', capacity: 25 });
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const [addStudentId, setAddStudentId] = useState('');
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [schedSaving, setSchedSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [g, c, teachList, studList] = await Promise.all([
        groupsApi.list(),
        fetch('/api/courses', { headers: { Authorization: `Bearer ${localStorage.getItem('ya_token')}` } }).then(r => r.json()).catch(() => []),
        adminApi.users({ role: 'teacher' }),
        adminApi.users({ role: 'student' }),
      ]);
      setList(g);
      setCourses(Array.isArray(c) ? c : []);
      setTeachers(teachList);
      setStudents(studList);
    } catch { showToast(t('groups.loadError')); }
    finally { setLoading(false); }
  };

  const openDetail = async (group) => {
    try {
      const detail = await groupsApi.get(group.id);
      setSelected(detail);
      setScheduleSlots(detail.schedule || []);
      setDetailTab('students');
      setTab('detail');
    } catch { showToast(t('groups.loadError')); }
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', courseId: '', teacherId: '', startDate: '', endDate: '', shift: 'morning', capacity: 25 });
    setTab('create');
  };

  const openEdit = (g) => {
    setEditTarget(g);
    setForm({
      name: g.name, courseId: g.course_id || '', teacherId: g.teacher_id || '',
      startDate: g.start_date?.split('T')[0] || '', endDate: g.end_date?.split('T')[0] || '',
      shift: g.shift || 'morning', capacity: g.capacity || 25,
    });
    setTab('create');
  };

  const handleSave = async () => {
    if (!form.name || !form.startDate) return showToast(t('groups.nameLabel') + ' ' + t('groups.startDateLabel'));
    setSaving(true);
    try {
      const payload = { ...form, courseId: form.courseId || null, teacherId: form.teacherId || null };
      if (editTarget) {
        await groupsApi.update(editTarget.id, payload);
        showToast(t('groups.updated'));
      } else {
        await groupsApi.create(payload);
        showToast(t('groups.created'));
      }
      setTab('list');
      setEditTarget(null);
      load();
    } catch { showToast(t('common.error')); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('groups.deleteConfirm'))) return;
    try { await groupsApi.remove(id); showToast(t('groups.deleted')); load(); }
    catch { showToast(t('common.error')); }
  };

  const handleAddStudent = async () => {
    if (!addStudentId || !selected) return;
    try {
      await groupsApi.addStudent(selected.id, +addStudentId);
      showToast(t('groups.studentAdded'));
      setAddStudentId('');
      const detail = await groupsApi.get(selected.id);
      setSelected(detail);
    } catch { showToast(t('common.error')); }
  };

  const handleRemoveStudent = async (userId) => {
    if (!selected) return;
    try {
      await groupsApi.removeStudent(selected.id, userId);
      showToast(t('groups.studentRemoved'));
      const detail = await groupsApi.get(selected.id);
      setSelected(detail);
    } catch { showToast(t('common.error')); }
  };

  const addSlot = () => setScheduleSlots(p => [...p, { weekday: 0, start_time: '09:00', end_time: '11:00', room: 'Online' }]);
  const removeSlot = (i) => setScheduleSlots(p => p.filter((_, idx) => idx !== i));
  const updateSlot = (i, key, val) => setScheduleSlots(p => p.map((s, idx) => idx === i ? { ...s, [key]: val } : s));

  const handleSaveSchedule = async () => {
    if (!selected) return;
    setSchedSaving(true);
    try {
      const slots = scheduleSlots.map(s => ({
        weekday: +s.weekday,
        startTime: s.start_time,
        endTime: s.end_time,
        room: s.room || 'Online',
      }));
      const saved = await groupsApi.setSchedule(selected.id, slots);
      setScheduleSlots(saved);
      showToast(t('groups.scheduleSaved'));
    } catch { showToast(t('common.error')); }
    finally { setSchedSaving(false); }
  };

  const weekdays = t('weekdays', { returnObjects: true });
  const shifts = t('shifts', { returnObjects: true });

  const shiftColor = (s) => s === 'morning' ? 'pill-blue' : s === 'afternoon' ? 'pill-amber' : s === 'evening' ? 'pill-navy' : 'pill-green';
  const statusColor = (s) => s === 'active' ? 'pill-green' : s === 'finished' ? 'pill-blue' : 'pill-red';

  return (
    <div className="page">
      {tab === 'list' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{t('groups.title')}</h2>
            <button className="btn btn-navy" onClick={openCreate}>{t('groups.createBtn')}</button>
          </div>
          {loading ? (
            <SkeletonGrid count={4} minWidth={280} />
          ) : list.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--hint)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
              <div>{t('groups.noGroups')}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {list.map(g => (
                <div key={g.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openDetail(g)}>
                  <div className="card-body">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 44, height: 44, background: 'var(--blue-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        👥
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{g.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{g.course_title || '—'}</div>
                      </div>
                      <span className={`pill ${statusColor(g.status)}`} style={{ fontSize: 10 }}>
                        {t(`status.${g.status}`, g.status)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      <span className={`pill ${shiftColor(g.shift)}`} style={{ fontSize: 10 }}>{shifts[g.shift] || g.shift}</span>
                      <span className="pill pill-blue" style={{ fontSize: 10 }}>👤 {g.student_count}/{g.capacity}</span>
                      {g.teacher_name && <span className="pill pill-navy" style={{ fontSize: 10 }}>🎓 {g.teacher_name}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                      {g.start_date?.split('T')[0]} {g.end_date ? `→ ${g.end_date.split('T')[0]}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}>{t('common.edit')}</button>
                      <button className="btn btn-red btn-sm" onClick={() => handleDelete(g.id)}>{t('common.delete')}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'create' && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button className="btn btn-ghost" onClick={() => setTab('list')}>← {t('common.back')}</button>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>{editTarget ? t('groups.editTitle') : t('groups.createTitle')}</h2>
          </div>
          <div className="card">
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fgroup">
                <div className="flabel">{t('groups.nameLabel')}</div>
                <input className="finput" placeholder={t('groups.namePlaceholder')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fgroup">
                  <div className="flabel">{t('groups.courseLabel')}</div>
                  <select className="finput" value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}>
                    <option value="">— {t('groups.courseLabel')} —</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="fgroup">
                  <div className="flabel">{t('groups.teacherLabel')}</div>
                  <select className="finput" value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}>
                    <option value="">— {t('groups.teacherLabel')} —</option>
                    {teachers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fgroup">
                  <div className="flabel">{t('groups.startDateLabel')}</div>
                  <input type="date" className="finput" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="fgroup">
                  <div className="flabel">{t('groups.endDateLabel')}</div>
                  <input type="date" className="finput" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fgroup">
                  <div className="flabel">{t('groups.shiftLabel')}</div>
                  <select className="finput" value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}>
                    {Object.entries(shifts).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="fgroup">
                  <div className="flabel">{t('groups.capacityLabel')}</div>
                  <input type="number" className="finput" min={1} max={100} value={form.capacity} onChange={e => setForm({ ...form, capacity: +e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setTab('list')}>{t('common.cancel')}</button>
                <button className="btn btn-navy" disabled={saving} onClick={handleSave}>
                  {saving ? t('groups.savingBtn') : t('groups.saveBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'detail' && selected && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button className="btn btn-ghost" onClick={() => { setTab('list'); setSelected(null); }}>← {t('common.back')}</button>
            <h2 style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{selected.name}</h2>
            <span className="pill pill-blue" style={{ fontSize: 11 }}>{selected.course_title}</span>
          </div>

          <div className="tabs" style={{ marginBottom: 14 }}>
            {['students', 'schedule'].map(k => (
              <button key={k} className={`tab${detailTab === k ? ' active' : ''}`} onClick={() => setDetailTab(k)}>
                {t(`groups.${k}Tab`)}
              </button>
            ))}
          </div>

          {detailTab === 'students' && (
            <div className="card">
              <div className="card-hd" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ flex: 1 }}>{t('groups.studentsTab')} ({selected.students?.length || 0})</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="finput" style={{ width: 220 }} value={addStudentId} onChange={e => setAddStudentId(e.target.value)}>
                    <option value="">{t('groups.addStudentPlaceholder')}</option>
                    {students.filter(s => !selected.students?.find(ss => ss.id === s.id)).map(s => (
                      <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                    ))}
                  </select>
                  <button className="btn btn-navy btn-sm" onClick={handleAddStudent}>{t('groups.addStudentLabel')}</button>
                </div>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('admin.users.nameCol')}</th>
                    <th>{t('admin.users.phoneCol')}</th>
                    <th style={{ textAlign: 'center' }}>{t('groups.attendanceRate')}</th>
                    <th style={{ textAlign: 'center' }}>{t('groups.presentCount')}</th>
                    <th style={{ textAlign: 'center' }}>{t('groups.absentCount')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.students || []).map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{s.phone}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: s.attendance_rate >= 80 ? 'var(--green)' : s.attendance_rate >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                          {s.attendance_rate}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--green)' }}>{s.present_count}</td>
                      <td style={{ textAlign: 'center', color: 'var(--red)' }}>{s.absent_count}</td>
                      <td>
                        <button className="btn btn-red btn-sm" onClick={() => handleRemoveStudent(s.id)}>{t('common.delete')}</button>
                      </td>
                    </tr>
                  ))}
                  {(!selected.students?.length) && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>{t('attendance.noStudents')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {detailTab === 'schedule' && (
            <div className="card">
              <div className="card-hd" style={{ display: 'flex', alignItems: 'center' }}>
                <h3 style={{ flex: 1 }}>{t('groups.scheduleTab')}</h3>
                <button className="btn btn-ghost btn-sm" onClick={addSlot}>{t('groups.addSlotBtn')}</button>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {scheduleSlots.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>{t('groups.noSchedule')}</div>
                )}
                {scheduleSlots.map((slot, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr auto', gap: 8, alignItems: 'center' }}>
                    <select className="finput" value={slot.weekday} onChange={e => updateSlot(i, 'weekday', e.target.value)}>
                      {Array.isArray(weekdays) && weekdays.map((d, wi) => <option key={wi} value={wi}>{d}</option>)}
                    </select>
                    <input type="time" className="finput" value={slot.start_time} onChange={e => updateSlot(i, 'start_time', e.target.value)} />
                    <input type="time" className="finput" value={slot.end_time} onChange={e => updateSlot(i, 'end_time', e.target.value)} />
                    <input className="finput" placeholder={t('groups.roomLabel')} value={slot.room} onChange={e => updateSlot(i, 'room', e.target.value)} />
                    <button className="btn btn-red btn-sm" onClick={() => removeSlot(i)}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn btn-navy" disabled={schedSaving} onClick={handleSaveSchedule}>
                    {schedSaving ? t('groups.savingBtn') : t('groups.scheduleSaved')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
