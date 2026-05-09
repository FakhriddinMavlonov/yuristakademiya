import React, { useEffect, useState, useRef } from 'react';
import { ai as aiApi } from '../api';

function AiTutorWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const result = await aiApi.chat({ message: userMsg });
      setMessages(prev => [...prev, { role: 'assistant', content: result.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Xatolik yuz berdi. Qayta urinib ko\'ring.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 999,
      fontFamily: 'inherit',
    }}>
      {isOpen ? (
        <div style={{
          width: 360,
          height: 480,
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e0e0e0',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, var(--blue), var(--navy))',
            color: 'white',
            padding: '16px 20px',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 600,
            fontSize: 14,
          }}>
            <span>🤖 AI Yordamchi</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: '#f9f9f9',
            }}
          >
            {messages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#999',
                fontSize: 13,
                marginTop: 'auto',
                marginBottom: 'auto',
              }}>
                Savolingizni bering...
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: msg.role === 'user' ? 'var(--blue)' : 'white',
                      color: msg.role === 'user' ? 'white' : 'var(--navy)',
                      fontSize: 13,
                      lineHeight: 1.4,
                      wordWrap: 'break-word',
                      border: msg.role === 'assistant' ? '1px solid #e0e0e0' : 'none',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div style={{
                display: 'flex',
                gap: 4,
                alignItems: 'center',
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--blue)',
                  animation: 'pulse 1s infinite',
                }} />
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--blue)',
                  animation: 'pulse 1s 0.2s infinite',
                }} />
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--blue)',
                  animation: 'pulse 1s 0.4s infinite',
                }} />
                <style>{`
                  @keyframes pulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                  }
                `}</style>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: '12px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            gap: 8,
            background: 'white',
          }}>
            <input
              type="text"
              placeholder="Savol..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
              style={{
                flex: 1,
                border: '1px solid #e0e0e0',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: 'var(--blue)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '8px 12px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                opacity: loading || !input.trim() ? 0.6 : 1,
              }}
            >
              ►
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--blue), var(--navy))',
            color: 'white',
            border: 'none',
            fontSize: 28,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
          }}
        >
          🤖
        </button>
      )}
    </div>
  );
}

export default AiTutorWidget;
