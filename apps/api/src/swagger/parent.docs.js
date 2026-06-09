/**
 * @swagger
 * components:
 *   schemas:
 *     ParentLink:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         student_id:
 *           type: integer
 *         parent_phone:
 *           type: string
 *         parent_name:
 *           type: string
 *         verified_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *     ParentStudentStats:
 *       type: object
 *       properties:
 *         student:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         attendance:
 *           type: object
 *           properties:
 *             rate:
 *               type: number
 *             present:
 *               type: integer
 *             total:
 *               type: integer
 *         tests:
 *           type: object
 *           properties:
 *             count:
 *               type: integer
 *             avg_score:
 *               type: number
 *         assignments:
 *           type: object
 *           properties:
 *             submitted:
 *               type: integer
 *         grades:
 *           type: object
 *           properties:
 *             count:
 *               type: integer
 *             avg_grade:
 *               type: number
 *         lessons:
 *           type: object
 *           properties:
 *             completed:
 *               type: integer
 *             total:
 *               type: integer
 *             completion_rate:
 *               type: number
 *     ParentWeeklyReport:
 *       type: object
 *       properties:
 *         student:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         groups:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               name:
 *                 type: string
 *               shift:
 *                 type: string
 *         reportPeriod:
 *           type: object
 *           properties:
 *             from:
 *               type: string
 *               format: date
 *             to:
 *               type: string
 *               format: date
 *         online:
 *           type: object
 *           properties:
 *             lessons:
 *               type: object
 *             tests:
 *               type: object
 *             assignments:
 *               type: object
 *         offline:
 *           type: object
 *           properties:
 *             attendance:
 *               type: object
 *             grades:
 *               type: object
 *             exams:
 *               type: object
 *         gamification:
 *           type: object
 *           properties:
 *             xp:
 *               type: integer
 *             level:
 *               type: integer
 *             streak:
 *               type: integer
 */

/**
 * @swagger
 * tags:
 *   - name: Parent
 *     description: Ota-onalar paneli
 */

/**
 * @swagger
 * /api/parent/students:
 *   get:
 *     tags: [Parent]
 *     summary: Bog'langan o'quvchilar ro'yxati
 *     description: |
 *       Telefon raqam orqali ota-onaga bog'langan o'quvchilar ro'yxati.
 *       Autentifikatsiya talab qilinmaydi.
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: Ota-onaning telefon raqami
 *         example: "+998901234567"
 *     responses:
 *       200:
 *         description: Bog'langan o'quvchilar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   student_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   verified:
 *                     type: boolean
 *                   linked_at:
 *                     type: string
 *                     format: date-time
 */

/**
 * @swagger
 * /api/parent/link:
 *   post:
 *     tags: [Parent]
 *     summary: Ota-onani o'quvchiga bog'lash
 *     description: |
 *       Teacher/admin tomonidan ota-onani o'quvchiga bog'lash.
 *       Telefon raqam orqali bog'lanadi.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - student_id
 *               - phone
 *             properties:
 *               student_id:
 *                 type: integer
 *               phone:
 *                 type: string
 *                 description: Ota-onaning telefon raqami
 *               name:
 *                 type: string
 *                 description: Ota-onaning ismi
 *     responses:
 *       201:
 *         description: Bog'landi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParentLink'
 */

/**
 * @swagger
 * /api/parent/students/{id}/stats:
 *   get:
 *     tags: [Parent]
 *     summary: O'quvchi statistikasi (teacher/admin)
 *     description: |
 *       O'quvchining o'zlashtirish statistikasi.
 *       So'nggi 30 kunlik ma'lumotlar.
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
 *         description: Statistika
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParentStudentStats'
 */

/**
 * @swagger
 * /api/parent/students/{id}/stats-public:
 *   get:
 *     tags: [Parent]
 *     summary: O'quvchi statistikasi (ota-ona)
 *     description: |
 *       Telefon raqam orqali tekshirilgan holda o'quvchi statistikasi.
 *       Autentifikatsiya talab qilinmaydi.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statistika
 *       403:
 *         description: Bog'lanmagan
 */

/**
 * @swagger
 * /api/parent/report/{studentId}:
 *   get:
 *     tags: [Parent]
 *     summary: Haftalik hisobot
 *     description: |
 *       O'quvchining haftalik to'liq hisoboti (online va offline ma'lumotlar).
 *       Telefon raqam orqali tekshiriladi.
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Haftalik hisobot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParentWeeklyReport'
 *       403:
 *         description: Bog'lanmagan
 */

/**
 * @swagger
 * /api/parent/report/subscribe:
 *   post:
 *     tags: [Parent]
 *     summary: Hisobotga obuna bo'lish (teacher/admin)
 *     description: |
 *       Ota-onani avtomatik hisobot olishga obuna qilish.
 *       Telegram orqali yuboriladi.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parentPhone
 *               - studentId
 *             properties:
 *               parentPhone:
 *                 type: string
 *               studentId:
 *                 type: integer
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *                 default: weekly
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Obuna sozlandi
 */

/**
 * @swagger
 * /api/parent/report/subscribe/phone:
 *   post:
 *     tags: [Parent]
 *     summary: Hisobotga obuna bo'lish (ota-ona)
 *     description: |
 *       Ota-ona o'z telefon raqami orqali hisobotga obuna bo'lishi.
 *       Autentifikatsiya talab qilinmaydi.
 *       Faqat oldin bog'langan ota-onalar uchun.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - studentId
 *             properties:
 *               phone:
 *                 type: string
 *               studentId:
 *                 type: integer
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *                 default: weekly
 *     responses:
 *       200:
 *         description: Obuna bo'lindi
 *       403:
 *         description: Bog'lanmagan
 */

/**
 * @swagger
 * /api/parent/report/subscription:
 *   get:
 *     tags: [Parent]
 *     summary: Obuna holatini tekshirish
 *     description: |
 *       Ota-onaning hisobot obuna holatini tekshirish.
 *       Autentifikatsiya talab qilinmaydi.
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Obuna holati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 is_active:
 *                   type: boolean
 *                 frequency:
 *                   type: string
 *                 last_sent_at:
 *                   type: string
 *                   format: date-time
 */
