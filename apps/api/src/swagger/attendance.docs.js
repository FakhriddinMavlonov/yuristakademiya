/**
 * @swagger
 * components:
 *   schemas:
 *     AttendanceRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         group_id:
 *           type: integer
 *         date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [present, late, absent, excused]
 *         note:
 *           type: string
 *         marked_by:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *     AttendanceStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *         present:
 *           type: integer
 *         late:
 *           type: integer
 *         absent:
 *           type: integer
 *         excused:
 *           type: integer
 *         rate:
 *           type: number
 *           description: Davomat foizi
 */

/**
 * @swagger
 * tags:
 *   - name: Attendance
 *     description: Davomat
 */

/**
 * @swagger
 * /api/attendance/my:
 *   get:
 *     tags: [Attendance]
 *     summary: Mening davomat tarixim
 *     description: Student o'z davomat tarixini ko'rish (oxirgi 90 kun)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Davomat tarixi va statistika
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 records:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AttendanceRecord'
 *                 stats:
 *                   $ref: '#/components/schemas/AttendanceStats'
 */

/**
 * @swagger
 * /api/attendance/group/{groupId}/date/{date}:
 *   get:
 *     tags: [Attendance]
 *     summary: Guruhning sana bo'yicha davomati
 *     description: Teacher/admin guruhdagi barcha o'quvchilarning bir sana uchun davomatini ko'rish
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
 *         example: "2024-01-15"
 *     responses:
 *       200:
 *         description: Davomat ro'yxati
 */

/**
 * @swagger
 * /api/attendance/group/{groupId}/date/{date}:
 *   post:
 *     tags: [Attendance]
 *     summary: Davomatni belgilash
 *     description: |
 *       Bir sana uchun barcha o'quvchilarning davomatini bir yo'la belgilash.
 *       Status: present (keldi), late (kechikdi), absent (kelmadi), excused (uzrli)
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
 *                   type: object
 *                   required:
 *                     - userId
 *                     - status
 *                   properties:
 *                     userId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       enum: [present, late, absent, excused]
 *                     note:
 *                       type: string
 *     responses:
 *       200:
 *         description: Davomat belgilandi
 */

/**
 * @swagger
 * /api/attendance/group/{groupId}/student/{studentId}:
 *   get:
 *     tags: [Attendance]
 *     summary: O'quvchining guruhdagi davomat tarixi
 *     description: |
 *       O'quvchining ma'lum guruhdagi davomat tarixi va statistika.
 *       Teacher/admin va student (o'zi) ko'rishi mumkin.
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
 *         description: Davomat tarixi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 records:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AttendanceRecord'
 *                 stats:
 *                   $ref: '#/components/schemas/AttendanceStats'
 */

/**
 * @swagger
 * /api/attendance/group/{groupId}/stats:
 *   get:
 *     tags: [Attendance]
 *     summary: Guruh davomat statistikasi
 *     description: Guruhdagi barcha o'quvchilarning davomat foizlari
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
 *         description: Davomat statistika
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
 *                   present:
 *                     type: integer
 *                   late:
 *                     type: integer
 *                   absent:
 *                     type: integer
 *                   excused:
 *                     type: integer
 *                   total:
 *                     type: integer
 *                   attendance_rate:
 *                     type: number
 */
