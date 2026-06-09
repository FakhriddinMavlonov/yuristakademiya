/**
 * @swagger
 * components:
 *   schemas:
 *     Meeting:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         group_id:
 *           type: integer
 *         group_name:
 *           type: string
 *         teacher_id:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         room_name:
 *           type: string
 *           description: Daily.co room name
 *         room_url:
 *           type: string
 *           description: Daily.co room URL
 *         start_time:
 *           type: string
 *           format: date-time
 *         end_time:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [scheduled, started, ended]
 *         is_recurring:
 *           type: boolean
 *         recurrence_rule:
 *           type: string
 *         created_by:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Meetings
 *     description: Video uchrashuvlar (Daily.co)
 */

/**
 * @swagger
 * /api/meetings:
 *   get:
 *     tags: [Meetings]
 *     summary: Uchrashuvlar ro'yxati
 *     description: |
 *       - **Teacher**: o'z uchrashuvlari
 *       - **Student**: o'zi a'zo guruhlardagi uchrashuvlar
 *       - **Admin**: barcha uchrashuvlar
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: integer
 *         description: Guruh ID bo'yicha filtr
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, started, ended]
 *         description: Status bo'yicha filtr
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Boshlanish sanasidan filtr
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Tugash sanasigacha filtr
 *     responses:
 *       200:
 *         description: Uchrashuvlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Meeting'
 */

/**
 * @swagger
 * /api/meetings:
 *   post:
 *     tags: [Meetings]
 *     summary: Yangi uchrashuv yaratish
 *     description: |
 *       Daily.co orqali video uchrashuv xonasi yaratish.
 *       Takrorlanuvchi uchrashuvlar qo'llab-quvvatlanadi.
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
 *               - startTime
 *               - groupId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               groupId:
 *                 type: integer
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               isRecurring:
 *                 type: boolean
 *               recurrenceRule:
 *                 type: string
 *                 description: "RRULE formatida, masalan: FREQ=WEEKLY;BYDAY=MO,WE"
 *     responses:
 *       201:
 *         description: Uchrashuv yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Meeting'
 */

/**
 * @swagger
 * /api/meetings/{id}:
 *   get:
 *     tags: [Meetings]
 *     summary: Uchrashuv detallari
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
 *         description: Uchrashuv ma'lumotlari
 */

/**
 * @swagger
 * /api/meetings/{id}:
 *   patch:
 *     tags: [Meetings]
 *     summary: Uchrashuvni yangilash
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
 *         description: Uchrashuv yangilandi
 */

/**
 * @swagger
 * /api/meetings/{id}:
 *   delete:
 *     tags: [Meetings]
 *     summary: Uchrashuvni o'chirish
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
 *         description: Uchrashuv o'chirildi
 */

/**
 * @swagger
 * /api/meetings/{id}/join:
 *   get:
 *     tags: [Meetings]
 *     summary: Uchrashuvga qo'shilish
 *     description: |
 *       Uchrashuv uchun Daily.co token va URL qaytaradi.
 *       Token orqali foydalanuvchi nomi va roli avtomatik belgilanadi.
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
 *         description: Uchrashuv linki
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room_url:
 *                   type: string
 *                 token:
 *                   type: string
 *                 room_name:
 *                   type: string
 */

/**
 * @swagger
 * /api/meetings/today:
 *   get:
 *     tags: [Meetings]
 *     summary: Bugungi uchrashuvlar
 *     description: Bugungi kunga rejalashtirilgan barcha uchrashuvlar
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bugungi uchrashuvlar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Meeting'
 */

/**
 * @swagger
 * /api/meetings/upcoming:
 *   get:
 *     tags: [Meetings]
 *     summary: Kelgusi uchrashuvlar
 *     description: Joriy vaqtdan keyingi uchrashuvlar
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kelgusi uchrashuvlar
 */
