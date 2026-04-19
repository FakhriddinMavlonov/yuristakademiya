const svc = require('./tests.service');

const get = async (req, res, next) => {
  try { res.json(await svc.getWithQuestions(req.params.id, req.user.id, req.user.role)); } catch (e) { next(e); }
};
const save = async (req, res, next) => {
  try { res.json(await svc.createOrUpdate(req.params.lessonId, req.user.id, req.body)); } catch (e) { next(e); }
};
const start = async (req, res, next) => {
  try { res.json(await svc.startAttempt(req.user.id, req.params.id)); } catch (e) { next(e); }
};
const submit = async (req, res, next) => {
  try { res.json(await svc.submitAttempt(req.user.id, req.params.attemptId, req.body.answers)); } catch (e) { next(e); }
};

const parseDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });
    const { lessonId } = req.params;
    const { rows: [lesson] } = await require('../../config/db').query('SELECT title FROM lessons WHERE id=$1', [lessonId]);

    let text = '';
    const mime = req.file.mimetype;

    if (mime === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    } else {
      text = req.file.buffer.toString('utf-8');
    }

    if (!text.trim()) return res.status(400).json({ error: 'Fayldan matn olib bo\'lmadi' });

    const result = svc.parseDocumentWithAI(text);
    res.json(result);
  } catch (e) { next(e); }
};

module.exports = { get, save, start, submit, parseDocument };
