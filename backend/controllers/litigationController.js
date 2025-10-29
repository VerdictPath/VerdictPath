const db = require('../config/db');

// Helper function to check and update phase transitions based on stage completion
const updatePhaseOnStageCompletion = async (userId, completedStageId) => {
  // Phase mapping based on completed stage:
  // Pre-Litigation: Stage 1 (stageId = 1)
  // Litigation: Stages 2-6 (stageId 2-6)
  // Trial: Stages 7-9 (stageId 7-9)
  
  let newPhase = null;
  
  if (completedStageId === 1) {
    // Completing Stage 1 moves user to Litigation phase
    newPhase = 'litigation';
  } else if (completedStageId >= 2 && completedStageId <= 6) {
    // User is in Litigation phase (stays in litigation until stage 6 is complete)
    if (completedStageId === 6) {
      // Completing Stage 6 (last litigation stage) moves to Trial phase
      newPhase = 'trial';
    }
  }
  // Stages 7-9 are already in Trial phase, no transition needed
  
  if (newPhase) {
    // Update user's current phase
    await db.query(
      'UPDATE users SET current_phase = $1 WHERE id = $2',
      [newPhase, userId]
    );
    
    return newPhase;
  }
  
  return null;
};

// Helper function to ensure user progress record exists (upsert pattern)
const ensureProgressRecord = async (userId) => {
  const result = await db.query(
    `INSERT INTO user_litigation_progress (user_id, current_stage_id, current_stage_name)
     VALUES ($1, 1, 'Pre-Litigation')
     ON CONFLICT (user_id) DO NOTHING
     RETURNING *`,
    [userId]
  );
  
  // If row already existed, fetch it
  if (result.rows.length === 0) {
    const existing = await db.query(
      'SELECT * FROM user_litigation_progress WHERE user_id = $1',
      [userId]
    );
    return existing.rows[0];
  }
  
  return result.rows[0];
};

