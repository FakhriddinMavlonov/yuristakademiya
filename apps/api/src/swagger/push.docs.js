/**
 * @swagger
 * components:
 *   schemas:
 *     PushSubscription:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         endpoint:
 *           type: string
 *         p256dh:
 *           type: string
 *         auth:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     PushSubscriptionCreate:
 *       type: object
 *       required:
 *         - endpoint
 *         - p256dh
 *         - auth
 *       properties:
 *         endpoint:
 *           type: string
 *         p256dh:
 *           type: string
 *         auth:
 *           type: string
 *     PushNotification:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         body:
 *           type: string
 *         icon:
 *           type: string
 *         url:
 *           type: string
 */

/**
 * @swagger
 * tags:
 *   - name: Push
 *     description: Push bildirishnomalar (Web Push)
 */

/**
 * @swagger
 * /api/push/subscribe:
 *   post:
 *     tags: [Push]
 *     summary: Push bildirishnomaga obuna bo'lish
 *     description: |
 *       Brauzer Web Push API orqali bildirishnoma olish uchun obuna bo'lish.
 *       Service worker orqali ishlaydi.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PushSubscriptionCreate'
 *     responses:
 *       201:
 *         description: Obuna bo'lindi
 */

/**
 * @swagger
 * /api/push/unsubscribe:
 *   post:
 *     tags: [Push]
 *     summary: Push bildirishnomadan chiqish
 *     description: Obunani bekor qilish
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpoint
 *             properties:
 *               endpoint:
 *                 type: string
 *     responses:
 *       200:
 *         description: Obuna bekor qilindi
 */

/**
 * @swagger
 * /api/push/send:
 *   post:
 *     tags: [Push]
 *     summary: Push bildirishnoma yuborish
 *     description: |
 *       Ma'lum foydalanuvchiga push bildirishnoma yuborish.
 *       Teacher/admin uchun.
 *       Bildirishnoma Web Push API orqali yuboriladi.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - title
 *               - body
 *             properties:
 *               userId:
 *                 type: integer
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bildirishnoma yuborildi
 */

/**
 * @swagger
 * /api/push/send/bulk:
 *   post:
 *     tags: [Push]
 *     summary: Bir nechta foydalanuvchiga push yuborish
 *     description: Bir vaqtning o'zida bir nechta foydalanuvchiga bildirishnoma yuborish
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - title
 *               - body
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bildirishnomalar yuborildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sent:
 *                   type: integer
 *                 failed:
 *                   type: integer
 */
