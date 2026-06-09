/**
 * @swagger
 * components:
 *   schemas:
 *     Lesson:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         course_id:
 *           type: integer
 *         order_num:
 *           type: integer
 *           description: Dars tartib raqami
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         video_guid:
 *           type: string
 *           description: Bunny CDN video GUID
 *         video_url:
 *           type: string
 *           description: Video URL (Bunny CDN)
 *         duration_seconds:
 *           type: integer
 *         quiz_required:
 *           type: boolean
 *         is_free:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *     LessonCreate:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         order_num:
 *           type: integer
 *     LessonProgress:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         lesson_id:
 *           type: integer
 *         is_completed:
 *           type: boolean
 *         watched_seconds:
 *           type: integer
 *         completed_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Lessons
 *     description: Darslar CRUD
 *   - name: Lesson Progress
 *     description: Dars o'zlashtirish
 */

/**
 * @swagger
 * /api/courses/{courseId}/lessons:
 *   get:
 *     tags: [Lessons]
 *     summary: Kursdagi darslar ro'yxati
 *     description: Kursga tegishli barcha darslar tartib bilan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kurs ID
 *     responses:
 *       200:
 *         description: Darslar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lesson'
 */

/**
 * @swagger
 * /api/courses/{courseId}/lessons:
 *   post:
 *     tags: [Lessons]
 *     summary: Yangi dars qo'shish
 *     description: Kursga yangi dars qo'shish. Faqat teacher/admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *         description: Dars yaratildi
 */

/**
 * @swagger
 * /api/lessons/{id}:
 *   get:
 *     tags: [Lessons]
 *     summary: Dars detallari
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
 *         description: Dars ma'lumotlari
 *       404:
 *         description: Dars topilmadi
 */

/**
 * @swagger
 * /api/lessons/{id}:
 *   patch:
 *     tags: [Lessons]
 *     summary: Darsni yangilash
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               order_num:
 *                 type: integer
 *               quiz_required:
 *                 type: boolean
 *               is_free:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Dars yangilandi
 */

/**
 * @swagger
 * /api/lessons/{id}:
 *   delete:
 *     tags: [Lessons]
 *     summary: Darsni o'chirish
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
 *         description: Dars o'chirildi
 */

/**
 * @swagger
 * /api/lessons/{id}/video:
 *   post:
 *     tags: [Lessons]
 *     summary: Dars videosini yuklash
 *     description: Videoni Bunny CDN ga yuklab, darsga biriktirish
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
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Video fayl (max 500MB)
 *     responses:
 *       200:
 *         description: Video yuklandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 */

/**
 * @swagger
 * /api/lessons/{id}/progress:
 *   post:
 *     tags: [Lesson Progress]
 *     summary: Dars o'zlashtirishni yangilash
 *     description: |
 *       Studentning darsni o'zlashtirish holatini yangilash.
 *       Video ko'rish davomiyligi va tugallanganlik statusini yuborish.
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
 *               watched_seconds:
 *                 type: integer
 *                 description: Ko'rilgan sekundlar
 *               is_completed:
 *                 type: boolean
 *                 description: Dars tugallanganmi
 *     responses:
 *       200:
 *         description: Progress yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonProgress'
 */

/**
 * @swagger
 * /api/lessons/{id}/progress:
 *   get:
 *     tags: [Lesson Progress]
 *     summary: Dars o'zlashtirish holati
 *     description: Joriy foydalanuvchining dars bo'yicha progressi
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
 *         description: Progress ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonProgress'
 */
