/**
 * @swagger
 * components:
 *   schemas:
 *     TeacherAnalytics:
 *       type: object
 *       properties:
 *         teacher_id:
 *           type: integer
 *         groups:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               name:
 *                 type: string
 *               student_count:
 *                 type: integer
 *               avg_grade:
 *                 type: number
 *               attendance_rate:
 *                 type: number
 *         top_students:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               xp:
 *                 type: integer
 *               streak:
 *                 type: integer
 *         bottom_students:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               xp:
 *                 type: integer
 *               streak:
 *                 type: integer
 *         assignment_submission_rate:
 *           type: number
 *     StudentAnalytics:
 *       type: object
 *       properties:
 *         student_id:
 *           type: integer
 *         attendance:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               group:
 *                 type: string
 *               rate:
 *                 type: number
 *         tests:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               course:
 *                 type: string
 *               avg_score:
 *                 type: number
 *               test_count:
 *                 type: integer
 *         lessons:
 *           type: object
 *           properties:
 *             completed:
 *               type: integer
 *             total:
 *               type: integer
 *             completion_rate:
 *               type: number
 *         daily_grades:
 *           type: object
 *           properties:
 *             avg:
 *               type: number
 *         xp:
 *           type: object
 *           properties:
 *             total_xp:
 *               type: integer
 *             daily_streak:
 *               type: integer
 */

/**
 * @swagger
 * tags:
 *   - name: Analytics
 *     description: Analitika
 */

/**
 * @swagger
 * /api/analytics/student/{id}:
 *   get:
 *     tags: [Analytics]
 *     summary: O'quvchi analitikasi
 *     description: |
 *       O'quvchining batafsil analitik ma'lumotlari:
 *       - Guruhlar bo'yicha davomat
 *       - Kurslar bo'yicha test natijalari
 *       - Dars o'zlashtirish foizi
 *       - O'rtacha baho
 *       - XP va streak
 *       Teacher faqat o'z o'quvchilarini ko'ra oladi.
 *       Student faqat o'z ma'lumotlarini ko'ra oladi.
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
 *         description: Analitika ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentAnalytics'
 *       403:
 *         description: Ruxsat yo'q
 *       404:
 *         description: O'quvchi topilmadi
 */

/**
 * @swagger
 * /api/analytics/teacher:
 *   get:
 *     tags: [Analytics]
 *     summary: O'qituvchi analitikasi (dashboard)
 *     description: |
 *       O'qituvchi uchun umumiy dashboard ma'lumotlari:
 *       - Guruhlar bo'yicha o'rtacha baho va davomat
 *       - TOP 5 va eng past 5 o'quvchi (XP bo'yicha)
 *       - Topshiriq topshirish foizi
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeacherAnalytics'
 */
