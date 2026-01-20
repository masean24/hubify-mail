import db from '../config/database.js';

/**
 * Cleanup expired inboxes and their emails
 * Emails are deleted via CASCADE when inbox is deleted
 */
export const cleanupExpiredInboxes = async () => {
    const result = await db.query(
        `DELETE FROM inboxes WHERE expires_at < NOW() RETURNING id`
    );
    return result.rowCount;
};

/**
 * Get cleanup statistics
 */
export const getCleanupStats = async () => {
    const expiredCount = await db.query(
        `SELECT COUNT(*) as count FROM inboxes WHERE expires_at < NOW()`
    );

    const totalInboxes = await db.query(
        `SELECT COUNT(*) as count FROM inboxes`
    );

    const totalEmails = await db.query(
        `SELECT COUNT(*) as count FROM emails`
    );

    return {
        expiredInboxes: parseInt(expiredCount.rows[0].count),
        totalInboxes: parseInt(totalInboxes.rows[0].count),
        totalEmails: parseInt(totalEmails.rows[0].count),
    };
};

export default {
    cleanupExpiredInboxes,
    getCleanupStats,
};
