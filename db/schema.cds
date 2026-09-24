namespace db;

using {
  cuid,
  managed,
  sap.common.CodeList
} from '@sap/cds/common';

type MissionStatus : String enum {
  planned;
  active;
  completed;
  failed;
}

entity Planet : CodeList {
  key code   : String(5);
      galaxy : String(50);
}

entity Rank : CodeList {
  key code  : String(20);
      level : Integer;
}

// lists the values of Spacefarer.stardustStatus for value helps; the thresholds stay there
// cds-typer would take the trailing s for a plural
@singular: 'StardustStatus'
@plural  : 'StardustStatuses'
entity StardustStatus : CodeList {
  key code  : String(10);
      level : Integer;
}

entity Department : cuid, managed {
  name   : String(100);
  sector : String(50);
}

entity Position : cuid, managed {
  title : String(100);
  level : Integer;
}

entity Spacefarer : cuid, managed {
  name                : String(100) not null @mandatory @mandatory.message: '{i18n>SPACEFARER_NAME_REQUIRED}';
  email               : String(200) @mandatory @mandatory.message: '{i18n>SPACEFARER_EMAIL_REQUIRED}';
  originPlanet        : Association to Planet;
  spacesuitColor      : String(30);
  stardustCollected   : Integer default 0;
  // keep in sync with stardustCriticality
  stardustStatus      : String(10) = case
                                       when stardustCollected >= 2000
                                            then 'Stellar'
                                       when stardustCollected >= 500
                                            then 'Growing'
                                       else 'Low'
                                     end;
  stardustCriticality : Integer    = case
                                       when stardustCollected >= 2000
                                            then 3
                                       when stardustCollected >= 500
                                            then 2
                                       else 1
                                     end;
  wormholeNavSkill    : Integer default 1;
  rank                : Association to Rank;
  department          : Association to Department;
  position            : Association to Position;
  missions            : Composition of many Mission
                          on missions.spacefarer = $self;
}

entity Mission : cuid, managed {
  title      : String(100);
  startDate  : Date;
  endDate    : Date;
  status     : MissionStatus default 'planned';
  spacefarer : Association to Spacefarer;
}
