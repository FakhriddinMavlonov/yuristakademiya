const svc = require('./flashcards.service');

async function listDecks(req, res, next) {
  try {
    const decks = await svc.listDecks(req.user.id);
    res.json(decks);
  } catch (e) {
    next(e);
  }
}

async function getDeck(req, res, next) {
  try {
    const { id } = req.params;
    const deck = await svc.getDeck(parseInt(id));
    res.json(deck);
  } catch (e) {
    next(e);
  }
}

async function createDeck(req, res, next) {
  try {
    const deck = await svc.createDeck(req.user.id, req.body);
    res.status(201).json(deck);
  } catch (e) {
    next(e);
  }
}

async function addCard(req, res, next) {
  try {
    const { id } = req.params;
    const card = await svc.addCard(parseInt(id), req.user.id, req.body);
    res.status(201).json(card);
  } catch (e) {
    next(e);
  }
}

async function removeCard(req, res, next) {
  try {
    const { id, cid } = req.params;
    await svc.removeCard(parseInt(cid), req.user.id);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

async function removeDeck(req, res, next) {
  try {
    const { id } = req.params;
    await svc.removeDeck(parseInt(id), req.user.id);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

async function getDueCards(req, res, next) {
  try {
    const cards = await svc.getDueCards(req.user.id);
    res.json(cards);
  } catch (e) {
    next(e);
  }
}

async function reviewCard(req, res, next) {
  try {
    const { id } = req.params;
    const { ease } = req.body;
    const result = await svc.reviewCard(req.user.id, parseInt(id), ease);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function generateWithAI(req, res, next) {
  try {
    const { lesson_title, count } = req.body;
    const cards = await svc.generateWithAI(lesson_title, count || 10);
    res.json({ cards });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listDecks,
  getDeck,
  createDeck,
  addCard,
  removeCard,
  removeDeck,
  getDueCards,
  reviewCard,
  generateWithAI,
};
