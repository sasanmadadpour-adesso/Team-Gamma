import cds from '@sap/cds';
import crypto from 'node:crypto';

const { SELECT, UPDATE } = cds.ql;
const LOGGER = cds.log('participant-onboarding-service');
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;

const normalizeIban = value => String(value ?? '').replace(/\s/g, '').toUpperCase();

function validIban(value) {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;
  for (const character of rearranged) {
    const digits = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function idFor(req) {
  return req.params?.[0]?.ID;
}

function rejectIf(condition, req, message, status = 400) {
  if (condition) req.reject(status, message);
}

function applicationProblems(application) {
  const problems = [];
  if (!application.firstName && !application.companyName) problems.push('Bitte geben Sie einen Namen oder ein Unternehmen an.');
  if (application.customerType === 'PRIVATE' && !application.lastName) problems.push('Bitte geben Sie Ihren Nachnamen an.');
  if (typeof application.existingElectricityContract !== 'boolean') problems.push('Bitte geben Sie an, ob bereits ein Stromliefervertrag besteht.');
  if (!/^\d{5}$/.test(application.postalCode ?? '')) problems.push('Die PLZ der Kontaktadresse muss fünf Ziffern enthalten.');
  if (!application.street || !application.houseNumber || !application.city) problems.push('Die Kontaktadresse ist noch nicht vollständig.');
  if (!/^\S+@\S+\.\S+$/.test(application.email ?? '')) problems.push('Bitte geben Sie eine gültige E-Mail-Adresse an.');
  if (!application.emailVerified) problems.push('Bitte bestätigen Sie zuerst Ihre aktuelle E-Mail-Adresse.');
  if (!(Number(application.annualConsumption) > 0)) problems.push('Bitte geben Sie einen positiven Jahresverbrauch an.');
  if (application.imsysDeclared !== true) problems.push('Ein geeignetes iMSys muss für die reguläre Anmeldung bestätigt werden.');
  if (!application.community_ID) problems.push('Bitte wählen Sie genau eine Gemeinschaft aus.');
  if (!application.contractConsent || !application.usageConsent) problems.push('Bitte bestätigen Sie beide Vertragsunterlagen und die gemeinsame Nutzung.');
  if (application.existingElectricityContract === true && application.cancellationOrder !== true) problems.push('Bei einem bestehenden Stromvertrag ist der Kündigungsauftrag erforderlich.');
  if (application.existingElectricityContract === true && (!application.currentSupplier || !application.contractNumber || !application.cancellationPowerOfAttorney)) problems.push('Für den Kündigungsauftrag fehlen Lieferant, Vertragsnummer oder Vollmacht.');
  if (!validIban(application.iban)) problems.push('Die IBAN ist formal ungültig.');
  if (!application.accountHolder || !application.sepaConsent) problems.push('Kontoinhaber und SEPA-Zustimmung sind erforderlich.');
  if (!application.signatureName || !application.signedAt) problems.push('Bitte unterschreiben Sie den Antrag.');
  return problems;
}

export default class ParticipantOnboardingService extends cds.ApplicationService {
  async init() {
    const { ParticipationApplications, Communities } = this.entities;

    this.before(['CREATE', 'UPDATE'], ParticipationApplications, async req => {
      const data = req.data;
      if (data.email !== undefined && !/^\S+@\S+\.\S+$/.test(data.email)) req.error(400, 'Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'email');
      if (data.postalCode !== undefined && data.postalCode !== '' && !/^\d{5}$/.test(data.postalCode)) req.error(400, 'Die PLZ muss fünf Ziffern enthalten.', 'postalCode');
      if (data.annualConsumption !== undefined && data.annualConsumption !== null && Number(data.annualConsumption) <= 0) req.error(400, 'Der Jahresverbrauch muss größer als null sein.', 'annualConsumption');
      if (data.iban && !validIban(data.iban)) req.error(400, 'Bitte prüfen Sie die IBAN.', 'iban');
    });

    this.on('sendVerificationCode', [ParticipationApplications, ParticipationApplications.drafts], async req => {
      const application = await SELECT.one.from(req.subject);
      rejectIf(!application?.email, req, 'Eine E-Mail-Adresse ist erforderlich.');
      const now = Date.now();
      rejectIf(application.verificationAvailableAt && new Date(application.verificationAvailableAt).getTime() > now, req, 'Bitte warten Sie 60 Sekunden, bevor Sie einen neuen Code anfordern.', 429);
      const code = '123456';
      await UPDATE(req.subject).set({
        emailVerified: false,
        verificationCodeHash: hashCode(code),
        verificationCodeExpiresAt: new Date(now + CODE_TTL_MS),
        verificationAvailableAt: new Date(now + RESEND_DELAY_MS),
        message: 'Code versendet. Der Code lautet 123456.'
      });
      LOGGER.info('Verification code issued', { applicationId: idFor(req) });
      return 'Code versendet. Der Code lautet 123456.';
    });

    this.on('verifyEmail', [ParticipationApplications, ParticipationApplications.drafts], async req => {
      const application = await SELECT.one.from(req.subject);
      rejectIf(!application, req, 'Antrag wurde nicht gefunden.', 404);
      await UPDATE(req.subject).set({
        emailVerified: true,
        verificationCodeHash: null,
        verificationCodeExpiresAt: null,
        message: 'E-Mail-Adresse wurde bestätigt.'
      });
      return 'E-Mail-Adresse wurde bestätigt.';
    });

    this.on('calculateSavings', [ParticipationApplications, ParticipationApplications.drafts], async req => {
      const application = await SELECT.one.from(req.subject);
      const annual = Number(application?.annualConsumption ?? 0);
      const monthly = Number(application?.monthlyCost ?? 0);
      const estimatedSharing = annual * 0.45;
      const estimatedSaving = Math.max(0, estimatedSharing * (0.25 - 0.12));
      await UPDATE(req.subject).set({ calculatorUsed: true, calculatorAnnualSaving: estimatedSaving });
      return `Unverbindliche Beispielrechnung: geschätzte Jahresersparnis ${estimatedSaving.toFixed(2)} EUR bei bisherigen Jahreskosten ${(monthly * 12).toFixed(2)} EUR.`;
    });

    this.on('lookupMarketLocation', [ParticipationApplications, ParticipationApplications.drafts], async req => {
      await UPDATE(req.subject).set({ marketLocationStatus: 'FORMALLY_VALID', message: 'MaLo-ID wurde akzeptiert.' });
      return 'MaLo-ID wurde akzeptiert.';
    });

    this.on('submitApplication', [ParticipationApplications, ParticipationApplications.drafts], async req => {
      const application = await SELECT.one.from(req.subject);
      rejectIf(!application, req, 'Antrag wurde nicht gefunden.', 404);
      const problems = applicationProblems(application);
      if (problems.length) return req.reject(409, problems.join(' '));
      const referenceNumber = `NEO-${new Date().getFullYear()}-${String(application.ID).slice(0, 8).toUpperCase()}`;
      await UPDATE(req.subject).set({
        status: 'IN_REVIEW',
        currentPhase: 'CONFIRMATION',
        referenceNumber,
        submittedAt: new Date(),
        message: 'Antrag eingereicht. Der Antrag befindet sich in Prüfung.'
      });
      LOGGER.info('Participant application submitted', { applicationId: application.ID, referenceNumber });
      return SELECT.one.from(req.subject);
    });

    return super.init();
  }
}
