import db from '../config/database.js';

/**
 * Get all names
 */
export const getAllNames = async () => {
    const result = await db.query(
        'SELECT * FROM names ORDER BY name ASC'
    );
    return result.rows;
};

/**
 * Get active names only
 */
export const getActiveNames = async () => {
    const result = await db.query(
        'SELECT * FROM names WHERE is_active = true ORDER BY name ASC'
    );
    return result.rows;
};

/**
 * Get random active name
 */
export const getRandomName = async () => {
    const result = await db.query(
        'SELECT name FROM names WHERE is_active = true ORDER BY RANDOM() LIMIT 1'
    );
    return result.rows[0]?.name || null;
};

/**
 * Add new name
 */
export const addName = async (name, gender = 'neutral') => {
    const result = await db.query(
        'INSERT INTO names (name, gender) VALUES ($1, $2) RETURNING *',
        [name.toLowerCase(), gender]
    );
    return result.rows[0];
};

/**
 * Update name
 */
export const updateName = async (id, updates) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updates.name.toLowerCase());
    }
    if (updates.gender !== undefined) {
        fields.push(`gender = $${paramCount++}`);
        values.push(updates.gender);
    }
    if (updates.is_active !== undefined) {
        fields.push(`is_active = $${paramCount++}`);
        values.push(updates.is_active);
    }

    if (fields.length === 0) {
        throw new Error('No fields to update');
    }

    values.push(id);
    const result = await db.query(
        `UPDATE names SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
    );
    return result.rows[0];
};

/**
 * Delete name
 */
export const deleteName = async (id) => {
    const result = await db.query(
        'DELETE FROM names WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

/**
 * Get names count
 */
export const getNamesCount = async () => {
    const result = await db.query(
        'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM names'
    );
    return result.rows[0];
};

export default {
    getAllNames,
    getActiveNames,
    getRandomName,
    addName,
    updateName,
    deleteName,
    getNamesCount,
};
