const db = require('../config/db');

/**
 * Permission Service - RBAC Implementation
 * Handles role-based access control for HIPAA-compliant PHI access
 */
class PermissionService {
  /**
   * Check if a user has a specific permission
   * @param {number} userId - User ID to check
   * @param {string} permissionName - Permission name to check
   * @param {string} userType - User type ('client', 'lawfirm', 'medical_provider')
   * @returns {Promise<boolean>} - True if user has permission
   */
  async checkPermission(userId, permissionName, userType = 'client') {
    try {
      // For law firms and medical providers, grant role permissions directly
      // since they're in separate tables from the users table
      if (userType === 'lawfirm') {
        // Law firms get LAW_FIRM_ADMIN permissions
        const query = `
          SELECT EXISTS (
            SELECT 1
            FROM roles r
            JOIN role_permissions rp ON r.id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE r.name = 'LAW_FIRM_ADMIN'
              AND p.name = $1
          ) as has_permission
        `;
        const result = await db.query(query, [permissionName]);
        return result.rows[0]?.has_permission || false;
      }
      
      if (userType === 'medical_provider') {
        // Medical providers get MEDICAL_PROVIDER_ADMIN permissions
        const query = `
          SELECT EXISTS (
            SELECT 1
            FROM roles r
            JOIN role_permissions rp ON r.id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE r.name = 'MEDICAL_PROVIDER_ADMIN'
              AND p.name = $1
          ) as has_permission
        `;
        const result = await db.query(query, [permissionName]);
        return result.rows[0]?.has_permission || false;
      }
      
      // For regular users, check user_roles table
      const query = `
        SELECT EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN role_permissions rp ON ur.role_id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE ur.user_id = $1
            AND p.name = $2
            AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        ) as has_permission
      `;
      
      const result = await db.query(query, [userId, permissionName]);
      return result.rows[0]?.has_permission || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user has ANY of the specified permissions
   * @param {number} userId - User ID to check
   * @param {string[]} permissionNames - Array of permission names
   * @returns {Promise<boolean>} - True if user has at least one permission
   */
  async checkAnyPermission(userId, permissionNames) {
    try {
      const query = `
        SELECT EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN role_permissions rp ON ur.role_id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE ur.user_id = $1
            AND p.name = ANY($2)
            AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        ) as has_permission
      `;
      
      const result = await db.query(query, [userId, permissionNames]);
      return result.rows[0]?.has_permission || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user has ALL of the specified permissions
   * @param {number} userId - User ID to check
   * @param {string[]} permissionNames - Array of permission names
   * @returns {Promise<boolean>} - True if user has all permissions
   */
  async checkAllPermissions(userId, permissionNames) {
    try {
      for (const permission of permissionNames) {
        const hasPermission = await this.checkPermission(userId, permission);
        if (!hasPermission) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all permissions for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of permission objects
   */
  async getUserPermissions(userId) {
    try {
      const query = `
        SELECT DISTINCT
          p.id,
          p.name,
          p.category,
          p.description,
          p.is_sensitive
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        ORDER BY p.category, p.name
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all roles for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of role objects
   */
  async getUserRoles(userId) {
    try {
      const query = `
        SELECT
          r.id,
          r.name,
          r.description,
          ur.assigned_at,
          ur.expires_at
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        ORDER BY r.name
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  /**
   * Assign a role to a user
   * @param {number} userId - User ID
   * @param {string} roleName - Role name to assign
   * @param {number} assignedBy - User ID of who assigned the role
   * @param {Date} expiresAt - Optional expiration date
   * @returns {Promise<Object>} - Assignment result
   */
  async assignRole(userId, roleName, assignedBy = null, expiresAt = null) {
    try {
      // Get role ID
      const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
      
      if (roleResult.rows.length === 0) {
        throw new Error(`Role ${roleName} not found`);
      }
      
      const roleId = roleResult.rows[0].id;
      
      // Assign role
      const query = `
        INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, role_id) DO UPDATE
          SET assigned_by = $3, expires_at = $4, assigned_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const result = await db.query(query, [userId, roleId, assignedBy, expiresAt]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove a role from a user
   * @param {number} userId - User ID
   * @param {string} roleName - Role name to remove
   * @returns {Promise<boolean>} - True if successful
   */
  async removeRole(userId, roleName) {
    try {
      const query = `
        DELETE FROM user_roles
        WHERE user_id = $1
          AND role_id = (SELECT id FROM roles WHERE name = $2)
      `;
      
      const result = await db.query(query, [userId, roleName]);
      return result.rowCount > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a permission is sensitive (requires enhanced logging)
   * @param {string} permissionName - Permission name
   * @returns {Promise<boolean>} - True if sensitive
   */
  async isSensitivePermission(permissionName) {
    try {
      const query = 'SELECT is_sensitive FROM permissions WHERE name = $1';
      const result = await db.query(query, [permissionName]);
      return result.rows[0]?.is_sensitive || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all available permissions grouped by category
   * @returns {Promise<Object>} - Permissions grouped by category
   */
  async getAllPermissions() {
    try {
      const query = `
        SELECT
          id,
          name,
          category,
          description,
          is_sensitive
        FROM permissions
        ORDER BY category, name
      `;
      
      const result = await db.query(query);
      
      // Group by category
      const grouped = {};
      result.rows.forEach(permission => {
        if (!grouped[permission.category]) {
          grouped[permission.category] = [];
        }
        grouped[permission.category].push(permission);
      });
      
      return grouped;
    } catch (error) {
      return {};
    }
  }
}

module.exports = new PermissionService();
