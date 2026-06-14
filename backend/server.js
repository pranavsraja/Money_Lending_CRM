const express = require('express');
const cors = require('cors');
const getDB = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

const entities = ['leads', 'borrowers', 'applications', 'loans', 'installments', 'interactions'];

// Welcome endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the LendFlow CRM API',
    endpoints: entities.map(e => `/api/${e}`),
    seedEndpoint: '/api/seed'
  });
});

// Helper to convert object to DB insert query
function insertQuery(table, data) {
  const keys = Object.keys(data);
  const vals = Object.values(data);
  const placeholders = keys.map(() => '?').join(',');
  return {
    query: `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`,
    params: vals
  };
}

// Helper to convert object to DB update query
function updateQuery(table, data, id) {
  const keys = Object.keys(data);
  const vals = Object.values(data);
  const setString = keys.map(k => `${k} = ?`).join(', ');
  return {
    query: `UPDATE ${table} SET ${setString} WHERE id = ?`,
    params: [...vals, id]
  };
}

async function start() {
  const db = await getDB();

  entities.forEach(entity => {
    // GET all
    app.get(`/api/${entity}`, async (req, res) => {
      try {
        const rows = await db.all(`SELECT * FROM ${entity}`);
        // Convert boolean fields
        rows.forEach(r => {
          if (r.documentsVerified !== undefined) r.documentsVerified = Boolean(r.documentsVerified);
        });
        res.json(rows);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // POST
    app.post(`/api/${entity}`, async (req, res) => {
      try {
        const data = { ...req.body };
        if (!data.id) data.id = Date.now().toString(36) + Math.random().toString(36).substring(2);
        data.createdAt = new Date().toISOString();
        data.updatedAt = new Date().toISOString();

        if (data.documentsVerified !== undefined) data.documentsVerified = data.documentsVerified ? 1 : 0;

        const { query, params } = insertQuery(entity, data);
        await db.run(query, params);

        if (data.documentsVerified !== undefined) data.documentsVerified = Boolean(data.documentsVerified);
        res.status(201).json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // PUT
    app.put(`/api/${entity}/:id`, async (req, res) => {
      try {
        const data = { ...req.body };
        data.updatedAt = new Date().toISOString();
        if (data.documentsVerified !== undefined) data.documentsVerified = data.documentsVerified ? 1 : 0;

        delete data.id;

        const { query, params } = updateQuery(entity, data, req.params.id);
        await db.run(query, params);

        res.json({ id: req.params.id, ...data, documentsVerified: data.documentsVerified !== undefined ? Boolean(data.documentsVerified) : undefined });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // DELETE
    app.delete(`/api/${entity}/:id`, async (req, res) => {
      try {
        await db.run(`DELETE FROM ${entity} WHERE id = ?`, [req.params.id]);
        res.status(204).send();
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  });

  // Basic batch write endpoint for seeding
  app.post('/api/seed', async (req, res) => {
    try {
      const dataSets = req.body; // e.g. { leads: [...], borrowers: [...] }
      for (const [entity, items] of Object.entries(dataSets)) {
        if (!entities.includes(entity)) continue;
        for (const item of items) {
          const data = { ...item };
          if (data.documentsVerified !== undefined) data.documentsVerified = data.documentsVerified ? 1 : 0;
          const { query, params } = insertQuery(entity, data);
          await db.run(query, params);
        }
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
