import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { courses as coursesApi } from '../../api';
import useStore from '../../store/useStore';
import { SkeletonGrid } from '../../components/ui/Loading';

const GRADIENTS = [
  'linear-gradient(135deg,#0C1A52,#1E2D8A)',
  'linear-gradient(135deg,#1B4332,#2D6A4F)',
  'linear-gradient(135deg,#7B2D00,#C0392B)',
  'linear-gradient(135deg,#4A235A,#7D3C98)',
  'linear-gradient(135deg,#1A3A5C,#2980B9)',
  'linear-gradient(135deg,#78350F,#D97706)',
  'linear-gradient(135deg,#1C1C2E,#4A4A8A)',
  'linear-gradient(135deg,#0D3B2E,#1A7A5E)',
];

const LEVEL_COLORS = { beginner: 'pill-green', intermediate: 'pill-blue', advanced: 'pill-amber' };

export default function TeacherCourses() {
  const [list, setList] = useState([]);
  const [tab, setTab] = useState('list');
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', level: 'beginner', status: 'draft', banner_gradient: GRADIENTS[0] });
  const { showToast } = useStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const defaultCategory = t('teacher.courses.categories.civil');

  const [loading, setLoading] = useState(true);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState('');

  useEffect(() => {
    coursesApi.list().then(d => { setList(d); setLoading(false); }).catch(() => setLoading(false));
    setForm(f => ({ ...f, category: defaultCategory }));
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ title: '', description: '', category: defaultCategory, level: 'beginner', status: 'draft', banner_gradient: GRADIENTS[0] });
    setTab('create');
  };

  const openEdit = (e, c) => {
    e.stopPropagation();
    setEditTarget(c);
    setForm({ title: c.title, description: c.description || '', category: c.category || defaultCategory, level: c.level || 'beginner', status: c.status, banner_gradient: c.banner_gradient || GRADIENTS[0] });
    setTab('create');
  };

  const deleteCourse = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm(t('teacher.courses.deleteConfirm'))) return;
    try {
      await coursesApi.remove(id);
      setList((p) => p.filter((c) => c.id !== id));
      showToast(t('teacher.courses.deleted'));
    } catch { showToast(t('teacher.courses.deleteError')); }
  };

  const submit = async (status) => {
    if (!form.title.trim()) return showToast(t('teacher.courses.enterName'));
    try {
      if (editTarget) {
        const updated = await coursesApi.update(editTarget.id, { ...form, status });
        setList((p) => p.map((c) => c.id === editTarget.id ? { ...c, ...updated } : c));
        showToast(t('teacher.courses.updated'));
      } else {
        const c = await coursesApi.create({ ...form, status });
        setList((p) => [c, ...p]);
        showToast(status === 'published' ? t('teacher.courses.publishedMsg') : t('teacher.courses.draftSaved'));
      }
      setTab('list');
      setEditTarget(null);
    } catch { showToast(t('common.error')); }
  };

  const [extraCategories, setExtraCategories] = useState([]);
  const categories = [
    t('teacher.courses.categories.civil'),
    t('teacher.courses.categories.criminal'),
    t('teacher.courses.categories.labor'),
    t('teacher.courses.categories.tax'),
    t('teacher.courses.categories.admin'),
    t('teacher.courses.categories.international'),
    t('teacher.courses.categories.business'),
    ...extraCategories,
  ];

  const confirmNewCategory = () => {
    const trimmed = newCategoryText.trim();
    if (!trimmed) return;
    if (!extraCategories.includes(trimmed)) {
      setExtraCategories((prev) => [...prev, trimmed]);
    }
    setForm((f) => ({ ...f, category: trimmed }));
    setNewCategoryText('');
    setAddingCategory(false);
  };

  if (loading) return (
    <div className="page"><SkeletonGrid count={6} minWidth={280} /></div>
  );

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div className="tabs">
          <button className={`tab${tab === 'list' ? ' active' : ''}`} onClick={() => setTab('list')}>
            {t('teacher.courses.listTab')}
          </button>
          <button className={`tab${tab === 'create' ? ' active' : ''}`} onClick={openCreate}>
            {t('teacher.courses.createTab')}
          </button>
        </div>
      </div>

      {tab === 'list' && (
        <>
          {list.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--hint)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 14, marginBottom: 16 }}>{t('teacher.courses.noCoursesYet')}</div>
              <button className="btn btn-navy" onClick={openCreate}>{t('teacher.courses.createFirst')}</button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {list.map((c) => {
              const score = parseFloat(c.avg_score) || 0;
              const scoreColor = score >= 90 ? 'var(--green)' : score >= 75 ? 'var(--amber)' : 'var(--blue)';
              return (
                <div className="course-card" key={c.id} onClick={() => navigate(`/teacher/courses/${c.id}/lessons`)}>
                  <div className="cc-banner" style={{ background: c.banner_gradient || GRADIENTS[0] }}>
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      <span className={`pill ${c.status === 'published' ? 'pill-blue' : 'pill-amber'}`}>
                        {c.status === 'published' ? t('status.published') : t('status.draft')}
                      </span>
                    </div>
                    <div style={{ color: '#fff', zIndex: 1, position: 'relative' }}>
                      <div style={{ fontSize: 10, opacity: .6, marginBottom: 3 }}>
                        {c.enrolled_count || 0} {t('common.students')} · {c.lesson_count || 0} {t('common.lessons')}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{c.title}</div>
                      <span className={`pill ${LEVEL_COLORS[c.level] || 'pill-blue'}`} style={{ marginTop: 6, display: 'inline-block', fontSize: 10 }}>
                        {t(`levels.${c.level}`) || c.level}
                      </span>
                    </div>
                  </div>
                  <div className="cc-body">
                    {c.description && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: 'var(--muted)' }}>{t('teacher.courses.avgResult')}</span>
                      <span style={{ fontWeight: 700, color: scoreColor }}>{score ? `${score}%` : '—'}</span>
                    </div>
                    <div className="pb-wrap"><div className="pb-fill" style={{ width: `${score}%`, background: scoreColor }} /></div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/teacher/courses/${c.id}/lessons`); }}>
                        {t('teacher.courses.lessonsBtn')}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={(e) => openEdit(e, c)}>
                        {t('teacher.courses.editBtn')}
                      </button>
                      <button className="btn btn-red btn-sm" onClick={(e) => deleteCourse(e, c.id)}>
                        {t('teacher.courses.deleteBtn')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'create' && (
        <div className="r-2col-rev">
          <div className="card">
            <div className="card-hd">
              <h3>{editTarget ? t('teacher.courses.editTitle') : t('teacher.courses.createTitle')}</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fgroup">
                <div className="flabel">{t('teacher.courses.nameLabel')}</div>
                <input
                  className="finput"
                  placeholder={t('teacher.courses.namePlaceholder')}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="fgroup">
                <div className="flabel">{t('teacher.courses.descLabel')}</div>
                <textarea
                  className="finput"
                  rows={4}
                  placeholder={t('teacher.courses.descPlaceholder')}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fgroup">
                  <div className="flabel">{t('teacher.courses.categoryLabel')}</div>
                  {addingCategory ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        autoFocus
                        className="finput"
                        placeholder={t('teacher.courses.addCategoryPlaceholder')}
                        value={newCategoryText}
                        onChange={(e) => setNewCategoryText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') confirmNewCategory(); if (e.key === 'Escape') setAddingCategory(false); }}
                      />
                      <button className="btn btn-navy btn-sm" style={{ flexShrink: 0 }} onClick={confirmNewCategory}>
                        {t('teacher.courses.addCategoryConfirm')}
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => setAddingCategory(false)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="finput" style={{ flex: 1 }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                        {categories.map(cat => <option key={cat}>{cat}</option>)}
                      </select>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                        onClick={() => { setAddingCategory(true); setNewCategoryText(''); }}
                      >
                        {t('teacher.courses.addCategoryBtn')}
                      </button>
                    </div>
                  )}
                </div>
                <div className="fgroup">
                  <div className="flabel">{t('teacher.courses.levelLabel')}</div>
                  <select className="finput" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    <option value="beginner">{t('levels.beginner')}</option>
                    <option value="intermediate">{t('levels.intermediate')}</option>
                    <option value="advanced">{t('levels.advanced')}</option>
                  </select>
                </div>
              </div>

              <div className="fgroup">
                <div className="flabel">{t('teacher.courses.bannerLabel')}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {GRADIENTS.map((g) => (
                    <div
                      key={g}
                      onClick={() => setForm({ ...form, banner_gradient: g })}
                      style={{
                        width: 44, height: 44, borderRadius: 10, background: g, cursor: 'pointer',
                        border: form.banner_gradient === g ? '2.5px solid var(--navy)' : '2.5px solid transparent',
                        boxShadow: form.banner_gradient === g ? '0 0 0 2px var(--gold)' : 'none',
                        transition: 'all .15s',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button className="btn btn-ghost" onClick={() => { setTab('list'); setEditTarget(null); }}>{t('teacher.courses.cancelBtn')}</button>
                <button className="btn btn-navy" onClick={() => submit('draft')}>{t('teacher.courses.saveDraft')}</button>
                <button className="btn btn-gold" onClick={() => submit('published')}>{t('teacher.courses.publishBtn')}</button>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--hint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>{t('teacher.courses.preview')}</div>
            <div className="course-card" style={{ cursor: 'default' }}>
              <div className="cc-banner" style={{ background: form.banner_gradient }}>
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <span className="pill pill-amber">{t('status.draft')}</span>
                </div>
                <div style={{ color: '#fff', zIndex: 1, position: 'relative' }}>
                  <div style={{ fontSize: 10, opacity: .6, marginBottom: 3 }}>{t('teacher.courses.previewStudents')}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{form.title || t('teacher.courses.previewTitle')}</div>
                  <span className={`pill ${LEVEL_COLORS[form.level]}`} style={{ marginTop: 6, display: 'inline-block', fontSize: 10 }}>
                    {t(`levels.${form.level}`)}
                  </span>
                </div>
              </div>
              <div className="cc-body">
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, minHeight: 32 }}>
                  {form.description || t('teacher.courses.previewDescription')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
