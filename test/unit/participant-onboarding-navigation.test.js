import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

let controller;
let baseOnInitCalls = 0;
const source = readFileSync(new URL('../../app/participant-onboarding/webapp/ext/view/Main.controller.js', import.meta.url), 'utf8');
vm.runInNewContext(source, {
  sap: { ui: { define: (_dependencies, factory) => {
    function PageController() {}
    PageController.prototype.onInit = () => { baseOnInitCalls += 1; };
    PageController.extend = (_name, methods) => methods;
    controller = factory(PageController, class {}, class {}, {}, {}, {});
  } } }
});

function model(data) {
  return {
    data,
    getData() { return this.data; },
    setData(value) { this.data = value; },
    getProperty(path) { return path.split('/').slice(1).reduce((value, part) => value?.[part], this.data); },
    setProperty(path, value) {
      const parts = path.split('/').slice(1);
      const key = parts.pop();
      const parent = parts.reduce((value, part) => value[part] ??= {}, this.data);
      parent[key] = value;
    }
  };
}

function fixture() {
  const steps = Array.from({ length: 7 }, (_, index) => ({ id: index }));
  const wizard = {
    position: 0,
    validated: [],
    getSteps: () => steps,
    getProgressStep() { return steps[this.position]; },
    indexOfStep: step => steps.indexOf(step),
    validateStep(step) { this.validated.push(step); },
    nextStep() { this.position += 1; },
    previousStep() { this.position -= 1; },
    goToStep(step) { this.position = steps.indexOf(step); }
  };
  const form = model({ postalCode: '44139', imsysDeclared: true, existingElectricityContract: false, currentPhase: 'PREREQUISITES' });
  const state = model({ validated: Array(7).fill(false), fieldStates: {}, fieldMessages: {}, progressText: '', progressPercent: 0 });
  const persisted = {};
  let batches = 0;
  const context = {
    getProperty: field => persisted[field],
    setProperty: (field, value, group) => {
      assert.equal(group, 'Onboarding');
      persisted[field] = value;
      return Promise.resolve();
    }
  };
  const instance = Object.assign(Object.create(controller), {
    byId: id => id === 'onboardingWizard' ? wizard : undefined,
    getView: () => ({ getModel: name => name === 'form' ? form : state }),
    _context: context,
    _serviceModel: { submitBatch: async group => { assert.equal(group, 'Onboarding'); batches += 1; } }
  });
  return { instance, wizard, form, state, persisted, get batches() { return batches; } };
}

test('onInit bezieht das Manifest-Modell von der AppComponent der FPM-Seite', () => {
  const form = model({});
  const viewModels = new Map();
  const view = {
    setModel(value, name) { viewModels.set(name, value); },
    getModel(name) { return viewModels.get(name); },
    getBindingContext: () => undefined,
    attachModelContextChange() {}
  };
  const fpmOwnerComponent = {
    getModel: () => undefined,
    attachModelContextChange() {}
  };
  const appComponent = {
    getModel: name => name === 'form' ? form : undefined
  };
  const instance = Object.assign(Object.create(controller), {
    getView: () => view,
    getOwnerComponent: () => fpmOwnerComponent,
    getAppComponent: () => appComponent
  });

  assert.doesNotThrow(() => instance.onInit());
  assert.equal(baseOnInitCalls, 1);
  assert.equal(view.getModel('form'), form);
  assert.equal(form.getProperty('/postalCode'), '60311');
  assert.equal(form.getProperty('/signatureName'), 'Max Mustermann');
  assert.equal(form.getProperty('/signatureMethod'), 'DRAWN');
  assert.ok(form.getProperty('/signedAt'));
});

test('Weiter speichert Eingaben und öffnet den nächsten Schritt; Zurück behält sie', async () => {
  const flow = fixture();
  await flow.instance.onNext();
  assert.equal(flow.wizard.position, 1);
  assert.equal(flow.persisted.postalCode, '44139');
  assert.equal(flow.persisted.currentPhase, 'COMMUNITY');
  assert.equal(flow.state.getProperty('/validated/0'), true);
  assert.equal(flow.batches, 1);
  flow.instance.onBack();
  assert.equal(flow.wizard.position, 0);
  assert.equal(flow.form.getProperty('/postalCode'), '44139');
});

test('Ein gespeicherter Schritt wird beim Wiederaufnehmen aktiviert', () => {
  const flow = fixture();
  flow.instance._restorePhase('CONNECTION');
  assert.equal(flow.wizard.position, 3);
  assert.equal(flow.wizard.validated.length, 3);
  assert.deepEqual(Array.from(flow.state.getProperty('/validated')), [true, true, true, false, false, false, false]);
  assert.match(flow.state.getProperty('/progressText'), /Schritt 4 von 7/);
});

test('Persönliche Eingaben bleiben beim Wechsel zur Anschlussseite erhalten', async () => {
  const flow = fixture();
  flow.wizard.position = 2;
  for (const [field, value] of Object.entries({
    firstName: 'Mara', lastName: 'Becker', email: 'mara@example.de', emailVerified: true,
    street: 'Lindenweg', houseNumber: '12', city: 'Dortmund', consumptionAddressDifferent: false
  })) flow.form.setProperty(`/${field}`, value);
  await flow.instance.onNext();
  assert.equal(flow.wizard.position, 3);
  assert.equal(flow.persisted.firstName, 'Mara');
  assert.equal(flow.persisted.street, 'Lindenweg');
  flow.instance.onBack();
  assert.equal(flow.form.getProperty('/firstName'), 'Mara');
  assert.equal(flow.form.getProperty('/email'), 'mara@example.de');
});

