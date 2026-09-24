import cds from '@sap/cds';
import { Spacefarers } from '#cds-models/GalacticService';
import { prepareCandidate } from './handlers/candidate';
import { enforceOwnPlanet } from './handlers/planet-guard';

export default class GalacticService extends cds.ApplicationService {
  override init() {
    // @restrict's where does not check the planet being written
    this.before(['NEW', 'CREATE', 'UPDATE'], [Spacefarers, Spacefarers.drafts], enforceOwnPlanet);
    // active entity only: fires on Save (draftActivate), so partial drafts can still be stored
    this.before(['CREATE', 'UPDATE'], Spacefarers, prepareCandidate);
    return super.init();
  }
}
