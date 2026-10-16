using ProducerOnboardingService as service from '../../srv/producer-onboarding-service';

// ---------------------------------------------------------------------------
// Producer portal: polished SAP Fiori Elements producer dashboard
// ---------------------------------------------------------------------------

annotate service.Plants with @(
    UI.HeaderInfo: {
        TypeName: 'Einspeiseanlage',
        TypeNamePlural: 'Einspeiseanlagen',
        Title: { Value: operatorName },
        Description: { Value: communityName }
    },
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: operatorName, Label: 'Anlagenbetreiber' },
        { $Type: 'UI.DataField', Value: communityName, Label: 'Energy-Sharing-Community' },
        { $Type: 'UI.DataField', Value: productionType, Label: 'Erzeugungsart' },
        { $Type: 'UI.DataField', Value: capacityKw, Label: 'Anlagenleistung (kW)' },
        { $Type: 'UI.DataField', Value: status, Label: 'Status' },
        { $Type: 'UI.DataField', Value: generationTodayKwh, Label: 'Erzeugung heute (kWh)' },
        { $Type: 'UI.DataField', Value: communityTodayKwh, Label: 'In der Community genutzt (kWh)' },
        { $Type: 'UI.DataField', Value: surplusTodayKwh, Label: 'Überschuss (kWh)' },
        { $Type: 'UI.DataField', Value: usageRatePercent, Label: 'Nutzungsquote (%)' },
        { $Type: 'UI.DataField', Value: revenueAmount, Label: 'Erlös (EUR)' }
    ],
    UI.SelectionFields: [
        status,
        productionType
    ],
    UI.PresentationVariant: {
        SortOrder: [ { Property: operatorName, Descending: false } ]
    },
    UI.DataPoint #ErzeugungHeute: {
        $Type: 'UI.DataPointType',
        Value: generationTodayKwh,
        Title: 'Erzeugung heute',
        Description: 'Summe der Erzeugung des Tages in kWh',
        TargetValue: capacityKw
    },
    UI.DataPoint #CommunityNutzung: {
        $Type: 'UI.DataPointType',
        Value: communityTodayKwh,
        Title: 'In der Community genutzt'
    },
    UI.DataPoint #Ueberschuss: {
        $Type: 'UI.DataPointType',
        Value: surplusTodayKwh,
        Title: 'Überschuss'
    },
    UI.DataPoint #Nutzungsquote: {
        $Type: 'UI.DataPointType',
        Value: usageRatePercent,
        Title: 'Nutzungsquote'
    },
    UI.DataPoint #Erlös: {
        $Type: 'UI.DataPointType',
        Value: revenueAmount,
        Title: 'Erlös'
    },
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'PlantFacet',
            Label: 'Meine Einspeiseanlage',
            Target: '@UI.FieldGroup#Plant'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'CommunityFacet',
            Label: 'Community',
            Target: '@UI.FieldGroup#Community'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'GridFacet',
            Label: 'Netz & Bilanzierung',
            Target: '@UI.FieldGroup#Grid'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'MeteringFacet',
            Label: 'Messung / iMSys',
            Target: '@UI.FieldGroup#Metering'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'RevenueFacet',
            Label: 'Verteilung & Erlös',
            Target: '@UI.FieldGroup#Revenue'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'EnergyDevelopmentFacet',
            Label: 'Tagesverlauf (15-Minuten)',
            Target: 'community/intervals/@UI.Chart#EnergyDevelopment'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'CheckpointsFacet',
            Label: 'Prüfungen',
            Target: 'checkpoints/@UI.LineItem'
        }
    ],
    UI.FieldGroup #Plant: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Label: 'Anlagenbetreiber', Value: operatorName },
            { $Type: 'UI.DataField', Label: 'E-Mail', Value: email },
            { $Type: 'UI.DataField', Label: 'Erzeugungsart', Value: productionType },
            { $Type: 'UI.DataField', Label: 'Anlagenleistung', Value: capacityKw },
            { $Type: 'UI.DataField', Label: 'Ausrichtung (Azimuth)', Value: azimuth },
            { $Type: 'UI.DataField', Label: 'Adresse', Value: address },
            { $Type: 'UI.DataField', Label: 'Gebäude-ID', Value: buildingId },
            { $Type: 'UI.DataField', Label: 'Gewünschter Start', Value: desiredStart },
            { $Type: 'UI.DataField', Label: 'Status', Value: status },
            { $Type: 'UI.DataField', Label: 'Erzeugung heute', Value: generationTodayKwh },
            { $Type: 'UI.DataField', Label: 'In der Community genutzt', Value: communityTodayKwh },
            { $Type: 'UI.DataField', Label: 'Überschuss', Value: surplusTodayKwh },
            { $Type: 'UI.DataField', Label: 'Nutzungsquote', Value: usageRatePercent },
            { $Type: 'UI.DataField', Label: 'Erlös', Value: revenueAmount }
        ]
    },
    UI.FieldGroup #Community: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Label: 'Energy-Sharing-Community', Value: communityName },
            { $Type: 'UI.DataField', Label: 'Community-Status', Value: communityStatus },
            { $Type: 'UI.DataField', Label: 'Gemeinschaftspreis (EUR/kWh)', Value: communityFixedPricePerKwh },
            { $Type: 'UI.DataField', Label: 'Reststrompreis (EUR/kWh)', Value: communityResidualPricePerKwh },
            { $Type: 'UI.DataField', Label: 'Tarifmodell', Value: communityPriceModel }
        ]
    },
    UI.FieldGroup #Grid: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Label: 'Bilanzierungsgebiet', Value: balancingArea },
            { $Type: 'UI.DataField', Label: 'Bilanzkreis (BK-ID)', Value: bkId },
            { $Type: 'UI.DataField', Label: 'Marktlokation (MaLo)', Value: marketLocationId }
        ]
    },
    UI.FieldGroup #Metering: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Label: 'Marktlokation', Value: marketLocationId },
            { $Type: 'UI.DataField', Label: 'Messlokation', Value: meteringLocationId },
            { $Type: 'UI.DataField', Label: 'Zählernummer', Value: meterNumber },
            { $Type: 'UI.DataField', Label: 'Messsystem', Value: meteringSystem },
            { $Type: 'UI.DataField', Label: 'Intelligentes Messsystem (iMSys)', Value: imsysActive }
        ]
    },
    UI.FieldGroup #Revenue: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Label: 'Community-Nutzung (kWh)', Value: communityTodayKwh },
            { $Type: 'UI.DataField', Label: 'Überschuss Erzeuger (kWh)', Value: surplusTodayKwh },
            { $Type: 'UI.DataField', Label: 'Nutzungsquote (%)', Value: usageRatePercent },
            { $Type: 'UI.DataField', Label: 'Erlös (EUR)', Value: revenueAmount }
        ]
    }
);

