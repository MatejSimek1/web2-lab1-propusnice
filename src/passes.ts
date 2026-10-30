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

export interface Pass {
    id: string;
    name: string;
    document: string;
    issued_at: Date;
    status: 'ACTIVE' | 'CANCELLED';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;  // /i -> case insensitive (mogu biti velika i mala slova)
export function isUuid(id: string): boolean {
    return UUID_RE.test(id);
}

// get all passes, newest first
export async function getAllPasses(): Promise<Pass[]> {
    const result = await pool.query(
        'SELECT id, name, document, issued_at, status FROM passes ORDER BY issued_at DESC;'
    );
    return result.rows;
}

// cancel pass; returns false if it does not exist
export async function cancelPass(id: string): Promise<boolean> {
    const result = await pool.query("UPDATE passes SET status = 'CANCELLED' WHERE id = $1;", [id]);
    return (result.rowCount ?? 0) > 0;  // pg u rezultatu daje metapodatak rowCount (koliko je redaka zahvaćeno upitom)
}

// delete pass; returns false if it does not exist
export async function deletePass(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM passes WHERE id = $1;', [id]);
    return (result.rowCount ?? 0) > 0;
}