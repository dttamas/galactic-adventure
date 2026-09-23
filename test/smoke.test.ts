import cds from '@sap/cds';

describe('smoke', () => {
  it('CDS module loads', () => {
    expect(cds.version).toMatch(/^\d+\.\d+/);
  });
});
