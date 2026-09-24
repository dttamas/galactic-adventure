import cds from '@sap/cds';
import type { Spacefarer } from '#cds-models/GalacticService';
import type { Notifier } from '../lib/notifier';

const LOG = cds.log('notifier');

export const welcomeOnLaunch = (notifier: () => Notifier) =>
  // the after-CREATE result is only an InsertResult, so the spacefarer comes from req.data
  function welcomeOnLaunch(_: unknown, req: cds.Request<Spacefarer>) {
    const { name, email, originPlanet_code, stardustCollected } = req.data;
    if (!name || !email) {
      LOG.info('welcome skipped, no name or email', { name });
      return;
    }
    // succeeded fires after commit, so a rolled-back launch never sends
    req.on('succeeded', () => {
      Promise.resolve()
        .then(() => notifier().sendWelcome({ name, email, originPlanet_code, stardustCollected }))
        .catch((err: unknown) => LOG.error('welcome email failed', err));
    });
  };
