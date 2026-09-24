import cds from '@sap/cds';
import { type Spacefarer, Spacefarers } from '#cds-models/GalacticService';

const LOG = cds.log('galactic');

// undefined means the payload does not touch the planet
const planetIn = (data: Spacefarer): string | null | undefined => {
  if ('originPlanet_code' in data) return data.originPlanet_code;
  if ('originPlanet' in data) return data.originPlanet?.code ?? null;
  return undefined;
};

// undefined means a partial UPDATE that leaves the field alone
const validInt = (value: number | null | undefined, min: number, max = Infinity) =>
  value === undefined ||
  (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max);

const titleCase = (text: string) =>
  text
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

export default class GalacticService extends cds.ApplicationService {
  override init() {
    // @restrict's where does not check the planet being written
    this.before(
      ['NEW', 'CREATE', 'UPDATE'],
      [Spacefarers, Spacefarers.drafts],
      function enforceOwnPlanet(req) {
        if (req.user.is('admin')) return;
        // XSUAA sends attributes as arrays
        const own: string[] = [req.user.attr.planet ?? []].flat();
        if (!own.length) return req.reject(403, 'No planet assigned to user');
        const planet = planetIn(req.data);
        if (planet === undefined) {
          if (req.event !== 'UPDATE') req.data.originPlanet_code = own[0];
          return;
        }
        if (planet === null || !own.includes(planet))
          req.reject(403, `Spacefarers must stay on Planet ${own}`);
      },
    );

    // active entity only: fires on Save (draftActivate), so partial drafts can still be stored
    this.before(['CREATE', 'UPDATE'], Spacefarers, function prepareCandidate(req) {
      const s = req.data;
      if (req.event === 'CREATE') {
        s.stardustCollected ??= 0;
        s.wormholeNavSkill ??= 1;
      }
      if (typeof s.name === 'string') s.name = s.name.trim();
      // not null alone would accept the trimmed ''
      if ('name' in s && !s.name)
        req.error({ status: 400, message: 'Name is required', target: 'name' });
      if (typeof s.spacesuitColor === 'string') s.spacesuitColor = titleCase(s.spacesuitColor);

      if (!validInt(s.wormholeNavSkill, 1, 10))
        req.error({
          status: 400,
          message: 'Wormhole navigation skill must be between 1 and 10',
          target: 'wormholeNavSkill',
        });
      if (!validInt(s.stardustCollected, 0))
        req.error({
          status: 400,
          message: 'Stardust collected must be 0 or more',
          target: 'stardustCollected',
        });

      if (req.event === 'CREATE' && !req.errors)
        LOG.info('candidate prepared for launch', { name: s.name, planet: s.originPlanet_code });
    });

    return super.init();
  }
}
