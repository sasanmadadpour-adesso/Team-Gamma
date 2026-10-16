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

        var PLANT_STATUS_LABELS = {
            REGISTERED: "Registriert",
            IN_REVIEW: "In Prüfung",
            ACTIVE: "Aktiv",
            READY_FOR_ASSIGNMENT: "Bereit zur Zuordnung",
            ASSIGNED: "Zugeordnet",
            REJECTED: "Abgelehnt"
        };

        var PLANT_STATUS_STATES = {
            REGISTERED: "None",
            IN_REVIEW: "Warning",
            ACTIVE: "Success",
            READY_FOR_ASSIGNMENT: "Information",
            ASSIGNED: "Success",
            REJECTED: "Error"
        };

        function round(value, digits) {
            return Number(Number(value || 0).toFixed(digits || 2));
        }

        return Controller.extend("neo.energy.energysharingportal.controller.Main", {
            onInit: function () {
                var oView = this.getView();
                var oPortal = new JSONModel({
                    view: "dashboard",
                    communityTab: "overview",
                    email: "",
                    password: "",
                    loginError: false
                });
                oView.setModel(oPortal, "portal");
                oView.setModel(new JSONModel({ items: [], plant: {}, checkpoints: [] }), "plantView");
                oView.setModel(new JSONModel({ items: [] }), "communityParticipants");
                oView.setModel(new JSONModel({ items: [] }), "allParticipants");
                oView.setModel(new JSONModel({ items: [] }), "billing");
                oView.setModel(new JSONModel({
                    name: "Jan Koller",
                    community: {},
                    plant: {},
                    billing: []
                }), "customer");
                oView.setModel(new JSONModel({
                    items: [],
                    selected: null,
                    checkpoints: [],
                    total: 0,
                    readyForAssignment: 0,
                    assigned: 0,
                    inReview: 0
                }), "allPlants");

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
                    var aParticipants = (aContexts || []).map(function (oContext) {
                        return oContext.getObject();
                    });
                    oCommunityModel.setProperty("/participantsCount", aParticipants.length);
                    oView.getModel("communityParticipants").setProperty("/items", aParticipants);
                }).catch(function () {
                    oCommunityModel.setProperty("/participantsCount", 1);
                });

                this._loadBillingData();
            },

            _loadAllPlants: function () {
                var oView = this.getView();
                var oModel = oView.getModel();
                var oAllPlants = oView.getModel("allPlants");
                var oBinding = oModel.bindList("/Plants", undefined, undefined, undefined, {
                    $expand: "community"
                });
                oBinding.requestContexts(0, 1000).then(function (aContexts) {
                    var aPlants = (aContexts || []).map(function (oContext) {
                        return oContext.getObject();
                    });
                    var iReady = 0, iAssigned = 0, iReview = 0;
                    aPlants.forEach(function (oPlant) {
                        if (oPlant.status === "READY_FOR_ASSIGNMENT") iReady++;
                        if (oPlant.status === "ASSIGNED") iAssigned++;
                        if (oPlant.status === "IN_REVIEW") iReview++;
                    });
                    oAllPlants.setProperty("/items", aPlants);
                    oAllPlants.setProperty("/total", aPlants.length);
                    oAllPlants.setProperty("/readyForAssignment", iReady);
                    oAllPlants.setProperty("/assigned", iAssigned);
                    oAllPlants.setProperty("/inReview", iReview);
                    if (aPlants.length > 0) {
                        this._selectPlant(aPlants[0]);
                    } else {
                        oAllPlants.setProperty("/selected", null);
                        oAllPlants.setProperty("/checkpoints", []);
                    }
                }.bind(this)).catch(function () {
                    oAllPlants.setProperty("/items", []);
                    oAllPlants.setProperty("/total", 0);
                    oAllPlants.setProperty("/readyForAssignment", 0);
                    oAllPlants.setProperty("/assigned", 0);
                    oAllPlants.setProperty("/inReview", 0);
                    oAllPlants.setProperty("/selected", null);
                    oAllPlants.setProperty("/checkpoints", []);
                });
            },

            _selectPlant: function (oPlant) {
                var oView = this.getView();
                var oModel = oView.getModel();
                var oAllPlants = oView.getModel("allPlants");
                oAllPlants.setProperty("/selected", oPlant);
                var oCheckpointsBinding = oModel.bindList("/PlantCheckpoints", undefined, undefined, undefined, {
                    $filter: "plant_ID eq '" + oPlant.ID + "'"
                });
                oCheckpointsBinding.requestContexts(0, 1000).then(function (aContexts) {
                    oAllPlants.setProperty("/checkpoints", (aContexts || []).map(function (oContext) {
                        return oContext.getObject();
                    }));
                }).catch(function () {
                    oAllPlants.setProperty("/checkpoints", []);
                });
            },

            onSelectPlant: function (oEvent) {
                var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
                var oContext = oItem.getBindingContext("allPlants");
                if (!oContext) return;
                this._selectPlant(oContext.getObject());
            },

            formatPlantStatusText: function (sStatus) {
                return PLANT_STATUS_LABELS[sStatus] || sStatus || "-";
            },

            formatPlantStatusState: function (sStatus) {
                return PLANT_STATUS_STATES[sStatus] || "None";
            },

            _loadBillingData: function () {
                var oView = this.getView();
                var oModel = oView.getModel();
                var oBillingModel = oView.getModel("billing");
                var oBillingBinding = oModel.bindList("/PaymentPositions", undefined, undefined, undefined, {
                    $filter: "community_ID eq '" + DEMO_COMMUNITY_ID + "'"
                });
                oBillingBinding.requestContexts(0, 1000).then(function (aContexts) {
                    oBillingModel.setProperty("/items", (aContexts || []).map(function (oContext) {
                        return oContext.getObject();
                    }));
                }).catch(function () {
                    oBillingModel.setProperty("/items", []);
                });
            },

            _loadCustomerData: function () {
                var oView = this.getView();
                var oModel = oView.getModel();
                var oCustomer = oView.getModel("customer");
                var oDashboard = oView.getModel("dashboard");

                oModel.bindContext("/Communities('" + DEMO_COMMUNITY_ID + "')").requestObject()
                    .then(function (oCommunity) {
                        oCustomer.setProperty("/community", oCommunity);
                    });

                oModel.bindContext("/Plants('" + DEMO_PLANT_ID + "')").requestObject()
                    .then(function (oPlant) {
                        oCustomer.setProperty("/plant", oPlant);
                        oDashboard.setProperty("/generationToday", round(oPlant.generationTodayKwh));
                        oDashboard.setProperty("/communityUsed", round(oPlant.communityTodayKwh));
                        oDashboard.setProperty("/surplus", round(oPlant.surplusTodayKwh));
                        oDashboard.setProperty("/usageRate", round(oPlant.usageRatePercent));
                    });

                oModel.bindList("/PaymentPositions", undefined, undefined, undefined, {
                    $filter: "plant_ID eq '" + DEMO_PLANT_ID + "'"
                }).requestContexts(0, 100).then(function (aContexts) {
                    var aBilling = (aContexts || []).map(function (oContext) {
                        return oContext.getObject();
                    });
                    var fRevenue = aBilling.reduce(function (fTotal, oPosition) {
                        return fTotal + Number(oPosition.amount || 0);
                    }, 0);
                    oCustomer.setProperty("/billing", aBilling);
                    oDashboard.setProperty("/revenue", round(fRevenue));
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

            onShowPlants: function () {
                var oPortal = this.getView().getModel("portal");
                if (oPortal) {
                    oPortal.setProperty("/view", "plants");
                }
                this._loadAllPlants();
            },

            onRefreshAllPlants: function () {
                this._loadAllPlants();
            },

            _loadAllParticipants: function () {
                var oParticipants = this.getView().getModel("allParticipants");
                var oBinding = this.getView().getModel().bindList("/Participants", undefined, undefined, undefined, {
                    $expand: "community"
                });
                oBinding.requestContexts(0, 1000).then(function (aContexts) {
                    oParticipants.setProperty("/items", (aContexts || []).map(function (oContext) {
                        return oContext.getObject();
                    }));
                }).catch(function () {
                    oParticipants.setProperty("/items", []);
                });
            },

            onShowParticipants: function () {
                this.getView().getModel("portal").setProperty("/view", "participants");
                this._loadAllParticipants();
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

            onRefreshCommunityParticipants: function () {
                if (this._loadCommunityDetails) {
                    this._loadCommunityDetails();
                }
            },

            onRefreshBilling: function () {
                if (this._loadBillingData) {
                    this._loadBillingData();
                }
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

            onLogin: function () {
                var oPortal = this.getView().getModel("portal");
                var sEmail = String(oPortal.getProperty("/email") || "").trim().toLowerCase();
                var sPassword = String(oPortal.getProperty("/password") || "");

                oPortal.setProperty("/loginError", false);
                if (sEmail === "lieferant@neo-energy.de" && sPassword === "demo") {
                    this.onLoginManager();
                    return;
                }
                if (sEmail === "jan.koller@neo-energy.de" && sPassword === "demo") {
                    this.onLoginCustomer();
                    return;
                }
                oPortal.setProperty("/loginError", true);
            },

            onLoginCustomer: function () {
                var oPortal = this.getView().getModel("portal");
                oPortal.setProperty("/authenticated", true);
                oPortal.setProperty("/role", "customer");
                oPortal.setProperty("/view", "customerOverview");
                this._loadCustomerData();
            },

            onShowCustomerOverview: function () {
                this.getView().getModel("portal").setProperty("/view", "customerOverview");
            },

            onShowCustomerCommunity: function () {
                this.getView().getModel("portal").setProperty("/view", "customerCommunity");
            },

            onShowCustomerPlant: function () {
                this.getView().getModel("portal").setProperty("/view", "customerPlant");
            },

            onShowCustomerEnergy: function () {
                this.getView().getModel("portal").setProperty("/view", "customerEnergy");
            },

            onShowCustomerBilling: function () {
                this.getView().getModel("portal").setProperty("/view", "customerBilling");
            },

            onLogout: function () {
                var oPortal = this.getView().getModel("portal");
                oPortal.setProperty("/authenticated", false);
                oPortal.setProperty("/role", null);
                oPortal.setProperty("/view", "dashboard");
                oPortal.setProperty("/communityTab", "overview");
                oPortal.setProperty("/email", "");
                oPortal.setProperty("/password", "");
                oPortal.setProperty("/loginError", false);
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
                window.location.href = sap.ui.require.toUrl("neo/energy/energysharingportal/register/index.html");
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
