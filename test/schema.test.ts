import cds from '@sap/cds';

describe('schema', () => {
  let definitions: NonNullable<cds.csn.CSN['definitions']>;
  beforeAll(async () => {
    definitions = (await cds.load(__dirname + '/../db/schema.cds')).definitions ?? {};
  });

  it('defines Spacefarer with cosmic fields', () => {
    const s = definitions['db.Spacefarer'];
    expect(s).toBeDefined();
    expect(s.elements.name).toBeDefined();
    expect(s.elements.stardustCollected).toBeDefined();
    expect(s.elements.wormholeNavSkill).toBeDefined();
    expect(s.elements.spacesuitColor).toBeDefined();
    expect(s.elements.originPlanet).toBeDefined();
    expect(s.elements.email).toBeDefined();
    expect(s.elements.missions).toBeDefined();
  });

  it('defines Planet as a code list', () => {
    const p = definitions['db.Planet'];
    expect(p).toBeDefined();
    expect(p.elements.code).toBeDefined();
  });

  it('defines Mission with status enum', () => {
    const m = definitions['db.Mission'];
    expect(m).toBeDefined();
    expect(m.elements.status).toBeDefined();
  });
});
