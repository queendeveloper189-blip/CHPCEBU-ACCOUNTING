#!/usr/bin/env node
/**
 * Database Health Check Script
 * Run this to diagnose database connection issues
 */

require('dotenv').config();
const { Pool } = require('pg');
const net = require('net');

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         DATABASE HEALTH CHECK & DIAGNOSTICS                    ║');
console.log('║         Trainees Accounting System                             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// ============================================
// 1. CHECK ENVIRONMENT VARIABLES
// ============================================
console.log('📋 ENVIRONMENT CONFIGURATION:');
console.log('───────────────────────────────────────────────────────────────');

const envVars = ['NODE_ENV', 'DATABASE_URL', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME'];
let config = {};

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName === 'DATABASE_URL' || varName === 'DB_PASSWORD') {
      const masked = value.substring(0, 5) + '***' + (value.length > 8 ? value.substring(value.length - 5) : '');
      console.log(`  ✓ ${varName}: ${masked}`);
    } else {
      console.log(`  ✓ ${varName}: ${value}`);
    }
  } else {
    console.log(`  ✗ ${varName}: <NOT SET>`);
  }
});

// ============================================
// 2. PARSE CONNECTION CONFIG
// ============================================
console.log('\n🔧 CONNECTION CONFIGURATION:');
console.log('───────────────────────────────────────────────────────────────');

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    config = {
      host: url.hostname,
      port: url.port || 5432,
      user: url.username,
      password: url.password ? '***' : 'none',
      database: url.pathname.substring(1),
      source: 'DATABASE_URL'
    };
    console.log(`  Source: DATABASE_URL (Render)`);
    console.log(`  Host: ${config.host}:${config.port}`);
    console.log(`  User: ${config.user}`);
    console.log(`  Database: ${config.database}`);
  } catch (e) {
    console.error(`  ✗ Failed to parse DATABASE_URL: ${e.message}`);
    process.exit(1);
  }
} else {
  config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'admin',
    database: process.env.DB_NAME || 'trainees_accounting_system',
    source: 'Individual variables'
  };
  console.log(`  Source: Individual environment variables`);
  console.log(`  Host: ${config.host}:${config.port}`);
  console.log(`  User: ${config.user}`);
  console.log(`  Database: ${config.database}`);
}

// ============================================
// 3. TEST NETWORK CONNECTIVITY
// ============================================
console.log('\n🌐 NETWORK CONNECTIVITY CHECK:');
console.log('───────────────────────────────────────────────────────────────');

function testNetworkConnection(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });

    socket.connect(port, host);
  });
}

(async () => {
  const canReach = await testNetworkConnection(config.host, config.port);
  
  if (canReach) {
    console.log(`  ✓ Can reach ${config.host}:${config.port}`);
  } else {
    console.log(`  ✗ Cannot reach ${config.host}:${config.port}`);
    console.log(`    - Check if PostgreSQL is running`);
    console.log(`    - Verify firewall rules`);
    console.log(`    - Check hostname/IP address`);
  }

  // ============================================
  // 4. TEST DATABASE CONNECTION
  // ============================================
  console.log('\n🗄️  DATABASE CONNECTION TEST:');
  console.log('───────────────────────────────────────────────────────────────');

  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      host: process.env.DATABASE_URL ? undefined : config.host,
      port: process.env.DATABASE_URL ? undefined : config.port,
      user: process.env.DATABASE_URL ? undefined : config.user,
      password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
      database: process.env.DATABASE_URL ? undefined : config.database,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000
    });

    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout (10s)')), 10000)
      )
    ]);

    const result = await client.query('SELECT NOW() as time, version() as version');
    const row = result.rows[0];
    
    console.log(`  ✓ Successfully connected to PostgreSQL`);
    console.log(`  ✓ Database time: ${row.time}`);
    console.log(`  ✓ Version: ${row.version.split(',')[0]}`);

    // ============================================
    // 5. CHECK TABLES EXIST
    // ============================================
    console.log('\n📊 DATABASE SCHEMA CHECK:');
    console.log('───────────────────────────────────────────────────────────────');

    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    const requiredTables = [
      'admin_users',
      'trainees',
      'statements_of_account',
      'requests',
      'forgot_password_requests'
    ];

    const tables = tableCheck.rows.map(row => row.table_name);
    console.log(`  Total tables: ${tables.length}`);
    
    requiredTables.forEach(table => {
      if (tables.includes(table)) {
        console.log(`  ✓ ${table}`);
      } else {
        console.log(`  ✗ ${table} (MISSING)`);
      }
    });

    // ============================================
    // 6. TEST COMMON QUERIES
    // ============================================
    console.log('\n🔍 COMMON QUERY TESTS:');
    console.log('───────────────────────────────────────────────────────────────');

    try {
      const adminCount = await client.query('SELECT COUNT(*) as count FROM admin_users');
      console.log(`  ✓ admin_users: ${adminCount.rows[0].count} records`);
    } catch (e) {
      console.log(`  ✗ admin_users query failed: ${e.message}`);
    }

    try {
      const traineeCount = await client.query('SELECT COUNT(*) as count FROM trainees');
      console.log(`  ✓ trainees: ${traineeCount.rows[0].count} records`);
    } catch (e) {
      console.log(`  ✗ trainees query failed: ${e.message}`);
    }

    try {
      const soaCount = await client.query('SELECT COUNT(*) as count FROM statements_of_account');
      console.log(`  ✓ statements_of_account: ${soaCount.rows[0].count} records`);
    } catch (e) {
      console.log(`  ✗ statements_of_account query failed: ${e.message}`);
    }

    // ============================================
    // 7. RESULT SUMMARY
    // ============================================
    console.log('\n✅ DATABASE HEALTH: EXCELLENT');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  Your database connection is working properly!');

    client.release();
    await pool.end();

  } catch (error) {
    console.log(`  ✗ Connection failed: ${error.message}`);
    console.log(`  Code: ${error.code}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(`\n  💡 TROUBLESHOOTING:`)
      console.log(`     - PostgreSQL service may not be running`);
      console.log(`     - Check if service is listening on ${config.host}:${config.port}`);
    } else if (error.code === 'ENOTFOUND') {
      console.log(`\n  💡 TROUBLESHOOTING:`);
      console.log(`     - Hostname "${config.host}" cannot be resolved`);
      console.log(`     - Check DNS settings or use IP address`);
    } else if (error.message.includes('timeout')) {
      console.log(`\n  💡 TROUBLESHOOTING:`);
      console.log(`     - Connection timeout - database is slow or unreachable`);
      console.log(`     - Check network connectivity`);
      console.log(`     - Check if firewall is blocking the connection`);
    }
    
    console.log('\n❌ DATABASE HEALTH: CRITICAL');
    
    if (pool) {
      try {
        await pool.end();
      } catch (e) {}
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
  process.exit(0);
})();
