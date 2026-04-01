const express = require('express');
const router = express.Router();
const { handleChatRequest } = require('../controllers/chatController');

// POST /api/chat
router.post('/', handleChatRequest);

module.exports = router;
