const express = require('express');
const router = express.Router();
const { processNotificationQueue } = require('../services/notificationQueueProcessor');
const { verifyLawFirmUser } = require('../middleware/lawFirmAuth');
const { verifyMedicalProviderUser } = require('../middleware/medicalProviderAuth');

/**
 * Notification Queue Management Routes
 * 
 * These routes allow manual processing and monitoring of the notification queue
 * In production, processNotificationQueue should be called by a cron job every 15 minutes
 */

/**
 * POST /api/notification-queue/process
 * Manually trigger queue processing (admin/testing use)
 * 
 * In production, this would be called by a cron job or scheduled task
 * For local testing, you can call this endpoint manually
 */
router.post('/process', async (req, res) => {
  try {
    const result = await processNotificationQueue();
    res.json({
      success: true,
      message: 'Queue processing completed',
      ...result
    });
  } catch (error) {
    console.error('Error processing notification queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process notification queue',
      message: error.message
    });
  }
});

/**
 * GET /api/notification-queue/status
 * Get queue status and statistics
 * Requires law firm or medical provider authentication
 */
router.get('/status', async (req, res) => {
  // Allow both law firms and medical providers to check queue status
  // Try law firm auth first, then medical provider
  let authenticated = false;
  
  try {
    await new Promise((resolve, reject) => {
      verifyLawFirmUser(req, res, (err) => {
        if (err) reject(err);
        else {
          authenticated = true;
          resolve();
        }
      });
    });
  } catch (lawFirmError) {
    try {
      await new Promise((resolve, reject) => {
        verifyMedicalProviderUser(req, res, (err) => {
          if (err) reject(err);
          else {
            authenticated = true;
            resolve();
          }
        });
      });
    } catch (medicalProviderError) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
  }
  
  if (!authenticated) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'queued') as queued_count,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'queued' AND scheduled_for <= NOW()) as ready_to_send,
        COUNT(*) FILTER (WHERE status = 'queued' AND scheduled_for > NOW()) as scheduled_for_later,
        MIN(scheduled_for) FILTER (WHERE status = 'queued' AND scheduled_for <= NOW()) as next_send_time
      FROM notification_queue
    `);
    
    res.json({
      success: true,
      queue_status: stats.rows[0]
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue status'
    });
  }
});

module.exports = router;
