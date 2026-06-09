/**
 * @swagger
 * components:
 *   schemas:
 *     ChatConversation:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         student_id:
 *           type: integer
 *         teacher_id:
 *           type: integer
 *         group_id:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [active, resolved]
 *         last_message_at:
 *           type: string
 *           format: date-time
 *         unread_count:
 *           type: integer
 *         last_message:
 *           type: string
 *         student_name:
 *           type: string
 *         teacher_name:
 *           type: string
 *     ChatMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         conversation_id:
 *           type: integer
 *         sender_id:
 *           type: integer
 *         message:
 *           type: string
 *         file_url:
 *           type: string
 *         file_name:
 *           type: string
 *         read_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Chat
 *     description: Xabarlar (o'qituvchi-o'quvchi chat)
 */

/**
 * @swagger
 * /api/chat:
 *   post:
 *     tags: [Chat]
 *     summary: Yangi suhbat boshlash
 *     description: |
 *       Student tomonidan o'qituvchiga yangi suhbat ochish.
 *       Agar allaqachon ochiq suhbat bo'lsa, uning ID si qaytariladi.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teacherId
 *             properties:
 *               teacherId:
 *                 type: integer
 *               groupId:
 *                 type: integer
 *               message:
 *                 type: string
 *                 description: Birinchi xabar matni
 *     responses:
 *       201:
 *         description: Suhbat boshlandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatConversation'
 */

/**
 * @swagger
 * /api/chat:
 *   get:
 *     tags: [Chat]
 *     summary: Suhbatlar ro'yxati
 *     description: |
 *       - **Student**: o'zining barcha suhbatlari
 *       - **Teacher**: o'ziga yozilgan barcha suhbatlar
 *       - **Admin**: barcha suhbatlar
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, resolved]
 *     responses:
 *       200:
 *         description: Suhbatlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatConversation'
 */

/**
 * @swagger
 * /api/chat/{id}:
 *   get:
 *     tags: [Chat]
 *     summary: Suhbat xabarlari
 *     description: Suhbatdagi barcha xabarlar (20 tadan 1 sahifa)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: before
 *         schema:
 *           type: integer
 *         description: Ma'lum xabardan oldingilarni olish (pagination)
 *     responses:
 *       200:
 *         description: Xabarlar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversation:
 *                   $ref: '#/components/schemas/ChatConversation'
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChatMessage'
 */

/**
 * @swagger
 * /api/chat/{id}:
 *   post:
 *     tags: [Chat]
 *     summary: Xabar yuborish
 *     description: Mavjud suhbatga yangi xabar yuborish
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
 *               message:
 *                 type: string
 *                 description: Xabar matni
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fayl (rasm, pdf va h.k.)
 *     responses:
 *       201:
 *         description: Xabar yuborildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatMessage'
 */

/**
 * @swagger
 * /api/chat/{id}/read:
 *   post:
 *     tags: [Chat]
 *     summary: Xabarlarni o'qilgan deb belgilash
 *     description: Suhbatdagi barcha o'qilmagan xabarlarni o'qilgan deb belgilaydi
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
 *         description: O'qildi
 */

/**
 * @swagger
 * /api/chat/{id}/resolve:
 *   post:
 *     tags: [Chat]
 *     summary: Suhbatni yakunlash
 *     description: Suhbatni "resolved" statusiga o'tkazish. Teacher/admin uchun.
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
 *         description: Suhbat yakunlandi
 */

/**
 * @swagger
 * /api/chat/unread:
 *   get:
 *     tags: [Chat]
 *     summary: O'qilmagan xabarlar soni
 *     description: Jami o'qilmagan xabarlar sonini qaytaradi
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: O'qilmagan xabarlar soni
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 conversations:
 *                   type: integer
 */

/**
 * @swagger
 * /api/chat/group/{groupId}:
 *   get:
 *     tags: [Chat]
 *     summary: Guruh suhbatlari
 *     description: Guruhga tegishli barcha suhbatlarni olish (teacher/admin uchun)
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
 *         description: Suhbatlar ro'yxati
 */
