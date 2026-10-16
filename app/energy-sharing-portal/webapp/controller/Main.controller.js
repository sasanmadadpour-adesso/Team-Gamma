sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel"
    ],
    function (Controller, JSONModel) {
        "use strict";

        // Demo-only UI role separation. Real authorization must be enforced server-side by CAP later.
        var DEMO_COMMUNITY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
        var DEMO_PLANT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

        function round(value, digits) {
            return Number(Number(value || 0).toFixed(digits || 2));
        }

        return Controller.extend("neo.energy.energysharingportal.controller.Main", {
            onInit: function () {
                var oView = this.getView();
                var oPortal = new JSONModel({ view: "dashboard", communityTab: "overview" });
                oView.setModel(oPortal, "portal");
                oView.setModel(new JSONModel({ items: [], plant: {}, checkpoints: [] }), "plantView");
                oView.setModel(new JSONModel({ items: [], plant: {}, checkpoints: [] }), "plantView");

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
                // Do not call protected OData services before a demo role is selected.
                // Real CAP authorization is unaffected; the UI simply waits for login.

                this._loadPortalData = function () {
                    this._loadCommunity(oDashboard);
                    this._loadIntervals(oDashboard);
                    this._loadRevenue(oDashboard);
                    this._loadCommunityDetails();
                }.bind(this);

                // A future SAP CAP login state can trigger this instead of the demo role selector.
                // this._loadPortalData();
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

            _loadCommunityDetails: function () {
                var oView = this.getView();
                var oModel = oView.getModel();
                var oCommunityModel = new JSONModel({
                    name: "Sonnenquartier Frankfurt",
                    status: "ACTIVE",
                    statusLabel: "Aktiv",
                    location: "Frankfurt am Main",
                    balancingArea: "",
                    bkId: "",
                    priceModel: "FIXED_PRICE",
                    priceModelLabel: "Festpreis",
                    fixedPricePerKwh: "",
                    residualPricePerKwh: "",
                    validFrom: "",
                    validTo: "",
                    plantsCount: 0,
                    participantsCount: 0
                });
                oView.setModel(oCommunityModel, "community");

                var oBinding = oModel.bindContext("/Communities('" + DEMO_COMMUNITY_ID + "')");
                oBinding.requestObject().then(function (oCommunity) {
                    oCommunityModel.setProperty("/name", oCommunity.name || "Sonnenquartier Frankfurt");
                    oCommunityModel.setProperty("/status", oCommunity.status || "ACTIVE");
                    oCommunityModel.setProperty("/statusLabel", oCommunity.status === "ACTIVE" ? "Aktiv" : (oCommunity.status || "-"));
                    oCommunityModel.setProperty("/location", oCommunity.location || "Frankfurt am Main");
                    oCommunityModel.setProperty("/balancingArea", oCommunity.balancingArea || "-");
                    oCommunityModel.setProperty("/bkId", oCommunity.bkId || "-");
                    oCommunityModel.setProperty("/priceModel", oCommunity.priceModel || "-");
                    oCommunityModel.setProperty("/priceModelLabel", oCommunity.priceModel === "FIXED_PRICE" ? "Festpreis" : (oCommunity.priceModel || "-"));
                    oCommunityModel.setProperty("/fixedPricePerKwh", oCommunity.fixedPricePerKwh || "-");
                    oCommunityModel.setProperty("/residualPricePerKwh", oCommunity.residualPricePerKwh || "-");
                    oCommunityModel.setProperty("/validFrom", oCommunity.validFrom || "-");
                    oCommunityModel.setProperty("/validTo", oCommunity.validTo || "-");
                    oCommunityModel.setProperty("/operator", oCommunity.contactName || "Jan Koller");
                }).catch(function () {
                    // Keep demo fallback values.
                });

                var oPlantsBinding = oModel.bindList("/Plants", undefined, undefined, undefined, {
                    $filter: "community_ID eq '" + DEMO_COMMUNITY_ID + "'"
                });
                oPlantsBinding.requestContexts(0, 1000).then(function (aContexts) {
                    var aPlants = (aContexts || []).map(function (oContext) {
                        return oContext.getObject();
                    });
                    var oPlantView = oView.getModel("plantView");
                    oCommunityModel.setProperty("/plantsCount", aPlants.length);
                    oPlantView.setProperty("/items", aPlants);
                    if (aPlants.length > 0) {
                        oPlantView.setProperty("/plant", aPlants[0]);
                        var oCheckpointsBinding = oModel.bindList("/PlantCheckpoints", undefined, undefined, undefined, {
                            $filter: "plant_ID eq '" + aPlants[0].ID + "'"
                        });
                        oCheckpointsBinding.requestContexts(0, 1000).then(function (aCheckpointContexts) {
                            oPlantView.setProperty("/checkpoints", (aCheckpointContexts || []).map(function (oContext) {
                                return oContext.getObject();
                            }));
                        }).catch(function () {
                            oPlantView.setProperty("/checkpoints", []);
                        });
                    }
                }).catch(function () {
                    oCommunityModel.setProperty("/plantsCount", 1);
                });

                var oParticipantsBinding = oModel.bindList("/Participants", undefined, undefined, undefined, {
                    $filter: "community_ID eq '" + DEMO_COMMUNITY_ID + "'"
                });
                oParticipantsBinding.requestContexts(0, 1000).then(function (aContexts) {
                    oCommunityModel.setProperty("/participantsCount", (aContexts || []).length);
                }).catch(function () {
                    oCommunityModel.setProperty("/participantsCount", 1);
                });
            },

            onShowDashboard: function () {
                var oPortal = this.getView().getModel("portal");
                if (oPortal) {
                    oPortal.setProperty("/view", "dashboard");
                }
            },

            onShowCommunity: function () {
                var oPortal = this.getView().getModel("portal");
                if (oPortal) {
                    oPortal.setProperty("/view", "community");
                }
                this._loadCommunityDetails();
            },

            onCommunityOverview: function () {
                var oPortal = this.getView().getModel("portal");
                if (oPortal) oPortal.setProperty("/communityTab", "overview");
            },

            onCommunityPlants: function () {
                var oPortal = this.getView().getModel("portal");
                if (oPortal) oPortal.setProperty("/communityTab", "plants");
            },

            onCommunityParticipants: function () {
                var oPortal = this.getView().getModel("portal");
                if (oPortal) oPortal.setProperty("/communityTab", "participants");
            },

            onCommunityBilling: function () {
                var oPortal = this.getView().getModel("portal");
                if (oPortal) oPortal.setProperty("/communityTab", "billing");
            },

            onLoginManager: function () {
                var oPortal = this.getView().getModel("portal");
                oPortal.setProperty("/authenticated", true);
                oPortal.setProperty("/role", "manager");
                oPortal.setProperty("/view", "dashboard");
                oPortal.setProperty("/communityTab", "overview");
                if (this._loadPortalData) {
                    this._loadPortalData();
                }
            },

            onLoginCustomer: function () {
                var oPortal = this.getView().getModel("portal");
                oPortal.setProperty("/authenticated", true);
                oPortal.setProperty("/role", "customer");
                if (this._loadPortalData) {
                    this._loadPortalData();
                }
            },

            onLogout: function () {
                var oPortal = this.getView().getModel("portal");
                oPortal.setProperty("/authenticated", false);
                oPortal.setProperty("/role", null);
                oPortal.setProperty("/view", "dashboard");
                oPortal.setProperty("/communityTab", "overview");
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
                window.location.href = "/neo.energy.energysharingportal/register/index.html";
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