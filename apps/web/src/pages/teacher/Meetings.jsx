import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { meetings as meetingsApi, courses as coursesApi } from '../../api';
import useStore from '../../store/useStore';

const COLORS = [
  ['#E8EDFB', '#1B2A6B'], ['#FEF3DC', '#B87A10'], ['#ECFDF3', '#027A48'],
  ['#FEF3F2', '#B42318'], ['#F5EAFB', '#534AB7'],
];

// ─── ONLINE MODE: Courses → Lessons → Start meeting ──────────────────────────
function OnlineMeetings() {
  const navigate = useNavigate();
  const { showToast } = useStore();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [readyData, setReadyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    meetingsApi.coursesWithLessons()
      .then((data) => { setCourses(data); if (data[0]) setSelectedCourse(data[0]); })
      .catch(() => showToast('Kurslarni yuklashda xatolik'))
      .finally(() => setLoading(false));
  }, []);

  const selectLesson = async (lesson) => {
    setSelectedLesson(lesson);
    setReadyData(null);
    try {
      const data = await meetingsApi.readyForLesson(lesson.id);
      setReadyData(data);
    } catch {
      showToast('Ma\'lumotlarni yuklashda xatolik');
    }
  };

  const startMeeting = async (lessonId, meetingId) => {
    try {
      await meetingsApi.updateStatus(meetingId, 'live');
      showToast('Meeting boshlandi');
      navigate(`/teacher/meetings/${meetingId}/join`);
    } catch {
      showToast('Xatolik yuz berdi');
    }
  };

  const scheduleMeeting = async () => {
    if (!readyData) return;
    const readyIds = readyData.students.filter((s) => !s.already_in_meeting).map((s) => s.id);
    if (!readyIds.length) return showToast('Tayyor o\'quvchi yo\'q');
    setScheduling(true);
    try {
      await meetingsApi.scheduleForLesson(selectedLesson.id, readyIds);
      showToast('Meeting rejalashtirildi (ertaga 19:00)');
      // Refresh lesson stats
      const data = await meetingsApi.coursesWithLessons();
      setCourses(data);
      if (selectedCourse) setSelectedCourse(data.find((c) => c.id === selectedCourse.id) || data[0]);
      setReadyData(null);
      setSelectedLesson(null);
    } catch (e) {
      showToast(e?.error || 'Xatolik yuz berdi');
    } finally {
      setScheduling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--hint)' }}>
        Yuklanmoqda...
      </div>
    );
  }

  if (!courses.length) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--hint)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
        <div>Online kurs mavjud emas</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%' }}>
      {/* Course list */}
      <div className="card" style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="card-hd"><h3 style={{ fontSize: 12 }}>Kurslar</h3></div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {courses.map((c) => (
            <div
              key={c.id}
              onClick={() => { setSelectedCourse(c); setSelectedLesson(null); setReadyData(null); }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                borderLeft: selectedCourse?.id === c.id ? '3px solid var(--navy)' : '3px solid transparent',
                background: selectedCourse?.id === c.id ? 'var(--bg)' : 'transparent',
                transition: 'all .15s',
              }}
            >
              {c.title}
            </div>
          ))}
        </div>
      </div>

      {/* Lesson list */}
      {selectedCourse && (
        <div className="card" style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-hd"><h3 style={{ fontSize: 12 }}>Mavzular</h3></div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {selectedCourse.lessons?.map((l) => (
              <div
                key={l.id}
                onClick={() => selectLesson(l)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', transition: 'background .15s',
                  background: selectedLesson?.id === l.id ? 'var(--bg)' : 'transparent',
                  borderLeft: selectedLesson?.id === l.id ? '3px solid var(--navy)' : '3px solid transparent',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  {l.order_num}. {l.title}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {l.ready_count > 0 && (
                    <span className="pill pill-green" style={{ fontSize: 10 }}>
                      {l.ready_count} tayyor
                    </span>
                  )}
                  {l.active_meeting_status === 'live' && (
                    <span className="pill pill-red" style={{ fontSize: 10 }}>🔴 Jonli</span>
                  )}
                  {l.active_meeting_status === 'scheduled' && (
                    <span className="pill pill-amber" style={{ fontSize: 10 }}>⏰ Rejalangan</span>
                  )}
                </div>
              </div>
            ))}
            {!selectedCourse.lessons?.length && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--hint)', fontSize: 11 }}>
                Nashr etilgan dars yo'q
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lesson detail panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {selectedLesson && readyData ? (
          <>
            {/* Meeting action card */}
            <div className="card" style={{ background: 'linear-gradient(135deg,var(--navy),var(--navy-3))', border: 'none' }}>
              <div className="card-body">
                <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, marginBottom: 4 }}>
                  {selectedCourse?.title}
                </div>
                <h2 style={{ color: '#fff', fontSize: 16, margin: '0 0 12px' }}>
                  {selectedLesson.order_num}-dars: {selectedLesson.title}
                </h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedLesson.active_meeting_status === 'live' ? (
                    <button
                      className="btn btn-gold"
                      onClick={() => navigate(`/teacher/meetings/${selectedLesson.active_meeting_id}/join`)}
                    >
                      📹 Meetingga kirish
                    </button>
                  ) : selectedLesson.active_meeting_status === 'scheduled' ? (
                    <>
                      <button
                        className="btn btn-gold"
                        onClick={() => startMeeting(selectedLesson.id, selectedLesson.active_meeting_id)}
                      >
                        ▶ Meetingni boshlash
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}
                        onClick={() => navigate(`/teacher/meetings/${selectedLesson.active_meeting_id}/join`)}
                      >
                        📹 Test kirish
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-gold"
                      onClick={scheduleMeeting}
                      disabled={scheduling || !readyData.students.filter((s) => !s.already_in_meeting).length}
                    >
                      {scheduling ? 'Rejalanmoqda...' : '📅 Meeting rejalashtirish (ertaga 19:00)'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Ready students */}
            <div className="card">
              <div className="card-hd">
                <h3>
                  Tayyor o'quvchilar
                  <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                    ({readyData.students.filter((s) => !s.already_in_meeting).length} yangi,&nbsp;
                    {readyData.students.filter((s) => s.already_in_meeting).length} qatnashgan)
                  </span>
                </h3>
              </div>
              <div className="card-body">
                {readyData.students.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--hint)', padding: 20, fontSize: 12 }}>
                    Hali biron o'quvchi darsni tugatmagan
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    {readyData.students.map((s, i) => {
                      const [bg, tc] = COLORS[i % COLORS.length];
                      const attended = !!s.already_in_meeting;
                      return (
                        <div
                          key={s.id}
                          style={{
                            padding: 12, background: attended ? 'var(--bg2)' : 'var(--bg)',
                            borderRadius: 12, textAlign: 'center',
                            border: attended ? '1px solid var(--line)' : '1px solid rgba(28,63,170,.15)',
                            opacity: attended ? 0.6 : 1,
                          }}
                        >
                          <div style={{
                            width: 40, height: 40, background: bg, color: tc,
                            borderRadius: 10, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 13, fontWeight: 700,
                            margin: '0 auto 6px',
                          }}>
                            {s.first_name?.[0]}{s.last_name?.[0]}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{s.first_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                            Test: {Math.round(s.test_score || 0)}%
                          </div>
                          {attended && (
                            <span className="pill pill-green" style={{ fontSize: 10, marginTop: 4 }}>Qatnashgan</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : selectedLesson ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--hint)' }}>
            Yuklanmoqda...
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--hint)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
              <div>Mavzuni tanlang</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── OFFLINE MODE: manual meeting creation + list ─────────────────────────────
function OfflineMeetings() {
  const navigate = useNavigate();
  const { showToast } = useStore();
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeM, setActiveM] = useState(null);
  const [form, setForm] = useState({ courseId: '', title: '', scheduledAt: '', durationMinutes: 60, audienceType: 'all' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMeetings();
    coursesApi.list('offline').then(setCourseList).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeM) meetingsApi.students(activeM.id).then(setStudents).catch(() => {});
  }, [activeM]);

  const loadMeetings = async () => {
    try {
      const data = await meetingsApi.list();
      setList(data);
      setActiveM(data[0] || null);
    } catch { showToast(t('teacher.meetings.loadError')); }
  };

  const createMeeting = async () => {
    if (!form.courseId || !form.title || !form.scheduledAt) return showToast(t('teacher.meetings.fillAll'));
    setSaving(true);
    try {
      const m = await meetingsApi.create({ ...form });
      setList((p) => [m, ...p]);
      setActiveM(m);
      showToast(t('teacher.meetings.scheduled'));
      setForm({ courseId: '', title: '', scheduledAt: '', durationMinutes: 60, audienceType: 'all' });
    } catch { showToast('Xatolik yuz berdi'); }
    finally { setSaving(false); }
  };

  const startMeeting = async () => {
    if (!activeM) return;
    try {
      await meetingsApi.updateStatus(activeM.id, 'live');
      const updated = { ...activeM, status: 'live' };
      setActiveM(updated);
      setList((p) => p.map((m) => m.id === activeM.id ? updated : m));
      showToast(t('teacher.meetings.started'));
    } catch { showToast('Xatolik yuz berdi'); }
  };

  const joinMeeting = () => activeM && navigate(`/teacher/meetings/${activeM.id}/join`);

  const upcomingMeetings = list.filter((m) => new Date(m.scheduled_at) > new Date());

  return (
    <div className="r-2col-side">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activeM && (
          <div className="card" style={{ background: 'linear-gradient(135deg,var(--navy),var(--navy-3))', border: 'none' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, marginBottom: 4 }}>{activeM.course_title}</div>
                <h2 style={{ color: '#fff', fontSize: 18, marginBottom: 6, margin: 0 }}>{activeM.title}</h2>
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
                    <button className="btn btn-gold" onClick={startMeeting}>▶ Boshlash</button>
                    <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} onClick={joinMeeting}>📹 Test</button>
                    <button
                      className="btn btn-ghost"
                      style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}
                      onClick={async () => {
                        const newTime = window.prompt('Yangi vaqt (YYYY-MM-DD HH:MM):', new Date(activeM.scheduled_at).toISOString().slice(0, 16).replace('T', ' '));
                        if (!newTime) return;
                        try {
                          const updated = await meetingsApi.reschedule(activeM.id, newTime);
                          setActiveM({ ...activeM, scheduled_at: updated.scheduled_at });
                          setList((p) => p.map((m) => m.id === activeM.id ? { ...m, scheduled_at: updated.scheduled_at } : m));
                          showToast(`✓ Vaqt yangilandi`);
                        } catch (e) { showToast(e?.error || 'Vaqt o\'zgartirilmadi'); }
                      }}
                    >
                      🔄 Vaqtni o'zgartirish
                    </button>
                  </>
                ) : (
                  <button className="btn btn-gold" onClick={joinMeeting}>📹 Kirish</button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeM && students.length > 0 && (
          <div className="card">
            <div className="card-hd"><h3>Ishtirokchilar ({students.length})</h3></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {students.map((s, i) => {
                  const [bg, tc] = COLORS[i % COLORS.length];
                  return (
                    <div key={s.id} style={{ padding: 12, background: 'var(--bg)', borderRadius: 12, textAlign: 'center' }}>
                      <div style={{ width: 44, height: 44, background: bg, color: tc, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, margin: '0 auto 8px' }}>
                        {s.first_name?.[0]}{s.last_name?.[0]}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{s.first_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{Math.round(s.avg_score || 0)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card">
          <div className="card-hd"><h3>{t('teacher.meetings.newMeeting')}</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="fgroup">
              <div className="flabel">{t('teacher.meetings.courseLabel')}</div>
              <select className="finput" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                <option value="">{t('teacher.meetings.selectOption')}</option>
                {courseList.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
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

        <div className="card">
          <div className="card-hd"><h3 style={{ fontSize: 13 }}>📅 Kelgusi</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {upcomingMeetings.map((m, i) => (
              <div
                key={m.id}
                style={{ padding: '10px 14px', borderBottom: i < upcomingMeetings.length - 1 ? '.5px solid var(--line)' : 'none', cursor: 'pointer' }}
                onClick={() => setActiveM(m)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{m.title}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{new Date(m.scheduled_at).toLocaleDateString('uz')}</div>
              </div>
            ))}
            {upcomingMeetings.length === 0 && (
              <div style={{ padding: 14, textAlign: 'center', color: 'var(--hint)', fontSize: 11 }}>Kelgusi meeting yo'q</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherMeetings() {
  const { mode } = useStore();

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {mode === 'online' ? <OnlineMeetings /> : <OfflineMeetings />}
    </div>
  );
}
