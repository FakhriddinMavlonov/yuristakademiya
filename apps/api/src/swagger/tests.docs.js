/**
 * @swagger
 * components:
 *   schemas:
 *     Test:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         course_id:
 *           type: integer
 *         lesson_id:
 *           type: integer
 *         title:
 *           type: string
 *         time_limit_seconds:
 *           type: integer
 *         max_attempts:
 *           type: integer
 *         passing_score:
 *           type: integer
 *         questions_count:
 *           type: integer
 *         created_by:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *     TestQuestion:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         test_id:
 *           type: integer
 *         question_text:
 *           type: string
 *         options:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               text:
 *                 type: string
 *         points:
 *           type: integer
 *     TestAttempt:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         test_id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         score:
 *           type: integer
 *         score_pct:
 *           type: number
 *         passed:
 *           type: boolean
 *         answers:
 *           type: object
 *         started_at:
 *           type: string
 *           format: date-time
 *         submitted_at:
 *           type: string
 *           format: date-time
 *     TestSubmitAnswers:
 *       type: object
 *       properties:
 *         answers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               question_id:
 *                 type: integer
 *               selected_option:
 *                 type: integer
 */

/**
 * @swagger
 * tags:
 *   - name: Tests
 *     description: Testlar va urinishlar
 */

/**
 * @swagger
 * /api/tests:
 *   get:
 *     tags: [Tests]
 *     summary: Testlar ro'yxati
 *     description: |
 *       Roli bo'yicha testlar:
 *       - **Student**: o'zi yozilgan kursdagi testlar
 *       - **Teacher**: o'zi yaratgan testlar
 *       - **Admin**: barcha testlar
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *         description: Kurs ID bo'yicha filtr
 *       - in: query
 *         name: lessonId
 *         schema:
 *           type: integer
 *         description: Dars ID bo'yicha filtr
 *     responses:
 *       200:
 *         description: Testlar ro'yxati
 */

/**
 * @swagger
 * /api/tests:
 *   post:
 *     tags: [Tests]
 *     summary: Test yaratish
 *     description: |
 *       Test yaratish. Teacher va adminlar uchun.
 *       Avval test yaratiladi, keyin unga savollar qo'shiladi.
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
 *               - lesson_id
 *             properties:
 *               title:
 *                 type: string
 *                 example: "1-mavzu bo'yicha test"
 *               lesson_id:
 *                 type: integer
 *               time_limit_seconds:
 *                 type: integer
 *                 description: Vaqt cheklovi (sekund)
 *                 example: 600
 *               max_attempts:
 *                 type: integer
 *                 example: 3
 *               passing_score:
 *                 type: integer
 *                 description: O'tish balli (foizda)
 *                 example: 60
 *     responses:
 *       201:
 *         description: Test yaratildi
 */

/**
 * @swagger
 * /api/tests/{id}:
 *   get:
 *     tags: [Tests]
 *     summary: Test detallari (savollar bilan)
 *     description: Test va uning savollarini olish
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
 *         description: Test ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 test:
 *                   $ref: '#/components/schemas/Test'
 *                 questions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TestQuestion'
 */

/**
 * @swagger
 * /api/tests/{id}:
 *   patch:
 *     tags: [Tests]
 *     summary: Testni yangilash
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
 *     responses:
 *       200:
 *         description: Test yangilandi
 */

/**
 * @swagger
 * /api/tests/{id}:
 *   delete:
 *     tags: [Tests]
 *     summary: Testni o'chirish
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
 *         description: Test o'chirildi
 */

/**
 * @swagger
 * /api/tests/{id}/questions:
 *   post:
 *     tags: [Tests]
 *     summary: Testga savol qo'shish
 *     description: |
 *       Testga yangi savol qo'shish. Har bir savol 4 ta variantdan iborat.
 *       correct_index - to'g'ri javob indeksi (0-3).
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
 *               - question_text
 *               - options
 *               - correct_index
 *             properties:
 *               question_text:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                 minItems: 4
 *                 maxItems: 4
 *               correct_index:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 3
 *               points:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       201:
 *         description: Savol qo'shildi
 */

/**
 * @swagger
 * /api/tests/{id}/questions/batch:
 *   post:
 *     tags: [Tests]
 *     summary: Bir nechta savol qo'shish
 *     description: Bir vaqtning o'zida bir nechta savol qo'shish
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
 *             properties:
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Savollar qo'shildi
 */

/**
 * @swagger
 * /api/tests/{id}/questions/{qid}:
 *   delete:
 *     tags: [Tests]
 *     summary: Savolni o'chirish
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: qid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Savol o'chirildi
 */

/**
 * @swagger
 * /api/tests/{id}/start:
 *   post:
 *     tags: [Tests]
 *     summary: Testni boshlash
 *     description: |
 *       Testni boshlash. Yangi urinish yaratiladi.
 *       Testda vaqt cheklovi va maksimal urinishlar soni tekshiriladi.
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
 *         description: Test boshlandi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attempt:
 *                   $ref: '#/components/schemas/TestAttempt'
 *                 questions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TestQuestion'
 */

/**
 * @swagger
 * /api/tests/{id}/submit:
 *   post:
 *     tags: [Tests]
 *     summary: Testni yakunlash
 *     description: |
 *       Test javoblarini yuborish. Avtomatik ball hisoblanadi.
 *       Studentning javoblari va natijasi qaytariladi.
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
 *             $ref: '#/components/schemas/TestSubmitAnswers'
 *     responses:
 *       200:
 *         description: Test natijalari
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attempt:
 *                   $ref: '#/components/schemas/TestAttempt'
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       question_id:
 *                         type: integer
 *                       correct:
 *                         type: boolean
 *                       correct_answer:
 *                         type: integer
 */

/**
 * @swagger
 * /api/tests/{id}/attempts:
 *   get:
 *     tags: [Tests]
 *     summary: Test urinishlari tarixi
 *     description: |
 *       Studentning test bo'yicha barcha urinishlari.
 *       Teacher/admin barcha studentlarning urinishlarini ko'radi.
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
 *         description: Urinishlar ro'yxati
 */
