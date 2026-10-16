sap.ui.define([
    'sap/fe/core/PageController',
    'sap/ui/model/json/JSONModel',
    'sap/m/MessageBox',
    'sap/m/MessageToast'
], function (PageController, JSONModel, MessageBox, MessageToast) {
    'use strict';

    const PHASES = ['Voraussetzungen', 'Gemeinschaft', 'Persönliche Daten', 'Stromanschluss', 'Verträge & Versorgung', 'Zahlung', 'Prüfen & absenden'];
    const DRAFT_INITIAL_DATA = {
        status: 'DRAFT',
        currentPhase: 'PREREQUISITES',
        currentSubphase: null,
        customerType: 'PRIVATE',
        firstName: 'Max',
        lastName: 'Mustermann',
        companyName: 'Muster Energie GmbH',
        legalForm: 'GmbH',
        representativeName: 'Max Mustermann',
        email: 'max.mustermann@example.com',
        phone: '+49 170 1234567',
        street: 'Musterstraße',
        houseNumber: '12',
        postalCode: '60311',
        city: 'Frankfurt am Main',
        consumptionAddressDifferent: false,
        consumptionStreet: 'Musterstraße',
        consumptionHouseNumber: '12',
        consumptionPostalCode: '60311',
        consumptionCity: 'Frankfurt am Main',
        annualConsumption: 3500,
        monthlyCost: 95,
        existingElectricityContract: false,
        currentSupplier: '',
        contractNumber: '',
        cancellationOrder: false,
        cancellationPowerOfAttorney: false,
        desiredStart: '2026-11-01',
        marketLocationId: '12345678901',
        marketLocationStatus: 'OPEN',
        meteringLocationId: 'MELO-60311',
        imsysDeclared: true,
        imsysCheckStatus: 'PENDING',
        community_ID: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        emailVerified: true,
        verificationCodeHash: null,
        verificationCodeExpiresAt: null,
        verificationAvailableAt: null,
        contractConsent: true,
        usageConsent: true,
        sepaConsent: true,
        accountHolder: 'Max Mustermann',
        iban: 'DE89370400440532013000',
        sepaMandateVersion: '2026-01',
        signatureName: 'Max Mustermann',
        signatureMethod: 'DRAWN',
        signedAt: '2026-10-16T10:00:00.000Z',
        termsVersion: '2026-01',
        offerVersion: '2026-01',
        calculatorUsed: false,
        calculatorAnnualSaving: null,
        resumeMessage: '',
        referenceNumber: '',
        submittedAt: null,
        message: ''
    };
    const FORM_FIELDS = [
        'currentPhase', 'currentSubphase', 'customerType', 'firstName', 'lastName', 'companyName',
        'legalForm', 'representativeName', 'email', 'phone', 'street', 'houseNumber', 'postalCode',
        'city', 'consumptionAddressDifferent', 'consumptionStreet', 'consumptionHouseNumber',
        'consumptionPostalCode', 'consumptionCity', 'annualConsumption', 'monthlyCost',
        'existingElectricityContract', 'currentSupplier', 'contractNumber', 'cancellationOrder',
        'cancellationPowerOfAttorney', 'desiredStart', 'marketLocationId', 'meteringLocationId',
        'imsysDeclared',
        'community_ID', 'emailVerified', 'contractConsent', 'usageConsent', 'sepaConsent', 'accountHolder', 'iban',
        'sepaMandateVersion', 'signatureName', 'signatureMethod', 'signedAt', 'termsVersion',
        'offerVersion'
    ];

    return PageController.extend('neo.energy.participantonboarding.ext.view.Main', {
        onInit: function () {
            PageController.prototype.onInit.apply(this, arguments);
            this.getView().setModel(new JSONModel({
                busy: true,
                message: 'Entwurf wird vorbereitet …',
                messageType: 'Information',
                verificationCode: '123456',
                verificationHint: '60 Sekunden Sperrzeit nach dem Versand',
                calculatorResult: '',
                submitted: false,
                submissionReference: '',
                imsysIndex: -1,
                contractIndex: 1,
                fieldStates: {},
                fieldMessages: {},
                progressText: 'Schritt 1 von 7 · Voraussetzungen',
                progressPercent: 14,
                validated: [false, false, false, false, false, false, false]
            }), 'state');
            const formModel = this.getAppComponent().getModel('form');
            formModel.setData(Object.assign({}, DRAFT_INITIAL_DATA));
            this.getView().setModel(formModel, 'form');
            this._draftInitializationStarted = false;
            this._onModelContextChange = this._tryInitializeDraft.bind(this);
            this._ownerComponent = this.getOwnerComponent();
            this.getView().attachModelContextChange(null, this._onModelContextChange, this);
            if (this._ownerComponent) this._ownerComponent.attachModelContextChange(null, this._onModelContextChange, this);
            this._tryInitializeDraft();
        },

        _tryInitializeDraft: function () {
            if (this._draftInitializationStarted) return;
            const pageContext = this.getView().getBindingContext();
            const model = pageContext?.getModel() || this.getView().getModel() || this._ownerComponent?.getModel();
            if (!model || typeof model.bindList !== 'function') return;
            this._draftInitializationStarted = true;
            this._serviceModel = model;
            this.getView().setModel(model, 'service');
            this._prepareDraft();
        },

        onExit: function () {
            if (this._onModelContextChange) this.getView().detachModelContextChange(null, this._onModelContextChange, this);
            if (this._ownerComponent && this._onModelContextChange) this._ownerComponent.detachModelContextChange(null, this._onModelContextChange, this);
            PageController.prototype.onExit.apply(this, arguments);
        },

        _prepareDraft: async function () {
            try {
                const model = this._serviceModel;
                const binding = model.bindList('/ParticipationApplications', null, null, null, { $$updateGroupId: 'Onboarding' });
                const context = binding.create(Object.assign({}, DRAFT_INITIAL_DATA));
                await model.submitBatch('Onboarding');
                await context.created();
                this.getView().setBindingContext(context, 'service');
                this._context = context;
                this._setState({ busy: false, message: '' });
                const form = this.getView().getModel('form').getData();
                this.getView().getModel('state').setProperty('/imsysIndex', form.imsysDeclared === true ? 0 : form.imsysDeclared === false ? 1 : -1);
                this.getView().getModel('state').setProperty('/contractIndex', form.existingElectricityContract === true ? 0 : form.existingElectricityContract === false ? 1 : -1);
                this._updateProgress(0);
            } catch (error) {
                this._setState({ busy: false, message: 'Der Entwurf konnte nicht angelegt werden. Bitte laden Sie die Seite neu.', messageType: 'Error' });
                MessageBox.error(error.message || 'Der Entwurf konnte nicht angelegt werden.');
            }
        },

        _restorePhase: function (phase) {
            const phaseIndex = { PREREQUISITES: 0, COMMUNITY: 1, PERSONAL: 2, CONNECTION: 3, CONTRACTS: 4, PAYMENT: 5, REVIEW: 6 }[phase];
            if (phaseIndex === undefined || phaseIndex === 0) return;
            const wizard = this.byId('onboardingWizard');
            const steps = wizard.getSteps();
            for (let index = 0; index < phaseIndex; index += 1) {
                wizard.validateStep(steps[index]);
                wizard.nextStep();
            }
            wizard.goToStep(steps[phaseIndex]);
            const validated = this.getView().getModel('state').getProperty('/validated').map((value, index) => index < phaseIndex ? true : value);
            this.getView().getModel('state').setProperty('/validated', validated);
            this._updateProgress(phaseIndex);
        },

        _setState: function (values) {
            const state = this.getView().getModel('state');
            Object.entries(values).forEach(([property, value]) => {
                state.setProperty(`/${property}`, value, null, true);
            });
        },

        _mergeDraftData: function (data) {
            const formModel = this.getView().getModel('form');
            const current = formModel.getData();
            const persisted = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null && value !== ''));
            const entered = Object.fromEntries(FORM_FIELDS
                .filter(field => Object.prototype.hasOwnProperty.call(current, field) && JSON.stringify(current[field]) !== JSON.stringify(DRAFT_INITIAL_DATA[field]))
                .map(field => [field, current[field]]));
            formModel.setData(Object.assign({}, DRAFT_INITIAL_DATA, persisted, entered));
        },

        formatCommunityOption: function (name, location, fixedPricePerKwh) {
            const cents = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(fixedPricePerKwh) * 100);
            return `${String(name).replace(/^Demo-/i, '')} · ${location} · ${cents} ct/kWh`;
        },

        _setFieldError: function (field, message) {
            const state = this.getView().getModel('state');
            state.setProperty(`/fieldStates/${field}`, message ? 'Error' : 'None');
            state.setProperty(`/fieldMessages/${field}`, message || '');
        },

        _syncFormFromContext: async function () {
            await this._context.requestRefresh('$direct');
            const data = await this._context.requestObject();
            this.getView().getModel('form').setData(Object.assign({}, DRAFT_INITIAL_DATA, data));
        },

        _save: async function () {
            if (!this._context) return;
            const formModel = this.getView().getModel('form');
            for (const field of ['annualConsumption', 'monthlyCost', 'desiredStart']) {
                if (formModel.getProperty(`/${field}`) === '') formModel.setProperty(`/${field}`, null);
            }
            const form = formModel.getData();
            const updates = FORM_FIELDS
                .filter(field => JSON.stringify(this._context.getProperty(field)) !== JSON.stringify(form[field]))
                .map(field => this._context.setProperty(field, form[field], 'Onboarding'));
            if (!updates.length) return;
            await this._serviceModel.submitBatch('Onboarding');
            await Promise.all(updates);
        },

        _action: async function (name, parameters) {
            const model = this._serviceModel;
            await this._save();
            const action = model.bindContext(`${this._context.getPath()}/ParticipantOnboardingService.${name}(...)`);
            if (parameters) Object.entries(parameters).forEach(([key, value]) => action.setParameter(key, value));
            const result = (await action.invoke('$single'))?.getObject() || action.getBoundContext()?.getObject();
            await this._syncFormFromContext();
            return result;
        },

        _currentStep: function () {
            return this.byId('onboardingWizard').getProgressStep();
        },

        onNext: async function () {
            const wizard = this.byId('onboardingWizard');
            const currentStep = this._currentStep();
            const index = wizard.indexOfStep(currentStep);
            if (index < 0) return;
            const form = this.getView().getModel('form').getData();
            if (!this._validateStep(index, form)) return;
            if (index === 2 && !form.emailVerified) {
                this._setState({ message: 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Der nächste Schritt bleibt gesperrt.', messageType: 'Warning' });
                MessageBox.warning('Die aktuelle E-Mail-Adresse muss vor dem Weitergehen bestätigt werden.');
                return;
            }
            if (index === 0 && form.imsysDeclared !== true) {
                this._setState({ message: 'Ohne bestätigtes iMSys ist die reguläre Anmeldung nicht möglich.', messageType: 'Error' });
                MessageBox.error('Bitte bestätigen Sie ein geeignetes iMSys oder kehren Sie zur Korrektur zurück.');
                return;
            }
            this._setState({ busy: true });
            try {
                const phaseNames = ['PREREQUISITES', 'COMMUNITY', 'PERSONAL', 'CONNECTION', 'CONTRACTS', 'PAYMENT', 'REVIEW'];
                this.getView().getModel('form').setProperty('/currentPhase', phaseNames[Math.min(index + 1, phaseNames.length - 1)]);
                await this._save();
                const validated = this.getView().getModel('state').getProperty('/validated').slice();
                validated[index] = true;
                this._setState({ busy: false, validated });
                const next = wizard.getSteps()[index + 1];
                if (next) {
                    wizard.validateStep(currentStep);
                    wizard.nextStep();
                    this._updateProgress(index + 1);
                }
            } catch (error) {
                this._setState({ busy: false, message: error.message, messageType: 'Error' });
                MessageBox.error(error.message || 'Bitte prüfen Sie Ihre Angaben.');
            }
        },

        _validateStep: function (index, form) {
            const errors = [];
            const requireField = (field, controlId, condition, message) => {
                this._setFieldError(field, condition ? message : '');
                if (condition) errors.push({ controlId, message });
            };
            if (index === 0) {
                requireField('postalCode', 'prerequisitePostalCode', !/^\d{5}$/.test(form.postalCode || ''), 'Bitte geben Sie eine fünfstellige deutsche PLZ ein.');
                if (form.imsysDeclared === null) errors.push({ message: 'Bitte wählen Sie aus, ob ein iMSys installiert ist.' });
                if (typeof form.existingElectricityContract !== 'boolean') errors.push({ message: 'Bitte geben Sie an, ob ein Stromliefervertrag besteht.' });
            }
            if (index === 1) requireField('community_ID', 'communitySelect', !form.community_ID, 'Bitte wählen Sie eine Gemeinschaft aus.');
            if (index === 2) {
                if (form.customerType === 'PRIVATE' && (!form.firstName?.trim() || !form.lastName?.trim())) errors.push({ controlId: 'firstName', message: 'Bitte geben Sie Vor- und Nachname vollständig an.' });
                if (form.customerType === 'BUSINESS' && !form.companyName?.trim()) errors.push({ controlId: 'companyName', message: 'Bitte geben Sie den Unternehmensnamen an.' });
                requireField('email', 'email', !/^\S+@\S+\.\S+$/.test(form.email || ''), 'Bitte geben Sie eine gültige E-Mail-Adresse ein.');
                if (!form.street?.trim() || !form.houseNumber?.trim() || !/^\d{5}$/.test(form.postalCode || '') || !form.city?.trim()) errors.push({ controlId: 'street', message: 'Bitte vervollständigen Sie die Kontaktadresse.' });
                if (form.consumptionAddressDifferent && (!form.consumptionStreet?.trim() || !form.consumptionHouseNumber?.trim() || !/^\d{5}$/.test(form.consumptionPostalCode || '') || !form.consumptionCity?.trim())) errors.push({ controlId: 'consumptionStreet', message: 'Bitte vervollständigen Sie die Verbrauchsadresse.' });
            }
            if (index === 3) {
                if (!(Number(form.annualConsumption) > 0)) errors.push({ controlId: 'annualConsumption', message: 'Bitte geben Sie einen positiven Jahresverbrauch ein.' });
            }
            if (index === 4) {
                if (!form.contractConsent || !form.usageConsent) errors.push({ message: 'Bitte bestätigen Sie beide Sharing-Zustimmungen.' });
                if (form.existingElectricityContract && (!form.currentSupplier?.trim() || !form.contractNumber?.trim() || !form.cancellationOrder || !form.cancellationPowerOfAttorney)) errors.push({ controlId: 'currentSupplier', message: 'Für den bestehenden Vertrag fehlen Kündigungsangaben oder Zustimmungen.' });
            }
            if (index === 5) {
                requireField('iban', 'iban', !this._validIban(form.iban), 'Bitte geben Sie eine formal gültige IBAN ein.');
                if (!form.accountHolder?.trim() || !form.sepaConsent) errors.push({ controlId: 'accountHolder', message: 'Kontoinhaber und SEPA-Zustimmung sind erforderlich.' });
            }
            if (errors.length) {
                const message = errors.map(error => error.message).join(' ');
                this._setState({ message, messageType: 'Error' });
                const firstControl = errors.find(error => error.controlId)?.controlId;
                if (firstControl) this.byId(firstControl)?.focus();
                return false;
            }
            return true;
        },

        _validIban: function (value) {
            const iban = String(value || '').replace(/\s/g, '').toUpperCase();
            if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
            const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
            let remainder = 0;
            for (const character of rearranged) {
                const digits = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character;
                for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
            }
            return remainder === 1;
        },

        _updateProgress: function (index) {
            const safeIndex = Math.max(0, Math.min(index, PHASES.length - 1));
            this._setState({ progressText: `Schritt ${safeIndex + 1} von ${PHASES.length} · ${PHASES[safeIndex]}`, progressPercent: Math.round(((safeIndex + 1) / PHASES.length) * 100) });
        },

        onStepActivate: function (event) { this._updateProgress(event.getParameter('index') - 1); },
        onBack: function () {
            const wizard = this.byId('onboardingWizard');
            wizard.previousStep();
            this._updateProgress(wizard.indexOfStep(wizard.getProgressStep()));
        },
        onDismissMessage: function () { this._setState({ message: '' }); },
        onAddressToggle: function (event) { this.getView().getModel('form').setProperty('/consumptionAddressDifferent', !event.getParameter('selected')); },
        onImsysChange: function (event) {
            const selectedIndex = event.getParameter('selectedIndex');
            this.getView().getModel('state').setProperty('/imsysIndex', selectedIndex);
            this.getView().getModel('form').setProperty('/imsysDeclared', selectedIndex === 0);
        },
        onContractChange: function (event) {
            const selectedIndex = event.getParameter('selectedIndex');
            this.getView().getModel('state').setProperty('/contractIndex', selectedIndex);
            this.getView().getModel('form').setProperty('/existingElectricityContract', selectedIndex === 0);
        },
        onCommunityChange: function (event) {
            this.getView().getModel('form').setProperty('/community_ID', event.getParameter('selectedItem')?.getKey() || null);
            this._setFieldError('community_ID', '');
            this._setState({ message: 'Die Gemeinschaftsauswahl ist noch keine Vertragszustimmung.', messageType: 'Information' });
        },
        onConsumptionChange: function () { this.getView().getModel('state').setProperty('/calculatorResult', '', null, true); },
        onEmailChange: function () { this.getView().getModel('form').setProperty('/emailVerified', false); this._setState({ verificationHint: 'E-Mail geändert – bitte neuen Code senden' }); },
        onIbanChange: function () { this.getView().getModel('form').setProperty('/sepaConsent', false); this._setFieldError('iban', ''); },
        onSignatureDrawn: function () {
            const form = this.getView().getModel('form');
            form.setProperty('/signedAt', null);
            form.setProperty('/signatureMethod', '');
            form.setProperty('/signatureName', '');
        },
        onClearSignature: function () { this.byId('signaturePad').clear(); },

        onSendCode: async function () {
            this._setState({ busy: true });
            try { const response = await this._action('sendVerificationCode'); this._setState({ busy: false, message: response?.value || 'Code versendet.', messageType: 'Information', verificationHint: 'Code 60 Sekunden gültig · erneutes Senden nach 60 Sekunden möglich' }); }
            catch (error) { this._setState({ busy: false, message: error.message, messageType: 'Error' }); MessageBox.error(error.message); }
        },
        onVerifyCode: async function () {
            this._setState({ busy: true });
            try { const response = await this._action('verifyEmail', { code: this.getView().getModel('state').getProperty('/verificationCode') }); this._setState({ busy: false, message: response?.value || 'E-Mail bestätigt.', messageType: 'Success' }); }
            catch (error) { this._setState({ busy: false, message: error.message, messageType: 'Error' }); MessageBox.error(error.message); }
        },
        onLookupMarketLocation: async function () {
            this._setState({ busy: true });
            try { const response = await this._action('lookupMarketLocation'); this._setState({ busy: false, message: response?.value || 'MaLo-Prüfung abgeschlossen.', messageType: 'Information' }); await this._save(); }
            catch (error) { this._setState({ busy: false, message: error.message, messageType: 'Error' }); MessageBox.error(error.message); }
        },
        onOpenCalculator: async function () {
            const annual = Number(this.getView().getModel('form').getProperty('/annualConsumption'));
            if (!(annual > 0)) {
                MessageBox.information('Nach Eingabe Ihres Jahresstromverbrauchs im Schritt „Stromanschluss“ können Sie eine unverbindliche Beispielrechnung anzeigen.');
                return;
            }
            this._setState({ busy: true });
            try {
                const response = await this._action('calculateSavings');
                this._setState({ busy: false, calculatorResult: response?.value || 'Beispielrechnung abgeschlossen.' });
            } catch (error) {
                this._setState({ busy: false, message: error.message, messageType: 'Error' });
                MessageBox.error(error.message || 'Die Beispielrechnung konnte nicht erstellt werden.');
            }
        },
        onInfoImsys: function () { MessageBox.information('Ein iMSys verbindet moderne Messtechnik mit einer Kommunikationseinheit. Die technische Eignung wird später extern geprüft.'); },
        onSign: async function () {
            const form = this.getView().getModel('form');
            if (!this.byId('signaturePad').hasSignature()) {
                this._setState({ message: 'Bitte zeichnen Sie zuerst Ihre Unterschrift in das Feld.', messageType: 'Error' });
                return;
            }
            form.setProperty('/signatureName', 'Gezeichnete Unterschrift');
            form.setProperty('/signatureMethod', 'DRAWN');
            form.setProperty('/signedAt', new Date().toISOString());
            try {
                await this._save();
                this._setState({ message: 'Unterschrift gespeichert. Vor dem Einreichen können Sie sie ändern.', messageType: 'Success' });
            } catch (error) {
                this._setState({ message: error.message, messageType: 'Error' });
                MessageBox.error(error.message || 'Die Unterschrift konnte nicht gespeichert werden.');
            }
        },
        onSubmit: async function () {
            this._setState({ busy: true });
            try {
                const result = await this._action('submitApplication');
                this._setState({
                    busy: false,
                    message: '',
                    submitted: true,
                    submissionReference: result?.referenceNumber || this.getView().getModel('form').getProperty('/referenceNumber') || '',
                    validated: [true, true, true, true, true, true, true]
                });
                this.byId('Main').scrollTo(0, 0);
                MessageToast.show('Antrag abgegeben');
            } catch (error) {
                this._setState({ busy: false, message: error.message, messageType: 'Error' });
                MessageBox.error(error.message || 'Der Antrag ist noch nicht vollständig.');
            }
        }
    });
});
