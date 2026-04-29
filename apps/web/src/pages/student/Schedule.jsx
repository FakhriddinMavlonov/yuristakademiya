import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { groups as groupsApi, attendance as attendanceApi, grades as gradesApi } from '../../api';
import useStore from '../../store/useStore';

const STATUS_COLORS = { present: 'var(--green)', late: 'var(--amber)', absent: 'var(--red)', excused: 'var(--muted)' };
const STATUS_BG = { present: 'var(--green-bg)', late: 'var(--amber-bg)', absent: 'var(--red-bg)', excused: 'var(--bg2)' };

const jsToMyWeekday = (jsDay) => (jsDay + 6) % 7;

export default function StudentSchedule() {
  const { t } = useTranslation();
  const { showToast } = useStore();

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [history, setHistory] = useState({ records: [], stats: { total: 0, present: 0, late: 0, absent: 0, rate: 0 } });
  const [gradeHistory, setGradeHistory] = useState({ records: [], stats: { total: 0, avg: null, best: null } });
  const [loading, setLoading] = useState(true);

  const weekdays = t('weekdays', { returnObjects: true });
  const statuses = t('attendanceStatus', { returnObjects: true });
  const shifts = t('shifts', { returnObjects: true });

  const todayWeekday = jsToMyWeekday(new Date().getDay());
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await groupsApi.list();
        const details = await Promise.all(list.map(g => groupsApi.get(g.id)));
        setGroups(details);
        if (details.length > 0) {
          setSelectedGroup(details[0]);
          const [hist, ghist] = await Promise.all([
            attendanceApi.myHistory(),
            gradesApi.myHistory(),
          ]);
          setHistory(hist);
          setGradeHistory(ghist);
        }
      } catch { showToast(t('groups.loadError')); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSelectGroup = async (g) => {
    setSelectedGroup(g);
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ color: 'var(--muted)' }}>{t('common.loading')}</div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="page" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--hint)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 14 }}>{t('schedule.noGroup')}</div>
        </div>
      </div>
    );
  }

  const schedule = selectedGroup?.schedule || [];
  const todaySlots = schedule.filter(s => +s.weekday === todayWeekday);

  const groupAttendance = selectedGroup
    ? history.records.filter(r => r.group_id === selectedGroup.id)
    : [];

  return (
    <div className="page" style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Group selector if multiple groups */}
      {groups.length > 1 && (
        <div className="tabs" style={{ marginBottom: 14 }}>
          {groups.map(g => (
            <button
              key={g.id}
              className={`tab${selectedGroup?.id === g.id ? ' active' : ''}`}
              onClick={() => handleSelectGroup(g)}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--navy-text)' }}>{history.stats.total}</div>
          <div className="stat-lbl">{t('attendance.totalLabel')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--green)' }}>{history.stats.present}</div>
          <div className="stat-lbl">{t('attendance.presentLabel')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--amber)' }}>{history.stats.late}</div>
          <div className="stat-lbl">{t('attendance.lateLabel')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ fontSize: 22, color: history.stats.rate >= 80 ? 'var(--green)' : history.stats.rate >= 60 ? 'var(--amber)' : 'var(--red)' }}>
            {history.stats.rate}%
          </div>
          <div className="stat-lbl">{t('attendance.rateLabel')}</div>
        </div>
        {gradeHistory.stats.avg !== null && (
          <div className="stat-card">
            <div className="stat-num" style={{ fontSize: 22, color: gradeHistory.stats.avg >= 8 ? 'var(--green)' : gradeHistory.stats.avg >= 5 ? 'var(--amber)' : 'var(--red)' }}>
              {gradeHistory.stats.avg}
            </div>
            <div className="stat-lbl">{t('grades.avgScore')}</div>
          </div>
        )}
        {gradeHistory.stats.best !== null && (
          <div className="stat-card">
            <div className="stat-num" style={{ fontSize: 22, color: 'var(--green)' }}>{gradeHistory.stats.best}</div>
            <div className="stat-lbl">{t('grades.bestLabel')}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'start' }}>
        {/* Weekly schedule */}
        <div className="card">
          <div className="card-hd"><h3>{t('schedule.weeklySchedule')}</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {schedule.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>{t('schedule.noSchedule')}</div>
            ) : (
              Array.isArray(weekdays) && weekdays.map((dayName, wi) => {
                const daySlots = schedule.filter(s => +s.weekday === wi);
                const isToday = wi === todayWeekday;
                return (
                  <div key={wi} style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: isToday ? 'var(--blue-bg)' : 'var(--bg)',
                    border: `.5px solid ${isToday ? 'var(--blue)' : 'var(--line-2)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--blue)' : 'var(--muted)', width: 100, flexShrink: 0 }}>
                        {dayName} {isToday && <span style={{ fontSize: 10, background: 'var(--blue)', color: '#fff', borderRadius: 5, padding: '1px 6px', marginLeft: 4 }}>{t('schedule.today')}</span>}
                      </div>
                      {daySlots.length === 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--hint)' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {daySlots.map((slot, si) => (
                            <div key={si} style={{ fontSize: 12, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600 }}>{slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}</span>
                              {slot.room && slot.room !== 'Online' && (
                                <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {slot.room}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel: group info + attendance history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Today's classes */}
          {todaySlots.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--green)', borderWidth: 1.5 }}>
              <div className="card-body">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
                  {t('schedule.today')}
                </div>
                {todaySlots.map((slot, si) => (
                  <div key={si} style={{ fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>{slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}</span>
                    {slot.room && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>{slot.room}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group info */}
          {selectedGroup && (
            <div className="card">
              <div className="card-body">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
                  {t('schedule.myGroup')}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{selectedGroup.name}</div>
                {selectedGroup.course_title && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{selectedGroup.course_title}</div>}
                {selectedGroup.teacher_name && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>🎓 {selectedGroup.teacher_name}</div>}
                {selectedGroup.shift && <div style={{ fontSize: 12, color: 'var(--muted)' }}>⏰ {shifts[selectedGroup.shift] || selectedGroup.shift}</div>}
              </div>
            </div>
          )}

          {/* Attendance progress bar */}
          <div className="card">
            <div className="card-body">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
                {t('attendance.rateLabel')}
              </div>
              <div className="pb-wrap" style={{ height: 10, marginBottom: 8 }}>
                <div className="pb-fill" style={{
                  width: `${history.stats.rate}%`,
                  background: history.stats.rate >= 80 ? 'var(--green)' : history.stats.rate >= 60 ? 'var(--amber)' : 'var(--red)',
                  transition: 'width 1s ease',
                }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Sora', textAlign: 'center',
                color: history.stats.rate >= 80 ? 'var(--green)' : history.stats.rate >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                {history.stats.rate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance history list */}
      {groupAttendance.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-hd"><h3>{t('schedule.attendanceSection')}</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {groupAttendance.slice(0, 30).map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                borderRadius: 8, background: STATUS_BG[r.status],
                border: `.5px solid ${STATUS_COLORS[r.status]}22`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', width: 90, flexShrink: 0 }}>{r.date}</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS[r.status] }}>
                  {statuses[r.status] || r.status}
                </span>
                {r.note && <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {r.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {groupAttendance.length === 0 && history.stats.total === 0 && (
        <div className="card" style={{ marginTop: 14, textAlign: 'center', padding: 32, color: 'var(--hint)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
          <div>{t('attendance.noHistory')}</div>
        </div>
      )}

      {gradeHistory.records.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-hd"><h3>{t('schedule.gradesSection')}</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gradeHistory.records.slice(0, 30).map((r, i) => {
              const scoreColor = r.score >= 8 ? 'var(--green)' : r.score >= 5 ? 'var(--amber)' : 'var(--red)';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                  borderRadius: 8, background: 'var(--bg)', border: '.5px solid var(--line-2)',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', width: 90, flexShrink: 0 }}>{r.date}</div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: scoreColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor }}>{r.score}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {r.group_name && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.group_name}</div>}
                    {r.comment && <div style={{ fontSize: 12, color: 'var(--ink)' }}>{r.comment}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
