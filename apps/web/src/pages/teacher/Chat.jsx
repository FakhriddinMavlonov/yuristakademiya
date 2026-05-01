import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { chat as chatApi } from '../../api';
import useStore from '../../store/useStore';

export default function TeacherChat() {
  const [contacts, setContacts] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [mobileView, setMobileView] = useState('list');
  const msgRef = useRef(null);
  const { socket, showToast } = useStore();
  const { t } = useTranslation();

  useEffect(() => { chatApi.contacts().then(setContacts).catch(() => {}); }, []);

  useEffect(() => {
    if (!active) return;
    chatApi.messages(active.id).then(setMessages).catch(() => {});
  }, [active]);

  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      if (active && (msg.sender_id === active.id || msg.receiver_id === active.id)) {
        setMessages((p) => [...p, msg]);
      }
      setContacts((prev) => prev.map(c => c.id === msg.sender_id ? { ...c, last_message: msg.content, unread_count: (c.unread_count || 0) + 1 } : c));
    };
    socket.on('chat:message', handler);
    return () => socket.off('chat:message', handler);
  }, [socket, active]);

  const send = async () => {
    if (!text.trim() || !active) return;
    try {
      const msg = await chatApi.send(active.id, text.trim());
      setMessages((p) => [...p, msg]);
      setText('');
    } catch { showToast('Xabar yuborilmadi'); }
  };

  const selectContact = (c) => {
    setActive(c);
    setMobileView('chat');
    setContacts((p) => p.map(x => x.id === c.id ? { ...x, unread_count: 0 } : x));
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', borderTop: '.5px solid var(--line)' }}>
      <div className="chat-shell card" style={{ height: 'calc(100dvh - 54px)', borderRadius: 0, border: 'none' }}>
        <div className={`chat-list${mobileView === 'chat' ? ' panel-hidden' : ''}`}>
          <div style={{ padding: '10px 12px', borderBottom: '.5px solid var(--line)' }}>
            <input className="finput" placeholder="Qidirish..." style={{ fontSize: 12, padding: '6px 10px' }} />
          </div>
          {contacts.map((c) => (
            <div key={c.id} className={`chat-item${active?.id === c.id ? ' active' : ''}`} onClick={() => selectContact(c)}>
              <div className="ci-av" style={{ background: '#E8EDFB', color: '#1B2A6B' }}>
                {c.first_name?.[0]}{c.last_name?.[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="ci-name">{c.first_name} {c.last_name}</div>
                </div>
                <div className="ci-last">{c.last_message || '...'}</div>
              </div>
              {c.unread_count > 0 && <div className="ci-unread">{c.unread_count}</div>}
            </div>
          ))}
        </div>

        <div className={`chat-main${mobileView === 'list' ? ' panel-hidden' : ''}`}>
          {active ? (
            <>
              <div className="chat-topbar">
                <button className="chat-back-btn" onClick={() => setMobileView('list')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  Orqaga
                </button>
                <div className="ci-av" style={{ background: '#E8EDFB', color: '#1B2A6B', width: 34, height: 34, borderRadius: 9 }}>
                  {active.first_name?.[0]}{active.last_name?.[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Sora' }}>{active.first_name} {active.last_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('teacher.chat.studentRole')}</div>
                </div>
              </div>
              <div className="chat-msgs" ref={msgRef}>
                {messages.map((m) => {
                  const mine = m.sender_id !== active.id;
                  return (
                    <div key={m.id} className={`msg ${mine ? 'mine' : 'theirs'}`}>
                      <div className="msg-bubble">{m.content}</div>
                      <div className="msg-time">{new Date(m.created_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  );
                })}
              </div>
              <div className="chat-input-bar">
                <textarea
                  className="chat-input"
                  rows={1}
                  placeholder={t('teacher.chat.messagePlaceholder')}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <button className="btn btn-navy" onClick={send}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12.5 7L2 12.5l2-5.5M2 12.5L7 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--hint)', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 40 }}>💬</span>
              <span style={{ fontSize: 13 }}>{t('teacher.chat.selectContact')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
