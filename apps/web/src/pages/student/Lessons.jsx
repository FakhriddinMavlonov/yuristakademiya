import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lessons as lessonsApi, assignments as assignmentsApi } from '../../api';
import useStore from '../../store/useStore';

export default function StudentLessons() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useStore();

  const [lessonList, setLessonList] = useState([]);
  const [active, setActive] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hwText, setHwText] = useState('');
  const [hwDone, setHwDone] = useState(false);
  const progressTimer = useRef(null);
  const watchedRef = useRef(0);

  useEffect(() => {
    lessonsApi.list(courseId).then((d) => {
      setLessonList(d);
      const first = d.find((l) => !l.locked) || d[0];
      if (first) selectLesson(first, d);
    }).catch(() => {});
  }, [courseId]);

  const selectLesson = (lesson, list) => {
    if (lesson.locked) return;
    setActive(lesson);
    setHwText('');
    setHwDone(!!lesson.submission_id);
    watchedRef.current = lesson.watched_seconds || 0;
    clearInterval(progressTimer.current);
  };

  const onVideoPlay = useCallback(() => {
    clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      watchedRef.current += 5;
      lessonsApi.progress(active.id, watchedRef.current).catch(() => {});
    }, 5000);
  }, [active]);

  const onVideoPause = useCallback(() => {
    clearInterval(progressTimer.current);
  }, []);

  useEffect(() => () => clearInterval(progressTimer.current), []);

  const submitHomework = async () => {
    if (!hwText.trim()) return showToast('Matn kiriting');
    if (!active?.assignment_id) return;
    setSubmitting(true);
    try {
      await assignmentsApi.submit(active.assignment_id, { contentText: hwText });
      setHwDone(true);
      showToast('Uy ishi topshirildi!');
    } catch { showToast('Xatolik yuz berdi'); }
    setSubmitting(false);
  };

  const [mobileView, setMobileView] = useState('list');

  const progress = active && active.lesson_count
    ? Math.round(((lessonList.filter(l => l.is_completed).length) / lessonList.length) * 100)
    : 0;

  return (
    <div className="page r-2col">
      {/* Lesson sidebar */}
      <div className={`card${mobileView === 'detail' ? ' panel-hidden' : ''}`} style={{ position: 'sticky', top: 14 }}>
        <div className="card-hd" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <h3 style={{ fontSize: 13 }}>Darslar</h3>
          <div className="pb-wrap">
            <div className="pb-fill" style={{ width: `${progress}%`, background: 'var(--green)' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {lessonList.filter(l => l.is_completed).length}/{lessonList.length} tugallandi
          </div>
        </div>
        <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {lessonList.map((lesson, i) => {
            const isActive = active?.id === lesson.id;
            return (
              <div
                key={lesson.id}
                className={`lesson-row${isActive ? ' active' : ''}${lesson.locked ? ' locked' : ''}`}
                onClick={() => { selectLesson(lesson, lessonList); if (!lesson.locked) setMobileView('detail'); }}
                style={{ cursor: lesson.locked ? 'not-allowed' : 'pointer' }}
              >
                <div className="lr-num" style={{
                  background: lesson.is_completed ? 'var(--green)' : lesson.locked ? 'var(--line)' : isActive ? 'var(--navy)' : 'var(--bg2)',
                  color: lesson.is_completed || isActive ? '#fff' : lesson.locked ? 'var(--hint)' : 'var(--ink)',
                }}>
                  {lesson.is_completed ? '✓' : lesson.locked ? '🔒' : i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: lesson.locked ? 'var(--hint)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lesson.title}
                  </div>
                  {lesson.locked && (
                    <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 1 }}>
                      Avvalgi dars testini o'ting (80%+) va uy ishini topshiring
                    </div>
                  )}
                  {!lesson.locked && lesson.duration_seconds > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                      {Math.ceil(lesson.duration_seconds / 60)} daq
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      {active ? (
        <div className={mobileView === 'list' ? 'panel-hidden' : ''} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Video */}
          <div className="card">
            <div className="card-hd">
              <button className="panel-back-btn" style={{ width: 'auto', borderBottom: 'none', paddingBottom: 0, marginBottom: 0, marginRight: 6 }} onClick={() => setMobileView('list')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <h3 style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active.title}</h3>
              {active.is_completed && <span className="pill pill-green">✓ Tugallandi</span>}
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {active.video_url ? (
                <div style={{ background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '0 0 var(--r-md) var(--r-md)', overflow: 'hidden', maxHeight: '85vh', aspectRatio: 'auto' }}>
                  <video
                    src={active.video_url}
                    style={{ maxWidth: '100%', maxHeight: '85vh', width: 'auto', height: 'auto', display: 'block' }}
                    controls
                    onPlay={onVideoPlay}
                    onPause={onVideoPause}
                    title={active.title}
                  />
                </div>
              ) : (
                <div className="video-mock" style={{ borderRadius: '0 0 var(--r-md) var(--r-md)' }}>
                  <div className="vm-play">▶</div>
                  <div style={{ position: 'absolute', bottom: 14, left: 14, color: 'rgba(255,255,255,.6)', fontSize: 12 }}>
                    Video hali yuklanmagan
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description & materials */}
          {(active.description || (active.materials && active.materials.length > 0)) && (
            <div className="card">
              <div className="card-hd"><h3>Dars haqida</h3></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {active.description && (
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink)', margin: 0 }}>{active.description}</p>
                )}
                {active.materials?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--muted)' }}>MATERIALLAR</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {active.materials.map((m, i) => (
                        <a
                          key={i}
                          href={m.file_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, textDecoration: 'none', color: 'var(--ink)', fontSize: 12, fontWeight: 600 }}
                        >
                          <span style={{ fontSize: 16 }}>📄</span>
                          <span style={{ flex: 1 }}>{m.name}</span>
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>↓ Yuklab olish</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test button */}
          {active.test_id && (
            <div className="card" style={{ background: active.best_score >= (active.pass_score_pct || 80) ? 'var(--green-bg)' : 'var(--bg)' }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, background: active.best_score >= (active.pass_score_pct || 80) ? 'var(--green)' : 'var(--amber)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {active.best_score >= (active.pass_score_pct || 80) ? '✅' : '🎯'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{active.test_title || 'Dars testi'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    O'tish balli: {active.pass_score_pct || 80}% · {active.time_limit_minutes ? `${active.time_limit_minutes} daq` : 'Vaqt cheklanmagan'}
                    {active.best_score !== null && active.best_score !== undefined && (
                      <span style={{ marginLeft: 6, color: active.best_score >= (active.pass_score_pct || 80) ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                        · Eng yaxshi ball: {active.best_score}%
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className={`btn ${active.best_score >= (active.pass_score_pct || 80) ? 'btn-ghost' : 'btn-gold'}`}
                  onClick={() => navigate(`/student/test/${active.test_id}`)}
                >
                  {active.best_score >= (active.pass_score_pct || 80) ? 'Qayta topshirish' : 'Testni boshlash →'}
                </button>
              </div>
            </div>
          )}

          {/* Homework */}
          {active.assignment_id && (
            <div className="card">
              <div className="card-hd">
                <h3>📝 Uy ishi</h3>
                {hwDone && <span className="pill pill-green">✓ Topshirildi</span>}
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{active.assignment_title}</div>
                {active.assignment_description && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{active.assignment_description}</div>
                )}
                {!hwDone ? (
                  <>
                    <textarea
                      className="finput"
                      rows={5}
                      placeholder="Javobingizni shu yerga yozing..."
                      value={hwText}
                      onChange={(e) => setHwText(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-navy" disabled={submitting} onClick={submitHomework}>
                        {submitting ? 'Yuborilmoqda...' : 'Topshirish →'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 12, background: 'var(--green-bg)', borderRadius: 8, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                    ✓ Uy ishi topshirildi. O'qituvchi tekshiradi.
                    {active.submission_score !== null && active.submission_score !== undefined && (
                      <div style={{ marginTop: 4, color: 'var(--ink)' }}>
                        Ball: <strong>{active.submission_score}/100</strong>
                        {active.submission_feedback && <div style={{ color: 'var(--muted)', fontWeight: 400, marginTop: 4 }}>{active.submission_feedback}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <div style={{ textAlign: 'center', color: 'var(--hint)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>▶️</div>
            <div style={{ fontSize: 13 }}>Darsni tanlang</div>
          </div>
        </div>
      )}
    </div>
  );
}
