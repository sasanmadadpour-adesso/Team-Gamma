sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel"
    ],
    function (Controller, JSONModel) {
        "use strict";

        var DEMO_COMMUNITY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
        var DEMO_PLANT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

        function round(value, digits) {
            return Number(Number(value || 0).toFixed(digits || 2));
        }

        return Controller.extend("neo.energy.energysharingportal.controller.Main", {
            onInit: function () {
                var oView = this.getView();
                var oDashboard = oView.getModel("dashboard");
                if (!oDashboard) {
                    oDashboard = new JSONModel({
                        communityName: "",
                        communityStatus: "",
                        generationToday: 0,
                        communityUsed: 0,
                        surplus: 0,
                        usageRate: 0,
                        revenue: 0,
                        chartData: []
                    });
                    oView.setModel(oDashboard, "dashboard");
                }
                this._loadCommunity(oDashboard);
                this._loadIntervals(oDashboard);
                this._loadRevenue(oDashboard);
                this._loadParticipants(oDashboard);
                this._loadAssignments(oDashboard);
            },

            _loadCommunity: function (oDashboard) {
                var oModel = this.getView().getModel();
                var oBinding = oModel.bindContext("/Communities('" + DEMO_COMMUNITY_ID + "')");
                oBinding.requestObject()
                    .then(function (oCommunity) {
                        oDashboard.setProperty("/communityName", oCommunity.name);
                        oDashboard.setProperty("/communityStatus", oCommunity.status);
                    })
                    .catch(function () {
                        oDashboard.setProperty("/communityName", "Sonnenquartier Frankfurt");
                        oDashboard.setProperty("/communityStatus", "ACTIVE");
                    });
            },

            _loadIntervals: function (oDashboard) {
                var oModel = this.getView().getModel();
                var oBinding = oModel.bindList("/CommunityIntervals", undefined, undefined, undefined, {
                    $filter: "community_ID eq '" + DEMO_COMMUNITY_ID + "'",
                    $orderby: "intervalStart"
                });
                oBinding.requestContexts(0, 1000)
                    .then(function (aContexts) {
                        var aIntervals = (aContexts || []).map(function (oContext) {
                            return oContext.getObject();
                        });
                        var aChart = aIntervals.map(function (oInterval) {
                            var oRow = Object.assign({}, oInterval);
                            var oDate = new Date(oInterval.intervalStart);
                            oRow.timeLabel = String(oDate.getUTCHours()).padStart(2, "0") + ":" + String(oDate.getUTCMinutes()).padStart(2, "0");
                            return oRow;
                        });
                        oDashboard.setProperty("/chartData", aChart);

                        var fGeneration = 0, fCommunity = 0, fSurplus = 0;
                        aIntervals.forEach(function (oInterval) {
                            fGeneration += Number(oInterval.generationKwh || 0);
                            fCommunity += Number(oInterval.communityKwh || 0);
                            fSurplus += Number(oInterval.surplusKwh || 0);
                        });
                        oDashboard.setProperty("/generationToday", round(fGeneration));
                        oDashboard.setProperty("/communityUsed", round(fCommunity));
                        oDashboard.setProperty("/surplus", round(fSurplus));
                        oDashboard.setProperty("/usageRate", round(fGeneration > 0 ? (fCommunity / fGeneration) * 100 : 0));
                    })
                    .catch(function () {
                        oDashboard.setProperty("/chartData", []);
                    });
            },

            _loadRevenue: function (oDashboard) {
                var oModel = this.getView().getModel();
                var oBinding = oModel.bindList("/PaymentPositions", undefined, undefined, undefined, {
                    $filter: "plant_ID eq '" + DEMO_PLANT_ID + "'"
                });
                oBinding.requestContexts(0, 100)
                    .then(function (aContexts) {
                        var aPositions = (aContexts || []).map(function (oContext) {
                            return oContext.getObject();
                        });
                        var fRevenue = 0;
                        aPositions.forEach(function (oPosition) {
                            fRevenue += Number(oPosition.amount || 0);
                        });
                        if (fRevenue === 0) {
                            var fCommunity = Number(oDashboard.getProperty("/communityUsed") || 0);
                            fRevenue = fCommunity * 0.12;
                        }
                        oDashboard.setProperty("/revenue", round(fRevenue));
                    })
                    .catch(function () {
                        oDashboard.setProperty("/revenue", 0);
                    });
            },

            _loadParticipants: function (oDashboard) {},

            _loadAssignments: function (oDashboard) {},

            onProducerPortal: function () {
                window.location.href = "/neo.energy.producerportal/index.html";
            },

            onCommunityManagement: function () {
                window.location.href = "/neo.energy.communitymanagement/index.html";
            },

            onParticipantOnboarding: function () {
                window.location.href = "/neo.energy.participantonboarding/index.html";
            },

            onHome: function () {
                window.location.href = "/neo.energy.energysharingportal/index.html";
            },

            onRegisterPlant: function () {
                window.location.href = "/neo.energy.producerportal/index.html";
            },

            onAssignPlant: function () {
                window.location.href = "/neo.energy.communitymanagement/index.html";
            },

            onOnboardParticipant: function () {
                window.location.href = "/neo.energy.participantonboarding/index.html";
            }
        });
    }
);