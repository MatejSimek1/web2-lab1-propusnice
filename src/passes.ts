import { pool } from './db.ts';

// get number of passes
export async function getTotalCount() : Promise<number>{
    const result = await pool.query('SELECT COUNT(*) AS count FROM passes;');
    return Number(result.rows[0].count);
}

// get number of active passes
export async function getActiveCount() : Promise<number> {
    const result = await pool.query("SELECT COUNT(*) AS count FROM passes WHERE status = 'ACTIVE';");
    return Number(result.rows[0].count);
}