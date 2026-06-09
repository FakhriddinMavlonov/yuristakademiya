/**
 * @swagger
 * components:
 *   schemas:
 *     AdminOverview:
 *       type: object
 *       properties:
 *         total_users:
 *           type: integer
 *         total_students:
 *           type: integer
 *         total_teachers:
 *           type: integer
 *         total_courses:
 *           type: integer
 *         total_groups:
 *           type: integer
 *         total_exams:
 *           type: integer
 *         recent_users:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         recent_activities:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               user_name:
 *                 type: string
 *               action:
 *                 type: string
 *               description:
 *                 type: string
 *               created_at:
 *                 type: string
 *                 format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Admin boshqaruv paneli
 */

/**
 * @swagger
 * /api/admin/overview:
 *   get:
 *     tags: [Admin]
 *     summary: Admin dashboard overview
 *     description: |
 *       Umumiy statistika:
 *       - Foydalanuvchilar soni (student/teacher)
 *       - Kurslar, guruhlar, imtihonlar soni
 *       - Oxirgi ro'yxatdan o'tganlar
 *       - Oxirgi faoliyatlar
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminOverview'
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Barcha foydalanuvchilar
 *     description: |
 *       Rol bo'yicha filtrlab, sahifalab olish.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [student, teacher, admin]
 *         description: Rol bo'yicha filtr
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Ism, familiya yoki telefon bo'yicha qidirish
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sahifa raqami
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Foydalanuvchilar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */

/**
 * @swagger
 * /api/admin/users/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Foydalanuvchini yangilash
 *     description: |
 *       Admin tomonidan foydalanuvchi ma'lumotlarini o'zgartirish.
 *       Rol, aktivlik holati va boshqa ma'lumotlarni o'zgartirish mumkin.
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
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [student, teacher, admin]
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Foydalanuvchi yangilandi
 */

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Foydalanuvchini o'chirish
 *     description: Foydalanuvchini butunlay o'chirish
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
 *         description: O'chirildi
 */

/**
 * @swagger
 * /api/admin/courses:
 *   get:
 *     tags: [Admin]
 *     summary: Barcha kurslar
 *     description: Admin barcha kurslarni ko'rishi va boshqarishi
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kurslar ro'yxati
 */

/**
 * @swagger
 * /api/admin/audit-log:
 *   get:
 *     tags: [Admin]
 *     summary: Audit log
 *     description: |
 *       Admin amallari tarixi.
 *       Kim, qachon, nima qilgani kuzatiladi.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Audit log
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       user_id:
 *                         type: integer
 *                       user_role:
 *                         type: string
 *                       action:
 *                         type: string
 *                       details:
 *                         type: object
 *                       ip_address:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 */
