import http from 'http';

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 5000,
  path: '/api/restaurants',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log('RESPONSE', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('RAW', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error', e.message);
});

req.end();
