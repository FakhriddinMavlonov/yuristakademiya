const svc = require('./library.service');

const list = async (req, res, next) => {
  try { res.json(await svc.list(req.user.id, req.query)); } catch (e) { next(e); }
};
const upload = async (req, res, next) => {
  try { res.status(201).json(await svc.upload(req.user.id, req.body)); } catch (e) { next(e); }
};
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const item = await svc.uploadFile(req.user.id, req.file.buffer, req.file.originalname, req.body.fileType || 'material');
    res.status(201).json(item);
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try { res.json(await svc.remove(req.params.id, req.user.id)); } catch (e) { next(e); }
};

module.exports = { list, upload, uploadFile, remove };
