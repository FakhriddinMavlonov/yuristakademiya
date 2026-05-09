import React, { useEffect, useState } from 'react';
import { flashcards as flashcardsApi } from '../../api';
import { PageLoader } from '../../components/ui/Loading';
import useStore from '../../store/useStore';

function TeacherFlashcards() {
  const showToast = useStore(s => s.showToast);

  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const [newDeckName, setNewDeckName] = useState('');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [generatingTitle, setGeneratingTitle] = useState('');
  const [generatingCount, setGeneratingCount] = useState(10);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      setLoading(true);
      const data = await flashcardsApi.listDecks();
      setDecks(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.error || "Xato");
    } finally {
      setLoading(false);
    }
  };

  const loadDeck = async (deckId) => {
    try {
      const data = await flashcardsApi.getDeck(deckId);
      setSelectedDeck(data);
    } catch (err) {
      showToast(err.error || "Xato");
    }
  };

  const createDeck = async () => {
    if (!newDeckName.trim()) {
      showToast("Nom kiriting");
      return;
    }
    try {
      await flashcardsApi.createDeck({ title: newDeckName });
      showToast("Yaratildi ✓");
      setNewDeckName('');
      setShowCreateModal(false);
      loadDecks();
    } catch (err) {
      showToast(err.error || "Xato");
    }
  };

  const addCard = async () => {
    if (!selectedDeck || !newCardFront.trim() || !newCardBack.trim()) {
      showToast("Barcha maydonni to'ldiring");
      return;
    }
    try {
      await flashcardsApi.addCard(selectedDeck.id, { front: newCardFront, back: newCardBack });
      showToast("Qo'shildi ✓");
      setNewCardFront('');
      setNewCardBack('');
      setShowAddCardModal(false);
      loadDeck(selectedDeck.id);
    } catch (err) {
      showToast(err.error || "Xato");
    }
  };

  const removeCard = async (cardId) => {
    if (!window.confirm("O'chirasizmi?")) return;
    try {
      await flashcardsApi.removeCard(selectedDeck.id, cardId);
      showToast("O'chirildi ✓");
      loadDeck(selectedDeck.id);
    } catch (err) {
      showToast(err.error || "Xato");
    }
  };

  const removeDeck = async (deckId) => {
    if (!window.confirm("Dastning barcha kartalarini o'chirasizmi?")) return;
    try {
      await flashcardsApi.removeDeck(deckId);
      showToast("O'chirildi ✓");
      setSelectedDeck(null);
      loadDecks();
    } catch (err) {
      showToast(err.error || "Xato");
    }
  };

  const generateCards = async () => {
    if (!generatingTitle.trim()) {
      showToast("Mavzu kiriting");
      return;
    }
    try {
      const result = await flashcardsApi.generate({ lesson_title: generatingTitle, count: generatingCount });
      const newDeck = { title: `AI: ${generatingTitle}`, cards: result.cards || [] };

      const created = await flashcardsApi.createDeck({ title: newDeck.title });
      for (const card of newDeck.cards) {
        await flashcardsApi.addCard(created.id, card);
      }

      showToast("Kartalar yaratildi! ✓");
      setGeneratingTitle('');
      setGeneratingCount(10);
      setShowGenerateModal(false);
      loadDecks();
    } catch (err) {
      showToast(err.error || "Xato");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, padding: '20px', maxWidth: 1200, margin: '0 auto' }} className="page">
      {/* Left Panel - Decks List */}
      <div>
        <h2 style={{ fontSize: 16, marginBottom: 16, fontWeight: 700 }}>Dastlar</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'var(--blue)',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            marginBottom: 12,
            cursor: 'pointer',
          }}
        >
          + Yangi Dast
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {decks.map(deck => (
            <div
              key={deck.id}
              onClick={() => {
                setSelectedDeck(null);
                loadDeck(deck.id);
              }}
              style={{
                padding: '12px',
                borderRadius: 6,
                background: selectedDeck?.id === deck.id ? 'var(--blue)' : 'var(--bg2)',
                color: selectedDeck?.id === deck.id ? 'white' : 'inherit',
                cursor: 'pointer',
                fontWeight: selectedDeck?.id === deck.id ? 600 : 400,
              }}
            >
              <div>{deck.title}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {deck.card_count || 0} karta
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Deck Detail */}
      <div>
        {selectedDeck ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{selectedDeck.title}</h2>
              <button
                onClick={() => removeDeck(selectedDeck.id)}
                style={{
                  padding: '8px 12px',
                  background: 'var(--red)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                O'chirish
              </button>
            </div>

            {/* Cards Table */}
            <div style={{
              background: 'var(--bg2)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
              overflowX: 'auto',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Savol</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Javob</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: 60 }}>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedDeck.cards || []).map(card => (
                    <tr key={card.id} style={{ borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <td style={{ padding: '8px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.front}</td>
                      <td style={{ padding: '8px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.back}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          onClick={() => removeCard(card.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--red)',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Card Button */}
            <button
              onClick={() => setShowAddCardModal(true)}
              style={{
                padding: '10px 16px',
                background: 'var(--green)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Karta Qo'shish
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            Dastni tanlang
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg)',
            padding: 24,
            borderRadius: 12,
            maxWidth: 400,
            width: '90%',
          }}>
            <h3 style={{ marginBottom: 16 }}>Yangi Dast</h3>
            <input
              type="text"
              placeholder="Dast nomi"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                marginBottom: 16,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={createDeck}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'var(--green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Yaratish
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Bekor
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCardModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg)',
            padding: 24,
            borderRadius: 12,
            maxWidth: 500,
            width: '90%',
          }}>
            <h3 style={{ marginBottom: 16 }}>Yangi Karta</h3>
            <input
              type="text"
              placeholder="Savol / Ta'rif"
              value={newCardFront}
              onChange={(e) => setNewCardFront(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />
            <textarea
              placeholder="Javob"
              value={newCardBack}
              onChange={(e) => setNewCardBack(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                marginBottom: 16,
                minHeight: 80,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={addCard}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'var(--green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Qo'shish
              </button>
              <button
                onClick={() => setShowAddCardModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Bekor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherFlashcards;
