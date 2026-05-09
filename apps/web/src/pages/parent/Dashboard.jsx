import React, { useEffect, useState } from 'react';
import { parent as parentApi, analytics as analyticsApi } from '../../api';
import { PageLoader } from '../../components/ui/Loading';
import useStore from '../../store/useStore';

function ParentDashboard() {
  const showToast = useStore(s => s.showToast);

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState('');
  const [showPhonePrompt, setShowPhonePrompt] = useState(true);

  useEffect(() => {
    const savedPhone = localStorage.getItem('parent_phone');
    if (savedPhone) {
      setPhone(savedPhone);
      loadStudents(savedPhone);
      setShowPhonePrompt(false);
    } else {
      setLoading(false);
    }
  }, []);

  const loadStudents = async (phoneNumber) => {
    try {
      setLoading(true);
      const data = await parentApi.getStudents(phoneNumber);
      setStudents(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        selectStudent(data[0].student_id);
        localStorage.setItem('parent_phone', phoneNumber);
      }
    } catch (err) {
      showToast(err.error || "Xato");
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = async (studentId) => {
    try {
      setLoading(true);
      const data = await analyticsApi.student(studentId);
      setStats(data);
      setSelectedStudent(studentId);
    } catch (err) {
      showToast(err.error || "Xato");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = () => {
    if (!phone.trim()) {
      showToast("Telefon raqamini kiriting");
      return;
    }
    loadStudents(phone);
    setShowPhonePrompt(false);
  };

  if (showPhonePrompt) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--navy), var(--blue))',
        color: 'white',
        padding: 20,
      }}>
        <div style={{
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
        }}>
          <h1 style={{ marginBottom: 24, fontSize: 28 }}>Ota-ona Portali</h1>
          <p style={{ marginBottom: 24, opacity: 0.9 }}>
            Farzanding o'qish jarayonini kuzating
          </p>
          <input
            type="tel"
            placeholder="+998 XX XXX XX XX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handlePhoneSubmit()}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              border: 'none',
              marginBottom: 16,
              fontSize: 16,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handlePhoneSubmit}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'white',
              color: 'var(--navy)',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Kirish
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <PageLoader />;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px' }} className="page">
      <h1 style={{ marginBottom: 20 }}>👨‍👩‍👧 Ota-ona Portali</h1>

      {students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
          Bu telefon raqamiga bog'langan o'quvchi topilmadi
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '250px 1fr',
          gap: 24,
        }}>
          {/* Student List */}
          <div>
            <h3 style={{ fontSize: 14, marginBottom: 12, fontWeight: 700 }}>Farzandlar</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {students.map(student => (
                <div
                  key={student.student_id}
                  onClick={() => selectStudent(student.student_id)}
                  style={{
                    padding: '12px',
                    borderRadius: 6,
                    background: selectedStudent === student.student_id ? 'var(--blue)' : 'var(--bg2)',
                    color: selectedStudent === student.student_id ? 'white' : 'inherit',
                    cursor: 'pointer',
                    fontWeight: selectedStudent === student.student_id ? 600 : 400,
                  }}
                >
                  <div>{student.name}</div>
                  {student.verified && <div style={{ fontSize: 10, opacity: 0.7 }}>✓ Tasdiqlandi</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Student Stats */}
          {stats && (
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 20, fontWeight: 700 }}>
                {stats.student?.name} - Statistika
              </h2>

              {/* Stats Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12,
                marginBottom: 24,
              }}>
                {/* Attendance */}
                <div style={{
                  background: 'linear-gradient(135deg, #FF6B6B, #FF8E72)',
                  color: 'white',
                  padding: 16,
                  borderRadius: 8,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    {stats.attendance?.length > 0 ? stats.attendance[0].rate : 0}%
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Davomat</div>
                </div>

                {/* Avg Grade */}
                <div style={{
                  background: 'linear-gradient(135deg, #4ECDC4, #44A08D)',
                  color: 'white',
                  padding: 16,
                  borderRadius: 8,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    {stats.daily_grades?.avg || 0}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Baholandirish</div>
                </div>

                {/* Test Avg */}
                <div style={{
                  background: 'linear-gradient(135deg, #667EEA, #764BA2)',
                  color: 'white',
                  padding: 16,
                  borderRadius: 8,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    {stats.tests?.avg_score || 0}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Test Ballli</div>
                </div>

                {/* Lesson Progress */}
                <div style={{
                  background: 'linear-gradient(135deg, #FFD93D, #FFB84D)',
                  color: 'white',
                  padding: 16,
                  borderRadius: 8,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    {stats.lessons?.completion_rate || 0}%
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Dars Bajarildi</div>
                </div>
              </div>

              {/* Attendance Details */}
              <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Davomat (Guruh bo'yicha)</h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  {(stats.attendance || []).map((att, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <div>{att.group}</div>
                      <div style={{ fontWeight: 600 }}>{att.rate}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Details */}
              <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Testlar</h3>
                <div style={{
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div>Jami testlar:</div>
                    <div style={{ fontWeight: 600 }}>{stats.tests?.test_count || 0}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>Avg Ball:</div>
                    <div style={{ fontWeight: 600 }}>{stats.tests?.avg_score || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ParentDashboard;
