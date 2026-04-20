import React from 'react';

export default function LibraryViewer({ item, onClose }) {
  if (!item) return null;

  const ext = item.file_type?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  const isVideo = ['mp4', 'avi', 'mov', 'webm', 'mkv'].includes(ext);
  const isPdf = ext === 'pdf';
  const isDoc = ['doc', 'docx', 'xls', 'xlsx', 'pptx', 'ppt'].includes(ext);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: 20,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        width: '90vw',
        maxWidth: 1000,
        height: '90vh',
        maxHeight: 700,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--line)',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{item.name}</h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {item.file_type?.toUpperCase()} · {(item.file_size_bytes / 1024 / 1024).toFixed(1)}MB
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={item.file_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-ghost"
              style={{ textDecoration: 'none' }}
            >
              ⬇️ Yuklash
            </a>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                padding: 0,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          {isImage && (
            <img
              src={item.file_url}
              alt={item.name}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 8,
              }}
            />
          )}

          {isVideo && (
            <video
              src={item.file_url}
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: 8,
              }}
            />
          )}

          {isPdf && (
            <iframe
              src={`${item.file_url}#toolbar=1&navpanes=0`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 8,
              }}
              title="PDF Viewer"
            />
          )}

          {isDoc && (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.file_url)}`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 8,
              }}
              title="Document Viewer"
            />
          )}

          {!isImage && !isVideo && !isPdf && !isDoc && (
            <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 14, marginBottom: 16 }}>Bu fayl ko'rilmaydi</div>
              <a
                href={item.file_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-navy btn-sm"
                style={{ textDecoration: 'none' }}
              >
                ⬇️ Yuklab olish
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
