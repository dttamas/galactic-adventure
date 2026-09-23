const cds = require('@sap/cds');

describe('stardust collection status (calculated elements)', () => {
  // Vitest 1.x runs beforeAll hooks in parallel, so our hook must wait for
  // cds.test's server (and in-memory DB deploy) before querying.
  const test = cds.test(__dirname + '/..');

  const cases = [
    { name: 'Zero', stardust: 0, status: 'Low', criticality: 1 },
    { name: 'AlmostGrowing', stardust: 499, status: 'Low', criticality: 1 },
    { name: 'JustGrowing', stardust: 500, status: 'Growing', criticality: 2 },
    { name: 'AlmostStellar', stardust: 1999, status: 'Growing', criticality: 2 },
    { name: 'JustStellar', stardust: 2000, status: 'Stellar', criticality: 3 },
    { name: 'Legend', stardust: 5000, status: 'Stellar', criticality: 3 },
    { name: 'Nobody', stardust: null, status: 'Low', criticality: 1 },
  ];

  let rows;
  beforeAll(async () => {
    await test;
    await INSERT.into('db.Spacefarer').entries(
      cases.map((c) => ({ name: c.name, stardustCollected: c.stardust })),
    );
    rows = await SELECT.from('db.Spacefarer').columns(
      'name',
      'stardustCollected',
      'stardustStatus',
      'stardustCriticality',
    );
  });

  it.each(cases)(
    '$stardust stardust -> $status / $criticality',
    ({ name, status, criticality }) => {
      const row = rows.find((r) => r.name === name);
      expect(row).toBeDefined();
      expect(row.stardustStatus).toBe(status);
      expect(row.stardustCriticality).toBe(criticality);
    },
  );
});
