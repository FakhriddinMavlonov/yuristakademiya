import React from 'react';

export default function Modal({ open, onClose, title, icon, children, footer }) {
  return (
    <div className={`modal-bg${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-ft">{footer}</div>}
      </div>
    </div>
  );
}
