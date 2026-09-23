const cds = require('@sap/cds');

// The planet a write payload assigns, or undefined when it does not touch it.
// Accepts both the flat foreign key and the structured association form.
const planetIn = (data) => {
  if ('originPlanet_code' in data) return data.originPlanet_code;
  if ('originPlanet' in data) return data.originPlanet?.code ?? null;
  return undefined;
};

module.exports = class GalacticService extends cds.ApplicationService {
  init() {
    const { Spacefarers } = this.entities;

    // @restrict's where-clause filters READ/UPDATE/DELETE of existing rows, but CAP
    // does not evaluate it against the *new* values on CREATE or UPDATE. Without this
    // guard a Planet X user could create a Planet Y spacefarer, or move one of theirs
    // to Planet Y. Runs on drafts (NEW; a PATCH arrives as UPDATE) and on activation
    // or direct writes to active rows (CREATE, UPDATE).
    this.before(
      ['NEW', 'CREATE', 'UPDATE'],
      [Spacefarers, Spacefarers.drafts],
      function enforceOwnPlanet(req) {
        if (req.user.is('admin')) return;
        // Mocked users carry a string; XSUAA delivers attributes as arrays.
        const own = [req.user.attr.planet ?? []].flat();
        if (!own.length) return req.reject(403, 'No planet assigned to user');
        const planet = planetIn(req.data);
        if (planet === undefined) {
          // Derive the planet for new spacefarers; leave it untouched on updates.
          if (req.event !== 'UPDATE') req.data.originPlanet_code = own[0];
          return;
        }
        if (!own.includes(planet)) req.reject(403, `Spacefarers must stay on Planet ${own}`);
      },
    );

    return super.init();
  }
};
