const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const mongoose = require('mongoose');
const app = require('./index');

test('Vercel API entrypoint initializes its database before handling API routes', async () => {
  const originalConnect = mongoose.connect;
  const originalMongoUri = process.env.MONGO_URI;
  const originalJwtSecret = process.env.JWT_SECRET;
  let connectionAttempts = 0;
  let server;

  process.env.MONGO_URI = 'mongodb://localhost/flowcare-test';
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
  mongoose.connect = async () => {
    connectionAttempts += 1;
    return mongoose;
  };
  server = app.listen(0);

  try {
    await once(server, 'listening');
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/resources`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(connectionAttempts, 1);
  } finally {
    server.close();
    await once(server, 'close');
    mongoose.connect = originalConnect;
    if (originalMongoUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = originalMongoUri;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});
