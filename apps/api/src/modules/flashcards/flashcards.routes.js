const router = require('express').Router();
const { auth, requireRole } = require('../../middleware/auth');
const ctrl = require('./flashcards.controller');

router.use(auth);

// Student
router.get('/due', ctrl.getDueCards);
router.post('/:id/review', ctrl.reviewCard);

// Teacher
router.get('/decks', requireRole('teacher', 'admin'), ctrl.listDecks);
router.get('/decks/:id', requireRole('teacher', 'admin'), ctrl.getDeck);
router.post('/decks', requireRole('teacher', 'admin'), ctrl.createDeck);
router.post('/decks/:id/cards', requireRole('teacher', 'admin'), ctrl.addCard);
router.delete('/decks/:id/cards/:cid', requireRole('teacher', 'admin'), ctrl.removeCard);
router.delete('/decks/:id', requireRole('teacher', 'admin'), ctrl.removeDeck);

// AI generation
router.post('/generate', requireRole('teacher', 'admin'), ctrl.generateWithAI);

module.exports = router;
