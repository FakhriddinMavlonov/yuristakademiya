/**
 * @swagger
 * components:
 *   schemas:
 *     Exam:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         teacher_id:
 *           type: integer
 *         teacher_name:
 *           type: string
 *         title:
 *           type: string
 *         topic:
 *           type: string
 *         scheduled_at:
 *           type: string
 *           format: date-time
 *         location:
 *           type: string
 *         duration_minutes:
 *           type: integer
 *         max_score:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [scheduled, completed, cancelled]
 *         answer_text:
 *           type: string
 *         groups:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               name:
 *                 type: string
 *         results_posted:
 *           type: integer
 *     ExamResult:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         exam_id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         score:
 *           type: integer
 *         feedback:
 *           type: string
 *         posted_at:
 *           type: string
 *           format: date-time
 *     ExamResultPost:
 *       type: object
 *       properties:
 *         userId:
 *           type: integer
 *         score:
 *           type: integer
 *         feedback:
 *           type: string
 */

/**
 * @swagger
 * tags:
 *   - name: Exams
 *     description: Imtihonlar va natijalar
 */

/**
 * @swagger
 * /api/exams:
 *   get:
 *     tags: [Exams]
 *     summary: Imtihonlar ro'yxati
 *     description: |
 *       Roli bo'yicha imtihonlar:
 *       - **Admin**: barcha imtihonlar
 *       - **Teacher**: o'zi yaratgan imtihonlar
 *       - **Student**: o'zi a'zo guruhlardagi imtihonlar (o'z natijasi bilan)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Imtihonlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Exam'
 */

/**
 * @swagger
 * /api/exams:
 *   post:
 *     tags: [Exams]
 *     summary: Yangi imtihon yaratish
 *     description: |
 *       Teacher/admin tomonidan imtihon yaratish.
 *       Imtihon bir yoki bir nechta guruhlarga tayinlanadi.
 *       Yaratilgandan so'ng o'quvchilarga push bildirishnoma yuboriladi.
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
 *               - scheduledAt
 *               - groupIds
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Oraliq imtihon"
 *               topic:
 *                 type: string
 *                 example: "1-5 mavzular"
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *                 default: "O'quv markaz"
 *               durationMinutes:
 *                 type: integer
 *                 default: 90
 *               maxScore:
 *                 type: integer
 *                 default: 100
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Guruh IDlari massivi
 *     responses:
 *       201:
 *         description: Imtihon yaratildi
 */

/**
 * @swagger
 * /api/exams/{id}:
 *   patch:
 *     tags: [Exams]
 *     summary: Imtihonni yangilash
 *     description: Imtihon ma'lumotlarini yangilash (guruhlarni ham o'zgartirish mumkin)
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
 *         description: Imtihon yangilandi
 */

/**
 * @swagger
 * /api/exams/{id}:
 *   delete:
 *     tags: [Exams]
 *     summary: Imtihonni o'chirish
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
 *         description: Imtihon o'chirildi
 */

/**
 * @swagger
 * /api/exams/{id}/students:
 *   get:
 *     tags: [Exams]
 *     summary: Imtihon o'quvchilari va natijalari
 *     description: |
 *       Imtihonga tayinlangan guruhlardagi barcha o'quvchilar,
 *       ularning natijalari (agar kiritilgan bo'lsa) bilan birga.
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
 *         description: O'quvchilar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exam:
 *                   $ref: '#/components/schemas/Exam'
 *                 students:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       score:
 *                         type: integer
 *                       feedback:
 *                         type: string
 *                       posted_at:
 *                         type: string
 *                         format: date-time
 *                       group_name:
 *                         type: string
 */

/**
 * @swagger
 * /api/exams/{id}/results:
 *   post:
 *     tags: [Exams]
 *     summary: Imtihon natijalarini kiritish
 *     description: |
 *       Teacher/admin imtihon natijalarini kiritadi.
 *       Har bir o'quvchi uchun ball va fikr yozish mumkin.
 *       Natijalar kiritilgandan so'ng imtihon "completed" statusiga o'tadi
 *       va o'quvchilarga push bildirishnoma yuboriladi.
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
 *               - results
 *             properties:
 *               results:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ExamResultPost'
 *     responses:
 *       200:
 *         description: Natijalar kiritildi
 */