annotate service.CommunityIntervals with @(
    UI.Chart #EnergyDevelopment: {
        $Type: 'UI.ChartType',
        Title: 'Erzeugung vs. Community-Nutzung (15-Minuten)',
        ChartType: #Line,
        Dimensions: [ intervalStart ],
        Measures: [ generationKwh, communityKwh, forecastKwh ],
        DimensionAttributes: [
            {
                $Type: 'UI.ChartDimensionAttributeType',
                Dimension: intervalStart,
                Role: #Category
            }
        ],
        MeasureAttributes: [
            {
                $Type: 'UI.ChartMeasureAttributeType',
                Measure: generationKwh,
                Role: #Axis1
            },
            {
                $Type: 'UI.ChartMeasureAttributeType',
                Measure: communityKwh,
                Role: #Axis1
            },
            {
                $Type: 'UI.ChartMeasureAttributeType',
                Measure: forecastKwh,
                Role: #Axis2
            }
        ]
    },
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: intervalStart, Label: 'Intervallbeginn' },
        { $Type: 'UI.DataField', Value: generationKwh, Label: 'Erzeugung (kWh)' },
        { $Type: 'UI.DataField', Value: forecastKwh, Label: 'Prognose (kWh)' },
        { $Type: 'UI.DataField', Value: communityKwh, Label: 'Community-Nutzung (kWh)' },
        { $Type: 'UI.DataField', Value: surplusKwh, Label: 'Überschuss (kWh)' }
    ],
    UI.PresentationVariant: {
        SortOrder: [ { Property: intervalStart, Descending: false } ]
    }
);

