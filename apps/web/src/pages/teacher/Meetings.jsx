import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { meetings as meetingsApi, courses as coursesApi } from '../../api';
import useStore from '../../store/useStore';

const COLORS = [
  ['#E8EDFB', '#1B2A6B'], ['#FEF3DC', '#B87A10'], ['#ECFDF3', '#027A48'],
  ['#FEF3F2', '#B42318'], ['#F5EAFB', '#534AB7'],
];

function ScoreColor(s) {
  return s >= 85 ? 'var(--green)' : s >= 65 ? 'var(--amber)' : 'var(--red)';
}

export default function TeacherMeetings() {
  const navigate = useNavigate();
  const { showToast } = useStore();
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeM, setActiveM] = useState(null);
  const [form, setForm] = useState({ courseId: '', title: '', scheduledAt: '', durationMinutes: 60, audienceType: 'all' });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMeetings();
    coursesApi.list().then(setCourseList).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeM) {
      meetingsApi.students(activeM.id).then(setStudents).catch(() => {});
      // Get current participants
      const currentParticipants = activeM.participant_ids || [];
      setSelectedStudents(currentParticipants);
    }
  }, [activeM]);

  const loadMeetings = async () => {
    try {
      const data = await meetingsApi.list();
      setList(data);
      setActiveM(data[0] || null);
    } catch (e) {
      showToast(t('teacher.meetings.loadError'));
    }
  };

  const createMeeting = async () => {
    if (!form.courseId || !form.title || !form.scheduledAt) {
      return showToast(t('teacher.meetings.fillAll'));
    }
    setSaving(true);
    try {
      const m = await meetingsApi.create({
        ...form,
        participantIds: form.audienceType === 'selected' ? selectedStudents : undefined,
      });
      setList((p) => [m, ...p]);
      showToast(t('teacher.meetings.scheduled'));
      setForm({ courseId: '', title: '', scheduledAt: '', durationMinutes: 60, audienceType: 'all' });
      setSelectedStudents([]);
    } catch (e) {
      showToast('Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const startMeeting = async () => {
    if (!activeM) return;
    try {
      await meetingsApi.updateStatus(activeM.id, 'live');
      const updated = { ...activeM, status: 'live' };
      setActiveM(updated);
      setList((p) => p.map(m => m.id === activeM.id ? updated : m));
      showToast(t('teacher.meetings.started'));
    } catch (e) {
      showToast('Xatolik yuz berdi');
    }
  };

  const joinMeeting = () => {
    if (!activeM) return;
    navigate(`/teacher/meetings/${activeM.id}/join`);
  };

  const toggleStudentSelect = async (studentId, checked) => {
    try {
      if (checked) {
        await meetingsApi.addParticipant(activeM.id, studentId);
        setSelectedStudents((p) => [...p, studentId]);
        showToast(t('teacher.meetings.studentAdded'));
      } else {
        await meetingsApi.removeParticipant(activeM.id, studentId);
        setSelectedStudents((p) => p.filter(id => id !== studentId));
        showToast(t('teacher.meetings.studentRemoved'));
      }
    } catch (e) {
      showToast('Xatolik yuz berdi');
    }
  };

  const upcomingMeetings = list.filter(m => new Date(m.scheduled_at) > new Date());

  return (
    <div className="page">
      <div className="r-2col-side">
        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Active meeting */}
          {activeM && (
            <div className="card" style={{ background: 'linear-gradient(135deg,var(--navy),var(--navy-3))', border: 'none' }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, marginBottom: 4 }}>
                    {activeM.course_title}
                  </div>
                  <h2 style={{ color: '#fff', fontSize: 18, marginBottom: 6, margin: 0 }}>
                    {activeM.title}
                  </h2>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    <span className="pill" style={{ background: activeM.status === 'live' ? 'var(--red)' : 'rgba(245,166,35,.2)', color: activeM.status === 'live' ? '#fff' : 'var(--gold)' }}>
                      {activeM.status === 'live' ? '🔴 JONLI' : '⏰ Rejalashtirilgan'}
                    </span>
                    <span className="pill" style={{ background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)' }}>
                      {students.length} o'quvchi
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                  {activeM.status !== 'live' ? (
                    <>
                      <button className="btn btn-gold" onClick={startMeeting} style={{ justifyContent: 'center' }}>
                        ▶ Boshlash
                      </button>
                      <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} onClick={joinMeeting}>
                        📹 Test
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-gold" onClick={joinMeeting} style={{ justifyContent: 'center' }}>
                      📹 Kirish
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Students */}
          {activeM && (
            <div className="card">
              <div className="card-hd">
                <h3>Ishtirokchilar ({students.length})</h3>
              </div>
              <div className="card-body">
                {students.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                    {students.map((s, i) => {
                      const [bg, tc] = COLORS[i % COLORS.length];
                      const isSelected = selectedStudents.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          style={{
                            padding: 12,
                            background: 'var(--bg)',
                            borderRadius: 12,
                            textAlign: 'center',
                            cursor: 'pointer',
                            border: isSelected ? '2px solid var(--navy)' : '1px solid var(--line)',
                            transition: 'all .2s',
                          }}
                          onClick={() => navigate(`/teacher/meetings/${activeM.id}/student/${s.id}`)}
                        >
                          <div style={{ width: 44, height: 44, background: bg, color: tc, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, margin: '0 auto 8px' }}>
                            {s.first_name?.[0]}{s.last_name?.[0]}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.first_name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                            {Math.round(s.avg_score || 0)}%
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8, cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => toggleStudentSelect(s.id, e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{t('teacher.meetings.addLabel')}</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--hint)', fontSize: 12, padding: 20 }}>
                    {t('teacher.meetings.noStudents')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Schedule */}
          <div className="card">
            <div className="card-hd"><h3>{t('teacher.meetings.newMeeting')}</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="fgroup">
                <div className="flabel">{t('teacher.meetings.courseLabel')}</div>
                <select className="finput" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                  <option value="">{t('teacher.meetings.selectOption')}</option>
                  {courseList.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="fgroup">
                <div className="flabel">{t('teacher.meetings.titleLabel')}</div>
                <input className="finput" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('teacher.meetings.titlePlaceholder')} />
              </div>
              <div className="fgroup">
                <div className="flabel">{t('teacher.meetings.dateLabel')}</div>
                <input className="finput" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>
              <button className="btn btn-gold" onClick={createMeeting} disabled={saving} style={{ justifyContent: 'center' }}>
                {saving ? t('teacher.meetings.savingBtn') : t('teacher.meetings.saveBtn')}
              </button>
            </div>
          </div>

          {/* Upcoming */}
          <div className="card">
            <div className="card-hd"><h3 style={{ fontSize: 13 }}>📅 Kelgusi</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {upcomingMeetings.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    padding: '10px 14px',
                    borderBottom: i < upcomingMeetings.length - 1 ? '.5px solid var(--line)' : 'none',
                    cursor: 'pointer',
                    transition: 'background .2s',
                  }}
                  onClick={() => setActiveM(m)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{m.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    {new Date(m.scheduled_at).toLocaleDateString('uz')}
                  </div>
                </div>
              ))}
              {upcomingMeetings.length === 0 && (
                <div style={{ padding: 14, textAlign: 'center', color: 'var(--hint)', fontSize: 11 }}>
                  Kelgusi meeting yo'q
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
