/**
 * @swagger
 * components:
 *   schemas:
 *     Curriculum:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         teacher_id:
 *           type: integer
 *         lesson_count:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *     CurriculumDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         teacher_id:
 *           type: integer
 *         lessons:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               curriculum_id:
 *                 type: integer
 *               order_num:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               task_count:
 *                 type: integer
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     curriculum_lesson_id:
 *                       type: integer
 *                     type:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *     CurriculumCreate:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *     LessonCreate:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *     TaskCreate:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *         type:
 *           type: string
 *           default: task
 *         description:
 *           type: string
 */

/**
 * @swagger
 * tags:
 *   - name: Curricula
 *     description: O'quv rejalari
 */

/**
 * @swagger
 * /api/curricula:
 *   get:
 *     tags: [Curricula]
 *     summary: O'quv rejalari ro'yxati
 *     description: |
 *       Teacher/admin o'zining barcha o'quv rejalari ro'yxati.
 *       Har bir reja uchun darslar soni ko'rsatiladi.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: O'quv rejalari
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Curriculum'
 */

/**
 * @swagger
 * /api/curricula:
 *   post:
 *     tags: [Curricula]
 *     summary: Yangi o'quv rejasi yaratish
 *     description: |
 *       Teacher/admin tomonidan yangi o'quv rejasi yaratish.
 *       Reja nomi va tavsifi kiritiladi.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CurriculumCreate'
 *     responses:
 *       201:
 *         description: O'quv rejasi yaratildi
 */

/**
 * @swagger
 * /api/curricula/{id}:
 *   get:
 *     tags: [Curricula]
 *     summary: O'quv rejasi detallari
 *     description: |
 *       O'quv rejasining to'liq ma'lumoti:
 *       - Darslar ro'yxati
 *       - Har bir darsdagi topshiriqlar
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
 *         description: O'quv rejasi ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CurriculumDetail'
 *       404:
 *         description: Topilmadi
 */

/**
 * @swagger
 * /api/curricula/{id}:
 *   patch:
 *     tags: [Curricula]
 *     summary: O'quv rejasini yangilash
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Yangilandi
 */

/**
 * @swagger
 * /api/curricula/{id}:
 *   delete:
 *     tags: [Curricula]
 *     summary: O'quv rejasini o'chirish
 *     description: Reja va unga tegishli barcha darslar o'chiriladi
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
 *         description: O'chirildi
 */

/**
 * @swagger
 * /api/curricula/{id}/lessons:
 *   post:
 *     tags: [Curricula]
 *     summary: Rejaga dars qo'shish
 *     description: |
 *       O'quv rejasiga yangi dars qo'shish.
 *       Dars tartib raqami avtomatik belgilanadi.
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
 *             $ref: '#/components/schemas/LessonCreate'
 *     responses:
 *       201:
 *         description: Dars qo'shildi
 */

/**
 * @swagger
 * /api/curricula/{id}/lessons/{lid}:
 *   patch:
 *     tags: [Curricula]
 *     summary: Rejadagi darsni yangilash
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lid
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dars yangilandi
 */

/**
 * @swagger
 * /api/curricula/{id}/lessons/{lid}:
 *   delete:
 *     tags: [Curricula]
 *     summary: Rejadagi darsni o'chirish
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dars o'chirildi
 */

/**
 * @swagger
 * /api/curricula/{id}/lessons/{lid}/tasks:
 *   post:
 *     tags: [Curricula]
 *     summary: Darsga topshiriq qo'shish
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lid
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskCreate'
 *     responses:
 *       201:
 *         description: Topshiriq qo'shildi
 */

/**
 * @swagger
 * /api/curricula/{id}/lessons/{lid}/tasks/{tid}:
 *   delete:
 *     tags: [Curricula]
 *     summary: Darsdan topshiriqni o'chirish
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lid
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: tid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Topshiriq o'chirildi
 */
