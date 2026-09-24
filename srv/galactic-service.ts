import cds from '@sap/cds';
import { Spacefarers } from '#cds-models/GalacticService';
import { prepareCandidate } from './handlers/candidate';
import { enforceOwnPlanet } from './handlers/planet-guard';
import { welcomeOnLaunch } from './handlers/welcome';
import { createNotifier, type Notifier } from './lib/notifier';

export default class GalacticService extends cds.ApplicationService {
  notifier!: Notifier;

  override init() {
    this.notifier = createNotifier();
    // @restrict's where does not check the planet being written
    this.before(['NEW', 'CREATE', 'UPDATE'], [Spacefarers, Spacefarers.drafts], enforceOwnPlanet);
    // active entity only: fires on Save (draftActivate), so partial drafts can still be stored
    this.before(['CREATE', 'UPDATE'], Spacefarers, prepareCandidate);
    // getter so tests can swap the notifier on the running service
    this.after(
      'CREATE',
      Spacefarers,
      welcomeOnLaunch(() => this.notifier),
    );
    return super.init();
  }
}
