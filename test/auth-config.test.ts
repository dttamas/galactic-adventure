import cds from '@sap/cds';
import path from 'path';

describe('auth configuration per profile', () => {
  const root = path.join(__dirname, '..');
  // cds.env.for() builds a detached config, so the global cds.env is untouched
  const envFor = (nodeEnv: string) => {
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
