/**
 * @swagger
 * components:
 *   schemas:
 *     FlashcardDeck:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         teacher_id:
 *           type: integer
 *         lesson_id:
 *           type: integer
 *         group_lesson_id:
 *           type: integer
 *         title:
 *           type: string
 *         card_count:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *     Flashcard:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         deck_id:
 *           type: integer
 *         front:
 *           type: string
 *           description: Savol yoki atama
 *         back:
 *           type: string
 *           description: Javob yoki ta'rif
 *         created_at:
 *           type: string
 *           format: date-time
 *     FlashcardReview:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         flashcard_id:
 *           type: integer
 *         ease_factor:
 *           type: number
 *           description: SM-2 easiness factor (default 2.5)
 *         interval_days:
 *           type: integer
 *         repetition_count:
 *           type: integer
 *         next_review_date:
 *           type: string
 *           format: date
 *         last_reviewed_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Flashcards
 *     description: Flashcardlar (SM-2 spaced repetition)
 */

/**
 * @swagger
 * /api/flashcards/decks:
 *   get:
 *     tags: [Flashcards]
 *     summary: Decklar ro'yxati (teacher/admin)
 *     description: O'qituvchining barcha flashcard decklari
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Decklar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FlashcardDeck'
 */

/**
 * @swagger
 * /api/flashcards/decks:
 *   post:
 *     tags: [Flashcards]
 *     summary: Yangi deck yaratish (teacher/admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               lesson_id:
 *                 type: integer
 *               group_lesson_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Deck yaratildi
 */

/**
 * @swagger
 * /api/flashcards/decks/{id}:
 *   get:
 *     tags: [Flashcards]
 *     summary: Deck detallari (kartalar bilan)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deck ma'lumotlari va kartalar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deck:
 *                   $ref: '#/components/schemas/FlashcardDeck'
 *                 cards:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flashcard'
 */

/**
 * @swagger
 * /api/flashcards/decks/{id}:
 *   delete:
 *     tags: [Flashcards]
 *     summary: Deckni o'chirish (teacher/admin)
 *     description: Deck va undagi barcha kartalar va reviewlar o'chiriladi
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deck o'chirildi
 */

/**
 * @swagger
 * /api/flashcards/decks/{id}/cards:
 *   post:
 *     tags: [Flashcards]
 *     summary: Deckka karta qo'shish (teacher/admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - front
 *               - back
 *             properties:
 *               front:
 *                 type: string
 *               back:
 *                 type: string
 *     responses:
 *       201:
 *         description: Karta qo'shildi
 */

/**
 * @swagger
 * /api/flashcards/decks/{id}/cards/{cid}:
 *   delete:
 *     tags: [Flashcards]
 *     summary: Kartani o'chirish (teacher/admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: cid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Karta o'chirildi
 */

/**
 * @swagger
 * /api/flashcards/generate:
 *   post:
 *     tags: [Flashcards]
 *     summary: AI yordamida kartalar yaratish (teacher/admin)
 *     description: |
 *       Dars mavzusi bo'yicha AI (Groq) yordamida avtomatik flashcard yaratish.
 *       Natijada savol-javob formatidagi kartalar.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lesson_title
 *             properties:
 *               lesson_title:
 *                 type: string
 *                 example: "Fuqarolik huquqi asoslari"
 *               count:
 *                 type: integer
 *                 description: Karta soni
 *                 default: 10
 *     responses:
 *       200:
 *         description: Yaratilgan kartalar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cards:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       front:
 *                         type: string
 *                       back:
 *                         type: string
 */

/**
 * @swagger
 * /api/flashcards/due:
 *   get:
 *     tags: [Flashcards]
 *     summary: Takrorlash vaqti kelgan kartalar (student)
 *     description: |
 *       SM-2 algoritmi bo'yicha bugun takrorlanishi kerak bo'lgan kartalar.
 *       Kartalar ease_factor va interval_days bo'yicha tartiblangan.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Takrorlash uchun kartalar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   front:
 *                     type: string
 *                   back:
 *                     type: string
 *                   deck_title:
 *                     type: string
 *                   ease_factor:
 *                     type: number
 *                   interval_days:
 *                     type: integer
 *                   repetition_count:
 *                     type: integer
 */

/**
 * @swagger
 * /api/flashcards/{id}/review:
 *   post:
 *     tags: [Flashcards]
 *     summary: Kartani baholash
 *     description: |
 *       SM-2 spaced repetition algoritmi bo'yicha kartani baholash.
 *       Baho bo'yicha keyingi takrorlash vaqti hisoblanadi.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ease
 *             properties:
 *               ease:
 *                 type: string
 *                 enum: [again, hard, good, easy]
 *                 description: |
 *                   - again: eslay olmadim (interval=1)
 *                   - hard: qiyin esladim (interval o'zgarishsiz)
 *                   - good: esladim (interval*EF)
 *                   - easy: oson esladim (interval*EF*1.3)
 *     responses:
 *       200:
 *         description: Baholandi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 next_review_date:
 *                   type: string
 *                   format: date
 */
