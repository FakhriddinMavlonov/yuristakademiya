import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gamification as gamificationApi } from '../../api';
import { PageLoader } from '../../components/ui/Loading';
import useStore from '../../store/useStore';

const ALL_BADGES = [
  { key: 'first_lesson', name: 'Birinchi Dars', emoji: '📚' },
  { key: 'streak_3', name: '3 Kun Ketma-ket', emoji: '🔥' },
  { key: 'streak_7', name: '1 Hafta Ketma-ket', emoji: '🌟' },
  { key: 'streak_30', name: '1 Oy Ketma-ket', emoji: '🏆' },
  { key: 'perfect_test', name: '100% Test', emoji: '🎯' },
  { key: 'first_homework', name: 'Birinchi Uy Ishi', emoji: '✍️' },
  { key: 'top3_leaderboard', name: 'Top 3', emoji: '🥇' },
  { key: 'first_course_complete', name: 'Birinchi Kurs', emoji: '🎓' },
  { key: 'xp_100', name: '100 XP', emoji: '⭐' },
  { key: 'xp_500', name: '500 XP', emoji: '💫' },
  { key: 'xp_1000', name: '1000 XP', emoji: '👑' },
];

function Gamification() {
  const { t } = useTranslation();
  const showToast = useStore(s => s.showToast);

  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, leaderboardData] = await Promise.all([
        gamificationApi.getStats(),
        gamificationApi.getLeaderboard(),
      ]);
      setStats(statsData);
      setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
    } catch (err) {
      showToast(err.error || "Ma'lumotlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!stats) return <div style={{ textAlign: 'center', padding: '40px' }}>Ma'lumot topilmadi</div>;

  const earnedBadgeKeys = (stats.badges || []).map(b => b.key);
  const nextLevelXp = stats.current_level * 100;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px' }} className="page">
      <h1 style={{ marginBottom: 30 }}>🏆 Yutuqlar</h1>

      {/* Top Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 40,
      }}>
        {/* Streak */}
        <div style={{
          background: 'linear-gradient(135deg, #FF6B6B, #FF8E72)',
          color: 'white',
          padding: 20,
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔥</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            {stats.daily_streak}
          </div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>kun ketma-ket</div>
          {stats.longest_streak > stats.daily_streak && (
            <div style={{ fontSize: 11, marginTop: 8, opacity: 0.8 }}>
              Eng ko'p: {stats.longest_streak} kun
            </div>
          )}
        </div>

        {/* Level */}
        <div style={{
          background: 'linear-gradient(135deg, #4ECDC4, #44A08D)',
          color: 'white',
          padding: 20,
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            LVL {stats.current_level}
          </div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Daraja</div>
        </div>

        {/* Total XP */}
        <div style={{
          background: 'linear-gradient(135deg, #667EEA, #764BA2)',
          color: 'white',
          padding: 20,
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            {stats.total_xp}
          </div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>XP pointi</div>
        </div>
      </div>

      {/* XP Progress */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12, color: 'var(--navy)' }}>
          Keyingi daraja: {stats.current_level + 1}
        </h2>
        <div style={{
          background: 'var(--bg2)',
          height: 12,
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 8,
        }}>
          <div style={{
            background: 'linear-gradient(90deg, var(--blue), var(--green))',
            height: '100%',
            width: `${(stats.xp_in_level / 100) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {stats.xp_in_level} / 100 XP
        </div>
      </div>

      {/* Badges */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, marginBottom: 16, color: 'var(--navy)' }}>
          Badges ({earnedBadgeKeys.length} / {ALL_BADGES.length})
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 12,
        }}>
          {ALL_BADGES.map(badge => {
            const isEarned = earnedBadgeKeys.includes(badge.key);
            return (
              <div
                key={badge.key}
                title={badge.name}
                style={{
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  background: isEarned ? 'linear-gradient(135deg, #FFD93D, #FFB84D)' : 'var(--bg2)',
                  padding: 12,
                  textAlign: 'center',
                  opacity: isEarned ? 1 : 0.4,
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 4 }}>{badge.emoji}</div>
                <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>
                  {badge.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h2 style={{ fontSize: 16, marginBottom: 16, color: 'var(--navy)' }}>
          Top 20 O'quvchilar
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14,
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 0', textAlign: 'left', fontWeight: 600, color: 'var(--navy)' }}>Rank</th>
                <th style={{ padding: '12px 0', textAlign: 'left', fontWeight: 600, color: 'var(--navy)' }}>Ismi</th>
                <th style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600, color: 'var(--navy)' }}>XP</th>
                <th style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600, color: 'var(--navy)' }}>Streak</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map(row => (
                <tr key={row.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 0' }}>
                    {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
                  </td>
                  <td style={{ padding: '12px 0', fontWeight: 500 }}>{row.name}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>{row.total_xp}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>
                    {row.daily_streak > 0 && `🔥 ${row.daily_streak}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Gamification;
