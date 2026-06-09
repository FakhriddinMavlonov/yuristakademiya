/**
 * @swagger
 * components:
 *   schemas:
 *     GamificationStats:
 *       type: object
 *       properties:
 *         userId:
 *           type: integer
 *         total_xp:
 *           type: integer
 *         current_level:
 *           type: integer
 *         xp_in_level:
 *           type: integer
 *         xp_to_next_level:
 *           type: integer
 *         daily_streak:
 *           type: integer
 *         longest_streak:
 *           type: integer
 *         last_active_date:
 *           type: string
 *           format: date
 *         badges:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *               name:
 *                 type: string
 *               emoji:
 *                 type: string
 *     LeaderboardEntry:
 *       type: object
 *       properties:
 *         rank:
 *           type: integer
 *         user_id:
 *           type: integer
 *         name:
 *           type: string
 *         total_xp:
 *           type: integer
 *         daily_streak:
 *           type: integer
 *         current_level:
 *           type: integer
 */

/**
 * @swagger
 * tags:
 *   - name: Gamification
 *     description: XP, daraja va badge
 */

/**
 * @swagger
 * /api/gamification/stats:
 *   get:
 *     tags: [Gamification]
 *     summary: Foydalanuvchi statistikasi
 *     description: |
 *       Joriy foydalanuvchining XP, daraja, streak va badge ma'lumotlari.
 *       XP darajalari: har 100 XP = 1 level.
 *       Badgelar: streak (3/7/30 kun), XP (100/500/1000) va boshqalar.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistika
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GamificationStats'
 */

/**
 * @swagger
 * /api/gamification/leaderboard:
 *   get:
 *     tags: [Gamification]
 *     summary: Reyting jadvali
 *     description: |
 *       O'quvchilarning XP bo'yicha reytingi (TOP 20).
 *       Guruh bo'yicha filtrlash mumkin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: integer
 *         description: Guruh ID bo'yicha filtr
 *     responses:
 *       200:
 *         description: Reyting jadvali
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LeaderboardEntry'
 */

/**
 * @swagger
 * /api/gamification/streak:
 *   post:
 *     tags: [Gamification]
 *     summary: Daily streak yangilash
 *     description: |
 *       Foydalanuvchining kunlik aktivligini qayd etish.
 *       Har kuni bir marta chaqirish mumkin.
 *       Streak uzluksiz bo'lganda 10 XP beriladi.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Streak yangilandi
 */
