import React, { useEffect, useState } from 'react';
import { admin as adminApi } from '../../api';

export default function AdminMessages() {
  const [conversations, setConversations] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
    }
  }, [selectedChatId]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const result = await adminApi.telegramConversations();
      setConversations(result);
      if (result.length > 0) {
        setSelectedChatId(result[0].telegram_chat_id);
      }
    } catch (e) {
      console.error('Error loading conversations:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const result = await adminApi.telegramMessages(chatId);
      setMessages(result);
    } catch (e) {
      console.error('Error loading messages:', e);
    }
  };

  const selectedConversation = conversations.find(c => c.telegram_chat_id === selectedChatId);

  return (
    <div className="page">
      <h2 style={{ marginBottom: 20, fontSize: 20, fontWeight: 700 }}>💬 Telegram Muloqotlari</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, height: 'calc(100vh - 180px)' }}>
        {/* Conversations list */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="card-hd" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 0 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>👥 Muloqotlar ({conversations.length})</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                {loading ? 'Yuklanyapti...' : 'Muloqot yo\'q'}
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.telegram_chat_id}
                  onClick={() => setSelectedChatId(conv.telegram_chat_id)}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--line)',
                    cursor: 'pointer',
                    background: selectedChatId === conv.telegram_chat_id ? 'var(--bg)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedChatId !== conv.telegram_chat_id) {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChatId !== conv.telegram_chat_id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 50, background: '#E8EDFB',
                      color: '#1B2A6B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                      {conv.first_name?.[0]}{conv.last_name?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                        {conv.first_name} {conv.last_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {conv.role === 'student' ? 'O\'quvchi' : 'Ustoz'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    💬 {conv.message_count} xabar
                  </div>
                  {conv.last_message_at && (
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                      {new Date(conv.last_message_at).toLocaleString('uz')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Header */}
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 50, background: '#E8EDFB',
                  color: '#1B2A6B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>
                  {selectedConversation.first_name?.[0]}{selectedConversation.last_name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                    {selectedConversation.first_name} {selectedConversation.last_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {selectedConversation.role === 'student' ? 'O\'quvchi' : 'Ustoz'} • {selectedConversation.phone}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '16px', display: 'flex',
                flexDirection: 'column', gap: 10,
              }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 20px' }}>
                    Xabar yo\'q
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: isUser ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '70%',
                            padding: '10px 14px',
                            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: isUser ? 'var(--navy)' : 'var(--bg)',
                            color: isUser ? '#fff' : 'var(--ink)',
                            fontSize: 13,
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                          }}
                        >
                          <div>{msg.message_text}</div>
                          <div style={{
                            fontSize: 10,
                            opacity: 0.7,
                            marginTop: 6,
                            textAlign: isUser ? 'right' : 'left',
                          }}>
                            {new Date(msg.created_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
              Muloqotni tanlang
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
