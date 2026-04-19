const router = require('express').Router();
const ctrl = require('./chat.controller');
const { auth } = require('../../middleware/auth');

router.use(auth);
router.get('/contacts', ctrl.contacts);
router.get('/:contactId/messages', ctrl.messages);
router.post('/:contactId/send', ctrl.send);

module.exports = router;
