import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // NODE_ENV -> Render automatski postavlja na 'production' (to lokalno ne postoji)
  // NODE_ENV postavljen -> server se vrti na renderu (baza koristi internal URL -> SSL nije potreban)
  // NODE_ENV nije postavljen -> vrtim ja lokalno (baza koristi external URL -> uključen SSL, ali sa rejectUnauthorized:false ne provjeravam lanac certifikata)
  ssl: process.env.NODE_ENV === 'production' ? false : { rejectUnauthorized: false }
});