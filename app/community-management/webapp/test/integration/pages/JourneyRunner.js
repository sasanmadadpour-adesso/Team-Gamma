sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"neo/energy/communitymanagement/test/integration/pages/CommunitiesList.gen",
	"neo/energy/communitymanagement/test/integration/pages/CommunitiesObjectPage.gen"
], function (JourneyRunner, CommunitiesListGenerated, CommunitiesObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('neo/energy/communitymanagement') + '/test/flp.html#app-preview',
        pages: {
			onTheCommunitiesListGenerated: CommunitiesListGenerated,
			onTheCommunitiesObjectPageGenerated: CommunitiesObjectPageGenerated
        },
        async: true
    });

    return runner;
});

