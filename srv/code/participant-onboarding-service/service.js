import cds from '@sap/cds';

const { SELECT, UPDATE } = cds.ql;

export default class ParticipantOnboardingService extends cds.ApplicationService {
  async init() {
    const { ParticipationApplications } = this.entities;
    this.on('sendVerificationCode', ParticipationApplications, async req => {
      if (!req.data.email) return req.reject(400, 'Eine E-Mail-Adresse ist erforderlich.');
      return 'Demo-Code wurde versendet.';
    });
    this.on('verifyEmail', ParticipationApplications, async req => {
      if (!/^\d{6}$/.test(req.data.code ?? '')) return req.reject(400, 'Der Bestätigungscode muss aus sechs Ziffern bestehen.');
      await UPDATE(ParticipationApplications).set({ emailVerified: true }).where({ ID: req.params[0].ID });
      return 'E-Mail-Adresse wurde in der Demo bestätigt.';
    });
    this.on('submitApplication', ParticipationApplications, async req => {
      const application = await SELECT.one.from(ParticipationApplications).where({ ID: req.params[0].ID });
      if (!application) return req.reject(404, 'Antrag wurde nicht gefunden.');
      if (!application.emailVerified) return req.reject(409, 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.');
      await UPDATE(ParticipationApplications).set({ status: 'SUBMITTED', submittedAt: new Date(), message: 'Antrag wurde zur Prüfung eingereicht.' }).where({ ID: application.ID });
      return SELECT.one.from(ParticipationApplications).where({ ID: application.ID });
    });
    return super.init();
  }
}
