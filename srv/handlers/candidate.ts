import cds from '@sap/cds';
import type { Spacefarer } from '#cds-models/GalacticService';
import { isSingleEmail, titleCase, validInt } from '../lib/rules';

const LOG = cds.log('galactic');
const SKILL_MIN = 1;
const SKILL_MAX = 10;
const STARDUST_MIN = 0;

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
    req.error({ status: 400, message: 'SPACEFARER_EMAIL_INVALID', target: 'email' });

  if (!validInt(s.wormholeNavSkill, SKILL_MIN, SKILL_MAX))
    req.error({
      status: 400,
      message: 'SPACEFARER_WORMHOLE_SKILL_RANGE',
      args: [SKILL_MIN, SKILL_MAX],
      target: 'wormholeNavSkill',
    });
  if (!validInt(s.stardustCollected, STARDUST_MIN))
    req.error({
      status: 400,
      message: 'SPACEFARER_STARDUST_MIN',
      args: [STARDUST_MIN],
      target: 'stardustCollected',
    });

  if (req.event === 'CREATE' && !req.errors)
    LOG.info('candidate prepared for launch', { name: s.name, planet: s.originPlanet_code });
}
