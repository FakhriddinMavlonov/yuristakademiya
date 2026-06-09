/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         teacher_id:
 *           type: integer
 *         teacher_name:
 *           type: string
 *         price:
 *           type: number
 *         duration_weeks:
 *           type: integer
 *         is_published:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *     CourseCreate:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           description: Kurs nomi
 *           example: "Yuridik fanlar asoslari"
 *         description:
 *           type: string
 *           description: Kurs tavsifi
 *         price:
 *           type: number
 *           description: Kurs narxi
 *         duration_weeks:
 *           type: integer
 *           description: Davomiyligi (haftalarda)
 *     Enrollment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         course_id:
 *           type: integer
 *         course_title:
 *           type: string
 *         enrolled_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Courses
 *     description: Kurslar CRUD
 */

/**
 * @swagger
 * /api/courses:
 *   get:
 *     tags: [Courses]
 *     summary: Barcha kurslar ro'yxati
 *     description: |
 *       Foydalanuvchi roliga qarab kurslar ro'yxati:
 *       - **Admin**: barcha kurslar
 *       - **Teacher**: faqat o'z kurslari
 *       - **Student**: o'zi yozilgan kurslar
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: published
 *         schema:
 *           type: string
 *         description: Filter by published status (true/false)
 *     responses:
 *       200:
 *         description: Kurslar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 */

/**
 * @swagger
 * /api/courses:
 *   post:
 *     tags: [Courses]
 *     summary: Yangi kurs yaratish
 *     description: Faqat teacher va adminlar uchun
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourseCreate'
 *     responses:
 *       201:
 *         description: Kurs yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Xato ma'lumotlar
 */

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     tags: [Courses]
 *     summary: Kurs detallari
 *     description: Kurs haqida to'liq ma'lumot, shu jumladan darslar soni va o'qituvchi ma'lumoti
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kurs ID
 *     responses:
 *       200:
 *         description: Kurs ma'lumotlari
 *       404:
 *         description: Kurs topilmadi
 */

/**
 * @swagger
 * /api/courses/{id}:
 *   patch:
 *     tags: [Courses]
 *     summary: Kursni yangilash
 *     description: Faqat teacher va adminlar uchun. Teacher faqat o'z kursini tahrirlay oladi.
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
 *             $ref: '#/components/schemas/CourseCreate'
 *     responses:
 *       200:
 *         description: Kurs yangilandi
 *       403:
 *         description: Ruxsat yo'q
 *       404:
 *         description: Kurs topilmadi
 */

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     tags: [Courses]
 *     summary: Kursni o'chirish
 *     description: Faqat teacher va adminlar uchun
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
 *         description: Kurs o'chirildi
 *       404:
 *         description: Kurs topilmadi
 */

/**
 * @swagger
 * /api/courses/{id}/enroll:
 *   post:
 *     tags: [Courses]
 *     summary: Kursga yozilish
 *     description: Student kursga o'zini yozishi
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Kursga yozildi
 *       409:
 *         description: Allaqachon yozilgan
 */

/**
 * @swagger
 * /api/courses/{id}/enrollments:
 *   get:
 *     tags: [Courses]
 *     summary: Kursga yozilgan o'quvchilar
 *     description: Faqat teacher va adminlar uchun
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
 *         description: Yozilgan o'quvchilar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Enrollment'
 */

/**
 * @swagger
 * /api/courses/enrolled:
 *   get:
 *     tags: [Courses]
 *     summary: Mening kurslarim
 *     description: Student o'zi yozilgan kurslar ro'yxati
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kurslar ro'yxati
 */
