import React, { useEffect, useState } from 'react';
import { parent as parentApi } from '../../api';
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

  // Report subscription state
  const [subscription, setSubscription] = useState(null);
  const [showReportSettings, setShowReportSettings] = useState(false);
  const [reportFreq, setReportFreq] = useState('weekly');
  const [savingReport, setSavingReport] = useState(false);

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
      const studentList = Array.isArray(data) ? data : [];
      setStudents(studentList);
      if (studentList.length > 0) {
        setSelectedStudent(studentList[0].student_id);
        await loadStats(studentList[0].student_id, phoneNumber);
        await loadSubscription(studentList[0].student_id, phoneNumber);
        localStorage.setItem('parent_phone', phoneNumber);
      } else {
        showToast("Ushbu telefon raqamiga bog'langan o'quvchi topilmadi");
      }
    } catch (err) {
      showToast(err.error || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (studentId, phoneNumber) => {
    try {
      setLoading(true);
      const data = await parentApi.getStats(studentId, phoneNumber);
      setStats(data);
    } catch (err) {
      showToast(err.error || "Statistikani yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = async (studentId) => {
    setSelectedStudent(studentId);
    await loadStats(studentId, phone);
    await loadSubscription(studentId, phone);
  };

  const loadSubscription = async (studentId, phoneNumber) => {
    try {
      const data = await parentApi.getSubscription(phoneNumber, studentId);
      setSubscription(data?.is_active ? data : null);
      if (data?.frequency) setReportFreq(data.frequency);
    } catch {
      // Ignore — subscription may not exist
    }
  };

  const handleSubscribeReport = async () => {
    try {
      setSavingReport(true);
      const result = await parentApi.subscribeByPhone({
        phone,
        studentId: selectedStudent,
        frequency: reportFreq,
      });
      setSubscription(result);
      showToast('✅ Hisobot yoqilgan! Telegram orqali olishni boshlaysiz.');
    } catch (err) {
      showToast(err.error || 'Xatolik yuz berdi');
    } finally {
      setSavingReport(false);
    }
  };

  const handleUnsubscribeReport = async () => {
    try {
      setSavingReport(true);
      await parentApi.subscribeByPhone({
        phone,
        studentId: selectedStudent,
        isActive: false,
      });
      setSubscription(null);
      showToast('Hisobot o\'chirildi');
    } catch (err) {
      showToast(err.error || 'Xatolik yuz berdi');
    } finally {
      setSavingReport(false);
    }
  };

  const handlePhoneSubmit = () => {
    if (!phone.trim()) {
      showToast("Telefon raqamingizni kiriting");
      return;
    }
    loadStudents(phone);
    setShowPhonePrompt(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('parent_phone');
    setStudents([]);
    setSelectedStudent(null);
    setStats(null);
    setPhone('');
    setShowPhonePrompt(true);
  };

  if (showPhonePrompt) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 10% 20%, rgb(12, 26, 82) 0%, rgb(30, 45, 138) 90.2%)',
        color: 'white',
        padding: 24,
        fontFamily: "'Inter', 'Outfit', sans-serif"
      }}>
        <div style={{
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          borderRadius: 20,
          padding: '40px 30px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: 50, marginBottom: 16, animation: 'bounce 2s infinite' }}>⚖️</div>
          <h1 style={{ marginBottom: 12, fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px' }}>Yurist Akademiya</h1>
          <h2 style={{ marginBottom: 20, fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>👨‍👩‍👧 Ota-ona Portali</h2>
          <p style={{ marginBottom: 30, fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
            Farzandingizning o'qish jarayoni, davomati, topshiriqlari va test ballarini real vaqt rejimida kuzatib boring.
          </p>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <input
              type="tel"
              placeholder="+998 XX XXX XX XX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handlePhoneSubmit()}
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.2)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: 16,
                boxSizing: 'border-box',
                textAlign: 'center',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#FFD700'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
            />
          </div>
          <button
            onClick={handlePhoneSubmit}
            style={{
              width: '100%',
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              color: '#0C1A52',
              border: 'none',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: '0 8px 16px rgba(255,215,0,0.2)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 20px rgba(255,215,0,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(255,215,0,0.2)'; }}
          >
            Tizimga Kirish
          </button>
        </div>
      </div>
    );
  }

  if (loading && !stats) return <PageLoader />;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f7fb',
      fontFamily: "'Inter', 'Outfit', sans-serif",
      color: '#1e293b'
    }}>
      {/* Premium Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0C1A52 0%, #1E2D8A 100%)',
        color: 'white',
        padding: '16px 24px',
        boxShadow: '0 4px 20px rgba(12,26,82,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>⚖️</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>Yurist Akademiya</div>
              <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500 }}>👨‍👩‍👧 Ota-ona Portali</div>
            </div>
          </div>

          {/* Child Switcher & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {students.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, opacity: 0.9 }}>Farzand:</span>
                <select
                  value={selectedStudent || ''}
                  onChange={(e) => handleStudentSelect(parseInt(e.target.value))}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {students.map(s => (
                    <option key={s.student_id} value={s.student_id} style={{ color: '#1e293b' }}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              🚪 Chiqish
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1200, margin: '30px auto', padding: '0 20px' }}>
        {/* Welcome Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
          border: '1px solid #e2e8f0',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20
        }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0C1A52', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              👋 Assalomu alaykum!
            </h1>
            <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: 14 }}>
              Farzandingiz <strong>{stats?.student?.name}</strong>ning o'qish jarayoni va o'zlashtirish ko'rsatkichlari.
            </p>
          </div>

          {students.length === 1 && (
            <div style={{
              background: '#f1f5f9',
              padding: '10px 16px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: '#334155',
              border: '1px solid #e2e8f0'
            }}>
              Talaba: {students[0].name}
            </div>
          )}
        </div>

        {stats ? (
          <div>
            {/* Stats Dashboard Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
              marginBottom: 30
            }}>
              {/* Davomat (Attendance) */}
              <div style={{
                background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E72 100%)',
                color: 'white',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 10px 20px rgba(255,107,107,0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: 120
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>📅 Davomat</span>
                  <span style={{ fontSize: 22 }}>📊</span>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.attendance?.rate || 0}%</div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                    Ishtirok: {stats.attendance?.present || 0} ta / Jami: {stats.attendance?.total || 0} ta
                  </div>
                </div>
              </div>

              {/* Baholar (Grades) */}
              <div style={{
                background: 'linear-gradient(135deg, #4ECDC4 0%, #20b2aa 100%)',
                color: 'white',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 10px 20px rgba(78,205,196,0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: 120
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>📝 Kunlik Baholar</span>
                  <span style={{ fontSize: 22 }}>⭐️</span>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.grades?.avg_grade || 0}</div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                    Jami baholar soni: {stats.grades?.count || 0} ta
                  </div>
                </div>
              </div>

              {/* Testlar (Tests) */}
              <div style={{
                background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                color: 'white',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 10px 20px rgba(102,126,234,0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: 120
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>🎯 Test Natijalari</span>
                  <span style={{ fontSize: 22 }}>🏆</span>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.tests?.avg_score || 0}%</div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                    Topshirilgan testlar: {stats.tests?.count || 0} ta
                  </div>
                </div>
              </div>

              {/* Progress (Lessons) */}
              <div style={{
                background: 'linear-gradient(135deg, #F39C12 0%, #F1C40F 100%)',
                color: 'white',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 10px 20px rgba(243,156,18,0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: 120
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>📖 Darslar Bajarilishi</span>
                  <span style={{ fontSize: 22 }}>🎓</span>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.lessons?.completion_rate || 0}%</div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                    O'zlashtirilgan: {stats.lessons?.completed || 0} ta / Jami: {stats.lessons?.total || 0} ta
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Content */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 24
            }}>
              {/* Submissions & Performance Info */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#0C1A52', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✍️ Uy Vazifalari faolligi
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #edf2f7' }}>
                  <div style={{ fontSize: 32 }}>📁</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                      Topshirilgan vazifalar soni: {stats.assignments?.submitted || 0} ta
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      So'nggi 30 kun ichida talaba tomonidan topshirilgan yozma amaliy vazifalar.
                    </div>
                  </div>
                </div>
              </div>

              {/* 📊 Telegram Report Settings */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0C1A52', display: 'flex', alignItems: 'center', gap: 8 }}>
                    📊 Telegram Hisobot
                  </h3>
                  <button
                    onClick={() => setShowReportSettings(!showReportSettings)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#3b82f6',
                      fontWeight: 600,
                    }}
                  >
                    {showReportSettings ? 'Yopish' : 'Sozlash'}
                  </button>
                </div>

                {subscription?.is_active ? (
                  <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 12, border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>✅</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#166534' }}>Hisobot faol</div>
                        <div style={{ fontSize: 12, color: '#15803d' }}>
                          {subscription.frequency === 'daily' ? 'Har kuni 18:00' :
                           subscription.frequency === 'weekly' ? 'Har yakshanba 20:00' :
                           'Har oyning 1-kuni'} Telegram orqali yuboriladi
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleUnsubscribeReport}
                      disabled={savingReport}
                      style={{
                        marginTop: 8,
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        padding: '8px 16px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {savingReport ? '⏳' : '🔕 Hisobotni o\'chirish'}
                    </button>
                  </div>
                ) : (
                  <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
                    <p style={{ margin: '0 0 12px 0' }}>
                      ✨ Farzandingizning o'qish jarayoni haqida <strong>avtomatik hisobot</strong> olish uchun Telegram orqali obuna bo'ling.
                      Hisobotlar chiroyli formatda, emoji va baholar bilan Telegram'ingizga yuboriladi.
                    </p>
                    <p style={{ margin: '0 0 12px 0', background: '#fef9c3', padding: 10, borderRadius: 8, border: '1px solid #fde68a', color: '#854d0e' }}>
                      💡 Hisobotni olish uchun Telegram botga ro'yxatdan o'tgan bo'lishingiz kerak!
                    </p>
                  </div>
                )}

                {showReportSettings && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                        Hisobot chastotasi:
                      </label>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setReportFreq('daily')}
                          style={{
                            padding: '10px 18px',
                            borderRadius: 10,
                            border: reportFreq === 'daily' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                            background: reportFreq === 'daily' ? '#eff6ff' : 'white',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 13,
                            color: reportFreq === 'daily' ? '#1d4ed8' : '#374151',
                            flex: 1,
                            textAlign: 'center',
                          }}
                        >
                          📅 Har kuni (18:00)
                        </button>
                        <button
                          onClick={() => setReportFreq('weekly')}
                          style={{
                            padding: '10px 18px',
                            borderRadius: 10,
                            border: reportFreq === 'weekly' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                            background: reportFreq === 'weekly' ? '#eff6ff' : 'white',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 13,
                            color: reportFreq === 'weekly' ? '#1d4ed8' : '#374151',
                            flex: 1,
                            textAlign: 'center',
                          }}
                        >
                          📆 Har hafta (Yakshanba)
                        </button>
                        <button
                          onClick={() => setReportFreq('monthly')}
                          style={{
                            padding: '10px 18px',
                            borderRadius: 10,
                            border: reportFreq === 'monthly' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                            background: reportFreq === 'monthly' ? '#eff6ff' : 'white',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 13,
                            color: reportFreq === 'monthly' ? '#1d4ed8' : '#374151',
                            flex: 1,
                            textAlign: 'center',
                          }}
                        >
                          📊 Har oy
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSubscribeReport}
                      disabled={savingReport}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #0C1A52 0%, #1E2D8A 100%)',
                        color: 'white',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        opacity: savingReport ? 0.7 : 1,
                      }}
                    >
                      {savingReport ? '⏳ Saqlanmoqda...' : '✅ Hisobotni yoqish'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <span style={{ fontSize: 40 }}>📭</span>
            <p style={{ marginTop: 12 }}>Talabaga tegishli tahliliy statistika topilmadi.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default ParentDashboard;
