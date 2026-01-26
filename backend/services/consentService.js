const db = require('../config/db');

/**
 * Consent Service - Patient Consent Management
 * Handles HIPAA-compliant patient consent for PHI sharing
 */
class ConsentService {
  /**
   * Check if valid consent exists for PHI access
   * @param {Object} params - Consent check parameters
   * @param {number} params.patientId - Patient/client user ID
   * @param {string} params.grantedToType - Type: 'lawfirm' or 'medical_provider'
   * @param {number} params.grantedToId - ID of law firm or medical provider
   * @param {string} params.dataType - Optional: specific data type (medical_records, billing, etc.)
   * @returns {Promise<boolean>} - True if valid consent exists
   */
  async checkConsent({ patientId, grantedToType, grantedToId, dataType = null }) {
    try {
      // Check for active consent
      const query = `
        SELECT cr.*, 
               ARRAY_AGG(DISTINCT cs.data_type) as allowed_data_types
        FROM consent_records cr
        LEFT JOIN consent_scope cs ON cr.id = cs.consent_id AND cs.can_view = true
        WHERE cr.patient_id = $1
          AND cr.granted_to_type = $2
          AND cr.granted_to_id = $3
          AND cr.status = 'active'
          AND (cr.expires_at IS NULL OR cr.expires_at > NOW())
        GROUP BY cr.id
      `;
      
      const result = await db.query(query, [patientId, grantedToType, grantedToId]);
      
      if (result.rows.length === 0) {
        return false;
      }
      
      // If no specific data type requested, consent exists
      if (!dataType) {
        return true;
      }
      
      // Check ALL consent records - if ANY of them grant access, return true
      for (const consent of result.rows) {
        // Check if consent type covers the requested data
        if (consent.consent_type === 'FULL_ACCESS') {
          return true;
        }
        
        if (consent.consent_type === 'MEDICAL_RECORDS_ONLY' && dataType === 'medical_records') {
          return true;
        }
        
        if (consent.consent_type === 'BILLING_ONLY' && dataType === 'billing') {
          return true;
        }
        
        if (consent.consent_type === 'LITIGATION_ONLY' && dataType === 'litigation') {
          return true;
        }
        
        // Check if the simple consent_type matches the dataType
        if (consent.consent_type === dataType) {
          return true;
        }
        
        // For CUSTOM consent, check if data type is in allowed list
        if (consent.consent_type === 'CUSTOM') {
          const allowedTypes = consent.allowed_data_types || [];
          if (allowedTypes.includes(dataType)) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Grant consent for PHI access
   * @param {Object} params - Consent parameters
   * @returns {Promise<Object>} - Created consent record
   */
  async grantConsent({
    patientId,
    grantedToType,
    grantedToId,
    consentType = 'FULL_ACCESS',
    expiresAt = null,
    consentMethod = 'electronic',
    ipAddress = null,
    signatureData = null,
    customDataTypes = null // For CUSTOM consent type
  }) {
    try {
      // Create consent record
      const query = `
        INSERT INTO consent_records (
          patient_id,
          granted_to_type,
          granted_to_id,
          consent_type,
          status,
          expires_at,
          consent_method,
          ip_address,
          signature_data
        ) VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8)
        RETURNING *
      `;
      
      const result = await db.query(query, [
        patientId,
        grantedToType,
        grantedToId,
        consentType,
        expiresAt,
        consentMethod,
        ipAddress,
        signatureData
      ]);
      
      const consent = result.rows[0];
      
      // If CUSTOM consent, add scope entries
      if (consentType === 'CUSTOM' && customDataTypes && customDataTypes.length > 0) {
        for (const dataType of customDataTypes) {
          await db.query(
            `INSERT INTO consent_scope (consent_id, data_type, can_view, can_edit)
             VALUES ($1, $2, $3, $4)`,
            [consent.id, dataType.type, dataType.canView || true, dataType.canEdit || false]
          );
        }
      }
      
      return consent;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Revoke consent
   * @param {number} consentId - Consent record ID
   * @param {string} reason - Reason for revocation
   * @returns {Promise<Object>} - Updated consent record
   */
  async revokeConsent(consentId, reason = null) {
    try {
      const query = `
        UPDATE consent_records
        SET status = 'revoked',
            revoked_at = CURRENT_TIMESTAMP,
            revoked_reason = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [consentId, reason]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all consents for a patient
   * @param {number} patientId - Patient user ID
   * @param {string} status - Optional: filter by status
   * @returns {Promise<Array>} - Array of consent records
   */
  async getPatientConsents(patientId, status = null) {
    try {
      let query = `
        SELECT 
          cr.*,
          CASE 
            WHEN cr.granted_to_type = 'lawfirm' THEN lf.firm_name
            WHEN cr.granted_to_type = 'medical_provider' THEN mp.provider_name
          END as granted_to_name
        FROM consent_records cr
        LEFT JOIN law_firms lf ON cr.granted_to_type = 'lawfirm' AND cr.granted_to_id = lf.id
        LEFT JOIN medical_providers mp ON cr.granted_to_type = 'medical_provider' AND cr.granted_to_id = mp.id
        WHERE cr.patient_id = $1
      `;
      
      const params = [patientId];
      
      if (status) {
        query += ' AND cr.status = $2';
        params.push(status);
      }
      
      query += ' ORDER BY cr.created_at DESC';
      
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all consents granted to a law firm or provider
   * @param {string} grantedToType - 'lawfirm' or 'medical_provider'
   * @param {number} grantedToId - Law firm or provider ID
   * @param {string} status - Optional: filter by status
   * @returns {Promise<Array>} - Array of consent records with patient info
   */
  async getGrantedConsents(grantedToType, grantedToId, status = 'active') {
    try {
      let query = `
        SELECT 
          cr.*,
          u.first_name,
          u.last_name,
          u.email,
          u.first_name_encrypted,
          u.last_name_encrypted
        FROM consent_records cr
        JOIN users u ON cr.patient_id = u.id
        WHERE cr.granted_to_type = $1
          AND cr.granted_to_id = $2
      `;
      
      const params = [grantedToType, grantedToId];
      
      if (status) {
        query += ' AND cr.status = $3';
        params.push(status);
      }
      
      query += ' ORDER BY cr.created_at DESC';
      
      const result = await db.query(query, params);
      
      // Decrypt patient names
      const encryption = require('./encryption');
      return result.rows.map(consent => ({
        ...consent,
        first_name: consent.first_name_encrypted ? 
          encryption.decrypt(consent.first_name_encrypted) : consent.first_name,
        last_name: consent.last_name_encrypted ? 
          encryption.decrypt(consent.last_name_encrypted) : consent.last_name
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Automatically expire old consents
   * @returns {Promise<number>} - Number of consents expired
   */
  async expireOldConsents() {
    try {
      const query = `
        UPDATE consent_records
        SET status = 'expired',
            updated_at = CURRENT_TIMESTAMP
        WHERE status = 'active'
          AND expires_at IS NOT NULL
          AND expires_at <= NOW()
        RETURNING id
      `;
      
      const result = await db.query(query);
      return result.rowCount;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get consent details with scope information
   * @param {number} consentId - Consent record ID
   * @returns {Promise<Object>} - Consent with scope details
   */
  async getConsentDetails(consentId) {
    try {
      const consentQuery = `
        SELECT 
          cr.*,
          CASE 
            WHEN cr.granted_to_type = 'lawfirm' THEN lf.firm_name
            WHEN cr.granted_to_type = 'medical_provider' THEN mp.provider_name
          END as granted_to_name
        FROM consent_records cr
        LEFT JOIN law_firms lf ON cr.granted_to_type = 'lawfirm' AND cr.granted_to_id = lf.id
        LEFT JOIN medical_providers mp ON cr.granted_to_type = 'medical_provider' AND cr.granted_to_id = mp.id
        WHERE cr.id = $1
      `;
      
      const consentResult = await db.query(consentQuery, [consentId]);
      
      if (consentResult.rows.length === 0) {
        return null;
      }
      
      const consent = consentResult.rows[0];
      
      // Get scope if CUSTOM consent
      if (consent.consent_type === 'CUSTOM') {
        const scopeQuery = `
          SELECT data_type, can_view, can_edit
          FROM consent_scope
          WHERE consent_id = $1
        `;
        
        const scopeResult = await db.query(scopeQuery, [consentId]);
        consent.scope = scopeResult.rows;
      }
      
      return consent;
    } catch (error) {
      return null;
    }
  }
}

module.exports = new ConsentService();
