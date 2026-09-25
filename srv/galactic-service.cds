using {db} from '../db/schema';

@requires: 'authenticated-user'
service GalacticService @(path: '/galactic') {

  @restrict: [
    {
      grant: '*',
      to   : 'admin'
    },
    {
      grant: '*',
      where: 'originPlanet.code = $user.planet'
    }
  ]
  @odata.draft.enabled
  entity Spacefarers as projection on db.Spacefarer;

  @restrict: [
    {
      grant: '*',
      to   : 'admin'
    },
    {
      grant: '*',
      where: 'spacefarer.originPlanet.code = $user.planet'
    }
  ]
  entity Missions    as projection on db.Mission;

  @readonly
  entity Planets     as projection on db.Planet;

  @readonly
  entity Departments as projection on db.Department;

  @readonly
  entity Positions   as projection on db.Position;

  @readonly
  entity Ranks       as projection on db.Rank;

  @readonly
  entity StardustStatuses as projection on db.StardustStatus;

  // cds-typer would otherwise name the item type MissionStatuse
  @readonly
  @singular: 'MissionStatus'
  @plural  : 'MissionStatuses'
  entity MissionStatuses  as projection on db.MissionStatusCode;
}

// only seeded app images, so nobody can point an avatar at an external tracker
annotate GalacticService.Spacefarers with {
  avatarUrl @readonly;
}
