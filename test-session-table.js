require('dotenv').config();
const pool = require('./config/database-pg');

async function testSessionTable() {
  try {
    console.log('\n🔍 Testing Session Table...\n');

    // Check if session table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'session'
      );
    `);
    
    console.log('✓ Session table exists:', tableCheckResult.rows[0].exists);

    if (tableCheckResult.rows[0].exists) {
      // Get table structure
      const structureResult = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'session'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Session Table Structure:');
      structureResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });

      // Check row count
      const countResult = await pool.query('SELECT COUNT(*) as count FROM "session"');
      console.log(`\n📊 Current session rows: ${countResult.rows[0].count}`);

      // Try to insert a test session
      const testSessionId = 'test-session-' + Date.now();
      const testData = JSON.stringify({
        userId: 999,
        username: 'test_user',
        userType: 'test'
      });
      
      await pool.query(
        'INSERT INTO "session" (sid, sess, expire) VALUES ($1, $2, $3)',
        [testSessionId, testData, new Date(Date.now() + 86400000)]
      );
      console.log('\n✅ Successfully inserted test session');

      // Retrieve test session
      const retriveResult = await pool.query(
        'SELECT * FROM "session" WHERE sid = $1',
        [testSessionId]
      );
      
      if (retriveResult.rows.length > 0) {
        console.log('✅ Successfully retrieved test session');
        console.log('   SID:', retriveResult.rows[0].sid);
        console.log('   Data:', retriveResult.rows[0].sess);
      } else {
        console.log('❌ Could not retrieve test session');
      }

      // Cleanup
      await pool.query('DELETE FROM "session" WHERE sid = $1', [testSessionId]);
      console.log('✅ Cleaned up test session');
    }

    await pool.end();
    console.log('\n✅ Session table test completed\n');

  } catch (error) {
    console.error('\n❌ Session table test failed:\n', error);
    process.exit(1);
  }
}

testSessionTable();
