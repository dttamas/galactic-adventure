import cds from '@sap/cds';
import type { Department, Mission, Planet, Position, Rank, Spacefarer } from '#cds-models/db';

describe('seed data (db/data/*.csv)', () => {
  const test = cds.test(__dirname + '/..');

  let planets: Planet[],
    ranks: Rank[],
    departments: Department[],
    positions: Position[],
    spacefarers: Spacefarer[],
    missions: Mission[];
  beforeAll(async () => {
    // Vitest 1.x runs beforeAll hooks in parallel
    await test;
    planets = await SELECT.from('db.Planet');
    ranks = await SELECT.from('db.Rank');
    departments = await SELECT.from('db.Department');
    positions = await SELECT.from('db.Position');
    spacefarers = await SELECT.from('db.Spacefarer').columns(
      'ID',
      'name',
      'email',
      'originPlanet_code',
      'spacesuitColor',
      'rank_code',
      'department_ID',
      'position_ID',
      'stardustCollected',
      'stardustStatus',
    );
    missions = await SELECT.from('db.Mission');
  });

  it('loads the expected row counts', () => {
    expect(planets).toHaveLength(3);
    expect(ranks).toHaveLength(5);
    expect(departments).toHaveLength(3);
    expect(positions).toHaveLength(3);
    expect(spacefarers).toHaveLength(6);
    expect(missions).toHaveLength(7);
  });

  it('has 3 spacefarers from Planet X and 3 from Planet Y', () => {
    const from = (code: string) => spacefarers.filter((s) => s.originPlanet_code === code);
    expect(from('X')).toHaveLength(3);
    expect(from('Y')).toHaveLength(3);
  });

  it('has no dangling spacefarer foreign keys', () => {
    const planetCodes = new Set(planets.map((p) => p.code));
    const rankCodes = new Set(ranks.map((r) => r.code));
    const departmentIDs = new Set(departments.map((d) => d.ID));
    const positionIDs = new Set(positions.map((p) => p.ID));
    for (const s of spacefarers) {
      expect(planetCodes, s.name).toContain(s.originPlanet_code);
      expect(rankCodes, s.name).toContain(s.rank_code);
      expect(departmentIDs, s.name).toContain(s.department_ID);
      expect(positionIDs, s.name).toContain(s.position_ID);
    }
  });

  it('has no dangling mission foreign keys', () => {
    const spacefarerIDs = new Set(spacefarers.map((s) => s.ID));
    for (const m of missions) {
      expect(spacefarerIDs, m.title ?? undefined).toContain(m.spacefarer_ID);
    }
  });

  it('covers every stardust status on each of Planet X and Planet Y', () => {
    for (const code of ['X', 'Y']) {
      const statuses = new Set(
        spacefarers.filter((s) => s.originPlanet_code === code).map((s) => s.stardustStatus),
      );
      expect([...statuses].sort(), `Planet ${code}`).toEqual(['Growing', 'Low', 'Stellar']);
    }
  });

  it('uses every mission status at least once', () => {
    const statuses = new Set(missions.map((m) => m.status));
    expect([...statuses].sort()).toEqual(['active', 'completed', 'failed', 'planned']);
  });

  it('leaves Orion Blackhole without missions', () => {
    const orion = spacefarers.find((s) => s.name === 'Orion Blackhole');
    expect(orion).toBeDefined();
    expect(missions.filter((m) => m.spacefarer_ID === orion?.ID)).toHaveLength(0);
  });

  it('orders ranks by seniority level 1..5', async () => {
    const ordered: Rank[] = await SELECT.from('db.Rank').columns('code', 'level').orderBy('level');
    expect(ordered.map((r) => r.level)).toEqual([1, 2, 3, 4, 5]);
    expect(ordered.map((r) => r.code)).toEqual([
      'Cadet',
      'Ensign',
      'Commander',
      'Captain',
      'Admiral',
    ]);
  });

  it('uses reserved @example.com email addresses', () => {
    for (const s of spacefarers) {
      expect(s.email, s.name).toMatch(/@example\.com$/);
    }
  });

  it('capitalises spacesuit colours', () => {
    for (const s of spacefarers) {
      expect(s.spacesuitColor, s.name).toMatch(/^[A-Z]/);
    }
  });
});
