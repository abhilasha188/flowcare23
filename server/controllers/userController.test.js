const assert = require('node:assert/strict');
const test = require('node:test');
const Cycle = require('../models/Cycle');
const Reminder = require('../models/Reminder');
const Symptom = require('../models/Symptom');
const User = require('../models/User');
const { changePassword, deleteHealthData } = require('./userController');

function responseStub() {
  return {
    statusCode: null,
    body: null,
    clearedCookies: 0,
    clearCookie() {
      this.clearedCookies += 1;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('changing password increments the session version and clears the session cookie', async () => {
  const originalFindById = User.findById;
  const user = {
    sessionVersion: 4,
    comparePassword: async () => true,
    save: async () => {},
  };
  User.findById = () => ({ select: async () => user });
  const res = responseStub();

  try {
    await changePassword({
      user: { _id: '507f1f77bcf86cd799439011' },
      body: {
        currentPassword: 'old-password',
        newPassword: 'NewStrongPassword1!',
        confirmNewPassword: 'NewStrongPassword1!',
      },
    }, res, (error) => { throw error; });

    assert.equal(user.sessionVersion, 5);
    assert.equal(res.statusCode, 200);
    assert.equal(res.clearedCookies, 2);
  } finally {
    User.findById = originalFindById;
  }
});

test('health-data deletion scopes every record collection to the current user', async () => {
  const originals = [Cycle, Symptom, Reminder].map((model) => model.deleteMany);
  const userId = '507f1f77bcf86cd799439011';
  const queries = [];
  [Cycle, Symptom, Reminder].forEach((model, index) => {
    model.deleteMany = async (query) => {
      queries[index] = query;
      return { deletedCount: index + 1 };
    };
  });
  const user = {
    _id: userId,
    averageCycleLength: 28,
    averagePeriodDuration: 5,
    save: async () => {},
  };
  const res = responseStub();

  try {
    await deleteHealthData({ user }, res, (error) => { throw error; });

    assert.deepEqual(queries, [{ userId }, { userId }, { userId }]);
    assert.equal(user.averageCycleLength, undefined);
    assert.equal(user.averagePeriodDuration, undefined);
    assert.deepEqual(res.body.deleted, { cycles: 1, symptoms: 2, reminders: 3 });
  } finally {
    [Cycle, Symptom, Reminder].forEach((model, index) => {
      model.deleteMany = originals[index];
    });
  }
});
