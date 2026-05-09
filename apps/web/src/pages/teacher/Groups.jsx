import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { groups as groupsApi, courses as coursesApi, attendance as attendanceApi, grades as gradesApi, curricula as curriculaApi } from '../../api';
import useStore from '../../store/useStore';
import Modal from '../../components/ui/Modal';
import { SkeletonGrid, SkeletonCard } from '../../components/ui/Loading';

const STATUS_COLORS = { present: 'var(--green)', late: 'var(--amber)', absent: 'var(--red)', excused: 'var(--muted)' };
const STATUS_BG = { present: 'var(--green-bg)', late: 'var(--amber-bg)', absent: 'var(--red-bg)', excused: 'var(--bg2)' };
const today = () => new Date().toISOString().split('T')[0];

export default function TeacherGroups() {
  const { t } = useTranslation();
  const { showToast } = useStore();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('students');

  // Create group modal
  const [createModal, setCreateModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', shift: 'morning', startDate: today() });
  const [groupSaving, setGroupSaving] = useState(false);

  // Add student to group modal
  const [addStudentModal, setAddStudentModal] = useState(false);
  const [myStudents, setMyStudents] = useState([]);
  const [addingStudent, setAddingStudent] = useState(null);

  // Attendance
  const [attendDate, setAttendDate] = useState(today());
  const [attendRecords, setAttendRecords] = useState([]);
  const [attendLoading, setAttendLoading] = useState(false);
  const [attendSaving, setAttendSaving] = useState(false);

  // Schedule
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [schedSaving, setSchedSaving] = useState(false);

  // Grades
  const [gradeDate, setGradeDate] = useState(today());
  const [gradeRecords, setGradeRecords] = useState([]);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeSaving, setGradeSaving] = useState(false);

  // Lessons (Darslar)
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [lessonEdits, setLessonEdits] = useState({});
  const [lessonSaving, setLessonSaving] = useState(null);
  const [videoUpload, setVideoUpload] = useState({});
  const [materialUpload, setMaterialUpload] = useState({});
  const [curriculumList, setCurriculumList] = useState([]);
  const [curriculumModal, setCurriculumModal] = useState(false);
  const [addLessonModal, setAddLessonModal] = useState(false);
  const [addLessonForm, setAddLessonForm] = useState({ title: '', description: '' });
  const videoInputRefs = useRef({});
  const materialInputRefs = useRef({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setList(await groupsApi.list()); }
    catch { showToast(t('groups.loadError')); }
    finally { setLoading(false); }
  };

  const openGroup = async (g) => {
    try {
      const detail = await groupsApi.get(g.id);
      setSelected(detail);
      setScheduleSlots(detail.schedule || []);
      setDetailTab('students');
      setExpandedLesson(null);
      setLessonEdits({});
      await loadAttendance(detail.id, attendDate);
      await loadGrades(detail.id, gradeDate);
      loadLessons(detail.id);
    } catch { showToast(t('groups.loadError')); }
  };

  const loadLessons = async (groupId) => {
    setLessonsLoading(true);
    try {
      const data = await groupsApi.getLessons(groupId);
      setLessons(data);
    } catch { showToast('Darslarni yuklashda xatolik'); }
    finally { setLessonsLoading(false); }
  };

  const createGroup = async () => {
    if (!groupForm.name.trim()) return showToast('Guruh nomini kiriting');
    setGroupSaving(true);
    try {
      const g = await groupsApi.create({ name: groupForm.name, shift: groupForm.shift, startDate: groupForm.startDate });
      setList((p) => [{ ...g, student_count: 0 }, ...p]);
      setCreateModal(false);
      setGroupForm({ name: '', shift: 'morning', startDate: today() });
      showToast('Guruh yaratildi');
    } catch (e) { showToast(e?.error || 'Xatolik yuz berdi'); }
    finally { setGroupSaving(false); }
  };

  const openAddStudent = async () => {
    try {
      const students = await coursesApi.offlineStudents();
      const inGroup = new Set((selected.students || []).map((s) => s.id));
      setMyStudents(students.filter((s) => !inGroup.has(s.id)));
      setAddStudentModal(true);
    } catch { showToast('O\'quvchilarni yuklashda xatolik'); }
  };

  const addStudentToGroup = async (studentId) => {
    setAddingStudent(studentId);
    try {
      await groupsApi.addStudent(selected.id, studentId);
      const student = myStudents.find((s) => s.id === studentId);
      const updated = { ...selected, students: [...(selected.students || []), { ...student, attendance_rate: 0, present_count: 0, absent_count: 0, late_count: 0 }] };
      setSelected(updated);
      setMyStudents((p) => p.filter((s) => s.id !== studentId));
      setList((p) => p.map((g) => g.id === selected.id ? { ...g, student_count: (g.student_count || 0) + 1 } : g));
      showToast('O\'quvchi guruhga qo\'shildi');
    } catch (e) { showToast(e?.error || 'Xatolik'); }
    finally { setAddingStudent(null); }
  };

  const removeStudentFromGroup = async (studentId) => {
    if (!window.confirm('Bu o\'quvchini guruhdan chiqarmoqchimisiz?')) return;
    try {
      await groupsApi.removeStudent(selected.id, studentId);
      const updated = { ...selected, students: selected.students.filter((s) => s.id !== studentId) };
      setSelected(updated);
      setList((p) => p.map((g) => g.id === selected.id ? { ...g, student_count: Math.max(0, (g.student_count || 0) - 1) } : g));
      showToast('O\'quvchi guruhdan chiqarildi');
    } catch (e) { showToast(e?.error || 'Xatolik'); }
  };

  const deleteGroup = async () => {
    if (!window.confirm(`"${selected.name}" guruhini o'chirmoqchimisiz?`)) return;
    try {
      await groupsApi.remove(selected.id);
      setList((p) => p.filter((g) => g.id !== selected.id));
      setSelected(null);
      showToast('Guruh o\'chirildi');
    } catch (e) { showToast(e?.error || 'Xatolik'); }
  };

  const loadGrades = async (groupId, date) => {
    setGradeLoading(true);
    try {
      const data = await gradesApi.getForDate(groupId, date);
      setGradeRecords(data.students.map((s) => ({ userId: s.id, firstName: s.first_name, lastName: s.last_name, score: s.score !== null && s.score !== undefined ? String(s.score) : '', comment: s.comment || '' })));
    } catch { showToast(t('grades.loadError')); }
    finally { setGradeLoading(false); }
  };

  const saveGrades = async () => {
    if (!selected) return;
    setGradeSaving(true);
    try {
      await gradesApi.markBulk(selected.id, gradeDate, gradeRecords.map((r) => ({ userId: r.userId, score: r.score !== '' ? r.score : null, comment: r.comment })));
      showToast(t('grades.saved'));
    } catch { showToast(t('grades.saveError')); }
    finally { setGradeSaving(false); }
  };

  const loadAttendance = async (groupId, date) => {
    setAttendLoading(true);
    try {
      const data = await attendanceApi.getForDate(groupId, date);
      setAttendRecords(data.students.map((s) => ({ userId: s.id, firstName: s.first_name, lastName: s.last_name, status: s.status || 'present', note: s.note || '' })));
    } catch { showToast(t('attendance.loadError')); }
    finally { setAttendLoading(false); }
  };

  const saveAttendance = async () => {
    if (!selected) return;
    setAttendSaving(true);
    try {
      await attendanceApi.markBulk(selected.id, attendDate, attendRecords.map((r) => ({ userId: r.userId, status: r.status, note: r.note })));
      showToast(t('attendance.saved'));
    } catch { showToast(t('attendance.saveError')); }
    finally { setAttendSaving(false); }
  };

  const addSlot = () => setScheduleSlots((p) => [...p, { weekday: 0, start_time: '09:00', end_time: '11:00', room: '' }]);
  const removeSlot = (i) => setScheduleSlots((p) => p.filter((_, idx) => idx !== i));
  const updateSlot = (i, key, val) => setScheduleSlots((p) => p.map((s, idx) => idx === i ? { ...s, [key]: val } : s));

  const openCurriculumModal = async () => {
    try {
      const list = await curriculaApi.list();
      setCurriculumList(list);
      setCurriculumModal(true);
    } catch { showToast('Kurs rejalarni yuklashda xatolik'); }
  };

  const applySelectedCurriculum = async (curriculumId) => {
    try {
      const newLessons = await groupsApi.applyCurriculum(selected.id, curriculumId);
      setLessons(p => [...p, ...newLessons]);
      setCurriculumModal(false);
      showToast('Kurs reja qo\'llandi');
    } catch (e) { showToast(e?.error || 'Xatolik'); }
  };

  const addManualLesson = async () => {
    if (!addLessonForm.title.trim()) return showToast('Dars nomini kiriting');
    try {
      const newL = await groupsApi.addLesson(selected.id, addLessonForm);
      setLessons(p => [...p, { ...newL, materials: [] }]);
      setAddLessonForm({ title: '', description: '' });
      setAddLessonModal(false);
      showToast('Dars qo\'shildi');
    } catch (e) { showToast(e?.error || 'Xatolik'); }
  };

  const saveLessonEdits = async (lessonId) => {
    const edits = lessonEdits[lessonId];
    if (!edits) return;
    setLessonSaving(lessonId);
    try {
      const updated = await groupsApi.updateLesson(selected.id, lessonId, {
        title: edits.title,
        description: edits.description,
        extraTasks: edits.extraTasks,
      });
      setLessons(p => p.map(l => l.id === lessonId ? { ...l, ...updated, materials: l.materials } : l));
      showToast('Saqlandi');
    } catch (e) { showToast(e?.error || 'Xatolik'); }
    finally { setLessonSaving(null); }
  };

  const handleVideoUpload = async (lessonId, file) => {
    setVideoUpload(p => ({ ...p, [lessonId]: { state: 'uploading', progress: 0 } }));
    try {
      const updated = await groupsApi.uploadLessonVideo(selected.id, lessonId, file, (pct) =>
        setVideoUpload(p => ({ ...p, [lessonId]: { state: 'uploading', progress: pct } }))
      );
      setLessons(p => p.map(l => l.id === lessonId ? { ...l, video_url: updated.video_url } : l));
      setVideoUpload(p => ({ ...p, [lessonId]: { state: 'done', progress: 100 } }));
      showToast('Video yuklandi');
    } catch { setVideoUpload(p => ({ ...p, [lessonId]: { state: 'error', progress: 0 } })); showToast('Video yuklashda xatolik'); }
  };

  const handleMaterialUpload = async (lessonId, file) => {
    setMaterialUpload(p => ({ ...p, [lessonId]: { state: 'uploading', progress: 0 } }));
    try {
      const newMaterial = await groupsApi.uploadLessonMaterial(selected.id, lessonId, file, file.name, (pct) =>
        setMaterialUpload(p => ({ ...p, [lessonId]: { state: 'uploading', progress: pct } }))
      );
      setLessons(p => p.map(l => l.id === lessonId ? { ...l, materials: [...(l.materials || []), newMaterial] } : l));
      setMaterialUpload(p => ({ ...p, [lessonId]: { state: 'done', progress: 100 } }));
      showToast('Material yuklandi');
    } catch { setMaterialUpload(p => ({ ...p, [lessonId]: { state: 'error', progress: 0 } })); showToast('Material yuklashda xatolik'); }
  };

  const completeLessonHandler = async (lessonId) => {
    if (!window.confirm('Bu darsni yakunlaysizmi? O\'quvchilar ko\'ra oladi.')) return;
    try {
      const updated = await groupsApi.completeLesson(selected.id, lessonId);
      setLessons(p => p.map(l => l.id === lessonId ? { ...l, is_completed: true, completed_at: updated.completed_at } : l));
      showToast('Dars yakunlandi — o\'quvchilar ko\'ra oladi');
    } catch (e) { showToast(e?.error || 'Xatolik'); }
  };

  const deleteLessonHandler = async (lessonId) => {
    if (!window.confirm('Bu darsni o\'chirmoqchimisiz?')) return;
    try {
      await groupsApi.removeLesson(selected.id, lessonId);
      setLessons(p => p.filter(l => l.id !== lessonId));
      if (expandedLesson === lessonId) setExpandedLesson(null);
      showToast('Dars o\'chirildi');
    } catch (e) { showToast(e?.error || 'Xatolik'); }
  };

  const handleSaveSchedule = async () => {
    if (!selected) return;
    setSchedSaving(true);
    try {
      const saved = await groupsApi.setSchedule(selected.id, scheduleSlots.map((s) => ({ weekday: +s.weekday, startTime: s.start_time, endTime: s.end_time, room: s.room || '' })));
      setScheduleSlots(saved);
      showToast(t('groups.scheduleSaved'));
    } catch { showToast(t('common.error')); }
    finally { setSchedSaving(false); }
  };

  const weekdays = t('weekdays', { returnObjects: true });
  const statusKeys = ['present', 'late', 'absent', 'excused'];
  const statuses = t('attendanceStatus', { returnObjects: true });
  const shifts = t('shifts', { returnObjects: true });

  if (!selected) {
    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t('groups.title')}</h2>
          <button className="btn btn-navy" onClick={() => setCreateModal(true)}>+ Guruh yaratish</button>
        </div>

        {loading ? (
          <SkeletonGrid count={4} minWidth={280} />
        ) : list.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--hint)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <div style={{ marginBottom: 12 }}>{t('groups.noGroupsTeacher')}</div>
            <button className="btn btn-navy" onClick={() => setCreateModal(true)}>+ Guruh yaratish</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {list.map((g) => (
              <div key={g.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openGroup(g)}>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 44, height: 44, background: 'var(--blue-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👥</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{g.course_title || '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="pill pill-blue" style={{ fontSize: 10 }}>👤 {g.student_count} {t('common.students')}</span>
                    <span className="pill pill-amber" style={{ fontSize: 10 }}>{shifts[g.shift] || g.shift}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                    {g.start_date?.split('T')[0]} {g.end_date ? `→ ${g.end_date.split('T')[0]}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create group modal */}
        <Modal open={createModal} onClose={() => setCreateModal(false)} title="Yangi guruh yaratish" icon="👥"
          footer={<>
            <button className="btn btn-ghost" onClick={() => setCreateModal(false)} disabled={groupSaving}>Bekor</button>
            <button className="btn btn-navy" onClick={createGroup} disabled={groupSaving}>
              {groupSaving ? 'Yaratilmoqda...' : 'Yaratish'}
            </button>
          </>}
        >
          <div className="fgroup">
            <div className="flabel">Guruh nomi *</div>
            <input className="finput" placeholder="Masalan: Guruh A-1" value={groupForm.name}
              onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="fgroup">
            <div className="flabel">Smena</div>
            <select className="finput" value={groupForm.shift} onChange={(e) => setGroupForm((f) => ({ ...f, shift: e.target.value }))}>
              {Object.entries(shifts || {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="fgroup">
            <div className="flabel">Boshlanish sanasi</div>
            <input className="finput" type="date" value={groupForm.startDate}
              onChange={(e) => setGroupForm((f) => ({ ...f, startDate: e.target.value }))} />
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button className="btn btn-ghost" onClick={() => setSelected(null)}>← {t('common.back')}</button>
        <h2 style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{selected.name}</h2>
        <span className="pill pill-amber" style={{ fontSize: 11 }}>👤 {selected.students?.length || 0}</span>
        <button className="btn btn-red btn-sm" onClick={deleteGroup}>O'chirish</button>
      </div>

      <div className="tabs" style={{ marginBottom: 14 }}>
        {['students', 'attendance', 'grades', 'schedule', 'lessons'].map((k) => (
          <button key={k} className={`tab${detailTab === k ? ' active' : ''}`} onClick={() => setDetailTab(k)}>
            {k === 'lessons' ? '📚 Darslar' : t(`groups.${k}Tab`)}
            {k === 'lessons' && lessons.length > 0 && (
              <span style={{ marginLeft: 4, fontSize: 10, background: 'var(--navy)', color: '#fff', borderRadius: 10, padding: '1px 5px' }}>{lessons.length}</span>
            )}
          </button>
        ))}
      </div>

      {detailTab === 'students' && (
        <div className="card">
          <div className="card-hd">
            <h3>{t('groups.studentsTab')} ({selected.students?.length || 0})</h3>
            <button className="btn btn-navy btn-sm" onClick={openAddStudent}>+ O'quvchi qo'shish</button>
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
              {(selected.students || []).map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{s.phone}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <div style={{ width: 50, height: 6, background: 'var(--line-2)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${s.attendance_rate}%`, height: '100%', borderRadius: 4, background: s.attendance_rate >= 80 ? 'var(--green)' : s.attendance_rate >= 60 ? 'var(--amber)' : 'var(--red)' }} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 12, color: s.attendance_rate >= 80 ? 'var(--green)' : s.attendance_rate >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                        {s.attendance_rate}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 600 }}>{s.present_count}</td>
                  <td style={{ textAlign: 'center', color: 'var(--red)', fontWeight: 600 }}>{s.absent_count}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)', fontSize: 11 }}
                      onClick={() => removeStudentFromGroup(s.id)}
                    >
                      Guruhdan chiqarish
                    </button>
                  </td>
                </tr>
              ))}
              {!selected.students?.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                  {t('attendance.noStudents')}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {detailTab === 'attendance' && (
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="flabel" style={{ flexShrink: 0 }}>{t('attendance.dateLabel')}</div>
              <input type="date" className="finput" style={{ width: 180 }} value={attendDate}
                onChange={(e) => { setAttendDate(e.target.value); if (selected) loadAttendance(selected.id, e.target.value); }} />
              <div style={{ flex: 1 }} />
              <button className="btn btn-navy" disabled={attendSaving || attendRecords.length === 0} onClick={saveAttendance}>
                {attendSaving ? t('attendance.savingBtn') : t('attendance.saveBtn')}
              </button>
            </div>
          </div>
          {attendLoading ? <SkeletonCard rows={5} /> : attendRecords.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>{t('attendance.noStudents')}</div>
          ) : (
            <div className="card">
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {attendRecords.map((r) => (
                  <div key={r.userId} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    borderRadius: 10, background: STATUS_BG[r.status], border: `.5px solid ${STATUS_COLORS[r.status]}22`, transition: 'all .15s',
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                      {r.firstName[0]}{r.lastName[0]}
                    </div>
                    <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{r.firstName} {r.lastName}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {statusKeys.map((sk) => (
                        <button key={sk} onClick={() => setAttendRecords((p) => p.map((rec) => rec.userId === r.userId ? { ...rec, status: sk } : rec))} style={{
                          padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          border: `.5px solid ${r.status === sk ? STATUS_COLORS[sk] : 'var(--line-2)'}`,
                          background: r.status === sk ? STATUS_COLORS[sk] : 'transparent',
                          color: r.status === sk ? '#fff' : 'var(--muted)', transition: 'all .12s',
                        }}>{statuses[sk]}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {detailTab === 'grades' && (
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="flabel" style={{ flexShrink: 0 }}>{t('grades.dateLabel')}</div>
              <input type="date" className="finput" style={{ width: 180 }} value={gradeDate}
                onChange={(e) => { setGradeDate(e.target.value); if (selected) loadGrades(selected.id, e.target.value); }} />
              <div style={{ flex: 1 }} />
              <button className="btn btn-navy" disabled={gradeSaving || gradeRecords.length === 0} onClick={saveGrades}>
                {gradeSaving ? t('grades.savingBtn') : t('grades.saveBtn')}
              </button>
            </div>
          </div>
          {gradeLoading ? <SkeletonCard rows={5} /> : gradeRecords.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>{t('grades.noStudents')}</div>
          ) : (
            <div className="card">
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {gradeRecords.map((r) => {
                  const score = r.score !== '' ? parseInt(r.score, 10) : null;
                  const scoreColor = score === null ? 'var(--muted)' : score >= 8 ? 'var(--green)' : score >= 5 ? 'var(--amber)' : 'var(--red)';
                  return (
                    <div key={r.userId} style={{
                      display: 'grid', gridTemplateColumns: '36px 1fr 90px 1fr', gap: 12,
                      alignItems: 'center', padding: '10px 14px', borderRadius: 10,
                      background: 'var(--bg)', border: '.5px solid var(--line-2)',
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                        {r.firstName[0]}{r.lastName[0]}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.firstName} {r.lastName}</div>
                      <div style={{ position: 'relative' }}>
                        <input type="number" min="0" max="10" step="1" className="finput"
                          style={{ textAlign: 'center', fontWeight: 700, fontSize: 16, color: scoreColor, paddingRight: 24 }}
                          placeholder="—" value={r.score}
                          onChange={(e) => setGradeRecords((p) => p.map((rec) => rec.userId === r.userId ? { ...rec, score: e.target.value } : rec))} />
                        {score !== null && (
                          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: scoreColor }}>/10</span>
                        )}
                      </div>
                      <input className="finput" placeholder={t('grades.commentPlaceholder')} value={r.comment}
                        onChange={(e) => setGradeRecords((p) => p.map((rec) => rec.userId === r.userId ? { ...rec, comment: e.target.value } : rec))}
                        style={{ fontSize: 12 }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                <select className="finput" value={slot.weekday} onChange={(e) => updateSlot(i, 'weekday', e.target.value)}>
                  {Array.isArray(weekdays) && weekdays.map((d, wi) => <option key={wi} value={wi}>{d}</option>)}
                </select>
                <input type="time" className="finput" value={slot.start_time} onChange={(e) => updateSlot(i, 'start_time', e.target.value)} />
                <input type="time" className="finput" value={slot.end_time} onChange={(e) => updateSlot(i, 'end_time', e.target.value)} />
                <input className="finput" placeholder={t('groups.roomLabel')} value={slot.room} onChange={(e) => updateSlot(i, 'room', e.target.value)} />
                <button className="btn btn-red btn-sm" onClick={() => removeSlot(i)}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-navy" disabled={schedSaving} onClick={handleSaveSchedule}>
                {schedSaving ? t('groups.savingBtn') : t('groups.saveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailTab === 'lessons' && (
        <div>
          {/* Header buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className="btn btn-navy" onClick={openCurriculumModal}>📚 Kurs reja qo'llash</button>
            <button className="btn btn-ghost" onClick={() => setAddLessonModal(true)}>+ Dars qo'shish</button>
          </div>

          {lessonsLoading ? <SkeletonCard rows={4} /> : lessons.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--hint)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
              <div style={{ marginBottom: 16 }}>Darslar yo'q. Kurs reja qo'llang yoki qo'lda dars qo'shing.</div>
              <button className="btn btn-navy" onClick={openCurriculumModal}>📚 Kurs reja qo'llash</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lessons.map((lesson, idx) => {
                const isOpen = expandedLesson === lesson.id;
                const edits = lessonEdits[lesson.id] || { title: lesson.title, description: lesson.description || '', extraTasks: lesson.extra_tasks || '' };
                const vup = videoUpload[lesson.id];
                const mup = materialUpload[lesson.id];
                return (
                  <div key={lesson.id} className="card" style={{ padding: 0 }}>
                    {/* Lesson header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
                      onClick={() => {
                        setExpandedLesson(isOpen ? null : lesson.id);
                        if (!isOpen && !lessonEdits[lesson.id]) {
                          setLessonEdits(p => ({ ...p, [lesson.id]: { title: lesson.title, description: lesson.description || '', extraTasks: lesson.extra_tasks || '' } }));
                        }
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>#{idx + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{lesson.title}</div>
                        {lesson.description && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{lesson.description}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {lesson.video_url && <span style={{ fontSize: 10, color: 'var(--navy)' }}>🎬</span>}
                        {lesson.materials?.length > 0 && <span style={{ fontSize: 10, color: 'var(--navy)' }}>📎 {lesson.materials.length}</span>}
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: lesson.is_completed ? '#ECFDF3' : 'var(--bg)', color: lesson.is_completed ? '#027A48' : 'var(--muted)' }}>
                          {lesson.is_completed ? '✓ Yakunlangan' : '⏱ Kutilmoqda'}
                        </span>
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid var(--line)', padding: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                          <div className="fgroup" style={{ margin: 0 }}>
                            <div className="flabel">Dars nomi</div>
                            <input className="finput" value={edits.title}
                              onChange={e => setLessonEdits(p => ({ ...p, [lesson.id]: { ...edits, title: e.target.value } }))} />
                          </div>
                          <div className="fgroup" style={{ margin: 0 }}>
                            <div className="flabel">Ta'rif</div>
                            <input className="finput" value={edits.description}
                              onChange={e => setLessonEdits(p => ({ ...p, [lesson.id]: { ...edits, description: e.target.value } }))} />
                          </div>
                        </div>

                        {/* Video section */}
                        <div style={{ marginBottom: 12 }}>
                          <div className="flabel" style={{ marginBottom: 6 }}>Dars videosi</div>
                          {lesson.video_url ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 12 }}>
                              <span>🎬</span>
                              <a href={lesson.video_url} target="_blank" rel="noreferrer" style={{ flex: 1, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Video yuklangan</a>
                              <button className="btn btn-sm btn-ghost" onClick={() => { videoInputRefs.current[lesson.id]?.click(); }}>Almashtirish</button>
                            </div>
                          ) : (
                            <div style={{ border: '2px dashed var(--line-2)', borderRadius: 10, padding: '18px 16px', textAlign: 'center', cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}
                              onClick={() => videoInputRefs.current[lesson.id]?.click()}>
                              🎬 Video yuklash uchun bosing (max 500MB)
                            </div>
                          )}
                          {vup && vup.state === 'uploading' && (
                            <div style={{ marginTop: 6 }}>
                              <div style={{ height: 4, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${vup.progress}%`, height: '100%', background: 'var(--navy)', transition: 'width .3s' }} />
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{vup.progress}% yuklanyapti...</div>
                            </div>
                          )}
                          <input type="file" accept="video/*" style={{ display: 'none' }}
                            ref={el => videoInputRefs.current[lesson.id] = el}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(lesson.id, f); e.target.value = ''; }} />
                        </div>

                        {/* Materials section */}
                        <div style={{ marginBottom: 12 }}>
                          <div className="flabel" style={{ marginBottom: 6 }}>Materiallar (kitob, PDF)</div>
                          {(lesson.materials || []).map((m, mi) => (
                            <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg)', borderRadius: 7, marginBottom: 4, fontSize: 12 }}>
                              <span>📎</span>
                              <a href={m.file_url} target="_blank" rel="noreferrer" style={{ flex: 1, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</a>
                              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{m.file_type?.split('/')[1] || m.file_type}</span>
                            </div>
                          ))}
                          <button className="btn btn-sm btn-ghost" style={{ marginTop: 4 }} onClick={() => materialInputRefs.current[lesson.id]?.click()}>
                            + Material yuklash
                          </button>
                          {mup && mup.state === 'uploading' && (
                            <div style={{ marginTop: 6 }}>
                              <div style={{ height: 4, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${mup.progress}%`, height: '100%', background: 'var(--green)', transition: 'width .3s' }} />
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{mup.progress}% yuklanyapti...</div>
                            </div>
                          )}
                          <input type="file" style={{ display: 'none' }}
                            ref={el => materialInputRefs.current[lesson.id] = el}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleMaterialUpload(lesson.id, f); e.target.value = ''; }} />
                        </div>

                        {/* Extra tasks */}
                        <div className="fgroup" style={{ marginBottom: 12 }}>
                          <div className="flabel">Qo'shimcha topshiriqlar</div>
                          <textarea className="finput" rows={3} placeholder="Bugungi topshiriqlar, eslatmalar..."
                            value={edits.extraTasks}
                            onChange={e => setLessonEdits(p => ({ ...p, [lesson.id]: { ...edits, extraTasks: e.target.value } }))} />
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                          <button className="btn btn-sm btn-ghost" style={{ color: 'var(--red)' }} onClick={() => deleteLessonHandler(lesson.id)}>
                            O'chirish
                          </button>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-sm btn-ghost" disabled={lessonSaving === lesson.id} onClick={() => saveLessonEdits(lesson.id)}>
                              {lessonSaving === lesson.id ? 'Saqlanmoqda...' : '💾 Saqlash'}
                            </button>
                            {!lesson.is_completed && (
                              <button className="btn btn-sm" style={{ background: 'var(--green)', color: '#fff', fontWeight: 700 }} onClick={() => completeLessonHandler(lesson.id)}>
                                ✓ Yakunlash
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Curriculum select modal */}
      <Modal open={curriculumModal} onClose={() => setCurriculumModal(false)} title="Kurs reja tanlash" icon="📚">
        {curriculumList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--hint)' }}>
            Hali kurs reja yaratilmagan. Avval "Kurs reja" bo'limidan yareting.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
            {curriculumList.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, border: '.5px solid var(--line)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.lesson_count} ta dars</div>
                </div>
                <button className="btn btn-navy btn-sm" onClick={() => applySelectedCurriculum(c.id)}>Qo'llash</button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Add lesson modal */}
      <Modal open={addLessonModal} onClose={() => setAddLessonModal(false)} title="Yangi dars qo'shish" icon="📖"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setAddLessonModal(false)}>Bekor</button>
          <button className="btn btn-navy" onClick={addManualLesson}>Qo'shish</button>
        </>}
      >
        <div className="fgroup">
          <div className="flabel">Dars nomi *</div>
          <input className="finput" placeholder="Dars sarlavhasi" value={addLessonForm.title}
            onChange={e => setAddLessonForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="fgroup">
          <div className="flabel">Ta'rifi</div>
          <textarea className="finput" placeholder="Qisqacha..." value={addLessonForm.description}
            onChange={e => setAddLessonForm(p => ({ ...p, description: e.target.value }))} rows={3} />
        </div>
      </Modal>

      {/* Add student modal */}
      <Modal open={addStudentModal} onClose={() => setAddStudentModal(false)} title="O'quvchi qo'shish" icon="👤">
        {myStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--hint)' }}>
            <div>Barcha o'quvchilaringiz allaqachon bu guruhda</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
            {myStudents.map((s) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: 'var(--bg)', borderRadius: 10, border: '.5px solid var(--line)',
              }}>
                <div style={{ width: 36, height: 36, background: 'var(--navy)', color: '#FFD700', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {s.first_name?.[0]}{s.last_name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.first_name} {s.last_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.phone}</div>
                </div>
                <button
                  className="btn btn-navy btn-sm"
                  onClick={() => addStudentToGroup(s.id)}
                  disabled={addingStudent === s.id}
                >
                  {addingStudent === s.id ? '...' : '+ Qo\'shish'}
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
