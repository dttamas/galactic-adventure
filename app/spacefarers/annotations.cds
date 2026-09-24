using GalacticService as service from '../../srv/galactic-service';
annotate service.Spacefarers with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'name',
                Value : name,
            },
            {
                $Type : 'UI.DataField',
                Label : 'email',
                Value : email,
            },
            {
                $Type : 'UI.DataField',
                Label : 'originPlanet_code',
                Value : originPlanet_code,
            },
            {
                $Type : 'UI.DataField',
                Label : 'spacesuitColor',
                Value : spacesuitColor,
            },
            {
                $Type : 'UI.DataField',
                Label : 'stardustCollected',
                Value : stardustCollected,
            },
            {
                $Type : 'UI.DataField',
                Label : 'stardustStatus',
                Value : stardustStatus,
            },
            {
                $Type : 'UI.DataField',
                Label : 'stardustCriticality',
                Value : stardustCriticality,
            },
            {
                $Type : 'UI.DataField',
                Label : 'wormholeNavSkill',
                Value : wormholeNavSkill,
            },
            {
                $Type : 'UI.DataField',
                Label : 'rank_code',
                Value : rank_code,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'name',
            Value : name,
        },
        {
            $Type : 'UI.DataField',
            Label : 'email',
            Value : email,
        },
        {
            $Type : 'UI.DataField',
            Label : 'originPlanet_code',
            Value : originPlanet_code,
        },
        {
            $Type : 'UI.DataField',
            Label : 'spacesuitColor',
            Value : spacesuitColor,
        },
        {
            $Type : 'UI.DataField',
            Label : 'stardustCollected',
            Value : stardustCollected,
        },
    ],
);

annotate service.Spacefarers with {
    department @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Departments',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : department_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'sector',
            },
        ],
    }
};

annotate service.Spacefarers with {
    position @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Positions',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : position_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'title',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'level',
            },
        ],
    }
};

