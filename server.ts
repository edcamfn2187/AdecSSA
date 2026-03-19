import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.VITE_SUPABASE_URL?.replace('https://', 'postgres://postgres:password@').replace('.supabase.co', '.supabase.co:5432/postgres'),
  ssl: {
    rejectUnauthorized: false
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // Helper function to handle queries
  const handleQuery = async (query: string, params: any[] = []) => {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  };

  // Generic CRUD endpoints
  const tables = [
    'church_settings',
    'profiles',
    'members',
    'classes',
    'students',
    'teachers',
    'attendance_records',
    'lesson_calendar',
    'teacher_attendance',
    'tithe_payers',
    'tithes',
    'contribution_types',
    'mission_transactions',
    'transactions',
    'regionals',
    'regional_transactions',
    'members'
  ];

  tables.forEach(table => {
    app.get(`/api/${table}`, async (req, res) => {
      try {
        const queryParams = req.query;
        let query = `SELECT * FROM ${table}`;
        const values: any[] = [];
        
        if (Object.keys(queryParams).length > 0) {
          const conditions = Object.keys(queryParams).map((key, i) => {
            values.push(queryParams[key]);
            return `${key} = $${i + 1}`;
          }).join(' AND ');
          query += ` WHERE ${conditions}`;
        }
        
        const rows = await handleQuery(query, values);
        res.json(rows);
      } catch (err) {
        console.error(`Error fetching ${table}:`, err);
        res.status(500).json({ error: `Internal server error fetching ${table}` });
      }
    });

    app.post(`/api/${table}`, async (req, res) => {
      try {
        const data = req.body;
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const rows = await handleQuery(query, values);
        res.json(rows[0]);
      } catch (err) {
        console.error(`Error creating ${table}:`, err);
        res.status(500).json({ error: `Internal server error creating ${table}` });
      }
    });

    app.put(`/api/${table}/:id`, async (req, res) => {
      try {
        const { id } = req.params;
        const data = req.body;
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const query = `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
        const rows = await handleQuery(query, [...values, id]);
        res.json(rows[0]);
      } catch (err) {
        console.error(`Error updating ${table}:`, err);
        res.status(500).json({ error: `Internal server error updating ${table}` });
      }
    });

    app.delete(`/api/${table}/:id`, async (req, res) => {
      try {
        const { id } = req.params;
        const query = `DELETE FROM ${table} WHERE id = $1`;
        await handleQuery(query, [id]);
        res.json({ success: true });
      } catch (err) {
        console.error(`Error deleting ${table}:`, err);
        res.status(500).json({ error: `Internal server error deleting ${table}` });
      }
    });
  });

  // Special endpoint for upsert (used by Supabase)
  app.post('/api/upsert/:table', async (req, res) => {
    const { table } = req.params;
    try {
      const { conflict_key = 'id', ...data } = req.body;
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const updateClause = keys.map((key, i) => `${key} = EXCLUDED.${key}`).join(', ');
      const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflict_key}) DO UPDATE SET ${updateClause} RETURNING *`;
      const rows = await handleQuery(query, values);
      res.json(rows[0]);
    } catch (err) {
      console.error(`Error upserting ${table}:`, err);
      res.status(500).json({ error: `Internal server error upserting ${table}` });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
