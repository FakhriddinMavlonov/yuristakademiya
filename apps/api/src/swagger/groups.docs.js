/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         course_id:
 *           type: integer
 *         course_title:
 *           type: string
 *         teacher_id:
 *           type: integer
 *         teacher_name:
 *           type: string
 *         start_date:
 *           type: string
 *           format: date
 *         end_date:
 *           type: string
 *           format: date
 *         shift:
 *           type: string
 *           enum: [morning, afternoon, evening]
 *         capacity:
 *           type: integer
 *         student_count:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [active, completed, cancelled]
 *         created_at:
 *           type: string
 *           format: date-time
 *     GroupCreate:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         courseId:
 *           type: integer
 *         teacherId:
 *           type: integer
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         shift:
 *           type: string
 *           enum: [morning, afternoon, evening]
 *         capacity:
 *           type: integer
 *     ScheduleSlot:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         group_id:
 *           type: integer
 *         weekday:
 *           type: integer
 *           description: "0=Sunday, 1=Monday, ..., 6=Saturday"
 *         start_time:
 *           type: string
 *         end_time:
 *           type: string
 *         room:
 *           type: string
 *     GroupLesson:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         group_id:
 *           type: integer
 *         order_num:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         video_url:
 *           type: string
 *         is_completed:
 *           type: boolean
 *         completed_at:
 *           type: string
 *           format: date-time
 *         material_count:
 *           type: integer
 *         materials:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/GroupLessonMaterial'
 *     GroupLessonMaterial:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         group_lesson_id:
 *           type: integer
 *         name:
 *           type: string
 *         file_url:
 *           type: string
 *         file_type:
 *           type: string
 *         file_size_bytes:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Groups
 *     description: Guruhlar
 */

/**
 * @swagger
 * /api/groups:
 *   get:
 *     tags: [Groups]
 *     summary: Guruhlar ro'yxati
 *     description: |
 *       Roli bo'yicha guruhlar:
 *       - **Admin**: barcha guruhlar
 *       - **Teacher**: o'z guruhlari
 *       - **Student**: o'zi a'zo bo'lgan guruhlar
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Guruhlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 */

/**
 * @swagger
 * /api/groups:
 *   post:
 *     tags: [Groups]
 *     summary: Yangi guruh yaratish
 *     description: Faqat admin yoki teacher
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupCreate'
 *     responses:
 *       201:
 *         description: Guruh yaratildi
 */

/**
 * @swagger
 * /api/groups/{id}:
 *   get:
 *     tags: [Groups]
 *     summary: Guruh detallari
 *     description: |
 *       Guruh haqida to'liq ma'lumot:
 *       - O'quvchilar ro'yxati (davomat statistikasi bilan)
 *       - Dars jadvali
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
 *         description: Guruh ma'lumotlari
 */

/**
 * @swagger
 * /api/groups/{id}:
 *   patch:
 *     tags: [Groups]
 *     summary: Guruhni yangilash
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
 *             $ref: '#/components/schemas/GroupCreate'
 *     responses:
 *       200:
 *         description: Guruh yangilandi
 */

/**
 * @swagger
 * /api/groups/{id}:
 *   delete:
 *     tags: [Groups]
 *     summary: Guruhni o'chirish
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
 *         description: Guruh o'chirildi
 */

/**
 * @swagger
 * /api/groups/{id}/students:
 *   post:
 *     tags: [Groups]
 *     summary: Guruhga o'quvchi qo'shish
 *     description: Faqat teacher/admin. Teacher faqat o'z guruhiga va o'z o'quvchisini qo'sha oladi.
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
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: O'quvchi qo'shildi
 */

/**
 * @swagger
 * /api/groups/{id}/students/{userId}:
 *   delete:
 *     tags: [Groups]
 *     summary: Guruhdan o'quvchini olib tashlash
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: O'quvchi olib tashlandi
 */

/**
 * @swagger
 * /api/groups/{id}/schedule:
 *   put:
 *     tags: [Groups]
 *     summary: Guruh dars jadvalini o'rnatish
 *     description: Eski jadval o'chirilib, yangisi yoziladi
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
 *             required:
 *               - slots
 *             properties:
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     weekday:
 *                       type: integer
 *                       description: "0=Sunday ... 6=Saturday"
 *                     startTime:
 *                       type: string
 *                       example: "14:00"
 *                     endTime:
 *                       type: string
 *                       example: "16:00"
 *                     room:
 *                       type: string
 *     responses:
 *       200:
 *         description: Jadval saqlandi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ScheduleSlot'
 */

/**
 * @swagger
 * /api/groups/{id}/lessons:
 *   get:
 *     tags: [Groups]
 *     summary: Guruh darslari ro'yxati
 *     description: Guruhdagi darslar ro'yxati materiallar bilan birga
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
 *         description: Darslar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GroupLesson'
 */

/**
 * @swagger
 * /api/groups/{id}/apply-curriculum:
 *   post:
 *     tags: [Groups]
 *     summary: Guruhga o'quv rejasini qo'llash
 *     description: |
 *       Tanlangan o'quv rejasidagi barcha darslarni guruhga qo'shish.
 *       Darslar mavjud darslardan keyin qo'shiladi.
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
 *             required:
 *               - curriculumId
 *             properties:
 *               curriculumId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Darslar qo'shildi
 */

/**
 * @swagger
 * /api/groups/{id}/lessons:
 *   post:
 *     tags: [Groups]
 *     summary: Guruhga yangi dars qo'shish
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
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Dars qo'shildi
 */

/**
 * @swagger
 * /api/groups/{id}/lessons/{lid}:
 *   patch:
 *     tags: [Groups]
 *     summary: Guruh darsini yangilash
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lid
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
 *         description: Dars yangilandi
 */

/**
 * @swagger
 * /api/groups/{id}/lessons/{lid}/video:
 *   post:
 *     tags: [Groups]
 *     summary: Guruh darsiga video yuklash
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lid
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
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Video yuklandi
 */

/**
 * @swagger
 * /api/groups/{id}/lessons/{lid}/materials:
 *   post:
 *     tags: [Groups]
 *     summary: Guruh darsiga material yuklash
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lid
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
 *               file:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Material yuklandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GroupLessonMaterial'
 */

/**
 * @swagger
 * /api/groups/{id}/lessons/{lid}/complete:
 *   post:
 *     tags: [Groups]
 *     summary: Guruh darsini yakunlash
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dars yakunlandi
 */

/**
 * @swagger
 * /api/groups/{id}/lessons/{lid}:
 *   delete:
 *     tags: [Groups]
 *     summary: Guruh darsini o'chirish
 *     description: Video ham CDN dan o'chiriladi
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dars o'chirildi
 */
