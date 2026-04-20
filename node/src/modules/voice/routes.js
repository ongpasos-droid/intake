const router  = require('express').Router();
const multer  = require('multer');
const { requireAuth } = require('../../middleware/auth');
const ctrl = require('./controller');

// Store audio in memory (max 25MB — Whisper limit)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/transcribe', requireAuth, upload.single('audio'), ctrl.transcribe);

module.exports = router;
