import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import cds from '@sap/cds';
import type {
  Department,
  Mission,
  Planet,
  Position,
  Rank,
  Spacefarer,
  StardustStatus,
  MissionStatusCode,
} from '#cds-models/db';

describe('seed data (db/data/*.csv)', () => {
  const test = cds.test(__dirname + '/..');
  const webapp = join(__dirname, '../app/spacefarers/webapp');

  let planets: Planet[],
    ranks: Rank[],
    departments: Department[],
    positions: Position[],
    spacefarers: Spacefarer[],
    missions: Mission[],
    stardustStatuses: StardustStatus[],
    missionStatuses: MissionStatusCode[];
  beforeAll(async () => {
    // Vitest 1.x runs beforeAll hooks in parallel
    await test;
    planets = await SELECT.from('db.Planet').orderBy('code');
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
      'avatarUrl',
    );
    missions = await SELECT.from('db.Mission');
    stardustStatuses = await SELECT.from('db.StardustStatus').orderBy('level');
    missionStatuses = await SELECT.from('db.MissionStatusCode');
  });

  it('loads the expected row counts', () => {
    expect(planets).toHaveLength(3);
    expect(ranks).toHaveLength(5);
    expect(departments).toHaveLength(3);
    expect(positions).toHaveLength(3);
    expect(spacefarers).toHaveLength(6);
    expect(missions).toHaveLength(7);
    expect(stardustStatuses).toHaveLength(3);
    expect(missionStatuses).toHaveLength(4);
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

  it('lists the stardust statuses Low, Growing, Stellar by level 1..3', () => {
    expect(stardustStatuses.map((s) => [s.code, s.name, s.level])).toEqual([
      ['Low', 'Low', 1],
      ['Growing', 'Growing', 2],
      ['Stellar', 'Stellar', 3],
    ]);
  });

  it('uses every mission status at least once', () => {
    const statuses = new Set(missions.map((m) => m.status));
    expect([...statuses].sort()).toEqual(['active', 'completed', 'failed', 'planned']);
  });

  it('names the mission statuses planned, active, completed, failed by level 1..4', () => {
    const byLevel = [...missionStatuses].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    expect(byLevel.map((s) => [s.code, s.name, s.level])).toEqual([
      ['planned', 'Planned', 1],
      ['active', 'Active', 2],
      ['completed', 'Completed', 3],
      ['failed', 'Failed', 4],
    ]);
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

  it('points every spacefarer at a distinct avatar file in the Fiori app', () => {
    const urls = spacefarers.map((s) => s.avatarUrl ?? '');
    expect(new Set(urls).size).toBe(6);
    for (const url of urls) {
      expect(url).toMatch(/^images\/spacefarers\/[a-z-]+\.svg$/);
      expect(existsSync(join(webapp, url)), url).toBe(true);
    }
  });

  it('points every planet at its image file in the Fiori app', () => {
    expect(planets.map((p) => [p.code, p.imageUrl])).toEqual([
      ['X', 'images/planets/planet-x.svg'],
      ['Y', 'images/planets/planet-y.svg'],
      ['Z', 'images/planets/planet-z.svg'],
    ]);
    for (const p of planets) {
      expect(existsSync(join(webapp, p.imageUrl ?? '')), p.imageUrl ?? undefined).toBe(true);
    }
  });

  it('uses only CC0-licensed images', () => {
    const files = [...spacefarers.map((s) => s.avatarUrl), ...planets.map((p) => p.imageUrl)];
    expect(files).toHaveLength(9);
    for (const file of files) {
      const svg = readFileSync(join(webapp, file ?? ''), 'utf8');
      expect(svg, file ?? undefined).toMatch(/^<svg /);
      expect(svg, file ?? undefined).toContain('licensed under “CC0 1.0”');
    }
  });

  it('capitalises spacesuit colours', () => {
    for (const s of spacefarers) {
      expect(s.spacesuitColor, s.name).toMatch(/^[A-Z]/);
    }
  });
});
