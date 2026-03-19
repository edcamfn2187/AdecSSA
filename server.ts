import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Database connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️  DATABASE_URL is not set. The backend will not be able to connect to the database.');
  console.warn('To fix this, add DATABASE_URL to your environment variables or AI Studio Secrets.');
  console.warn('Example: postgres://user:password@host:5432/dbname');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('supabase.co') ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000, // Fail fast
});

async function startServer() {
  const app = express();
  // AI Studio expects port 3000. Docker will provide 3001 via env.
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(cors());
  app.use(express.json());

  // Auth Routes
  app.get('/api/auth/check-setup', async (req, res) => {
    if (!connectionString) {
      return res.status(503).json({ error: 'DATABASE_URL_NOT_CONFIGURED' });
    }
    try {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT COUNT(*) FROM profiles');
        const count = parseInt(result.rows[0].count, 10);
        res.json({ isSetup: count > 0 });
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Check setup error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/setup', async (req, res) => {
    const { email, password, name } = req.body;
    if (!connectionString) {
      return res.status(503).json({ error: 'DATABASE_URL_NOT_CONFIGURED' });
    }
    try {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT COUNT(*) FROM profiles');
        const count = parseInt(result.rows[0].count, 10);
        if (count > 0) {
          return res.status(403).json({ error: 'Sistema já configurado' });
        }

        // Ensure password column exists
        await client.query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT');

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertResult = await client.query(
          'INSERT INTO profiles (id, email, password, full_name, role, allowed_modules) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) RETURNING id, email, role',
          [email, hashedPassword, name, 'ADMIN', '{PORTAL,MEMBERS,FINANCIAL,EBD,REGIONAIS,CONFIG}']
        );
        
        const user = insertResult.rows[0];
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '24h' }
        );

        res.json({
          session: {
            access_token: token,
            user: { id: user.id, email: user.email }
          }
        });
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Setup error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!connectionString) {
      return res.status(503).json({ error: 'DATABASE_URL_NOT_CONFIGURED' });
    }

    try {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM profiles WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
          return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Se a senha no banco for igual à enviada (plain text para o admin inicial)
        // ou se o hash bater
        const isMatch = user.password === password || (user.password && await bcrypt.compare(password, user.password));

        if (!isMatch) {
          return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Se a senha era plain text, vamos hashear agora para segurança
        if (user.password === password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await client.query('UPDATE profiles SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '24h' }
        );

        res.json({
          session: {
            access_token: token,
            user: {
              id: user.id,
              email: user.email,
              user_metadata: {
                full_name: user.full_name,
                role: user.role
              }
            }
          }
        });
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API Routes
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';
    if (connectionString) {
      try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        dbStatus = 'connected';
      } catch (err) {
        dbStatus = `error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    res.json({ 
      status: 'ok', 
      database: dbStatus,
      message: connectionString ? 'Server is running' : 'Server is running but DATABASE_URL is missing'
    });
  });

  // Helper function to handle queries
  const handleQuery = async (query: string, params: any[] = []) => {
    if (!connectionString) {
      return null;
    }
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
    'transactions',
    'regionals',
    'regional_transactions'
  ];

  tables.forEach(table => {
    app.get(`/api/${table}`, async (req, res) => {
      if (!connectionString) {
        return res.status(503).json({ error: 'DATABASE_URL_NOT_CONFIGURED' });
      }
      try {
        const queryParams = req.query;
        let query = `SELECT * FROM ${table}`;
        const values: any[] = [];
        
        if (Object.keys(queryParams).length > 0) {
          const conditions = Object.keys(queryParams).map((key, i) => {
            values.push(queryParams[key as string]);
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
