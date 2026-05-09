import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { flashcards as flashcardsApi } from '../../api';
import { PageLoader, SkeletonCard } from '../../components/ui/Loading';
import useStore from '../../store/useStore';

function Flashcards() {
  const { t } = useTranslation();
  const showToast = useStore(s => s.showToast);

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = await flashcardsApi.getDue();
      setCards(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.error || "Kartochkalarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  const reviewCard = async (ease) => {
    if (currentIndex >= cards.length) return;

    try {
      setReviewing(true);
      const card = cards[currentIndex];
      await flashcardsApi.review(card.id, ease);

      if (currentIndex + 1 < cards.length) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      } else {
        showToast("Bugun hammasi! 🎉");
        setCards([]);
      }
    } catch (err) {
      showToast(err.error || "Xato");
    } finally {
      setReviewing(false);
    }
  };

  if (loading) return <PageLoader />;

  const current = currentIndex < cards.length ? cards[currentIndex] : null;
  const progress = cards.length > 0 ? Math.round(((currentIndex) / cards.length) * 100) : 0;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px' }} className="page">
      <h1 style={{ marginBottom: 10 }}>📚 Kartochkalar</h1>

      {cards.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--muted)',
          fontSize: 18,
        }}>
          {currentIndex === 0 ? "Bugun ko'rish kerak bo'lgan kartochka yo'q 😊" : "Bugun hammasi bajarildi! 🎉"}
        </div>
      ) : (
        <div>
          <div style={{
            marginBottom: 30,
            padding: '12px 0',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              {currentIndex + 1} / {cards.length}
            </div>
            <div style={{
              background: 'var(--bg2)',
              height: 6,
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                background: 'var(--green)',
                height: '100%',
                width: `${progress}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {current && (
            <div>
              {/* Flip Card */}
              <div
                onClick={() => !reviewing && setIsFlipped(!isFlipped)}
                style={{
                  perspective: '1000px',
                  cursor: reviewing ? 'not-allowed' : 'pointer',
                  height: 300,
                  marginBottom: 40,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    transitionDuration: '0.6s',
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* Front */}
                  <div
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      background: 'linear-gradient(135deg, var(--navy), var(--blue))',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 24,
                      borderRadius: 12,
                      textAlign: 'center',
                      fontSize: 20,
                      fontWeight: 600,
                      lineHeight: 1.6,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    {current.front}
                  </div>

                  {/* Back */}
                  <div
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: 'linear-gradient(135deg, var(--green), var(--teal))',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 24,
                      borderRadius: 12,
                      textAlign: 'center',
                      fontSize: 18,
                      lineHeight: 1.6,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    {current.back}
                  </div>
                </div>
              </div>

              {!isFlipped && (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 12,
                  marginBottom: 30,
                }}>
                  Javobni ko'rish uchun kartochkaga bosing
                </div>
              )}

              {/* Rating Buttons */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}>
                <button
                  onClick={() => reviewCard('again')}
                  disabled={reviewing}
                  style={{
                    padding: '16px 12px',
                    borderRadius: 8,
                    border: '2px solid var(--red)',
                    background: 'transparent',
                    color: 'var(--red)',
                    fontWeight: 600,
                    cursor: reviewing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: reviewing ? 0.6 : 1,
                  }}
                  className="btn-hover"
                >
                  Yana 🔄
                </button>

                <button
                  onClick={() => reviewCard('hard')}
                  disabled={reviewing}
                  style={{
                    padding: '16px 12px',
                    borderRadius: 8,
                    border: '2px solid var(--amber)',
                    background: 'transparent',
                    color: 'var(--amber)',
                    fontWeight: 600,
                    cursor: reviewing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: reviewing ? 0.6 : 1,
                  }}
                  className="btn-hover"
                >
                  Qiyin 😓
                </button>

                <button
                  onClick={() => reviewCard('good')}
                  disabled={reviewing}
                  style={{
                    padding: '16px 12px',
                    borderRadius: 8,
                    border: '2px solid var(--blue)',
                    background: 'transparent',
                    color: 'var(--blue)',
                    fontWeight: 600,
                    cursor: reviewing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: reviewing ? 0.6 : 1,
                  }}
                  className="btn-hover"
                >
                  Yaxshi 👍
                </button>

                <button
                  onClick={() => reviewCard('easy')}
                  disabled={reviewing}
                  style={{
                    padding: '16px 12px',
                    borderRadius: 8,
                    border: '2px solid var(--green)',
                    background: 'transparent',
                    color: 'var(--green)',
                    fontWeight: 600,
                    cursor: reviewing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: reviewing ? 0.6 : 1,
                  }}
                  className="btn-hover"
                >
                  Oson 😊
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Flashcards;
