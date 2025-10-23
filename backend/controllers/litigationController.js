const db = require('../db');

// Get user's litigation progress
const getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get overall progress
    const progressResult = await db.query(
      'SELECT * FROM user_litigation_progress WHERE user_id = $1',
      [userId]
    );

    let progress = progressResult.rows[0];

    // If no progress exists, create initial record
    if (!progress) {
      const createResult = await db.query(
        `INSERT INTO user_litigation_progress (user_id, current_stage_id, current_stage_name)
         VALUES ($1, 1, 'Pre-Litigation')
         RETURNING *`,
        [userId]
      );
      progress = createResult.rows[0];
    }

    // Get completed substages
    const substagesResult = await db.query(
      'SELECT * FROM litigation_substage_completions WHERE user_id = $1 ORDER BY completed_at DESC',
      [userId]
    );

    // Get completed stages
    const stagesResult = await db.query(
      'SELECT * FROM litigation_stage_completions WHERE user_id = $1 ORDER BY stage_id',
      [userId]
    );

    // Get video progress
    const videosResult = await db.query(
      'SELECT * FROM litigation_video_progress WHERE user_id = $1',
      [userId]
    );

    res.json({
      progress,
      completedSubstages: substagesResult.rows,
      completedStages: stagesResult.rows,
      videoProgress: videosResult.rows
    });
  } catch (error) {
    console.error('Error getting user progress:', error);
    res.status(500).json({ error: 'Failed to get litigation progress' });
  }
};

// Complete a substage
const completeSubstage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      stageId, 
      stageName, 
      substageId, 
      substageName, 
      substageType, 
      coinsEarned, 
      dataValue, 
      fileIds 
    } = req.body;

    if (!stageId || !substageId || !substageName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if already completed
    const existing = await db.query(
      'SELECT id FROM litigation_substage_completions WHERE user_id = $1 AND stage_id = $2 AND substage_id = $3',
      [userId, stageId, substageId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Substage already completed' });
    }

    // Insert completion record
    const result = await db.query(
      `INSERT INTO litigation_substage_completions 
       (user_id, stage_id, stage_name, substage_id, substage_name, substage_type, coins_earned, data_value, file_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, stageId, stageName, substageId, substageName, substageType || 'upload', coinsEarned || 0, dataValue, fileIds || []]
    );

    // Update user's total coins
    await db.query(
      'UPDATE users SET total_coins = total_coins + $1 WHERE id = $2',
      [coinsEarned || 0, userId]
    );

    // Update progress totals
    await db.query(
      `UPDATE user_litigation_progress 
       SET total_coins_earned = total_coins_earned + $1,
           total_substages_completed = total_substages_completed + 1,
           last_activity_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [coinsEarned || 0, userId]
    );

    res.json({
      message: 'Substage completed successfully',
      completion: result.rows[0],
      coinsEarned: coinsEarned || 0
    });
  } catch (error) {
    console.error('Error completing substage:', error);
    res.status(500).json({ error: 'Failed to complete substage' });
  }
};

// Complete a main stage
const completeStage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stageId, stageName, coinsEarned, allSubstagesCompleted } = req.body;

    if (!stageId || !stageName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if already completed
    const existing = await db.query(
      'SELECT id FROM litigation_stage_completions WHERE user_id = $1 AND stage_id = $2',
      [userId, stageId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Stage already completed' });
    }

    // Insert completion record
    const result = await db.query(
      `INSERT INTO litigation_stage_completions 
       (user_id, stage_id, stage_name, coins_earned, all_substages_completed)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, stageId, stageName, coinsEarned || 0, allSubstagesCompleted !== false]
    );

    // Update user's total coins
    await db.query(
      'UPDATE users SET total_coins = total_coins + $1 WHERE id = $2',
      [coinsEarned || 0, userId]
    );

    // Update current stage if moving forward
    if (stageId >= 1 && stageId < 9) {
      const nextStageId = stageId + 1;
      const stageNames = [
        'Pre-Litigation', 'Complaint Filed', 'Discovery', 'Mediation',
        'Pre-Trial', 'Trial', 'Verdict', 'Appeal', 'Case Resolution'
      ];
      
      await db.query(
        `UPDATE user_litigation_progress 
         SET current_stage_id = $1,
             current_stage_name = $2,
             total_coins_earned = total_coins_earned + $3,
             last_activity_at = CURRENT_TIMESTAMP
         WHERE user_id = $4`,
        [nextStageId, stageNames[nextStageId - 1] || 'Unknown', coinsEarned || 0, userId]
      );
    }

    res.json({
      message: 'Stage completed successfully',
      completion: result.rows[0],
      coinsEarned: coinsEarned || 0
    });
  } catch (error) {
    console.error('Error completing stage:', error);
    res.status(500).json({ error: 'Failed to complete stage' });
  }
};

// Update video progress
const updateVideoProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { videoId, videoTitle, stageId, purchased, completed, purchasePrice } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    // Upsert video progress
    const result = await db.query(
      `INSERT INTO litigation_video_progress 
       (user_id, video_id, video_title, stage_id, purchased, completed, purchase_price, purchased_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 
               CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE NULL END,
               CASE WHEN $6 THEN CURRENT_TIMESTAMP ELSE NULL END)
       ON CONFLICT (user_id, video_id) 
       DO UPDATE SET
         purchased = EXCLUDED.purchased,
         completed = EXCLUDED.completed,
         purchased_at = CASE WHEN EXCLUDED.purchased AND litigation_video_progress.purchased_at IS NULL 
                             THEN CURRENT_TIMESTAMP ELSE litigation_video_progress.purchased_at END,
         completed_at = CASE WHEN EXCLUDED.completed AND litigation_video_progress.completed_at IS NULL 
                             THEN CURRENT_TIMESTAMP ELSE litigation_video_progress.completed_at END
       RETURNING *`,
      [userId, videoId, videoTitle, stageId, purchased || false, completed || false, purchasePrice]
    );

    res.json({
      message: 'Video progress updated',
      videoProgress: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating video progress:', error);
    res.status(500).json({ error: 'Failed to update video progress' });
  }
};

// Get litigation progress for law firm's client
const getClientProgress = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { clientId } = req.params;

    // Verify law firm has access to this client
    const accessCheck = await db.query(
      'SELECT id FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
      [lawFirmId, clientId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this client' });
    }

    // Get client's progress
    const progressResult = await db.query(
      'SELECT * FROM user_litigation_progress WHERE user_id = $1',
      [clientId]
    );

    const substagesResult = await db.query(
      'SELECT * FROM litigation_substage_completions WHERE user_id = $1 ORDER BY completed_at DESC',
      [clientId]
    );

    const stagesResult = await db.query(
      'SELECT * FROM litigation_stage_completions WHERE user_id = $1 ORDER BY stage_id',
      [clientId]
    );

    res.json({
      progress: progressResult.rows[0] || null,
      completedSubstages: substagesResult.rows,
      completedStages: stagesResult.rows
    });
  } catch (error) {
    console.error('Error getting client progress:', error);
    res.status(500).json({ error: 'Failed to get client progress' });
  }
};

module.exports = {
  getUserProgress,
  completeSubstage,
  completeStage,
  updateVideoProgress,
  getClientProgress
};
