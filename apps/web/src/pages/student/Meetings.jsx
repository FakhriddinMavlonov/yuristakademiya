import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetings as meetingsApi } from '../../api';
import useStore from '../../store/useStore';

export default function StudentMeetings() {
  const navigate = useNavigate();
  const { showToast } = useStore();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const data = await meetingsApi.list();
      setList(data);
    } catch (e) {
      showToast('Meetinglarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const fmtTime = (d) => new Date(d).toLocaleString('uz', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const upcomingMeetings = list.filter(m => new Date(m.scheduled_at) > new Date());
  const liveMeetings = list.filter(m => m.status === 'live');

  return (
    <div className="page" style={{ maxWidth: 900, margin: '0 auto' }}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--muted)' }}>
          Yuklanyapti...
        </div>
      ) : (
        <>
          {/* Live meetings */}
          {liveMeetings.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 12, textTransform: 'uppercase' }}>
                🔴 Jonli Meetinglar
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {liveMeetings.map((m) => (
                  <div key={m.id} className="card" style={{ borderColor: 'var(--red)', borderWidth: '1.5px' }}>
                    <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, background: 'var(--red-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        🔴
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{m.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {m.course_title} • {m.teacher_name}
                        </div>
                      </div>
                      <button
                        className="btn btn-gold"
                        onClick={() => navigate(`/student/meetings/${m.id}`)}
                      >
                        Kirish →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming meetings */}
          {upcomingMeetings.length > 0 ? (
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase' }}>
                ⏰ Kelayotgan Meetinglar
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingMeetings.map((m) => (
                  <div key={m.id} className="card">
                    <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, background: '#EFF4FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        📹
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{m.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {m.course_title} • {m.teacher_name} · {fmtTime(m.scheduled_at)}
                        </div>
                      </div>
                      <span className="pill pill-blue">Rejalashtirilgan</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, textAlign: 'center', color: 'var(--hint)' }}>
              <div>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📹</div>
                <div style={{ fontSize: 13 }}>Hozircha meeting yo'q</div>
                <div style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>Ustozlari yangi meeting rejalashtirsa, bu yerda ko'rinadi</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
