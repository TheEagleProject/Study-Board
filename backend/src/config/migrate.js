const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const logger = require('./logger');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(schema);
    logger.info('✅ Database schema applied successfully');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Migration failed', { error: err.message });
    process.exit(1);
  }
}

migrate();
