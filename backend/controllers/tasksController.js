const { Pool } = require('pg');
const { checkTreasureChestCapacity, MAX_TOTAL_COINS } = require('./coinsController');
const { sendTaskAssignedEmail, sendTaskCompletedEmail } = require('../services/emailService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const SYSTEM_COIN_REWARDS = {
  urgent: 100,
  high: 75,
  medium: 50,
  low: 25,
};

const MAX_COIN_REWARD_PER_TASK = 100;

function getSystemCoinReward(priority) {
  const p = (priority || 'medium').toLowerCase();
  const reward = SYSTEM_COIN_REWARDS[p] || SYSTEM_COIN_REWARDS.medium;
  return Math.min(reward, MAX_COIN_REWARD_PER_TASK);
}

const tasksController = {
  async getMyTasks(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.userType;

      if (userType !== 'individual' && userType !== 'client') {
        return res.status(403).json({ error: 'Only individual users can view their tasks' });
      }

      const { status, priority } = req.query;

      let query = `
        SELECT 
          lft.*,
          lf.firm_name as law_firm_name,
          lf.email as law_firm_email
        FROM law_firm_tasks lft
        LEFT JOIN law_firms lf ON lf.id = lft.law_firm_id
        WHERE lft.client_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        query += ` AND lft.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (priority) {
        query += ` AND lft.priority = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
      }

      query += ` ORDER BY 
        CASE lft.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        lft.due_date ASC NULLS LAST,
        lft.created_at DESC
      `;

      const result = await pool.query(query, params);

      const tasks = result.rows.map(task => ({
        id: task.id,
        lawFirmId: task.law_firm_id,
        lawFirmName: task.law_firm_name,
        title: task.task_title,
        description: task.task_description,
        type: task.task_type,
        priority: task.priority,
        status: task.status,
        dueDate: task.due_date,
        coinsReward: task.coins_reward,
        actionUrl: task.action_url,
        attachments: task.attachments,
        taskData: task.task_data,
        completedAt: task.completed_at,
        completionNotes: task.completion_notes,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      }));

      const summary = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()).length
      };

      res.json({ tasks, summary });
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  },

  async createTask(req, res) {
    try {
      const userType = req.user.userType;

      if (userType !== 'law_firm' && userType !== 'lawfirm') {
        return res.status(403).json({ error: 'Only law firms can create tasks' });
      }

      const lawFirmId = req.user.id;
      const {
        clientId,
        taskTitle,
        taskDescription,
        taskType,
        priority = 'medium',
        dueDate,
        actionUrl,
        attachments,
        taskData,
        sendNotification = true
      } = req.body;

      const coinsReward = getSystemCoinReward(priority);

      if (!clientId || !taskTitle || !taskType) {
        return res.status(400).json({ 
          error: 'Missing required fields: clientId, taskTitle, taskType' 
        });
      }

      const clientCheck = await pool.query(
        'SELECT id, email FROM users WHERE id = $1 AND (user_type = $2 OR user_type = $3)',
        [clientId, 'individual', 'client']
      );

      if (clientCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const connectionCheck = await pool.query(
        'SELECT id FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
        [lawFirmId, clientId]
      );

      if (connectionCheck.rows.length === 0) {
        return res.status(403).json({ 
          error: 'Client is not connected to your law firm' 
        });
      }

      const insertResult = await pool.query(
        `INSERT INTO law_firm_tasks 
          (law_firm_id, client_id, created_by_user_id, task_title, task_description, 
           task_type, priority, due_date, coins_reward, action_url, attachments, task_data, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          lawFirmId,
          clientId,
          null,
          taskTitle,
          taskDescription,
          taskType,
          priority,
          dueDate || null,
          coinsReward,
          actionUrl || null,
          attachments ? JSON.stringify(attachments) : null,
          taskData ? JSON.stringify(taskData) : null,
          'pending'
        ]
      );

      const task = insertResult.rows[0];

      await pool.query(
        `INSERT INTO task_audit (task_id, action, new_status, performed_by_type, performed_by_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [task.id, 'created', 'pending', 'law_firm', lawFirmId, 'Task created']
      );

      if (sendNotification) {
        const lawFirmResult = await pool.query(
          'SELECT firm_name FROM law_firms WHERE id = $1',
          [lawFirmId]
        );
        const lawFirmName = lawFirmResult.rows[0]?.firm_name || 'Your attorney';

        const notificationTitle = `📋 New Task: ${taskTitle}`;
        const notificationBody = taskDescription || 'You have a new task from your attorney.';
        const notificationPriority = priority === 'urgent' ? 'urgent' : priority === 'high' ? 'high' : 'medium';

        await pool.query(
          `INSERT INTO notifications 
            (sender_type, sender_id, sender_name, recipient_type, recipient_id, 
             type, priority, title, body, action_url, action_data, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            'law_firm',
            lawFirmId,
            lawFirmName,
            'user',
            clientId,
            'task_assigned',
            notificationPriority,
            notificationTitle,
            notificationBody,
            actionUrl || 'verdictpath://tasks',
            JSON.stringify({ taskId: task.id, taskType }),
            'pending'
          ]
        );

        // Send email notification to client (fire-and-forget, non-blocking)
        (async () => {
          try {
            const clientResult = await pool.query(
              `SELECT u.first_name, u.last_name, u.email, 
                      COALESCE(np.email_notifications_enabled, true) as email_notifications_enabled 
               FROM users u 
               LEFT JOIN notification_preferences np ON np.user_id = u.id 
               WHERE u.id = $1`,
              [clientId]
            );
            const client = clientResult.rows[0];
            
            if (client && client.email && client.email_notifications_enabled !== false) {
              const clientName = client.first_name && client.last_name 
                ? `${client.first_name} ${client.last_name}` 
                : 'Client';
              
              sendTaskAssignedEmail(client.email, clientName, {
                title: taskTitle,
                description: taskDescription,
                priority: priority,
                dueDate: dueDate,
                coinReward: coinsReward
              }).catch(err => console.error('Error sending task assignment email:', err));
            }
          } catch (emailError) {
            console.error('Error preparing task assignment email:', emailError);
          }
        })();
      }

      res.status(201).json({
        success: true,
        task: {
          id: task.id,
          lawFirmId: task.law_firm_id,
          clientId: task.client_id,
          title: task.task_title,
          description: task.task_description,
          type: task.task_type,
          priority: task.priority,
          status: task.status,
          dueDate: task.due_date,
          coinsReward: task.coins_reward,
          actionUrl: task.action_url,
          createdAt: task.created_at
        }
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  },

  async updateTaskStatus(req, res) {
    try {
      const { taskId } = req.params;
      const { status, completionNotes } = req.body;
      const userId = req.user.id;
      const userType = req.user.userType;

      if (!status || !['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ 
          error: 'Invalid status. Must be: pending, in_progress, completed, or cancelled' 
        });
      }

      const taskResult = await pool.query(
        'SELECT * FROM law_firm_tasks WHERE id = $1',
        [taskId]
      );

      if (taskResult.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = taskResult.rows[0];

      if (userType === 'individual' || userType === 'client') {
        if (task.client_id !== userId) {
          return res.status(403).json({ error: 'You can only update your own tasks' });
        }
        if (status === 'cancelled') {
          return res.status(403).json({ error: 'Only law firms can cancel tasks' });
        }
      } else if (userType === 'law_firm') {
        if (task.law_firm_id !== userId) {
          return res.status(403).json({ error: 'You can only update tasks you created' });
        }
      } else {
        return res.status(403).json({ error: 'Unauthorized to update tasks' });
      }

      const previousStatus = task.status;
      const now = new Date();
      const completedAt = status === 'completed' ? now : (status === 'pending' || status === 'in_progress' ? null : task.completed_at);
      const completedByUserId = status === 'completed' ? userId : (status === 'pending' || status === 'in_progress' ? null : task.completed_by_user_id);

      await pool.query(
        `UPDATE law_firm_tasks 
        SET status = $1, 
            completion_notes = $2, 
            completed_at = $3,
            completed_by_user_id = $4,
            updated_at = $5
        WHERE id = $6`,
        [
          status,
          completionNotes || task.completion_notes,
          completedAt,
          completedByUserId,
          now,
          taskId
        ]
      );

      await pool.query(
        `INSERT INTO task_audit (task_id, action, previous_status, new_status, performed_by_type, performed_by_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          taskId,
          status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'updated',
          previousStatus,
          status,
          userType === 'law_firm' ? 'law_firm' : 'user',
          userId,
          completionNotes || `Status changed from ${previousStatus} to ${status}`
        ]
      );

      let coinsAwarded = 0;
      let treasureChestFull = false;
      let treasureChestMessage = null;
      let coinsAlreadyEarned = false;
      
      if (status === 'completed' && task.coins_reward > 0 && (userType === 'individual' || userType === 'client')) {
        // Check if coins were already awarded for this task (prevents coin farming)
        const existingTransaction = await pool.query(
          `SELECT id FROM coin_transactions 
          WHERE user_id = $1 
          AND transaction_type = 'task_completion' 
          AND metadata->>'taskId' = $2`,
          [userId, task.id.toString()]
        );
        
        coinsAlreadyEarned = existingTransaction.rows.length > 0;
        
        // Only award coins if they haven't been earned before
        if (!coinsAlreadyEarned) {
          // Check treasure chest capacity before awarding coins
          const capacity = await checkTreasureChestCapacity(userId, task.coins_reward);
          coinsAwarded = capacity.canAward;
          treasureChestFull = capacity.isFull;
          treasureChestMessage = capacity.message;
          
          if (coinsAwarded > 0) {
            await pool.query(
              'UPDATE users SET total_coins = total_coins + $1 WHERE id = $2',
              [coinsAwarded, userId]
            );

            await pool.query(
              `INSERT INTO coin_transactions (user_id, amount, transaction_type, description, metadata)
              VALUES ($1, $2, $3, $4, $5)`,
              [
                userId,
                coinsAwarded,
                'task_completion',
                `Task completed: ${task.task_title}`,
                JSON.stringify({ taskId: task.id, taskType: task.task_type })
              ]
            );
          }
        }
      }

      let message = `Task ${status}`;
      if (coinsAlreadyEarned && status === 'completed') {
        message += ' (coins already earned previously)';
      }
      if (treasureChestMessage) {
        message += `\n${treasureChestMessage}`;
      }

      // Send notification to law firm when client updates task status
      if ((userType === 'individual' || userType === 'client') && previousStatus !== status) {
        try {
          // Get client name
          const clientResult = await pool.query(
            'SELECT first_name, last_name, email FROM users WHERE id = $1',
            [userId]
          );
          const client = clientResult.rows[0];
          const clientName = client.first_name && client.last_name 
            ? `${client.first_name} ${client.last_name}` 
            : client.email;

          let notificationTitle, notificationBody, notificationType;
          
          if (status === 'completed') {
            notificationTitle = `✅ Task Completed: ${task.task_title}`;
            notificationBody = `${clientName} has completed the task "${task.task_title}".`;
            notificationType = 'task_completed';
          } else if (status === 'in_progress') {
            notificationTitle = `🔄 Task In Progress: ${task.task_title}`;
            notificationBody = `${clientName} is now working on the task "${task.task_title}".`;
            notificationType = 'task_started';
          } else if (status === 'pending') {
            notificationTitle = `↩️ Task Reverted: ${task.task_title}`;
            notificationBody = `${clientName} has reverted the task "${task.task_title}" to pending.`;
            notificationType = 'task_reverted';
          }

          if (notificationTitle) {
            await pool.query(
              `INSERT INTO notifications 
                (sender_type, sender_id, sender_name, recipient_type, recipient_id, 
                 type, priority, title, body, action_url, action_data, status)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                'user',
                userId,
                clientName,
                'law_firm',
                task.law_firm_id,
                notificationType,
                'medium',
                notificationTitle,
                notificationBody,
                'verdictpath://tasks',
                JSON.stringify({ taskId: task.id, clientId: userId, newStatus: status }),
                'pending'
              ]
            );

            // Send email to law firm when task is completed (fire-and-forget, non-blocking)
            if (status === 'completed') {
              (async () => {
                try {
                  const lawFirmResult = await pool.query(
                    'SELECT firm_name, email FROM law_firms WHERE id = $1',
                    [task.law_firm_id]
                  );
                  const lawFirm = lawFirmResult.rows[0];
                  
                  if (lawFirm && lawFirm.email) {
                    sendTaskCompletedEmail(
                      lawFirm.email, 
                      lawFirm.firm_name || 'Law Firm',
                      { title: task.task_title },
                      clientName
                    ).catch(err => console.error('Error sending task completion email:', err));
                  }
                } catch (emailError) {
                  console.error('Error preparing task completion email:', emailError);
                }
              })();
            }
          }
        } catch (notifError) {
          console.error('Error sending task update notification:', notifError);
        }
      }

      res.json({
        success: true,
        message: message,
        coinsAwarded: coinsAwarded,
        coinsAlreadyEarnedBefore: coinsAlreadyEarned,
        treasureChestFull: treasureChestFull,
        maxCoins: MAX_TOTAL_COINS
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ error: 'Failed to update task status' });
    }
  },

  async getClientTasks(req, res) {
    try {
      const { clientId } = req.params;
      const lawFirmId = req.user.id;
      const userType = req.user.userType;

      if (userType !== 'law_firm') {
        return res.status(403).json({ error: 'Only law firms can view client tasks' });
      }

      const connectionCheck = await pool.query(
        'SELECT id FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
        [lawFirmId, clientId]
      );

      if (connectionCheck.rows.length === 0) {
        return res.status(403).json({ 
          error: 'Client is not connected to your law firm' 
        });
      }

      const result = await pool.query(
        `SELECT * FROM law_firm_tasks 
        WHERE law_firm_id = $1 AND client_id = $2
        ORDER BY 
          CASE priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END,
          due_date ASC NULLS LAST,
          created_at DESC`,
        [lawFirmId, clientId]
      );

      const tasks = result.rows.map(task => ({
        id: task.id,
        clientId: task.client_id,
        title: task.task_title,
        description: task.task_description,
        type: task.task_type,
        priority: task.priority,
        status: task.status,
        dueDate: task.due_date,
        coinsReward: task.coins_reward,
        completedAt: task.completed_at,
        completionNotes: task.completion_notes,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      }));

      res.json({ tasks });
    } catch (error) {
      console.error('Error fetching client tasks:', error);
      res.status(500).json({ error: 'Failed to fetch client tasks' });
    }
  },

  async deleteTask(req, res) {
    try {
      const { taskId } = req.params;
      const lawFirmId = req.user.id;
      const userType = req.user.userType;

      if (userType !== 'law_firm') {
        return res.status(403).json({ error: 'Only law firms can delete tasks' });
      }

      const taskResult = await pool.query(
        'SELECT * FROM law_firm_tasks WHERE id = $1',
        [taskId]
      );

      if (taskResult.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = taskResult.rows[0];

      if (task.law_firm_id !== lawFirmId) {
        return res.status(403).json({ error: 'You can only delete tasks you created' });
      }

      await pool.query(
        `INSERT INTO task_audit (task_id, action, previous_status, performed_by_type, performed_by_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          taskId,
          'deleted',
          task.status,
          'law_firm',
          lawFirmId,
          'Task deleted by law firm'
        ]
      );

      await pool.query('DELETE FROM law_firm_tasks WHERE id = $1', [taskId]);

      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  },

  async getTaskTemplates(req, res) {
    try {
      const userType = req.user.userType;
      const userId = req.user.id;

      if (userType !== 'law_firm') {
        return res.status(403).json({ error: 'Only law firms can access task templates' });
      }

      const result = await pool.query(
        `SELECT * FROM task_templates 
        WHERE (owner_type = 'system' AND owner_id IS NULL) 
           OR (owner_type = 'law_firm' AND owner_id = $1)
        AND is_active = true
        ORDER BY template_name ASC`,
        [userId]
      );

      const templates = result.rows.map(t => ({
        id: t.id,
        name: t.template_name,
        key: t.template_key,
        description: t.description,
        titleTemplate: t.task_title_template,
        descriptionTemplate: t.task_description_template,
        type: t.task_type,
        defaultPriority: t.default_priority,
        defaultCoinsReward: getSystemCoinReward(t.default_priority || 'medium'),
        defaultDueDays: t.default_due_days,
        timesUsed: t.times_used
      }));

      res.json({ templates });
    } catch (error) {
      console.error('Error fetching task templates:', error);
      res.status(500).json({ error: 'Failed to fetch task templates' });
    }
  },

  async getCoinRewardConfig(req, res) {
    try {
      res.json({
        success: true,
        coinRewards: SYSTEM_COIN_REWARDS,
        maxPerTask: MAX_COIN_REWARD_PER_TASK,
        maxTotalCoins: MAX_TOTAL_COINS,
        note: 'Coin rewards are automatically determined by the system based on task priority to ensure fairness and prevent coin mining.'
      });
    } catch (error) {
      console.error('Error fetching coin config:', error);
      res.status(500).json({ error: 'Failed to fetch coin reward configuration' });
    }
  }
};

module.exports = tasksController;
