sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"neo/energy/participantonboarding/test/integration/pages/ParticipationApplicationsMain.gen"
], function (JourneyRunner, ParticipationApplicationsMainGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('neo/energy/participantonboarding') + '/test/flp.html#app-preview',
        pages: {
			onTheParticipationApplicationsMainGenerated: ParticipationApplicationsMainGenerated
        },
        async: true
    });

    return runner;
});

