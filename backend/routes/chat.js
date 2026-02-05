const express = require('express');
const router = express.Router();
const storageService = require('../services/storageService');

/**
 * GET /api/chat
 * Get chat history
 */
router.get('/', (req, res) => {
    try {
        const history = storageService.getChatHistory();
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/chat
 * Clear chat history
 */
router.delete('/', (req, res) => {
    try {
        storageService.clearChatHistory();
        res.json({
            success: true,
            message: 'Chat history cleared'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
