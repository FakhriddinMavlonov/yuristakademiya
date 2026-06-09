/**
 * @swagger
 * components:
 *   schemas:
 *     Assignment:
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
 *         description:
 *           type: string
 *         due_date:
 *           type: string
 *           format: date-time
 *         max_score:
 *           type: integer
 *         created_by:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *     AssignmentSubmission:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         assignment_id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         content:
 *           type: string
 *         file_url:
 *           type: string
 *         file_name:
 *           type: string
 *         score:
 *           type: integer
 *         feedback:
 *           type: string
 *         submitted_at:
 *           type: string
 *           format: date-time
 *         graded_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Assignments
 *     description: Uy vazifalari
 */

/**
 * @swagger
 * /api/assignments:
 *   get:
 *     tags: [Assignments]
 *     summary: Topshiriqlar ro'yxati
 *     description: |
 *       - **Student**: o'z kurslaridagi topshiriqlar
 *       - **Teacher**: o'zi yaratgan topshiriqlar
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: lessonId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Topshiriqlar ro'yxati
 */

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     tags: [Assignments]
 *     summary: Yangi topshiriq yaratish
 *     description: Teacher yoki admin tomonidan topshiriq yaratish
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
 *               description:
 *                 type: string
 *               lesson_id:
 *                 type: integer
 *               due_date:
 *                 type: string
 *                 format: date-time
 *               max_score:
 *                 type: integer
 *                 default: 100
 *     responses:
 *       201:
 *         description: Topshiriq yaratildi
 */

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     tags: [Assignments]
 *     summary: Topshiriq detallari
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
 *         description: Topshiriq ma'lumotlari
 *       404:
 *         description: Topshiriq topilmadi
 */

/**
 * @swagger
 * /api/assignments/{id}:
 *   patch:
 *     tags: [Assignments]
 *     summary: Topshiriqni yangilash
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
 *         description: Topshiriq yangilandi
 */

/**
 * @swagger
 * /api/assignments/{id}:
 *   delete:
 *     tags: [Assignments]
 *     summary: Topshiriqni o'chirish
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
 *         description: Topshiriq o'chirildi
 */

/**
 * @swagger
 * /api/assignments/{id}/submit:
 *   post:
 *     tags: [Assignments]
 *     summary: Topshiriqni topshirish
 *     description: |
 *       Student tomonidan topshiriqni bajarib topshirish.
 *       Matn va/yoki fayl yuklash mumkin.
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Topshiriq matni
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fayl (max 50MB)
 *     responses:
 *       201:
 *         description: Topshiriq topshirildi
 */

/**
 * @swagger
 * /api/assignments/{id}/submissions:
 *   get:
 *     tags: [Assignments]
 *     summary: Topshiriq bo'yicha barcha topshirishlar
 *     description: Teacher/admin o'quvchilarning topshirishlarini ko'rish
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
 *         description: Topshirishlar ro'yxati
 */

/**
 * @swagger
 * /api/assignments/submissions/{submissionId}:
 *   get:
 *     tags: [Assignments]
 *     summary: Topshiriq bajarilishini ko'rish
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Topshiriq bajarilishi
 */

/**
 * @swagger
 * /api/assignments/submissions/{submissionId}/grade:
 *   post:
 *     tags: [Assignments]
 *     summary: Topshiriqni baholash
 *     description: Teacher/admin tomonidan topshiriqni baholash va fikr qoldirish
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
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
 *               - score
 *             properties:
 *               score:
 *                 type: integer
 *                 description: Ball
 *               feedback:
 *                 type: string
 *                 description: Fikr-mulohaza
 *     responses:
 *       200:
 *         description: Baholandi
 */
