import React from 'react';

export function Spinner({ size = 'md', color }) {
  const cls = size === 'sm' ? 'spinner spinner-sm' : size === 'lg' ? 'spinner spinner-lg' : 'spinner';
  return (
    <span
      className={cls}
      style={color ? { borderTopColor: color } : undefined}
    />
  );
}

export function PageLoader({ text }) {
  return (
    <div className="page-loading">
      <div style={{ position: 'relative', width: 52, height: 52 }}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="26" cy="26" r="22" stroke="var(--line-2)" strokeWidth="3.5" />
          <circle
            cx="26" cy="26" r="22"
            stroke="var(--navy-text)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="138"
            strokeDashoffset="100"
            style={{
              transformOrigin: '26px 26px',
              animation: 'spin 1s linear infinite',
            }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          ⚖️
        </div>
      </div>
      {text && <div className="page-loading-text">{text}</div>}
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count},1fr)`, gap: 12 }} className="stagger">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 40}ms` }}>
          <span className="skeleton skeleton-num" style={{ width: '50%' }} />
          <span className="skeleton skeleton-text" style={{ width: '70%' }} />
          <span className="skeleton skeleton-text" style={{ width: '45%', opacity: 0.5 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ rows = 3, hasHeader = true }) {
  return (
    <div className="card">
      {hasHeader && (
        <div className="card-hd">
          <span className="skeleton skeleton-text" style={{ width: 140 }} />
        </div>
      )}
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="skeleton" style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span className="skeleton skeleton-text" style={{ width: '65%' }} />
              <span className="skeleton skeleton-text" style={{ width: '40%', opacity: 0.6 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card">
      <div className="card-hd">
        <span className="skeleton skeleton-text" style={{ width: 160 }} />
      </div>
      <table className="tbl">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><span className="skeleton" style={{ height: 10, width: 60, display: 'block', borderRadius: 4 }} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, ri) => (
            <tr key={ri}>
              {Array.from({ length: cols }).map((_, ci) => (
                <td key={ci}>
                  <span className="skeleton skeleton-text" style={{ width: ci === 0 ? '80%' : ci === cols - 1 ? '50%' : '65%' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonGrid({ count = 6, minWidth = 280 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px,1fr))`, gap: 14 }} className="stagger">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ overflow: 'hidden', animationDelay: `${i * 50}ms` }}>
          <span className="skeleton" style={{ display: 'block', height: 110 }} />
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="skeleton skeleton-title" />
            <span className="skeleton skeleton-text" style={{ width: '80%' }} />
            <span className="skeleton skeleton-text" style={{ width: '55%' }} />
            <span className="skeleton" style={{ height: 32, borderRadius: 8, marginTop: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
