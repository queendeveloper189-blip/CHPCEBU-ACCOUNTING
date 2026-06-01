const { Pool } = require('pg');
require('dotenv').config();

async function fixSOARemaining() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Fixing SOA amount_remaining values...');
    
    // For each SOA, set amount_remaining = total_amount - amount_paid
    const result = await pool.query(`
      UPDATE statements_of_account
      SET amount_remaining = (total_amount - COALESCE(amount_paid, 0))
      WHERE amount_remaining = 0 AND total_amount > 0
    `);

    console.log(`✓ Updated ${result.rowCount} SOA records`);
    
    // Display the updated SOAs
    const soasResult = await pool.query(`
      SELECT id, soa_number, total_amount, amount_paid, amount_remaining
      FROM statements_of_account
      ORDER BY id
    `);
    
    console.log('\n📋 Updated SOAs:');
    soasResult.rows.forEach(row => {
      console.log(`  SOA ${row.soa_number}: Total=₱${row.total_amount}, Paid=₱${row.amount_paid}, Remaining=₱${row.amount_remaining}`);
    });

    await pool.end();
    console.log('\n✅ Fix complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixSOARemaining();