test('Entwurfsladen überschreibt eine bereits eingegebene PLZ nicht', () => {
  const flow = fixture();
  flow.form.setProperty('/postalCode', '44139');
  flow.instance._mergeDraftData({ postalCode: '10115', city: 'Berlin', currentPhase: 'COMMUNITY' });
  assert.equal(flow.form.getProperty('/postalCode'), '44139');
  assert.equal(flow.form.getProperty('/city'), 'Berlin');
  assert.equal(flow.form.getProperty('/currentPhase'), 'COMMUNITY');
});

test('PLZ-Felder verwenden das zentral konfigurierte Formularmodell', () => {
  const view = readFileSync(new URL('../../app/participant-onboarding/webapp/ext/view/Main.view.xml', import.meta.url), 'utf8');
  const manifest = JSON.parse(readFileSync(new URL('../../app/participant-onboarding/webapp/manifest.json', import.meta.url), 'utf8'));
  const postalCodeInputs = view.match(/<Input[^\r\n]+id="(?:prerequisitePostalCode|contactPostalCode|consumptionPostalCode)"[^\r\n]*\/>/g) || [];

  assert.equal(manifest['sap.ui5'].models.form.type, 'sap.ui.model.json.JSONModel');
  assert.equal(manifest['sap.ui5'].models.form.settings.defaultBindingMode, 'TwoWay');
  assert.equal(postalCodeInputs.length, 3);
  for (const input of postalCodeInputs) {
    assert.match(input, /value="\{form>\/(?:postalCode|consumptionPostalCode)\}"/);
    assert.doesNotMatch(input, /valueLiveUpdate|mode:|onPostalCodeInput/);
  }
});

test('Formulareingaben aktualisieren das zentrale Modell erst bei Enter oder Fokuswechsel', () => {
  const view = readFileSync(new URL('../../app/participant-onboarding/webapp/ext/view/Main.view.xml', import.meta.url), 'utf8');
  const formInputs = view.match(/<Input[^\r\n]*value="\{form>\/[^}]+\}"[^\r\n]*\/>/g) || [];

  assert.ok(formInputs.length >= 20);
  for (const input of formInputs) assert.doesNotMatch(input, /valueLiveUpdate="true"/);
  assert.match(view, /value="\{state>\/verificationCode\}"[^>]+valueLiveUpdate="true"|valueLiveUpdate="true"[^>]+value="\{state>\/verificationCode\}"/);
});

test('Zustandsänderungen ersetzen nicht das komplette UI-Modell', () => {
  const state = model({ busy: false, message: '', progressText: 'unverändert' });
  state.setData = () => { throw new Error('Das vollständige state-Modell darf nicht ersetzt werden'); };
  const instance = Object.assign(Object.create(controller), {
    getView: () => ({ getModel: () => state })
  });

  assert.doesNotThrow(() => instance._setState({ busy: true, message: 'Lädt' }));
  assert.equal(state.getProperty('/busy'), true);
  assert.equal(state.getProperty('/message'), 'Lädt');
  assert.equal(state.getProperty('/progressText'), 'unverändert');
});

test('Schrittinhalte starten bei Modellupdates keine CSS-Animation neu', () => {
  const css = readFileSync(new URL('../../app/participant-onboarding/webapp/css/style.css', import.meta.url), 'utf8');
  const stepRule = css.match(/\.stepContent\s*\{[^}]+\}/)?.[0] || '';

  assert.doesNotMatch(stepRule, /animation|transform/);
  assert.doesNotMatch(css, /@keyframes\s+neoStepIn/);
});

test('Onboarding zeigt weder Voraussetzungskarten noch separates Fortschrittspanel', () => {
  const view = readFileSync(new URL('../../app/participant-onboarding/webapp/ext/view/Main.view.xml', import.meta.url), 'utf8');

  assert.doesNotMatch(view, /requirementGrid|requirementItem/);
  assert.doesNotMatch(view, /progressPanel|flowProgress|progressLabel|progressValue/);
});

test('Hauptüberschrift wird vollständig und umbrechbar angezeigt', () => {
  const view = readFileSync(new URL('../../app/participant-onboarding/webapp/ext/view/Main.view.xml', import.meta.url), 'utf8');

  assert.match(view, /<Title text="Ihr Weg in die Energiegemeinschaft" level="H1" wrapping="true"\/>/);
  assert.doesNotMatch(view, /Ihr Weg in die Energi(?:e)?…|Ihr Weg in die Energi\.\.\./);
});

test('Letzter Schritt enthält eine vorausgefüllte Unterschrift und keinen Demo-Hinweis', () => {
  const view = readFileSync(new URL('../../app/participant-onboarding/webapp/ext/view/Main.view.xml', import.meta.url), 'utf8');

  assert.match(view, /<custom:SignaturePad[^>]+presetName="\{form>\/signatureName\}"/);
  assert.doesNotMatch(view, /\bdemo\b/i);
});

test('Nach der Einreichung ersetzt ein Bestätigungsbildschirm das Formular', () => {
  const view = readFileSync(new URL('../../app/participant-onboarding/webapp/ext/view/Main.view.xml', import.meta.url), 'utf8');

  assert.match(view, /<Wizard id="onboardingWizard" visible="\{= !\$\{state>\/submitted\} &amp;&amp; \$\{form>\/status\} !== 'IN_REVIEW'\}"/);
  assert.match(view, /visible="\{= \$\{state>\/submitted\} \|\| \$\{form>\/status\} === 'IN_REVIEW'\}" class="submissionSuccess"/);
  assert.match(view, /text="Antrag abgegeben"/);
  assert.match(view, /text="Status: In Prüfung"/);
});
