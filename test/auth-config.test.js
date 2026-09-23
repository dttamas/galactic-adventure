const cds = require('@sap/cds');
const path = require('path');

// Mocked users with known passwords must never reach production. cds.env.for()
// builds a fresh, detached config from NODE_ENV, so the global cds.env is untouched.
describe('auth configuration per profile', () => {
  const root = path.join(__dirname, '..');
  const envFor = (nodeEnv) => {
    const saved = process.env.NODE_ENV;
    process.env.NODE_ENV = nodeEnv;
    try {
      return cds.env.for('cds', root);
    } finally {
      if (saved === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = saved;
    }
  };

  it('production does not use mocked auth or our mocked users', () => {
    const { auth } = envFor('production').requires;
    expect(auth.kind).not.toBe('mocked');
    expect(auth.users).toBeUndefined();
  });

  it('the test run (NODE_ENV=test, which implies development) uses our mocked users', () => {
    const { auth } = envFor('test').requires;
    expect(auth.kind).toBe('mocked');
    expect(auth.users.alice).toMatchObject({ roles: [], attr: { planet: 'X' } });
    expect(auth.users.admin).toMatchObject({ attr: { planet: 'X' } });
  });
});
