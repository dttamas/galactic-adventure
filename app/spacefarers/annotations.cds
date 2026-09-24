using GalacticService as service from '../../srv/galactic-service';

annotate service.Spacefarers with @(
    UI.HeaderInfo : {
        TypeName       : '{i18n>Spacefarer.typeName}',
        TypeNamePlural : '{i18n>Spacefarer.typeNamePlural}',
        Title          : { Value : name },
        Description    : { Value : rank.name },
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
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : name,
            },
            {
                $Type : 'UI.DataField',
                Value : email,
            },
            {
                $Type : 'UI.DataField',
                Value : originPlanet_code,
            },
            {
                $Type : 'UI.DataField',
                Value : spacesuitColor,
            },
            {
                $Type : 'UI.DataField',
                Value : stardustCollected,
            },
            {
                $Type : 'UI.DataField',
                Value : stardustStatus,
            },
            {
                $Type : 'UI.DataField',
                Value : wormholeNavSkill,
            },
            {
                $Type : 'UI.DataField',
                Value : rank_code,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : '{i18n>Spacefarer.generalInformation}',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
);
