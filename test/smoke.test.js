const cds = require('@sap/cds');

describe('smoke', () => {
  it('CDS module loads', () => {
    expect(cds.version).toMatch(/^\d+\.\d+/);
  });
});
