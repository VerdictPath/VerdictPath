const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasksController');
const { authenticateToken } = require('../middleware/auth');

router.get('/my-tasks', authenticateToken, tasksController.getMyTasks);

router.post('/create', authenticateToken, tasksController.createTask);

router.put('/:taskId/status', authenticateToken, tasksController.updateTaskStatus);

router.get('/client/:clientId', authenticateToken, tasksController.getClientTasks);

router.delete('/:taskId', authenticateToken, tasksController.deleteTask);

router.get('/templates', authenticateToken, tasksController.getTaskTemplates);

router.get('/coin-config', authenticateToken, tasksController.getCoinRewardConfig);

module.exports = router;
