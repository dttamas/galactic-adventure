using GalacticService as service from '../srv/galactic-service';

annotate service.Spacefarers with @Common.IsNaturalPerson {
  ID                  @UI.Hidden;
  name                @title: '{i18n>Spacefarer.name}';
  email               @title: '{i18n>Spacefarer.email}';
  avatarUrl           @title: '{i18n>Spacefarer.avatarUrl}'
                      @UI.IsImageURL
                      @UI.HiddenFilter;
  spacesuitColor      @title: '{i18n>Spacefarer.spacesuitColor}';
  stardustCollected   @title: '{i18n>Spacefarer.stardustCollected}';
  stardustCriticality @title: '{i18n>Spacefarer.stardustCriticality}'
                      @UI.Hidden;

  stardustStatus      @title: '{i18n>Spacefarer.stardustStatus}'
                      @Common.ValueListWithFixedValues
                      @Common.ValueList: {
                        CollectionPath              : 'StardustStatuses',
                        PresentationVariantQualifier: 'ByLevel',
                        Parameters                  : [{
                          $Type            : 'Common.ValueListParameterInOut',
                          LocalDataProperty: stardustStatus,
                          ValueListProperty: 'code'
                        }]
                      };

  wormholeNavSkill    @title: '{i18n>Spacefarer.wormholeNavSkill}';

  originPlanet        @title: '{i18n>Spacefarer.originPlanet}'
                      @Common.Text: {
                        $value              : originPlanet.name,
                        @UI.TextArrangement : #TextOnly
                      }
                      @Common.ValueListWithFixedValues
                      @Common.ValueList: {
                        CollectionPath: 'Planets',
                        Parameters    : [{
                          $Type            : 'Common.ValueListParameterInOut',
                          LocalDataProperty: originPlanet_code,
                          ValueListProperty: 'code'
                        }]
                      };

  rank                @title: '{i18n>Spacefarer.rank}'
                      @Common.Text: {
                        $value              : rank.name,
                        @UI.TextArrangement : #TextOnly
                      }
                      @Common.ValueListWithFixedValues
                      @Common.ValueList: {
                        CollectionPath              : 'Ranks',
                        PresentationVariantQualifier: 'BySeniority',
                        Parameters                  : [{
                          $Type            : 'Common.ValueListParameterInOut',
                          LocalDataProperty: rank_code,
                          ValueListProperty: 'code'
                        }]
                      };

  department          @title: '{i18n>Spacefarer.department}'
                      @Common.Text: {
                        $value              : department.name,
                        @UI.TextArrangement : #TextOnly
                      }
                      @Common.ValueList: {
                        CollectionPath: 'Departments',
                        Parameters    : [
                          {
                            $Type            : 'Common.ValueListParameterInOut',
                            LocalDataProperty: department_ID,
                            ValueListProperty: 'ID'
                          },
                          {
                            $Type            : 'Common.ValueListParameterDisplayOnly',
                            ValueListProperty: 'sector'
                          }
                        ]
                      };

  position            @title: '{i18n>Spacefarer.position}'
                      @Common.Text: {
                        $value              : position.title,
                        @UI.TextArrangement : #TextOnly
                      }
                      @Common.ValueList: {
                        CollectionPath: 'Positions',
                        Parameters    : [
                          {
                            $Type            : 'Common.ValueListParameterInOut',
                            LocalDataProperty: position_ID,
                            ValueListProperty: 'ID'
                          },
                          {
                            $Type            : 'Common.ValueListParameterDisplayOnly',
                            ValueListProperty: 'level'
                          }
                        ]
                      };
}

// value helps show these texts instead of the keys
annotate service.Departments with {
  ID     @title: '{i18n>Department.ID}'
         @Common.Text: {
           $value              : name,
           @UI.TextArrangement : #TextOnly
         };
  name   @title: '{i18n>Department.name}';
  sector @title: '{i18n>Department.sector}';
}

annotate service.Positions with {
  ID    @title: '{i18n>Position.ID}'
        @Common.Text: {
          $value              : title,
          @UI.TextArrangement : #TextOnly
        };
  title @title: '{i18n>Position.title}';
  level @title: '{i18n>Position.level}';
}

annotate service.Ranks with @UI.PresentationVariant #BySeniority: {
  SortOrder: [{Property: level}]
} {
  code  @title: '{i18n>Rank.code}'
        @Common.Text: {
          $value              : name,
          @UI.TextArrangement : #TextOnly
        };
  level @title: '{i18n>Rank.level}';
}

annotate service.StardustStatuses with @UI.PresentationVariant #ByLevel: {
  SortOrder: [{Property: level}]
} {
  code  @title: '{i18n>StardustStatus.code}'
        @Common.Text: {
          $value              : name,
          @UI.TextArrangement : #TextOnly
        };
  level @title: '{i18n>StardustStatus.level}';
}

annotate service.Planets with {
  code   @title: '{i18n>Planet.code}'
         @Common.Text: {
           $value              : name,
           @UI.TextArrangement : #TextOnly
         };
  galaxy   @title: '{i18n>Planet.galaxy}';
  imageUrl @title: '{i18n>Planet.imageUrl}'
           @UI.IsImageURL;
}

annotate service.Missions with {
  ID                @UI.Hidden;
  title             @title: '{i18n>Mission.title}';
  startDate         @title: '{i18n>Mission.startDate}';
  endDate           @title: '{i18n>Mission.endDate}';
  statusCriticality @title: '{i18n>Mission.statusCriticality}'
                    @UI.Hidden;
  spacefarer        @UI.Hidden;

  status            @title: '{i18n>Mission.status}'
                    @Common.Text: {
                      $value              : statusInfo.name,
                      @UI.TextArrangement : #TextOnly
                    }
                    @Common.ValueListWithFixedValues
                    @Common.ValueList: {
                      CollectionPath              : 'MissionStatuses',
                      PresentationVariantQualifier: 'ByLevel',
                      Parameters                  : [{
                        $Type            : 'Common.ValueListParameterInOut',
                        LocalDataProperty: status,
                        ValueListProperty: 'code'
                      }]
                    };
}

annotate service.MissionStatuses with @UI.PresentationVariant #ByLevel: {
  SortOrder: [{Property: level}]
} {
  code  @title: '{i18n>MissionStatus.code}'
        @Common.Text: {
          $value              : name,
          @UI.TextArrangement : #TextOnly
        };
  level @title: '{i18n>MissionStatus.level}';
}
