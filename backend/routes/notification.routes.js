const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const auth = require('../middleware/auth');

// All notification routes require authentication
router.use(auth.verifyToken);

router.get('/', notificationController.getNotifications);
router.put('/:notification_id/read', notificationController.markNotificationRead);

module.exports = router;
