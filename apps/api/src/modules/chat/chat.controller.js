const svc = require('./chat.service');
const { notify } = require('../../config/socket');

const contacts = async (req, res, next) => {
  try { res.json(await svc.getContacts(req.user.id, req.user.role)); } catch (e) { next(e); }
};
const messages = async (req, res, next) => {
  try { res.json(await svc.getMessages(req.user.id, req.params.contactId)); } catch (e) { next(e); }
};
const send = async (req, res, next) => {
  try {
    const msg = await svc.send(req.user.id, req.params.contactId, req.body.content);
    notify(Number(req.params.contactId), 'chat:message', msg);
    res.status(201).json(msg);
  } catch (e) { next(e); }
};

module.exports = { contacts, messages, send };
