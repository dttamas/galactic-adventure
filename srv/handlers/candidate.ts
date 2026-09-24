import cds from '@sap/cds';
import type { Spacefarer } from '#cds-models/GalacticService';
import { isSingleEmail, titleCase, validInt } from '../lib/rules';

const LOG = cds.log('galactic');

export function prepareCandidate(req: cds.Request<Spacefarer>) {
  const s = req.data;
  if (req.event === 'CREATE') {
    s.stardustCollected ??= 0;
    s.wormholeNavSkill ??= 1;
  }
  // blank name and email never get here: @mandatory rejects them before handlers run
  if (typeof s.name === 'string') s.name = s.name.trim();
  if (typeof s.spacesuitColor === 'string') s.spacesuitColor = titleCase(s.spacesuitColor);
  if (typeof s.email === 'string') s.email = s.email.trim();
  if (s.email && !isSingleEmail(s.email))
    req.error({ status: 400, message: 'Email must be a single valid address', target: 'email' });

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
}