annotate service.Communities with @(
    UI.HeaderInfo: {
        TypeName: 'Community',
        TypeNamePlural: 'Communities',
        Title: { Value: name },
        Description: { Value: location }
    },
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: name, Label: 'Community-Name' },
        { $Type: 'UI.DataField', Value: status, Label: 'Status' },
        { $Type: 'UI.DataField', Value: location, Label: 'Standort' },
        { $Type: 'UI.DataField', Value: balancingArea, Label: 'Bilanzierungsgebiet' },
        { $Type: 'UI.DataField', Value: bkId, Label: 'Bilanzkreis' },
        { $Type: 'UI.DataField', Value: fixedPricePerKwh, Label: 'Festpreis (EUR/kWh)' }
    ]
);

annotate service.PaymentPositions with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: positionType, Label: 'Position' },
        { $Type: 'UI.DataField', Value: quantityKwh, Label: 'Menge (kWh)' },
        { $Type: 'UI.DataField', Value: ratePerKwh, Label: 'Satz (EUR/kWh)' },
        { $Type: 'UI.DataField', Value: amount, Label: 'Betrag (EUR)' },
        { $Type: 'UI.DataField', Value: payee, Label: 'Empfänger' },
        { $Type: 'UI.DataField', Value: periodStart, Label: 'Zeitraum von' },
        { $Type: 'UI.DataField', Value: periodEnd, Label: 'Zeitraum bis' }
    ]
);

// Common labels for readable metadata
annotate service.Plants with {
    operatorName @Common.Label: 'Anlagenbetreiber';
    email @Common.Label: 'E-Mail';
    productionType @Common.Label: 'Erzeugungsart';
    capacityKw @Common.Label: 'Anlagenleistung (kW)';
    azimuth @Common.Label: 'Ausrichtung (Azimuth)';
    address @Common.Label: 'Adresse';
    buildingId @Common.Label: 'GebÃ¤ude-ID';
    marketLocationId @Common.Label: 'Marktlokation (MaLo)';
    meteringLocationId @Common.Label: 'Messlokation (MeLo)';
    meterNumber @Common.Label: 'ZÃ¤hlernummer';
    meteringSystem @Common.Label: 'Messsystem';
    balancingArea @Common.Label: 'Bilanzierungsgebiet';
    bkId @Common.Label: 'Bilanzkreis (BK-ID)';
    imsysActive @Common.Label: 'Intelligentes Messsystem (iMSys)';
    status @Common.Label: 'Status';
    desiredStart @Common.Label: 'GewÃ¼nschter Start';
    communityName @Common.Label: 'Energy-Sharing-Community';
    communityStatus @Common.Label: 'Community-Status';
    generationTodayKwh @Common.Label: 'Erzeugung heute (kWh)';
    communityTodayKwh @Common.Label: 'In der Community genutzt (kWh)';
    surplusTodayKwh @Common.Label: 'Ãœberschuss (kWh)';
    usageRatePercent @Common.Label: 'Nutzungsquote (%)';
    revenueAmount @Common.Label: 'ErlÃ¶s (EUR)';
};

annotate service.CommunityIntervals with {
    intervalStart @Common.Label: 'Intervallbeginn';
    intervalEnd @Common.Label: 'Intervallende';
    generationKwh @Common.Label: 'Erzeugung (kWh)';
    forecastKwh @Common.Label: 'Prognose (kWh)';
    consumptionKwh @Common.Label: 'Verbrauch (kWh)';
    communityKwh @Common.Label: 'Community-Nutzung (kWh)';
    surplusKwh @Common.Label: 'Ãœberschuss (kWh)';
    residualKwh @Common.Label: 'Reststrom (kWh)';
    intervalType @Common.Label: 'Intervalltyp';
};

annotate service.Communities with {
    name @Common.Label: 'Community-Name';
    status @Common.Label: 'Status';
    location @Common.Label: 'Standort';
    balancingArea @Common.Label: 'Bilanzierungsgebiet';
    bkId @Common.Label: 'Bilanzkreis';
    fixedPricePerKwh @Common.Label: 'Festpreis (EUR/kWh)';
    residualPricePerKwh @Common.Label: 'Reststrompreis (EUR/kWh)';
    priceModel @Common.Label: 'Tarifmodell';
};