const pool = require('./config/database');
(async () => {
  try {
    const [rows] = await pool.query('SELECT id, trainee_id, soa_id, transaction_type, amount, description, payment_method, created_at FROM transactions WHERE soa_id = ? ORDER BY created_at DESC', [4]);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
