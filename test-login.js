const http = require('http');

const data = JSON.stringify({
  username: 'admin',
  password: 'admin123',
  userType: 'admin'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log('\n=== Response Status: ' + res.statusCode + ' ' + res.statusMessage + ' ===\n');
  console.log('=== Response Headers ===');
  console.log(res.headers);
  console.log('\n=== Response Body ===');
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch (e) {
      console.log(body);
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

req.write(data);
req.end();
