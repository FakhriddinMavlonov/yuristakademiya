import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { admin as adminApi } from '../../api';

function SkeletonConvList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span className="skeleton skeleton-text" style={{ width: '60%' }} />
            <span className="skeleton skeleton-text" style={{ width: '40%', opacity: 0.5 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminMessages() {
  const [conversations, setConversations] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
  const messagesEndRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedChatId) loadMessages(selectedChatId);
  }, [selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const result = await adminApi.telegramConversations();
      setConversations(result);
      if (result.length > 0) setSelectedChatId(result[0].telegram_chat_id);
    } catch (e) {
      console.error('Error loading conversations:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId) => {
    setLoadingMsgs(true);
    try {
      const result = await adminApi.telegramMessages(chatId);
      setMessages(result);
    } catch (e) {
      console.error('Error loading messages:', e);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const handleSelectConv = (chatId) => {
    setSelectedChatId(chatId);
    setMobileView('chat');
  };

  const selectedConversation = conversations.find(c => c.telegram_chat_id === selectedChatId);

  return (
    <div className="page msg-page">
      <div className="msg-layout">
        {/* ── Left: Conversations list ───────────────────────── */}
        <div
          className={`card${mobileView === 'chat' ? ' panel-hidden' : ''}`}
          style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
        >
          <div className="card-hd" style={{ borderBottom: '1px solid var(--line)', marginBottom: 0 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>
              👥 {t('admin.messages.conversations')} ({conversations.length})
            </h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <SkeletonConvList />
            ) : conversations.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>💬</div>
                {t('admin.messages.empty')}
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.telegram_chat_id}
                  onClick={() => handleSelectConv(conv.telegram_chat_id)}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--line)',
                    cursor: 'pointer',
                    background: selectedChatId === conv.telegram_chat_id ? 'var(--bg)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (selectedChatId !== conv.telegram_chat_id) e.currentTarget.style.background = 'var(--bg)'; }}
                  onMouseLeave={e => { if (selectedChatId !== conv.telegram_chat_id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--blue-bg)', color: 'var(--blue)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>
                      {conv.first_name?.[0]}{conv.last_name?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.first_name} {conv.last_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {conv.role === 'student' ? "O'quvchi" : 'Ustoz'} · 💬 {conv.message_count}
                      </div>
                    </div>
                  </div>
                  {conv.last_message_at && (
                    <div style={{ fontSize: 10, color: 'var(--hint)', paddingLeft: 46 }}>
                      {new Date(conv.last_message_at).toLocaleString('uz')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right: Chat area ───────────────────────────────── */}
        <div
          className={`card${mobileView === 'list' ? ' panel-hidden' : ''}`}
          style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
        >
          {selectedConversation ? (
            <>
              {/* Header (has back button on mobile) */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <button
                  className="panel-back-btn"
                  style={{ paddingBottom: 0, borderBottom: 'none', marginBottom: 0, width: 'auto', marginRight: 4 }}
                  onClick={() => setMobileView('list')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--blue-bg)', color: 'var(--blue)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, flexShrink: 0,
                }}>
                  {selectedConversation.first_name?.[0]}{selectedConversation.last_name?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                    {selectedConversation.first_name} {selectedConversation.last_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {selectedConversation.role === 'student' ? "O'quvchi" : 'Ustoz'} · {selectedConversation.phone}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loadingMsgs ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[70, 50, 80, 40, 65].map((w, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                        <span className="skeleton" style={{ height: 40, width: `${w}%`, borderRadius: 12 }} />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 20px', fontSize: 13 }}>
                    Xabar yo'q
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '75%',
                          padding: '10px 14px',
                          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isUser ? 'var(--navy)' : 'var(--bg)',
                          color: isUser ? '#fff' : 'var(--ink)',
                          fontSize: 13, lineHeight: 1.55, wordBreak: 'break-word',
                        }}>
                          <div>{msg.message_text}</div>
                          <div style={{ fontSize: 10, opacity: 0.65, marginTop: 5, textAlign: isUser ? 'right' : 'left' }}>
                            {new Date(msg.created_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 13, flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 36, opacity: 0.3 }}>💬</div>
              Muloqotni tanlang
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
