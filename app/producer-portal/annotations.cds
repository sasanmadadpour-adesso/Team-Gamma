using ProducerOnboardingService as service from '../../srv/producer-onboarding-service';
annotate service.Plants with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'operatorName',
                Value : operatorName,
            },
            {
                $Type : 'UI.DataField',
                Label : 'email',
                Value : email,
            },
            {
                $Type : 'UI.DataField',
                Label : 'productionType',
                Value : productionType,
            },
            {
                $Type : 'UI.DataField',
                Label : 'capacityKw',
                Value : capacityKw,
            },
            {
                $Type : 'UI.DataField',
                Label : 'azimuth',
                Value : azimuth,
            },
            {
                $Type : 'UI.DataField',
                Label : 'address',
                Value : address,
            },
            {
                $Type : 'UI.DataField',
                Label : 'buildingId',
                Value : buildingId,
            },
            {
                $Type : 'UI.DataField',
                Label : 'marketLocationId',
                Value : marketLocationId,
            },
            {
                $Type : 'UI.DataField',
                Label : 'meteringLocationId',
                Value : meteringLocationId,
            },
            {
                $Type : 'UI.DataField',
                Label : 'meterNumber',
                Value : meterNumber,
            },
            {
                $Type : 'UI.DataField',
                Label : 'meteringSystem',
                Value : meteringSystem,
            },
            {
                $Type : 'UI.DataField',
                Label : 'balancingArea',
                Value : balancingArea,
            },
            {
                $Type : 'UI.DataField',
                Label : 'bkId',
                Value : bkId,
            },
            {
                $Type : 'UI.DataField',
                Label : 'imsysActive',
                Value : imsysActive,
            },
            {
                $Type : 'UI.DataField',
                Label : 'status',
                Value : status,
            },
            {
                $Type : 'UI.DataField',
                Label : 'desiredStart',
                Value : desiredStart,
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
            Label : 'operatorName',
            Value : operatorName,
        },
        {
            $Type : 'UI.DataField',
            Label : 'email',
            Value : email,
        },
        {
            $Type : 'UI.DataField',
            Label : 'productionType',
            Value : productionType,
        },
        {
            $Type : 'UI.DataField',
            Label : 'capacityKw',
            Value : capacityKw,
        },
        {
            $Type : 'UI.DataField',
            Label : 'azimuth',
            Value : azimuth,
        },
    ],
);

