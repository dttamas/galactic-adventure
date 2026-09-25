using GalacticService as service from '../../srv/galactic-service';

annotate service.Spacefarers with @(
    UI.HeaderInfo : {
        TypeName       : '{i18n>Spacefarer.typeName}',
        TypeNamePlural : '{i18n>Spacefarer.typeNamePlural}',
        Title          : { $Type : 'UI.DataField', Value : name },
        Description    : { Value : rank.name },
        ImageUrl       : avatarUrl,
    },
    UI.SelectionFields : [
        originPlanet_code,
        rank_code,
        department_ID,
        stardustStatus,
    ],
    UI.PresentationVariant : {
        SortOrder      : [{ Property : name }],
        Visualizations : ['@UI.LineItem'],
    },
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : avatarUrl,
            @HTML5.CssDefaults : { width : '5rem' },
        },
        {
            $Type : 'UI.DataField',
            Value : name,
            @HTML5.CssDefaults : { width : 'auto' },
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : originPlanet_code,
            @HTML5.CssDefaults : { width : 'auto' },
        },
        {
            $Type : 'UI.DataField',
            Value : spacesuitColor,
            @HTML5.CssDefaults : { width : 'auto' },
        },
        {
            $Type : 'UI.DataField',
            Value : stardustCollected,
        },
        {
            $Type       : 'UI.DataField',
            Value       : stardustStatus,
            Criticality : stardustCriticality,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : wormholeNavSkill,
            Label : '{i18n>Spacefarer.wormholeNavSkill.column}',
        },
        {
            $Type : 'UI.DataField',
            Value : rank_code,
            @HTML5.CssDefaults : { width : 'auto' },
        },
    ],
    Common.SideEffects #stardust : {
        SourceProperties : [stardustCollected],
        TargetProperties : [
            'stardustStatus',
            'stardustCriticality',
        ],
    },
    Common.SideEffects #originPlanet : {
        SourceProperties : [originPlanet_code],
        TargetEntities   : [originPlanet],
    },
    UI.HeaderFacets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'StardustStatusHeader',
            Target : '@UI.DataPoint#stardustStatus',
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'WormholeNavSkillHeader',
            Target : '@UI.DataPoint#wormholeNavSkill',
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'OriginPlanetHeader',
            Label  : '{i18n>Spacefarer.originPlanet}',
            Target : '@UI.FieldGroup#OriginPlanet',
        },
    ],
    UI.DataPoint #stardustStatus : {
        Value       : stardustStatus,
        Title       : '{i18n>Spacefarer.stardustStatus}',
        Criticality : stardustCriticality,
    },
    UI.DataPoint #wormholeNavSkill : {
        Value         : wormholeNavSkill,
        Title         : '{i18n>Spacefarer.wormholeNavSkill}',
        Visualization : #Rating,
        TargetValue   : 10,
    },
    UI.FieldGroup #OriginPlanet : {
        Data : [
            { $Type : 'UI.DataField', Value : originPlanet.imageUrl },
            {
                $Type : 'UI.DataField',
                Value : originPlanet_code,
                Label : '{i18n>Planet.name}',
            },
        ],
    },
    UI.FieldGroup #Profile : {
        Data : [
            { $Type : 'UI.DataField', Value : name },
            { $Type : 'UI.DataField', Value : email },
            { $Type : 'UI.DataField', Value : originPlanet_code },
        ],
    },
    UI.FieldGroup #CosmicDetails : {
        Data : [
            { $Type : 'UI.DataField', Value : stardustCollected },
            {
                $Type       : 'UI.DataField',
                Value       : stardustStatus,
                Criticality : stardustCriticality,
            },
            { $Type : 'UI.DataField', Value : wormholeNavSkill },
            { $Type : 'UI.DataField', Value : spacesuitColor },
        ],
    },
    UI.FieldGroup #Assignment : {
        Data : [
            { $Type : 'UI.DataField', Value : rank_code },
            { $Type : 'UI.DataField', Value : department_ID },
            { $Type : 'UI.DataField', Value : position_ID },
        ],
    },
    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'Profile',
            Label  : '{i18n>Spacefarer.profile}',
            Target : '@UI.FieldGroup#Profile',
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'CosmicDetails',
            Label  : '{i18n>Spacefarer.cosmicDetails}',
            Target : '@UI.FieldGroup#CosmicDetails',
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'Assignment',
            Label  : '{i18n>Spacefarer.assignment}',
            Target : '@UI.FieldGroup#Assignment',
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'Missions',
            Label  : '{i18n>Spacefarer.missions}',
            Target : 'missions/@UI.PresentationVariant',
        },
    ],
);

annotate service.Missions with @(
    UI.HeaderInfo : {
        TypeName       : '{i18n>Mission.typeName}',
        TypeNamePlural : '{i18n>Mission.typeNamePlural}',
        Title          : { Value : title },
    },
    UI.PresentationVariant : {
        SortOrder      : [{ Property : startDate }],
        Visualizations : ['@UI.LineItem'],
    },
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : title,
            @HTML5.CssDefaults : { width : 'auto' },
        },
        {
            $Type       : 'UI.DataField',
            Value       : status,
            Criticality : statusCriticality,
        },
        { $Type : 'UI.DataField', Value : startDate },
        { $Type : 'UI.DataField', Value : endDate },
    ],
);