// Get user's litigation progress
const getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ensure progress record exists
    const progress = await ensureProgressRecord(userId);

    // Get completed substages (exclude reverted ones)
    const substagesResult = await db.query(
      'SELECT * FROM litigation_substage_completions WHERE user_id = $1 AND is_reverted = FALSE ORDER BY completed_at DESC',
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

    // Ensure progress record exists before any updates
    await ensureProgressRecord(userId);

    // Check if a completion record exists (active or reverted)
    const existing = await db.query(
      'SELECT id, coins_earned, is_reverted FROM litigation_substage_completions WHERE user_id = $1 AND stage_id = $2 AND substage_id = $3',
      [userId, stageId, substageId]
    );

    // If active (not reverted) completion exists, user can't complete again
    if (existing.rows.length > 0 && !existing.rows[0].is_reverted) {
      return res.status(400).json({ error: 'Substage already completed' });
    }

    // Check if coins were previously earned for this substage
    // This prevents coin farming - coins can only be earned once ever
    const coinsAlreadyEarned = existing.rows.length > 0 && existing.rows[0].coins_earned > 0;
    const coinsToAward = coinsAlreadyEarned ? 0 : (coinsEarned || 0);

    let result;
    if (existing.rows.length > 0 && existing.rows[0].is_reverted) {
      // Re-activate the reverted completion
      result = await db.query(
        `UPDATE litigation_substage_completions 
         SET is_reverted = FALSE, 
             reverted_at = NULL,
             completed_at = CURRENT_TIMESTAMP,
             data_value = $1,
             file_ids = $2
         WHERE id = $3
         RETURNING *`,
        [dataValue, fileIds || [], existing.rows[0].id]
      );
    } else {
      // Insert new completion record
      result = await db.query(
        `INSERT INTO litigation_substage_completions 
         (user_id, stage_id, stage_name, substage_id, substage_name, substage_type, coins_earned, data_value, file_ids, is_reverted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
         RETURNING *`,
        [userId, stageId, stageName, substageId, substageName, substageType || 'upload', coinsToAward, dataValue, fileIds || []]
      );
    }

    // Update user's total coins (only if coins are awarded)
    if (coinsToAward > 0) {
      await db.query(
        'UPDATE users SET total_coins = total_coins + $1 WHERE id = $2',
        [coinsToAward, userId]
      );

      // Update progress totals
      await db.query(
        `UPDATE user_litigation_progress 
         SET total_coins_earned = total_coins_earned + $1,
             total_substages_completed = total_substages_completed + 1,
             last_activity_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [coinsToAward, userId]
      );
    } else {
      // Just update substage count, no coins
      await db.query(
        `UPDATE user_litigation_progress 
         SET total_substages_completed = total_substages_completed + 1,
             last_activity_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId]
      );
    }

    const message = coinsAlreadyEarned 
      ? 'Substage completed successfully (coins already earned previously)'
      : 'Substage completed successfully';

    res.json({
      message: message,
      completion: result.rows[0],
      coinsEarned: coinsToAward,
      coinsAlreadyEarnedBefore: coinsAlreadyEarned
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

    // Ensure progress record exists before any updates
    await ensureProgressRecord(userId);

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

    // Update current stage - handle all stages including stage 9 (final stage)
    const stageNames = [
      'Pre-Litigation', 'Complaint Filed', 'Discovery', 'Mediation',
      'Pre-Trial', 'Trial', 'Verdict', 'Appeal', 'Case Resolution'
    ];
    
    if (stageId >= 1 && stageId < 9) {
      // Move to next stage
      const nextStageId = stageId + 1;
      await db.query(
        `UPDATE user_litigation_progress 
         SET current_stage_id = $1,
             current_stage_name = $2,
             total_coins_earned = total_coins_earned + $3,
             progress_percentage = ($1::DECIMAL / 9 * 100),
             last_activity_at = CURRENT_TIMESTAMP
         WHERE user_id = $4`,
        [nextStageId, stageNames[nextStageId - 1], coinsEarned || 0, userId]
      );
    } else if (stageId === 9) {
      // Final stage completed - mark as 100% complete
      await db.query(
        `UPDATE user_litigation_progress 
         SET current_stage_id = 9,
             current_stage_name = 'Case Resolution',
             total_coins_earned = total_coins_earned + $1,
             progress_percentage = 100.00,
             last_activity_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [coinsEarned || 0, userId]
      );
    }

    // Check for phase transition based on stage completion
    const newPhase = await updatePhaseOnStageCompletion(userId, stageId);

    res.json({
      message: 'Stage completed successfully',
      completion: result.rows[0],
      coinsEarned: coinsEarned || 0,
      phaseTransition: newPhase ? { newPhase } : null
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

// Revert (uncomplete) a substage
const revertSubstage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stageId, substageId } = req.body;

    if (!stageId || !substageId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the completion record
    const existing = await db.query(
      'SELECT * FROM litigation_substage_completions WHERE user_id = $1 AND stage_id = $2 AND substage_id = $3 AND is_reverted = FALSE',
      [userId, stageId, substageId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Substage completion not found or already reverted' });
    }
    
    // Mark as reverted instead of deleting (preserves coin history)
    await db.query(
      `UPDATE litigation_substage_completions 
       SET is_reverted = TRUE, 
           reverted_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND stage_id = $2 AND substage_id = $3`,
      [userId, stageId, substageId]
    );

    // Note: Coins are NOT refunded - they remain as earned but user can't earn them again
    // This prevents coin farming by reverting and re-completing

    // Update progress totals
    await db.query(
      `UPDATE user_litigation_progress 
       SET total_substages_completed = GREATEST(0, total_substages_completed - 1),
           last_activity_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      message: 'Substage reverted successfully (coins preserved to prevent farming)',
      substageId: substageId,
      coinsNotRefunded: true
    });
  } catch (error) {
    console.error('Error reverting substage:', error);
    res.status(500).json({ error: 'Failed to revert substage' });
  }
};

// Revert (uncomplete) an entire stage
const revertStage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stageId } = req.body;

    if (!stageId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Delete all substage completions for this stage
    await db.query(
      'DELETE FROM litigation_substage_completions WHERE user_id = $1 AND stage_id = $2',
      [userId, stageId]
    );

    // Delete stage completion record
    const stageResult = await db.query(
      'DELETE FROM litigation_stage_completions WHERE user_id = $1 AND stage_id = $2 RETURNING *',
      [userId, stageId]
    );

    if (stageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stage completion not found' });
    }

    // Note: Coins are NOT refunded - they remain as earned but user can't earn them again
    // This prevents coin farming

    res.json({
      message: 'Stage reverted successfully',
      stageId: stageId
    });
  } catch (error) {
    console.error('Error reverting stage:', error);
    res.status(500).json({ error: 'Failed to revert stage' });
  }
};

module.exports = {
  getUserProgress,
  completeSubstage,
  completeStage,
  updateVideoProgress,
  getClientProgress,
  revertSubstage,
  revertStage
};
