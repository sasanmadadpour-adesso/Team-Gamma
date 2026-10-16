sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"neo/energy/producerportal/test/integration/pages/PlantsList.gen",
	"neo/energy/producerportal/test/integration/pages/PlantsObjectPage.gen"
], function (JourneyRunner, PlantsListGenerated, PlantsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('neo/energy/producerportal') + '/test/flp.html#app-preview',
        pages: {
			onThePlantsListGenerated: PlantsListGenerated,
			onThePlantsObjectPageGenerated: PlantsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

