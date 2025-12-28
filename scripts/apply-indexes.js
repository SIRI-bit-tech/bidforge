const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyIndexes() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the performance indexes SQL file
    const sqlPath = path.join(__dirname, '..', 'drizzle', 'performance-indexes-enhanced.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Applying performance indexes...');
    
    // Split SQL into individual statements and filter out comments and empty lines
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '')
      .map(stmt => stmt + ';');
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const statement of statements) {
      try {
        // Skip comment-only statements
        if (statement.trim().startsWith('--')) continue;
        
        await client.query(statement);
        
        // Extract index name for logging
        const indexMatch = statement.match(/idx_\w+/);
        const indexName = indexMatch ? indexMatch[0] : 'unknown';
        
        if (statement.includes('ANALYZE')) {
          console.log(`✅ Analyzed table`);
        } else {
          console.log(`✅ Created index: ${indexName}`);
        }
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          skipCount++;
          // Skip already existing indexes silently
        } else {
          console.warn(`⚠️  Warning: ${error.message}`);
        }
      }
    }
    
    console.log(`\n🎉 Performance indexes applied successfully!`);
    console.log(`   ✅ Created/Updated: ${successCount} indexes`);
    console.log(`   ⏭️  Skipped (already exist): ${skipCount} indexes`);

  } catch (error) {
    console.error('❌ Error applying indexes:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyIndexes();