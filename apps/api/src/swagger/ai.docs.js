/**
 * @swagger
 * components:
 *   schemas:
 *     AIQuizResponse:
 *       type: object
 *       properties:
 *         questions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               questionText:
 *                 type: string
 *               points:
 *                 type: integer
 *               options:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *               correctIndex:
 *                 type: integer
 *     AIHomeworkCheck:
 *       type: object
 *       properties:
 *         strengths:
 *           type: array
 *           items:
 *             type: string
 *         weaknesses:
 *           type: array
 *           items:
 *             type: string
 *         recommendations:
 *           type: array
 *           items:
 *             type: string
 *         summary:
 *           type: string
 *     AIChatRequest:
 *       type: object
 *       required:
 *         - message
 *       properties:
 *         message:
 *           type: string
 *         lesson_id:
 *           type: integer
 *         group_lesson_id:
 *           type: integer
 *     AIChatResponse:
 *       type: object
 *       properties:
 *         conversation_id:
 *           type: integer
 *         reply:
 *           type: string
 *         messages:
 *           type: integer
 *           description: Jami xabarlar soni
 */

/**
 * @swagger
 * tags:
 *   - name: AI
 *     description: AI yordamchisi
 */

/**
 * @swagger
 * /api/ai/generate-quiz:
 *   post:
 *     tags: [AI]
 *     summary: AI yordamida test savollari yaratish
 *     description: |
 *       Mavzu bo'yicha AI (Groq Llama 3.3) yordamida test savollari yaratish.
 *       Faqat teacher/admin uchun.
 *       Natijada 4 variantli, 1 to'g'ri javobli testlar qaytariladi.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 description: Mavzu nomi
 *                 example: "Fuqarolik kodeksi 1-bob"
 *               count:
 *                 type: integer
 *                 description: Savollar soni (1-30)
 *                 default: 10
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 description: "easy=oson, medium=o'rta, hard=qiyin"
 *                 default: medium
 *     responses:
 *       200:
 *         description: Test savollari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AIQuizResponse'
 *       400:
 *         description: Mavzu nomi kiritilmagan
 *       500:
 *         description: AI bilan bog'liq xatolik
 */

/**
 * @swagger
 * /api/ai/check-homework:
 *   post:
 *     tags: [AI]
 *     summary: AI yordamida uy ishini tekshirish
 *     description: |
 *       O'quvchining uy ishi javobini AI yordamida tekshirish.
 *       Kuchli va zaif tomonlar, tavsiyalar beriladi.
 *       Faqat teacher/admin uchun.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: O'quvchining javob matni (kamida 15 belgi)
 *               assignmentTitle:
 *                 type: string
 *                 description: Topshiriq nomi
 *                 default: "Uy ishi"
 *     responses:
 *       200:
 *         description: Tekshirish natijalari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AIHomeworkCheck'
 *       400:
 *         description: Matn juda qisqa
 */

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: AI bilan suhbat
 *     description: |
 *       AI yordamchi bilan suhbat qilish.
 *       Dars kontekstida so'zlashish imkoniyati.
 *       Suhbat tarixi saqlanadi (oxirgi 20 xabar).
 *       Barcha rollar (student, teacher, admin) foydalanishi mumkin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AIChatRequest'
 *     responses:
 *       200:
 *         description: AI javobi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AIChatResponse'
 *       400:
 *         description: Xabar matni kiritilmagan
 */

/**
 * @swagger
 * /api/ai/history:
 *   get:
 *     tags: [AI]
 *     summary: AI suhbat tarixi
 *     description: Foydalanuvchining AI bilan oxirgi suhbat tarixini olish
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lesson_id
 *         schema:
 *           type: integer
 *         description: Dars ID bo'yicha filtr
 *     responses:
 *       200:
 *         description: Suhbat tarixi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversation_id:
 *                   type: integer
 *                   nullable: true
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [user, assistant]
 *                       content:
 *                         type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 */
