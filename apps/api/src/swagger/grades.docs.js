/**
 * @swagger
 * components:
 *   schemas:
 *     DailyGrade:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         group_id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         date:
 *           type: string
 *           format: date
 *         score:
 *           type: integer
 *           description: "Baholash (0-10)"
 *         comment:
 *           type: string
 *         marked_by:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *     GradeRecord:
 *       type: object
 *       required:
 *         - userId
 *         - score
 *       properties:
 *         userId:
 *           type: integer
 *         score:
 *           type: integer
 *           description: "Baho (0-10)"
 *         comment:
 *           type: string
 */

/**
 * @swagger
 * tags:
 *   - name: Grades
 *     description: Kundalik baholar
 */

/**
 * @swagger
 * /api/grades/my:
 *   get:
 *     tags: [Grades]
 *     summary: Mening baholarim tarixi
 *     description: Student o'zining barcha baholarini ko'rish (oxirgi 90 ta)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Baholar tarixi va statistika
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 records:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DailyGrade'
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     avg:
 *                       type: number
 *                     best:
 *                       type: integer
 */

/**
 * @swagger
 * /api/grades/group/{groupId}/date/{date}:
 *   get:
 *     tags: [Grades]
 *     summary: Guruhning sana bo'yicha baholari
 *     description: Teacher/admin ma'lum sana uchun guruhdagi o'quvchilarning baholarini ko'rish
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Baholar ro'yxati
 */

/**
 * @swagger
 * /api/grades/group/{groupId}/date/{date}:
 *   post:
 *     tags: [Grades]
 *     summary: Baholarni qo'yish
 *     description: |
 *       Bir sana uchun guruhdagi o'quvchilarga baho qo'yish (0-10).
 *       Avvalgi baho bo'lsa, yangilanadi.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - records
 *             properties:
 *               records:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/GradeRecord'
 *     responses:
 *       200:
 *         description: Baholar saqlandi
 */

/**
 * @swagger
 * /api/grades/group/{groupId}/student/{studentId}:
 *   get:
 *     tags: [Grades]
 *     summary: O'quvchining guruhdagi baholari tarixi
 *     description: Ma'lum o'quvchining guruhdagi baholar tarixi (oxirgi 60 ta)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Baholar tarixi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 records:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DailyGrade'
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     avg:
 *                       type: number
 */

/**
 * @swagger
 * /api/grades/group/{groupId}/stats:
 *   get:
 *     tags: [Grades]
 *     summary: Guruh baho statistikasi
 *     description: Guruhdagi barcha o'quvchilarning o'rtacha baholari
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Baho statistika
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                   grade_count:
 *                     type: integer
 *                   avg_score:
 *                     type: number
 *                   min_score:
 *                     type: integer
 *                   max_score:
 *                     type: integer
 */
