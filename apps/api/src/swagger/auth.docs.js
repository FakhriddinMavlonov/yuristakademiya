/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: password123
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - phone
 *         - password
 *         - role
 *       properties:
 *         firstName:
 *           type: string
 *           example: Ali
 *         lastName:
 *           type: string
 *           example: Valiyev
 *         phone:
 *           type: string
 *           example: "+998901234567"
 *         email:
 *           type: string
 *           format: email
 *           example: ali@example.com
 *         password:
 *           type: string
 *           minLength: 6
 *           example: password123
 *         role:
 *           type: string
 *           enum: [student, teacher]
 *           example: student
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT token
 *         user:
 *           $ref: '#/components/schemas/User'
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, teacher, student]
 *         is_active:
 *           type: boolean
 *         is_verified:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Xatolik tavsifi
 *     AuthMeResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User'
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           description: Joriy parol
 *         newPassword:
 *           type: string
 *           minLength: 6
 *           description: Yangi parol (kamida 6 belgi)
 */

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Autentifikatsiya va ro'yxatdan o'tish
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Yangi foydalanuvchi ro'yxatdan o'tkazish
 *     description: |
 *       Student yoki Teacher ro'yxatdan o'tishi mumkin.
 *       Telefon raqam unikal bo'lishi kerak.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Muvaffaqiyatli ro'yxatdan o'tildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Xato ma'lumotlar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Telefon raqam allaqachon ro'yxatdan o'tgan
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Tizimga kirish
 *     description: Email/Phone + password orqali tizimga kirish
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Muvaffaqiyatli kirish
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Noto'g'ri email/parol
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Joriy foydalanuvchi ma'lumotlari
 *     description: Token orqali joriy foydalanuvchi profilini olish
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Foydalanuvchi ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthMeResponse'
 *       401:
 *         description: Token noto'g'ri yoki muddati o'tgan
 */

/**
 * @swagger
 * /api/auth/profile:
 *   patch:
 *     tags: [Auth]
 *     summary: Profilni yangilash
 *     description: Foydalanuvchi o'z profil ma'lumotlarini yangilashi
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil yangilandi
 *       400:
 *         description: Xato ma'lumotlar
 */

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Parolni o'zgartirish
 *     description: Joriy parolni tekshirib, yangi parol o'rnatish
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Parol muvaffaqiyatli o'zgartirildi
 *       400:
 *         description: Joriy parol noto'g'ri yoki yangi parol talabga javob bermaydi
 */
