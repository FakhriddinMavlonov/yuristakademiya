import React, { useEffect, useState } from 'react';
import { analytics as analyticsApi } from '../../api';
import { PageLoader } from '../../components/ui/Loading';
import useStore from '../../store/useStore';

function TeacherAnalytics() {
  const showToast = useStore(s => s.showToast);

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await analyticsApi.teacher();
      setAnalytics(data);
    } catch (err) {
      showToast(err.error || "Xato");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!analytics) return <div style={{ textAlign: 'center', padding: '40px' }}>Ma'lumot topilmadi</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }} className="page">
      <h1 style={{ marginBottom: 30 }}>📊 Tahlil</h1>

      {/* Groups Stats */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, marginBottom: 16, color: 'var(--navy)', fontWeight: 700 }}>
          Guruhlar Statistikasi
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14,
            background: 'var(--bg2)',
            borderRadius: 8,
            padding: 16,
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--navy)' }}>Guruh</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--navy)' }}>O'quvchilar</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--navy)' }}>Avg Baho</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--navy)' }}>Davomat</th>
              </tr>
            </thead>
            <tbody>
              {(analytics.groups || []).map((group, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px' }}>{group.name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{group.student_count}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{group.avg_grade}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{group.attendance_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top and Bottom Students */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        marginBottom: 40,
      }}>
        {/* Top Students */}
        <div>
          <h2 style={{ fontSize: 16, marginBottom: 12, color: 'var(--green)', fontWeight: 700 }}>
            🏆 Top 5 O'quvchilar (XP)
          </h2>
          <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 16 }}>
            {(analytics.top_students || []).map((student, idx) => (
              <div key={idx} style={{
                padding: '12px 0',
                borderBottom: idx < (analytics.top_students || []).length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{idx + 1}. {student.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    🔥 {student.streak} kun
                  </div>
                </div>
                <div style={{
                  fontWeight: 700,
                  color: 'var(--green)',
                  fontSize: 16,
                }}>
                  {student.xp}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Students */}
        <div>
          <h2 style={{ fontSize: 16, marginBottom: 12, color: 'var(--red)', fontWeight: 700 }}>
            ⚠️ Bottom 5 O'quvchilar (XP)
          </h2>
          <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 16 }}>
            {(analytics.bottom_students || []).map((student, idx) => (
              <div key={idx} style={{
                padding: '12px 0',
                borderBottom: idx < (analytics.bottom_students || []).length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{student.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {student.streak > 0 ? `🔥 ${student.streak} kun` : 'Strikeasy yo\'q'}
                  </div>
                </div>
                <div style={{
                  fontWeight: 700,
                  color: 'var(--red)',
                  fontSize: 16,
                }}>
                  {student.xp}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assignment Stats */}
      <div>
        <h2 style={{ fontSize: 16, marginBottom: 16, color: 'var(--navy)', fontWeight: 700 }}>
          Uy Ishi Statistikasi
        </h2>
        <div style={{
          background: 'linear-gradient(135deg, #667EEA, #764BA2)',
          color: 'white',
          padding: 24,
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            {analytics.assignment_submission_rate}%
          </div>
          <div style={{ fontSize: 14 }}>Topshiriq taqdimi foiz</div>
        </div>
      </div>
    </div>
  );
}

export default TeacherAnalytics;
