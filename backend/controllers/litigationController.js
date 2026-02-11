const db = require('../config/db');
const { getStageCoins, getSubstageCoins } = require('../config/litigationRewards');
const { checkTreasureChestCapacity, MAX_TOTAL_COINS } = require('./coinsController');

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

    // Get completed stages (exclude reverted ones)
    const stagesResult = await db.query(
      'SELECT * FROM litigation_stage_completions WHERE user_id = $1 AND is_reverted = FALSE ORDER BY stage_id',
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
    const userType = req.user.userType;
    
    // Roadmap features are only for individual users
    if (userType === 'lawfirm' || userType === 'medicalprovider' || userType === 'medical_provider') {
      return res.status(403).json({ 
        error: 'Roadmap features are only available for individual users. Law firms and medical providers manage their clients/patients who complete the litigation journey.',
        userType: userType
      });
    }
    
    const { 
      stageId, 
      stageName, 
      substageId, 
      substageName, 
      substageType, 
      dataValue, 
      fileIds 
    } = req.body;

    if (!stageId || !substageId || !substageName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // SECURITY: Get canonical coin value from server (NEVER trust client)
    const canonicalCoins = getSubstageCoins(substageId);

    // Ensure progress record exists before any updates
    await ensureProgressRecord(userId);

    // Check if a completion record exists (active or reverted)
    const existing = await db.query(
      'SELECT id, coins_earned, is_reverted, data_value FROM litigation_substage_completions WHERE user_id = $1 AND stage_id = $2 AND substage_id = $3',
      [userId, stageId, substageId]
    );

    // If active (not reverted) completion exists with data_value update request, allow update
    if (existing.rows.length > 0 && !existing.rows[0].is_reverted) {
      // For data_entry substages, allow updating the data_value
      if (substageType === 'data_entry' && dataValue !== undefined) {
        const updateResult = await db.query(
          `UPDATE litigation_substage_completions 
           SET data_value = $1, completed_at = CURRENT_TIMESTAMP
           WHERE id = $2
           RETURNING *`,
          [dataValue, existing.rows[0].id]
        );
        return res.json({
          message: 'Data entry updated successfully',
          completion: updateResult.rows[0],
          coinsEarned: 0,
          coinsAlreadyEarnedBefore: true,
          dataUpdated: true
        });
      }
      return res.status(400).json({ error: 'Substage already completed' });
    }

    // Check if coins were previously earned for this substage
    // This prevents coin farming - coins can only be earned once ever
    // NOTE: We check if ANY completion record exists (even if coins_earned is 0)
    // because some old records may have coins_earned=0 due to a previous bug,
    // but coins were still awarded to the user at completion time
    const coinsAlreadyEarned = existing.rows.length > 0;
    
    // Check treasure chest capacity before awarding coins
    let coinsToAward = 0;
    let treasureChestFull = false;
    let treasureChestMessage = null;
    
    if (!coinsAlreadyEarned && canonicalCoins > 0) {
      const capacity = await checkTreasureChestCapacity(userId, canonicalCoins);
      coinsToAward = capacity.canAward;
      treasureChestFull = capacity.isFull;
      treasureChestMessage = capacity.message;
    }

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

    let message = coinsAlreadyEarned 
      ? 'Substage completed successfully (coins already earned previously)'
      : 'Substage completed successfully';
    
    if (treasureChestMessage) {
      message += `\n${treasureChestMessage}`;
    }

    res.json({
      message: message,
      completion: result.rows[0],
      coinsEarned: coinsToAward,
      coinsAlreadyEarnedBefore: coinsAlreadyEarned,
      treasureChestFull: treasureChestFull,
      maxCoins: MAX_TOTAL_COINS
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
    const userType = req.user.userType;
    
    // Roadmap features are only for individual users
    if (userType === 'lawfirm' || userType === 'medicalprovider' || userType === 'medical_provider') {
      return res.status(403).json({ 
        error: 'Roadmap features are only available for individual users.',
        userType: userType
      });
    }
    
    const { stageId, stageName, allSubstagesCompleted } = req.body;

    if (!stageId || !stageName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // SECURITY: Get canonical coin value from server (NEVER trust client)
    const canonicalCoins = getStageCoins(stageId);

    // Ensure progress record exists before any updates
    await ensureProgressRecord(userId);

    // Check if a completion record exists (active or reverted)
    const existing = await db.query(
      'SELECT id, coins_earned, is_reverted FROM litigation_stage_completions WHERE user_id = $1 AND stage_id = $2',
      [userId, stageId]
    );

    // If active (not reverted) completion exists, user can't complete again
    if (existing.rows.length > 0 && !existing.rows[0].is_reverted) {
      return res.json({
        message: 'Stage already completed (coins already earned)',
        completion: existing.rows[0],
        coinsEarned: 0,
        coinsAlreadyEarnedBefore: true
      });
    }

    // Check if coins were previously earned for this stage
    // NOTE: We check if ANY completion record exists (even if coins_earned is 0)
    // because some old records may have coins_earned=0 due to a previous bug,
    // but coins were still awarded to the user at completion time
    const coinsAlreadyEarned = existing.rows.length > 0;
    
    // Check treasure chest capacity before awarding coins
    let coinsToAward = 0;
    let treasureChestFull = false;
    let treasureChestMessage = null;
    
    if (!coinsAlreadyEarned && canonicalCoins > 0) {
      const capacity = await checkTreasureChestCapacity(userId, canonicalCoins);
      coinsToAward = capacity.canAward;
      treasureChestFull = capacity.isFull;
      treasureChestMessage = capacity.message;
    }

    let result;
    if (existing.rows.length > 0 && existing.rows[0].is_reverted) {
      // Re-activate the reverted completion
      result = await db.query(
        `UPDATE litigation_stage_completions 
         SET is_reverted = FALSE, 
             reverted_at = NULL,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [existing.rows[0].id]
      );
    } else {
      // Insert new completion record with canonical coins
      result = await db.query(
        `INSERT INTO litigation_stage_completions 
         (user_id, stage_id, stage_name, coins_earned, all_substages_completed, is_reverted)
         VALUES ($1, $2, $3, $4, $5, FALSE)
         RETURNING *`,
        [userId, stageId, stageName, coinsToAward, allSubstagesCompleted !== false]
      );
    }

    // Update user's total coins (only if coins are being awarded)
    if (coinsToAward > 0) {
      await db.query(
        'UPDATE users SET total_coins = total_coins + $1 WHERE id = $2',
        [coinsToAward, userId]
      );
    }

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
        [nextStageId, stageNames[nextStageId - 1], coinsToAward, userId]
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
        [coinsToAward, userId]
      );
    }

    // Check for phase transition based on stage completion
    const newPhase = await updatePhaseOnStageCompletion(userId, stageId);

    let message = coinsAlreadyEarned 
      ? 'Stage completed successfully (coins already earned previously)'
      : 'Stage completed successfully';
    
    if (treasureChestMessage) {
      message += `\n${treasureChestMessage}`;
    }

    res.json({
      message: message,
      completion: result.rows[0],
      coinsEarned: coinsToAward,
      coinsAlreadyEarnedBefore: coinsAlreadyEarned,
      phaseTransition: newPhase ? { newPhase } : null,
      treasureChestFull: treasureChestFull,
      maxCoins: MAX_TOTAL_COINS
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

const STAGE_DEFINITIONS = [
  { id: 1, name: 'Pre-Litigation', substageCount: 11 },
  { id: 2, name: 'Complaint Filed', substageCount: 4 },
  { id: 3, name: 'Discovery Begins', substageCount: 5 },
  { id: 4, name: 'Depositions', substageCount: 4 },
  { id: 5, name: 'Mediation', substageCount: 3 },
  { id: 6, name: 'Trial Prep', substageCount: 5 },
  { id: 7, name: 'Trial', substageCount: 16 },
  { id: 8, name: 'Settlement', substageCount: 10 },
  { id: 9, name: 'Case Resolved', substageCount: 2 },
];

const buildStructuredStages = (completedSubstages, completedStages, progress) => {
  return STAGE_DEFINITIONS.map(def => {
    const activeSubstages = completedSubstages.filter(
      s => s.stage_id === def.id && !s.is_reverted
    );
    const stageCompletion = completedStages.find(
      s => s.stage_id === def.id && !s.is_reverted
    );
    return {
      stage_id: def.id,
      stage_name: def.name,
      total_substages: def.substageCount,
      substages_completed: activeSubstages.length,
      completed_at: stageCompletion?.completed_at || null,
      is_current: progress?.current_stage_id === def.id,
    };
  });
};

const verifyClientAccess = async (userId, clientId, userType) => {
  if (userType === 'lawfirm') {
    const result = await db.query(
      'SELECT id FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
      [userId, clientId]
    );
    return result.rows.length > 0;
  }
  if (userType === 'medicalprovider' || userType === 'medical_provider') {
    const result = await db.query(
      'SELECT id FROM medical_provider_patients WHERE provider_id = $1 AND patient_id = $2',
      [userId, clientId]
    );
    return result.rows.length > 0;
  }
  return false;
};

// Get litigation progress for law firm's client
const getClientProgress = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { clientId } = req.params;

    const hasAccess = await verifyClientAccess(lawFirmId, clientId, 'lawfirm');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this client' });
    }

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

    const progress = progressResult.rows[0] || null;
    const stages = buildStructuredStages(substagesResult.rows, stagesResult.rows, progress);

    res.json({
      progress,
      completedSubstages: substagesResult.rows,
      completedStages: stagesResult.rows,
      stages
    });
  } catch (error) {
    console.error('Error getting client progress:', error);
    res.status(500).json({ error: 'Failed to get client progress' });
  }
};

// Get litigation progress for medical provider's patient
const getPatientProgress = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { patientId } = req.params;

    const hasAccess = await verifyClientAccess(providerId, patientId, 'medicalprovider');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this patient' });
    }

    const progressResult = await db.query(
      'SELECT * FROM user_litigation_progress WHERE user_id = $1',
      [patientId]
    );

    const substagesResult = await db.query(
      'SELECT * FROM litigation_substage_completions WHERE user_id = $1 ORDER BY completed_at DESC',
      [patientId]
    );

    const stagesResult = await db.query(
      'SELECT * FROM litigation_stage_completions WHERE user_id = $1 ORDER BY stage_id',
      [patientId]
    );

    const progress = progressResult.rows[0] || null;
    const stages = buildStructuredStages(substagesResult.rows, stagesResult.rows, progress);

    res.json({
      progress,
      completedSubstages: substagesResult.rows,
      completedStages: stagesResult.rows,
      stages
    });
  } catch (error) {
    console.error('Error getting patient progress:', error);
    res.status(500).json({ error: 'Failed to get patient progress' });
  }
};

// Complete a substage on behalf of a client (law firm or medical provider)
const completeSubstageForClient = async (req, res) => {
  try {
    const actorId = req.user.id;
    const userType = req.user.userType;
    const targetId = req.params.clientId || req.params.patientId;
    const { stageId, stageName, substageId, substageName, substageType } = req.body;

    if (!targetId || !stageId || !substageId || !substageName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hasAccess = await verifyClientAccess(actorId, targetId, userType);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this client/patient' });
    }

    await ensureProgressRecord(targetId);

    const existing = await db.query(
      'SELECT id, is_reverted FROM litigation_substage_completions WHERE user_id = $1 AND stage_id = $2 AND substage_id = $3',
      [targetId, stageId, substageId]
    );

    if (existing.rows.length > 0 && !existing.rows[0].is_reverted) {
      return res.status(400).json({ error: 'Substage already completed' });
    }

    let result;
    if (existing.rows.length > 0 && existing.rows[0].is_reverted) {
      result = await db.query(
        `UPDATE litigation_substage_completions 
         SET is_reverted = FALSE, reverted_at = NULL, completed_at = CURRENT_TIMESTAMP,
             coins_earned = 0, completed_by = $1, completed_by_type = $2
         WHERE id = $3 RETURNING *`,
        [actorId, userType, existing.rows[0].id]
      );
    } else {
      result = await db.query(
        `INSERT INTO litigation_substage_completions 
         (user_id, stage_id, stage_name, substage_id, substage_name, substage_type, coins_earned, is_reverted, completed_by, completed_by_type)
         VALUES ($1, $2, $3, $4, $5, $6, 0, FALSE, $7, $8)
         RETURNING *`,
        [targetId, stageId, stageName, substageId, substageName, substageType || 'upload', actorId, userType]
      );
    }

    await db.query(
      `UPDATE user_litigation_progress 
       SET total_substages_completed = total_substages_completed + 1,
           last_activity_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [targetId]
    );

    res.json({
      message: 'Substage completed on behalf of client',
      completion: result.rows[0],
      completedBy: userType
    });
  } catch (error) {
    console.error('Error completing substage for client:', error);
    res.status(500).json({ error: 'Failed to complete substage for client' });
  }
};

// Revert a substage on behalf of a client (law firm or medical provider)
const revertSubstageForClient = async (req, res) => {
  try {
    const actorId = req.user.id;
    const userType = req.user.userType;
    const targetId = req.params.clientId || req.params.patientId;
    const { stageId, substageId } = req.body;

    if (!targetId || !stageId || !substageId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hasAccess = await verifyClientAccess(actorId, targetId, userType);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this client/patient' });
    }

    const existing = await db.query(
      'SELECT * FROM litigation_substage_completions WHERE user_id = $1 AND stage_id = $2 AND substage_id = $3 AND is_reverted = FALSE',
      [targetId, stageId, substageId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Substage completion not found or already reverted' });
    }

    await db.query(
      `UPDATE litigation_substage_completions 
       SET is_reverted = TRUE, reverted_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND stage_id = $2 AND substage_id = $3 AND is_reverted = FALSE`,
      [targetId, stageId, substageId]
    );

    await db.query(
      `UPDATE user_litigation_progress 
       SET total_substages_completed = GREATEST(0, total_substages_completed - 1),
           last_activity_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [targetId]
    );

    res.json({
      message: 'Substage reverted on behalf of client',
      substageId,
      revertedBy: userType
    });
  } catch (error) {
    console.error('Error reverting substage for client:', error);
    res.status(500).json({ error: 'Failed to revert substage for client' });
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
// Handles both explicit stage completions (via "Mark Entire Stage Complete" button)
// AND implicit stage completions (when all substages were completed individually)
const revertStage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stageId } = req.body;

    if (!stageId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // First, check if there are any active substage completions to revert
    const activeSubstages = await db.query(
      `SELECT COUNT(*) as count FROM litigation_substage_completions 
       WHERE user_id = $1 AND stage_id = $2 AND is_reverted = FALSE`,
      [userId, stageId]
    );
    const substageCount = parseInt(activeSubstages.rows[0]?.count || 0);

    // Also check if there's an explicit stage completion record
    const existingStageCompletion = await db.query(
      `SELECT id FROM litigation_stage_completions 
       WHERE user_id = $1 AND stage_id = $2 AND is_reverted = FALSE`,
      [userId, stageId]
    );
    const hasExplicitStageCompletion = existingStageCompletion.rows.length > 0;

    // If nothing to revert, return error
    if (substageCount === 0 && !hasExplicitStageCompletion) {
      return res.status(404).json({ error: 'Stage completion not found or already reverted' });
    }

    // Mark all substage completions as reverted for this stage
    const substageResult = await db.query(
      `UPDATE litigation_substage_completions 
       SET is_reverted = TRUE, 
           reverted_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND stage_id = $2 AND is_reverted = FALSE
       RETURNING id`,
      [userId, stageId]
    );
    const substagesReverted = substageResult.rows.length;

    // Mark stage completion record as reverted (if it exists)
    // Note: Stage may be "completed" implicitly (all substages done) without an explicit record
    let stageRecordReverted = false;
    if (hasExplicitStageCompletion) {
      await db.query(
        `UPDATE litigation_stage_completions 
         SET is_reverted = TRUE, 
             reverted_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1 AND stage_id = $2 AND is_reverted = FALSE`,
        [userId, stageId]
      );
      stageRecordReverted = true;
    }

    // Note: Coins are NOT refunded - they remain as earned but user can't earn them again
    // This prevents coin farming

    // Update progress totals (reduce by number of substages reverted)
    if (substagesReverted > 0) {
      await db.query(
        `UPDATE user_litigation_progress 
         SET total_substages_completed = GREATEST(0, total_substages_completed - $1),
             last_activity_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [substagesReverted, userId]
      );
    }

    res.json({
      message: 'Stage reverted successfully (coins preserved to prevent farming)',
      stageId: stageId,
      substagesReverted: substagesReverted,
      explicitStageRecordReverted: stageRecordReverted,
      coinsNotRefunded: true
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
  getPatientProgress,
  completeSubstageForClient,
  revertSubstageForClient,
  revertSubstage,
  revertStage
};
