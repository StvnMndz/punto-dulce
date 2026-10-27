const express = require('express');
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

const router = express.Router();
router.post('/registro', authController.registro);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);

module.exports = router;
