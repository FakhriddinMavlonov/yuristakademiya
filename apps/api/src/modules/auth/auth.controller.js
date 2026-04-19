const svc = require('./auth.service');

const register = async (req, res, next) => {
  try { res.status(201).json(await svc.register(req.body)); } catch (e) { next(e); }
};
const login = async (req, res, next) => {
  try { res.json(await svc.login(req.body)); } catch (e) { next(e); }
};
const me = async (req, res, next) => {
  try { res.json(await svc.me(req.user.id)); } catch (e) { next(e); }
};
const verifyStatus = async (req, res, next) => {
  try { res.json(await svc.verifyStatus(req.params.phone)); } catch (e) { next(e); }
};
const refresh = async (req, res, next) => {
  try { res.json(await svc.refresh(req.body.refreshToken)); } catch (e) { next(e); }
};

module.exports = { register, login, me, verifyStatus, refresh };
