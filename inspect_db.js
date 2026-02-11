const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'analytics.db');
const db = new Database(dbPath);

// Find the record #319 or similar recent "Unknown" records
const rows = db.prepare(`
    SELECT id, timestamp, event_type, sso_user, tenant_id, details 
    FROM events 
    WHERE sso_user = 'Unknown' OR id = 319
    ORDER BY id DESC
    LIMIT 5
`).all();

console.log(JSON.stringify(rows, null, 2));
