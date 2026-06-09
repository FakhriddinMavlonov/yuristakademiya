/**
 * @swagger
 * components:
 *   schemas:
 *     LibraryItem:
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
 *         file_url:
 *           type: string
 *         file_type:
 *           type: string
 *           enum: [pdf, doc, video, link, image, other]
 *         file_size_bytes:
 *           type: integer
 *         is_published:
 *           type: boolean
 *         uploaded_by:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *     LibraryCreate:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         course_id:
 *           type: integer
 *         lesson_id:
 *           type: integer
 *         is_published:
 *           type: boolean
 *           default: true
 *         file_url:
 *           type: string
 *         file_type:
 *           type: string
 *           enum: [pdf, doc, video, link, image, other]
 */

/**
 * @swagger
 * tags:
 *   - name: Library
 *     description: Kutubxona
 */

/**
 * @swagger
 * /api/library:
 *   get:
 *     tags: [Library]
 *     summary: Kutubxona materiallari
 *     description: |
 *       Barcha nashr qilingan kutubxona materiallari ro'yxati.
 *       Kurs va dars bo'yicha filtrlash mumkin.
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
 *       - in: query
 *         name: fileType
 *         schema:
 *           type: string
 *           enum: [pdf, doc, video, link, image, other]
 *     responses:
 *       200:
 *         description: Materiallar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LibraryItem'
 */

/**
 * @swagger
 * /api/library:
 *   post:
 *     tags: [Library]
 *     summary: Yangi material qo'shish
 *     description: |
 *       Kutubxonaga yangi material qo'shish (faqat teacher/admin).
 *       Material faqat URL orqali yoki fayl yuklash orqali qo'shiladi.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               course_id:
 *                 type: integer
 *               lesson_id:
 *                 type: integer
 *               is_published:
 *                 type: boolean
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Yuklanadigan fayl
 *     responses:
 *       201:
 *         description: Material qo'shildi
 */

/**
 * @swagger
 * /api/library/{id}:
 *   get:
 *     tags: [Library]
 *     summary: Material detallari
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
 *         description: Material ma'lumotlari
 */

/**
 * @swagger
 * /api/library/{id}:
 *   patch:
 *     tags: [Library]
 *     summary: Materialni yangilash
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
 *             $ref: '#/components/schemas/LibraryCreate'
 *     responses:
 *       200:
 *         description: Material yangilandi
 */

/**
 * @swagger
 * /api/library/{id}:
 *   delete:
 *     tags: [Library]
 *     summary: Materialni o'chirish
 *     description: Fayl va ma'lumotlar bazasidan o'chirish
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
 *         description: Material o'chirildi
 */
