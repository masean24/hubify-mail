import db from '../config/database.js';

/**
 * Get all active domains
 */
export const getActiveDomains = async () => {
    const result = await db.query(
        'SELECT id, domain FROM domains WHERE is_active = true ORDER BY domain'
    );
    return result.rows;
};

/**
 * Get all domains (for admin)
 */
export const getAllDomains = async () => {
    const result = await db.query(
        'SELECT id, domain, is_active, created_at FROM domains ORDER BY created_at DESC'
    );
    return result.rows;
};

/**
 * Get domain by ID
 */
export const getDomainById = async (id) => {
    const result = await db.query('SELECT * FROM domains WHERE id = $1', [id]);
    return result.rows[0];
};

/**
 * Get domain by name
 */
export const getDomainByName = async (domain) => {
    const result = await db.query('SELECT * FROM domains WHERE domain = $1', [domain]);
    return result.rows[0];
};

/**
 * Create new domain
 */
export const createDomain = async (domain) => {
    const result = await db.query(
        'INSERT INTO domains (domain) VALUES ($1) RETURNING *',
        [domain.toLowerCase()]
    );
    return result.rows[0];
};

/**
 * Update domain
 */
export const updateDomain = async (id, updates) => {
    const { domain, is_active } = updates;
    const result = await db.query(
        'UPDATE domains SET domain = COALESCE($1, domain), is_active = COALESCE($2, is_active) WHERE id = $3 RETURNING *',
        [domain, is_active, id]
    );
    return result.rows[0];
};

/**
 * Delete domain
 */
export const deleteDomain = async (id) => {
    await db.query('DELETE FROM domains WHERE id = $1', [id]);
};

export default {
    getActiveDomains,
    getAllDomains,
    getDomainById,
    getDomainByName,
    createDomain,
    updateDomain,
    deleteDomain,
};
