/**
 * Database Connection Diagnostics
 * Helps identify why database connections are failing
 */

console.log('\n═══════════════════════════════════════════════════════════');
console.log('DATABASE CONNECTION DIAGNOSTICS');
console.log('═══════════════════════════════════════════════════════════\n');

// Show all environment variables
console.log('Environment Variables:');
console.log('─────────────────────────────────────────────────────────');

const envVars = [
  'NODE_ENV',
  'DATABASE_URL',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'PORT',
  'RENDER',
  'RENDER_SERVICE_ID',
];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    if (varName === 'DATABASE_URL' || varName === 'DB_PASSWORD') {
      const masked = value.substring(0, 5) + '***' + (value.length > 8 ? value.substring(value.length - 5) : '');
      console.log(`  ${varName}: ${masked}`);
    } else {
      console.log(`  ${varName}: ${value}`);
    }
  } else {
    console.log(`  ${varName}: <not set>`);
  }
});

console.log('\n═══════════════════════════════════════════════════════════\n');

// Parse and show final config
let finalConfig = {};

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    finalConfig = {
      host: url.hostname,
      user: url.username,
      password: url.password ? '***' : 'none',
      database: url.pathname.substring(1),
      port: url.port || 3306,
      source: 'DATABASE_URL'
    };
  } catch (e) {
    console.error('✗ Failed to parse DATABASE_URL:', e.message);
  }
} else if (process.env.DB_HOST) {
  finalConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ? '***' : 'none',
    database: process.env.DB_NAME || 'trainees_accounting_system',
    port: process.env.DB_PORT || 3306,
    source: 'Individual env vars'
  };
} else {
  finalConfig = {
    host: 'localhost',
    user: 'root',
    password: 'none',
    database: 'trainees_accounting_system',
    port: 3306,
    source: 'DEFAULTS (Database not configured!)'
  };
}

console.log('Parsed Database Configuration:');
console.log('─────────────────────────────────────────────────────────');
console.log(`  Source: ${finalConfig.source}`);
console.log(`  Host: ${finalConfig.host}`);
console.log(`  Port: ${finalConfig.port}`);
console.log(`  User: ${finalConfig.user}`);
console.log(`  Password: ${finalConfig.password}`);
console.log(`  Database: ${finalConfig.database}`);

// Warn if using defaults
if (finalConfig.source === 'DEFAULTS (Database not configured!)') {
  console.log('\n⚠ WARNING: Using default localhost configuration!');
  console.log('   Make sure DATABASE_URL or DB_* variables are set on Render.\n');
}

console.log('═══════════════════════════════════════════════════════════\n');

module.exports = finalConfig;
