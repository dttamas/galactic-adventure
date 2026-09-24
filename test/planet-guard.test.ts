import cds from '@sap/cds';
import type { Spacefarer } from '#cds-models/GalacticService';
import { enforceOwnPlanet } from '../srv/handlers/planet-guard';

describe('enforceOwnPlanet', () => {
  it('rejects a user without a planet with a message key the bundle resolves', () => {
    const req = new cds.Request<Spacefarer>({ event: 'CREATE', data: {} });
    req.user = new cds.User({ id: 'nomad', attr: {}, roles: [] });

    let error: unknown;
    try {
      enforceOwnPlanet(req);
    } catch (e) {
      error = e;
    }

    expect(error).toMatchObject({ code: 403, message: 'USER_WITHOUT_PLANET' });
    expect(cds.i18n.messages.at('USER_WITHOUT_PLANET', 'en')).toBe('No planet assigned to user');
  });
});
