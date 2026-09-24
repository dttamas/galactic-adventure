import cds from '@sap/cds';
import type { Spacefarer } from '#cds-models/GalacticService';

describe('GalacticService read isolation', () => {
  const test = cds.test(__dirname + '/..');

  const as = (user?: string) => ({
    auth: user && { username: user, password: user },
    validateStatus: () => true,
  });
  const NOVA = '10000000-0000-0000-0000-000000000001';
  const VEGA = '20000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    await test;
  });

  describe('authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await test.get('/galactic/Spacefarers', as());
      expect(res.status).toBe(401);
    });

    it('rejects a wrong password with 401', async () => {
      const res = await test.get('/galactic/Spacefarers', {
        ...as(),
        auth: { username: 'alice', password: 'wrong' },
      });
      expect(res.status).toBe(401);
    });

    it.each(['mallory', 'carol', 'dave', 'erin'])(
      'rejects unknown or disabled CAP default user %s with 401',
      async (user) => {
        const res = await test.get('/galactic/Spacefarers', as(user));
        expect(res.status).toBe(401);
      },
    );
  });

  describe('Spacefarers', () => {
    it('alice (Planet X) sees exactly the 3 Planet X spacefarers, so she is not an admin', async () => {
      const { status, data } = await test.get('/galactic/Spacefarers', as('alice'));
      expect(status).toBe(200);
      expect(data.value).toHaveLength(3);
      for (const s of data.value) expect(s.originPlanet_code).toBe('X');
    });

    it('bob (Planet Y) sees exactly the 3 Planet Y spacefarers', async () => {
      const { status, data } = await test.get('/galactic/Spacefarers', as('bob'));
      expect(status).toBe(200);
      expect(data.value).toHaveLength(3);
      for (const s of data.value) expect(s.originPlanet_code).toBe('Y');
    });

    it('admin sees all 6 spacefarers', async () => {
      const { status, data } = await test.get('/galactic/Spacefarers', as('admin'));
      expect(status).toBe(200);
      expect(data.value).toHaveLength(6);
    });

    it('alice cannot read a Planet Y spacefarer by key', async () => {
      const res = await test.get(
        `/galactic/Spacefarers(ID=${VEGA},IsActiveEntity=true)`,
        as('alice'),
      );
      expect(res.status).toBe(404);
    });

    it('alice cannot find Planet Y spacefarers with a $filter', async () => {
      const { data } = await test.get(
        "/galactic/Spacefarers?$filter=originPlanet_code eq 'Y'",
        as('alice'),
      );
      expect(data.value).toHaveLength(0);
    });

    it('alice can read her own Planet X spacefarer by key', async () => {
      const res = await test.get(
        `/galactic/Spacefarers(ID=${NOVA},IsActiveEntity=true)`,
        as('alice'),
      );
      expect(res.status).toBe(200);
      expect(res.data.name).toBe('Nova Starweaver');
    });
  });

  describe('Missions follow their spacefarer', () => {
    it('alice sees only the 3 missions of Planet X spacefarers', async () => {
      const { data } = await test.get('/galactic/Missions?$expand=spacefarer', as('alice'));
      expect(data.value).toHaveLength(3);
      for (const m of data.value) expect(m.spacefarer.originPlanet_code).toBe('X');
    });

    it('bob sees only the 4 missions of Planet Y spacefarers', async () => {
      const { data } = await test.get('/galactic/Missions?$expand=spacefarer', as('bob'));
      expect(data.value).toHaveLength(4);
      for (const m of data.value) expect(m.spacefarer.originPlanet_code).toBe('Y');
    });

    it('admin sees all 7 missions', async () => {
      const { data } = await test.get('/galactic/Missions', as('admin'));
      expect(data.value).toHaveLength(7);
    });
  });

  describe('code lists', () => {
    it.each(['Planets', 'Departments', 'Positions', 'Ranks', 'StardustStatuses'])(
      '%s is readable by any authenticated user',
      async (entity) => {
        const res = await test.get(`/galactic/${entity}`, as('alice'));
        expect(res.status).toBe(200);
        expect(res.data.value.length).toBeGreaterThan(0);
      },
    );

    it.each(['Planets', 'StardustStatuses'])('%s is read-only', async (entity) => {
      const res = await test.post(`/galactic/${entity}`, { code: 'Q', name: 'Q' }, as('admin'));
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('StardustStatuses lists exactly Low, Growing and Stellar by level', async () => {
      const { data } = await test.get(
        '/galactic/StardustStatuses?$select=code,name&$orderby=level',
        as('bob'),
      );
      expect(data.value).toEqual([
        { code: 'Low', name: 'Low' },
        { code: 'Growing', name: 'Growing' },
        { code: 'Stellar', name: 'Stellar' },
      ]);
    });
  });

  describe('stardust status through the service', () => {
    it('returns stardustStatus and stardustCriticality per spacefarer', async () => {
      const { data } = await test.get(
        '/galactic/Spacefarers?$select=name,stardustCollected,stardustStatus,stardustCriticality',
        as('admin'),
      );
      const byName = Object.fromEntries(data.value.map((s: Spacefarer) => [s.name, s]));
      expect(byName['Orion Blackhole']).toMatchObject({
        stardustStatus: 'Low',
        stardustCriticality: 1,
      });
      expect(byName['Nova Starweaver']).toMatchObject({
        stardustStatus: 'Growing',
        stardustCriticality: 2,
      });
      expect(byName['Lyra Nebula']).toMatchObject({
        stardustStatus: 'Stellar',
        stardustCriticality: 3,
      });
    });

    it("supports $filter=stardustStatus eq 'Stellar'", async () => {
      const { status, data } = await test.get(
        "/galactic/Spacefarers?$filter=stardustStatus eq 'Stellar'",
        as('admin'),
      );
      expect(status).toBe(200);
      expect(data.value.map((s: Spacefarer) => s.name).sort()).toEqual([
        'Lyra Nebula',
        'Sirius Voidwalker',
      ]);
    });

    it('combines the stardust $filter with planet isolation', async () => {
      const { data } = await test.get(
        "/galactic/Spacefarers?$filter=stardustStatus eq 'Stellar'",
        as('alice'),
      );
      expect(data.value.map((s: Spacefarer) => s.name)).toEqual(['Lyra Nebula']);
    });

    it('filters on the calculated stardust status with the draft filter the list report adds', async () => {
      const { data } = await test.get(
        "/galactic/Spacefarers?$filter=stardustStatus eq 'Stellar' and (IsActiveEntity eq false or SiblingEntity/IsActiveEntity eq null)",
        as('alice'),
      );
      expect(data.value.map((s: Spacefarer) => s.name)).toEqual(['Lyra Nebula']);
    });

    it('supports $orderby=stardustStatus', async () => {
      const { status, data } = await test.get(
        '/galactic/Spacefarers?$orderby=stardustStatus,name',
        as('admin'),
      );
      expect(status).toBe(200);
      expect(data.value.map((s: Spacefarer) => s.name)).toEqual([
        'Nova Starweaver',
        'Vega Cometrider',
        'Andromeda Quasar',
        'Orion Blackhole',
        'Lyra Nebula',
        'Sirius Voidwalker',
      ]);
    });
  });
});
