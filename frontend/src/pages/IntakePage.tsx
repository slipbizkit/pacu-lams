import { createPortal } from 'react-dom';
import { Fragment, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService, lookupService } from '../services/api';
import type { CityMunicipality, ClientSex, IntakeBody, IntakeResult, PendingComplaintType } from '../types/client';
import { PENDING_COMPLAINT_TYPES } from '../types/client';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { SearchableSelect } from '../components/SearchableSelect';
import { MultiSelectChips } from '../components/MultiSelectChips';
import { IntakeLangProvider, LanguageSwitch, useIntakeLang, STRINGS } from './intakeI18n';
import type { IntakeLang, IntakeStrings } from './intakeI18n';

const EMPTY_FORM: IntakeBody = {
  first_name: '',
  middle_name: '',
  last_name: '',
  suffix: '',
  sex: undefined,
  contact_no: '',
  telephone_no: '',
  email: '',
  city_id: undefined,
  occupation: '',
  date_of_employment: '',
  union_member: undefined,
  employer: '',
  company_city_id: undefined,
  pending_complaint_types: [],
  pending_complaint_other: '',
  is_pwd: false,
  is_senior: false,
  is_pregnant: false,
  is_anonymous: false,
};

const TOTAL_STEPS = 4;

type FieldErrors = Partial<Record<keyof IntakeBody, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeTelephone(value: string): string {
  return value.replace(/[^0-9-]/g, '').replace(/-{2,}/g, '-');
}

function formatContactNo(digits: string): string {
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return digits.slice(0, 4) + '-' + digits.slice(4);
  return digits.slice(0, 4) + '-' + digits.slice(4, 7) + '-' + digits.slice(7);
}

function validateStep(step: number, form: IntakeBody, t: IntakeStrings): FieldErrors {
  const errors: FieldErrors = {};
  const isAnon = form.is_anonymous;

  if (step === 0) {
    const rawContact = form.contact_no?.replace(/-/g, '') ?? '';
    if (!isAnon) {
      if (!form.first_name?.trim()) errors.first_name = t.reqFirstName;
      if (!form.last_name?.trim()) errors.last_name = t.reqLastName;
      if (!form.sex) errors.sex = t.reqSex;
      if (!form.city_id) errors.city_id = t.reqCity;
    }
    if (rawContact.length > 0 && rawContact.length < 11) {
      errors.contact_no = t.invalidMobile;
    }
    if (form.email?.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = t.invalidEmail;
    }
  }

  if (step === 1 && !isAnon) {
    if (!form.occupation?.trim()) errors.occupation = t.reqWorkPosition;
    if (!form.date_of_employment) errors.date_of_employment = t.reqDateEmployment;
    if (form.union_member === undefined) errors.union_member = t.reqUnion;
  }

  if (step === 2) {
    if (!form.employer?.trim()) errors.employer = t.reqCompany;
    if (!form.company_city_id) errors.company_city_id = t.reqCompanyAddress;
    if (form.pending_complaint_types?.includes('Others') && !form.pending_complaint_other?.trim()) {
      errors.pending_complaint_other = t.reqPendingComplaintOther;
    }
  }

  return errors;
}

function formatClock(d: Date): string {
  const day = d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} • ${time}`;
}

export default function IntakePage() {
  const [lang, setLang] = useState<IntakeLang>('en');
  const t = STRINGS[lang];
  const [clock, setClock] = useState(() => formatClock(new Date()));

  const [consentGiven, setConsentGiven] = useState(false);
  const [anonymousChosen, setAnonymousChosen] = useState(false);
  const [form, setForm] = useState<IntakeBody>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [cities, setCities] = useState<CityMunicipality[]>([]);

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    lookupService.citiesMunicipalities()
      .then(setCities)
      .catch((err) => {
        Swal.fire({
          icon: 'error',
          title: t.citiesErrTitle,
          text: err instanceof Error ? err.message : t.tryAgain,
        });
      });
    // Cities are static reference data; load once on mount. `t` is intentionally
    // omitted so switching language does not re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!result) return;
    setCountdown(10);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [result]);

  function update<K extends keyof IntakeBody>(key: K, value: IntakeBody[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function goNext() {
    const stepErrors = validateStep(step, form, t);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setShake(true);
      setTimeout(() => setShake(false), 420);
      return;
    }
    setErrors({});

    if (step === 0) {
      const rawContact = form.contact_no?.replace(/-/g, '') ?? '';
      const missingContact = rawContact.length < 11;
      const missingEmail = !form.email?.trim();
      if (missingContact || missingEmail) {
        const warn = await Swal.fire({
          icon: 'info',
          title: t.contactBlankTitle,
          text: t.contactBlankText,
          showCancelButton: true,
          confirmButtonText: t.proceed,
          cancelButtonText: t.goBackFill,
          confirmButtonColor: 'var(--pacu-accent)',
        });
        if (!warn.isConfirmed) return;
      }
    }

    setDirection('forward');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function goBack() {
    setErrors({});
    setDirection('back');
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const confirm = await Swal.fire({
      icon: 'warning',
      title: t.confirmTitle,
      text: t.confirmText,
      showCancelButton: true,
      confirmButtonText: t.confirmYes,
      cancelButtonText: t.cancel,
      confirmButtonColor: 'var(--pacu-accent)',
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const rawContact = form.contact_no?.replace(/-/g, '') ?? '';
      const body: IntakeBody = {
        ...form,
        contact_no: rawContact.length > 2 ? rawContact : undefined,
      };
      const data = await clientService.intake(body);
      setResult(data);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: t.submitErrTitle,
        text: err instanceof Error ? err.message : t.tryAgain,
      });
      setDirection('back');
      setStep(0);
    } finally {
      setSubmitting(false);
    }
  }

  async function startNewEntry() {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: t.nextClientTitle,
      html: t.nextClientHtml,
      confirmButtonText: t.nextClientYes,
      cancelButtonText: t.goBack,
      showCancelButton: true,
    });
    if (!isConfirmed) return;
    setConsentGiven(false);
    setAnonymousChosen(false);
    setForm(EMPTY_FORM);
    setErrors({});
    setStep(0);
    setResult(null);
  }

  return (
    <IntakeLangProvider lang={lang} setLang={setLang}>
      <div style={{ minHeight: '100vh' }}>
        {!consentGiven && <PrivacyNoticeModal onAgree={() => setConsentGiven(true)} />}
        {consentGiven && !anonymousChosen && (
          <AnonModal
            onChoose={(isAnon) => {
              update('is_anonymous', isAnon);
              setAnonymousChosen(true);
            }}
          />
        )}

        <header className="pacu-intake-navbar">
          <div className="pacu-intake-navbar-left">
            <div className="pacu-intake-wordmark">
              <div className="pacu-intake-wordmark-name">
                <span>Public Assistance</span>
                <span>and Complaints Unit</span>
              </div>
            </div>
          </div>

          <div className="pacu-intake-navbar-center">
            <div className="pacu-dole-banner">
              <img src="/dole-logo.png" alt="DOLE" className="pacu-dole-banner-logo" />
              <div className="pacu-dole-banner-text">
                <div className="pacu-dole-banner-republic">
                  <span>Republic of the Philippines</span>
                  <span className="pacu-dole-banner-rule" />
                </div>
                <div className="pacu-dole-banner-dept">Department of Labor and Employment</div>
              </div>
              <img src="/Bagong Pilipinas Logo.png" alt="Bagong Pilipinas" className="pacu-dole-banner-logo" />
            </div>
          </div>

          <div className="pacu-intake-navbar-right">
            <span className="pacu-intake-wordmark-clock">{clock}</span>
            <div className="pacu-intake-controls">
              <div className="pacu-control-group">
                <span className="pacu-control-label">
                  <i className="bi bi-translate" />
                  Language
                </span>
                <LanguageSwitch />
              </div>
              <div className="pacu-control-group">
                <span className="pacu-control-label">
                  <i className="bi bi-palette" />
                  Theme
                </span>
                <ThemeSwitcher />
              </div>
            </div>
          </div>
        </header>

        <div className="d-flex justify-content-center px-3 pb-5 pacu-intake-content">
          <div className="pacu-intake-shell">
            {result ? (
              <div className="card pacu-auth-success">
                <div className="card-body p-5 text-center">
                  <p className="pacu-eyebrow mb-2">{t.queueEyebrow}</p>
                  <div className="pacu-display pacu-mono" style={{ fontSize: '4.5rem', lineHeight: 1, color: 'var(--pacu-accent)' }}>
                    {result.queue_number}
                  </div>
                  <p className="text-muted mb-4">{t.queueSeat}</p>
                  <p className="mb-4">
                    {t.refNumber} <code className="pacu-mono">{result.reference_no}</code>
                  </p>
                  <button className="btn btn-primary" onClick={startNewEntry} disabled={countdown > 0}>
                    <i className="bi bi-plus-lg me-2" />
                    {countdown > 0 ? `${t.startNew} (${countdown})` : t.startNew}
                  </button>
                </div>
              </div>
            ) : (
              <div className="card pacu-intake-card">
                <div className="card-body p-4 p-md-5">
                  <form onSubmit={handleSubmit}>
                    <h1 className="pacu-display mb-1">{t.welcome}</h1>
                    <p className="text-muted mb-4">{t.welcomeSub}</p>

                    <div className="pacu-stepper mb-4">
                      {t.steps.map((title, idx) => (
                        <Fragment key={idx}>
                          <div
                            className={`pacu-step${idx === step ? ' is-active' : ''}${idx < step ? ' is-done' : ''}`}
                          >
                            <div className="pacu-step-circle">
                              {idx < step ? <i className="bi bi-check-lg" /> : idx + 1}
                            </div>
                            <div className="pacu-step-label">{title}</div>
                          </div>
                          {idx < TOTAL_STEPS - 1 && (
                            <div className={`pacu-step-connector${idx < step ? ' is-done' : ''}`} />
                          )}
                        </Fragment>
                      ))}
                    </div>

                    <div
                      key={step}
                      data-dir={direction}
                      className={`pacu-wizard-step${shake ? ' pacu-wizard-shake' : ''}`}
                    >
                      {step === 0 && (
                        <ClientInfoStep form={form} update={update} errors={errors} cities={cities} />
                      )}

                      {step === 1 && (
                        <EmploymentStatusStep form={form} update={update} errors={errors} />
                      )}
                      {step === 2 && (
                        <CompanyDetailsStep form={form} update={update} errors={errors} cities={cities} />
                      )}
                      {step === 3 && <ReviewStep form={form} cities={cities} />}
                    </div>

                    <div className="pacu-wizard-nav">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={goBack}
                        disabled={step === 0}
                        style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
                      >
                        <i className="bi bi-arrow-left me-2" />
                        {t.prev}
                      </button>

                      {step < TOTAL_STEPS - 1 ? (
                        <button key="next" type="button" className="btn btn-primary" onClick={goNext}>
                          {t.next}
                          <i className="bi bi-arrow-right ms-2" />
                        </button>
                      ) : (
                        <button key="submit" className="btn btn-primary" type="submit" disabled={submitting}>
                          {submitting ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                          {t.submit}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </IntakeLangProvider>
  );
}

// ---------------------------------------------------------------------------
// Privacy Notice Modal
// ---------------------------------------------------------------------------

function PrivacyNoticeModal({ onAgree }: { onAgree: () => void }) {
  const [englishOpen, setEnglishOpen] = useState(true);
  const [filipinoOpen, setFilipinoOpen] = useState(true);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function block(e: KeyboardEvent) {
      if (e.key === 'Escape') e.preventDefault();
    }
    document.addEventListener('keydown', block, true);
    return () => document.removeEventListener('keydown', block, true);
  }, []);

  function handleScroll() {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) {
      setScrolledToBottom(true);
    }
  }

  return createPortal(
    <>
      <div className="pacu-privacy-backdrop" />
      <div className="pacu-privacy-wrap">
        <div className="pacu-privacy-modal">

          {/* Government banner */}
          <div className="pacu-privacy-banner">
            <span className="pacu-privacy-banner-logo">
              <img src="/dole-logo.png" alt="DOLE" />
            </span>
            <div className="pacu-privacy-banner-text">
              <span className="pacu-privacy-banner-republic">Republic of the Philippines</span>
              <span className="pacu-privacy-banner-rule" />
              <span className="pacu-privacy-banner-dept">Department of Labor and Employment</span>
            </div>
          </div>

          {/* Title bar */}
          <div className="pacu-privacy-titlebar">
            <span className="pacu-privacy-shield">
              <i className="bi bi-shield-lock-fill" />
            </span>
            <div>
              <h5 className="pacu-privacy-title mb-0">Privacy Notice</h5>
              <p className="pacu-privacy-subtitle mb-0">Data Privacy Act of 2012 — Republic Act No. 10173</p>
            </div>
          </div>

          <div className="pacu-privacy-body" ref={bodyRef} onScroll={handleScroll}>

            <button
              type="button"
              className="pacu-privacy-toggle"
              onClick={() => setEnglishOpen((o) => !o)}
              aria-expanded={englishOpen}
            >
              <span className="fw-semibold">English</span>
              <i className={`bi bi-chevron-${englishOpen ? 'up' : 'down'}`} />
            </button>

            {englishOpen && (
              <div className="pacu-privacy-content">
                <p>By submitting this form, you acknowledge that the Department of Labor and Employment (DOLE) collects and processes your personal information, such as your name, age, and email address, for the purpose of responding to your legal query, in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173), its Implementing Rules and Regulations, and relevant issuances of the National Privacy Commission.</p>
                <p>DOLE assures data subjects that all personal data collected through this platform shall be processed with due diligence and prudence and shall be used solely for the declared purpose.</p>
                <p>Access to your personal information is limited to duly authorized DOLE personnel. Your personal data shall be stored in a secure database.</p>
                <p>As a data subject, you have the right to be informed, to access, and to request the correction of your personal data processed by DOLE, subject to the limitations provided by law. You may exercise these rights by contacting DOLE during office hours, from Monday to Friday, 8:00 a.m. to 5:00 p.m., except holidays, through the following contact details:</p>
                <ContactBlock />
              </div>
            )}

            <hr className="pacu-privacy-divider" />

            <button
              type="button"
              className="pacu-privacy-toggle"
              onClick={() => setFilipinoOpen((o) => !o)}
              aria-expanded={filipinoOpen}
            >
              <span className="fw-semibold">Filipino</span>
              <i className={`bi bi-chevron-${filipinoOpen ? 'up' : 'down'}`} />
            </button>

            {filipinoOpen && (
              <div className="pacu-privacy-content">
                <p>Sa pamamagitan ng pagsumite ng pormang ito, kinikilala mo na ang Department of Labor and Employment (DOLE) ay nangongolekta at nagpoproseso ng iyong personal na impormasyon, gaya ng iyong pangalan, edad, at email address, para sa layuning tumugon sa iyong legal na katanungan, alinsunod sa Data Privacy Act of 2012 (Republic Act No. 10173), sa mga Implementing Rules and Regulations nito, at sa mga kaugnay na kautusan ng National Privacy Commission.</p>
                <p>Tinitiyak ng DOLE sa mga data subject na ang lahat ng personal na datos na makokolekta sa pamamagitan ng platapormang ito ay ipoproseso nang may nararapat na pag-iingat at pagkamahinahon at gagamitin lamang para sa ipinahayag na layunin.</p>
                <p>Ang pag-access sa iyong personal na impormasyon ay limitado lamang sa mga duly authorized personnel ng DOLE. Ang iyong personal na datos ay itatago sa isang ligtas na database.</p>
                <p>Bilang isang data subject, ikaw ay may karapatang mabigyan ng impormasyon, magkaroon ng access, at humiling ng pagwawasto ng iyong personal na datos na pinoproseso ng DOLE, alinsunod sa mga limitasyong itinakda ng batas. Maaari mong gamitin ang mga karapatang ito sa pamamagitan ng pakikipag-ugnayan sa DOLE sa oras ng opisina, mula Lunes hanggang Biyernes, ika-8:00 ng umaga hanggang ika-5:00 ng hapon, maliban sa mga pista opisyal, sa pamamagitan ng mga sumusunod na detalye:</p>
                <ContactBlock />
              </div>
            )}

          </div>

          <div className="pacu-privacy-footer">
            {!scrolledToBottom && (
              <p className="pacu-privacy-scroll-hint">
                <i className="bi bi-arrow-down-circle me-1" />
                Scroll down to read the full notice
              </p>
            )}
            <button
              type="button"
              className="btn pacu-privacy-agree"
              onClick={onAgree}
              disabled={!scrolledToBottom}
            >
              <i className="bi bi-check2-circle me-2" />
              I Understand &amp; Acknowledge
            </button>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Anonymous Inquiry Modal
// ---------------------------------------------------------------------------

const ANON_READ_SECONDS = 5;

function AnonModal({ onChoose }: { onChoose: (isAnonymous: boolean) => void }) {
  // Short, non-scrollable content, so there is no scroll position to gate on the
  // way the privacy notice does — hold the choice for a few seconds instead so it
  // can't be dismissed reflexively.
  const [secondsLeft, setSecondsLeft] = useState(ANON_READ_SECONDS);
  const locked = secondsLeft > 0;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  useEffect(() => {
    function block(e: KeyboardEvent) {
      if (e.key === 'Escape') e.preventDefault();
    }
    document.addEventListener('keydown', block, true);
    return () => document.removeEventListener('keydown', block, true);
  }, []);

  return createPortal(
    <>
      <div className="pacu-privacy-backdrop" />
      <div className="pacu-privacy-wrap">
        <div className="pacu-privacy-modal">

          {/* Government banner */}
          <div className="pacu-privacy-banner">
            <span className="pacu-privacy-banner-logo">
              <img src="/dole-logo.png" alt="DOLE" />
            </span>
            <div className="pacu-privacy-banner-text">
              <span className="pacu-privacy-banner-republic">Republic of the Philippines</span>
              <span className="pacu-privacy-banner-rule" />
              <span className="pacu-privacy-banner-dept">Department of Labor and Employment</span>
            </div>
          </div>

          {/* Title bar */}
          <div className="pacu-privacy-titlebar">
            <span className="pacu-privacy-shield">
              <i className="bi bi-incognito" />
            </span>
            <div>
              <h5 className="pacu-privacy-title mb-0">Anonymous Inquiry</h5>
              <p className="pacu-privacy-subtitle mb-0">Would you like to remain anonymous?</p>
            </div>
          </div>

          <div className="pacu-privacy-body">
            <div className="pacu-privacy-content">
              <p>You may choose to remain anonymous. If you select <strong>Yes</strong>, your name and personal contact details will not be required. Your legal concern will still be documented and attended to by DOLE personnel.</p>
              <p>Note that choosing anonymity may limit our ability to follow up with you regarding the status of your concern.</p>
              <hr className="pacu-privacy-divider" />
              <p>Maaari kang pumili na manatiling anonymous. Kung pipiliin mo ang <strong>Oo</strong>, hindi na kakailanganin ang iyong pangalan at personal na impormasyon. Ang iyong legal na alalahanin ay idodokumento pa rin at haharapin ng mga tauhan ng DOLE.</p>
              <p>Tandaan na ang pagpili ng anonymity ay maaaring maglimita sa kakayahan naming makipag-ugnayan sa iyo tungkol sa katayuan ng iyong alalahanin.</p>
            </div>
          </div>

          <div className="pacu-privacy-footer pacu-anon-footer">
            {locked && (
              <p className="pacu-privacy-scroll-hint" role="status" aria-live="polite">
                <i className="bi bi-hourglass-split me-1" />
                Please take a moment to read &mdash; {secondsLeft}s
              </p>
            )}
            <div className="pacu-anon-actions">
              <button
                type="button"
                className="btn pacu-anon-btn-no"
                onClick={() => onChoose(true)}
                disabled={locked}
              >
                <i className="bi bi-incognito me-2" />
                Yes, stay anonymous
              </button>
              <button
                type="button"
                className="btn pacu-privacy-agree pacu-anon-btn-yes"
                onClick={() => onChoose(false)}
                disabled={locked}
              >
                <i className="bi bi-person-check me-2" />
                No, don't stay anonymous
              </button>
            </div>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}

function ContactBlock() {
  return (
    <div className="pacu-privacy-contact">
      <div className="pacu-privacy-contact-group">
        <p className="pacu-privacy-contact-title"><i className="bi bi-person-badge" />DOLE Data Protection Officer</p>
        <p className="pacu-privacy-contact-line"><i className="bi bi-telephone" /><span><strong>Mobile No.:</strong> (02) 8527 3000 (local 710/715)</span></p>
        <p className="pacu-privacy-contact-line"><i className="bi bi-envelope" /><span><strong>Email:</strong> dpo@dole.gov.ph</span></p>
      </div>
      <div className="pacu-privacy-contact-group">
        <p className="pacu-privacy-contact-title"><i className="bi bi-person-badge" />DOLE Legal Service</p>
        <p className="pacu-privacy-contact-line"><i className="bi bi-telephone" /><span><strong>Landline No.:</strong> (02) 8527 3000 (local 607)</span></p>
        <p className="pacu-privacy-contact-line"><i className="bi bi-envelope" /><span><strong>Email:</strong> ls@dole.gov.ph</span></p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Client Information
// ---------------------------------------------------------------------------

interface StepProps {
  form: IntakeBody;
  update: <K extends keyof IntakeBody>(key: K, value: IntakeBody[K]) => void;
  errors: FieldErrors;
}

// Dozens of city/municipality names repeat across provinces (e.g. "San Jose" appears 9
// times) — disambiguate same-named entries with their province so the single dropdown
// stays usable, without adding a separate province input.
function toCityOptions(cities: CityMunicipality[]) {
  const nameCounts = new Map<string, number>();
  for (const c of cities) {
    nameCounts.set(c.city_municipality, (nameCounts.get(c.city_municipality) ?? 0) + 1);
  }
  return cities.map((c) => ({
    id: c.id,
    label: (nameCounts.get(c.city_municipality) ?? 0) > 1 ? `${c.city_municipality} (${c.province})` : c.city_municipality,
  }));
}

function ClientInfoStep({ form, update, errors, cities }: StepProps & { cities: CityMunicipality[] }) {
  const { t } = useIntakeLang();
  const req = !form.is_anonymous;

  function handleContactChange(value: string) {
    const digits = value.replace(/\D/g, '');
    const enforced = digits.startsWith('09') ? digits.slice(0, 11) : '09';
    update('contact_no', formatContactNo(enforced));
  }

  function handleContactFocus() {
    if (!form.contact_no) update('contact_no', '09');
  }

  function handleContactBlur() {
    const raw = form.contact_no?.replace(/-/g, '') ?? '';
    if (raw.length <= 2) update('contact_no', '');
  }

  return (
    <>
      <p className="pacu-eyebrow mb-3">{t.nameSection}</p>
      <div className="row g-3 mb-2">
        <div className="col-sm-6 col-lg-4">
          <label className="form-label">{t.firstName}{req && <span style={{ color: 'red' }}> *</span>}</label>
          <div className={`pacu-wizard-field${errors.first_name ? ' is-error' : ''}`}>
            <input
              className="form-control"
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              autoFocus
            />
            {errors.first_name && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.first_name}</div>
            )}
          </div>
        </div>
        <div className="col-sm-6 col-lg-4">
          <label className="form-label">{t.middleName}</label>
          <input className="form-control" value={form.middle_name} onChange={(e) => update('middle_name', e.target.value)} />
        </div>
        <div className="col-sm-6 col-lg-4">
          <label className="form-label">{t.lastName}{req && <span style={{ color: 'red' }}> *</span>}</label>
          <div className={`pacu-wizard-field${errors.last_name ? ' is-error' : ''}`}>
            <input className="form-control" value={form.last_name} onChange={(e) => update('last_name', e.target.value)} />
            {errors.last_name && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.last_name}</div>
            )}
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <label className="form-label">{t.suffix}</label>
          <input className="form-control" placeholder={t.suffixPlaceholder} value={form.suffix} onChange={(e) => update('suffix', e.target.value)} />
        </div>
        <div className="col-sm-6 col-lg-3">
          <label className="form-label">{t.sex}{req && <span style={{ color: 'red' }}> *</span>}</label>
          <div className={`pacu-wizard-field${errors.sex ? ' is-error' : ''}`}>
            <select className="form-select" value={form.sex ?? ''} onChange={(e) => update('sex', (e.target.value || undefined) as ClientSex | undefined)}>
              <option value="">{t.select}</option>
              <option value="male">{t.male}</option>
              <option value="female">{t.female}</option>
            </select>
            {errors.sex && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.sex}</div>
            )}
          </div>
        </div>
      </div>

      <p className="pacu-eyebrow mb-3">{t.contactSection}</p>
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-4">
          <label className="form-label">{t.mobile}</label>
          <div className={`pacu-wizard-field${errors.contact_no ? ' is-error' : ''}`}>
            <input
              className="form-control"
              inputMode="numeric"
              value={form.contact_no}
              onChange={(e) => handleContactChange(e.target.value)}
              onFocus={handleContactFocus}
              onBlur={handleContactBlur}
            />
            {errors.contact_no && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.contact_no}</div>
            )}
          </div>
        </div>
        <div className="col-sm-6 col-lg-4">
          <label className="form-label">{t.telephone}</label>
          <input
            className="form-control"
            value={form.telephone_no}
            onChange={(e) => update('telephone_no', sanitizeTelephone(e.target.value))}
            placeholder={t.telephonePlaceholder}
          />
        </div>
        <div className="col-sm-6 col-lg-4">
          <label className="form-label">{t.email}</label>
          <div className={`pacu-wizard-field${errors.email ? ' is-error' : ''}`}>
            <input type="email" className="form-control" value={form.email} onChange={(e) => update('email', e.target.value)} />
            {errors.email && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.email}</div>
            )}
          </div>
        </div>
      </div>

      <p className="pacu-eyebrow mb-3">{t.addressSection}</p>
      <div className="mb-2">
        <label className="form-label">{t.city}{req && <span style={{ color: 'red' }}> *</span>}</label>
        <div className={`pacu-wizard-field${errors.city_id ? ' is-error' : ''}`}>
          <SearchableSelect
            options={toCityOptions(cities)}
            value={form.city_id ?? null}
            onChange={(id) => update('city_id', id ?? undefined)}
            placeholder={t.citySearchPlaceholder}
          />
          {errors.city_id && (
            <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.city_id}</div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Employment & Status
// ---------------------------------------------------------------------------

function EmploymentStatusStep({ form, update, errors }: StepProps) {
  const { t } = useIntakeLang();
  const req = !form.is_anonymous;

  return (
    <>
      <p className="pacu-eyebrow mb-3">{t.employmentSection}</p>
      <div className="row g-3 mb-4">
        <div className="col-sm-6">
          <label className="form-label">{t.workPosition}{req && <span style={{ color: 'red' }}> *</span>}</label>
          <div className={`pacu-wizard-field${errors.occupation ? ' is-error' : ''}`}>
            <input className="form-control" value={form.occupation} onChange={(e) => update('occupation', e.target.value)} />
            {errors.occupation && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.occupation}</div>
            )}
          </div>
        </div>
        <div className="col-sm-6">
          <label className="form-label">{t.dateEmployment}{req && <span style={{ color: 'red' }}> *</span>}</label>
          <div className={`pacu-wizard-field${errors.date_of_employment ? ' is-error' : ''}`}>
            <input
              type="date"
              className="form-control"
              value={form.date_of_employment}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => update('date_of_employment', e.target.value)}
            />
            {errors.date_of_employment && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.date_of_employment}</div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label d-block">{t.union}{req && <span style={{ color: 'red' }}> *</span>}</label>
        <div className="d-flex gap-4">
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="union_member"
              id="union_member_yes"
              checked={form.union_member === true}
              onChange={() => update('union_member', true)}
            />
            <label className="form-check-label" htmlFor="union_member_yes">{t.yes}</label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="union_member"
              id="union_member_no"
              checked={form.union_member === false}
              onChange={() => update('union_member', false)}
            />
            <label className="form-check-label" htmlFor="union_member_no">{t.no}</label>
          </div>
        </div>
        {errors.union_member && (
          <div className="pacu-wizard-error mt-1"><i className="bi bi-exclamation-circle" />{errors.union_member}</div>
        )}
      </div>

      <div className="card">
        <div className="card-body p-3">
          <p className="pacu-eyebrow mb-3">{t.statusPrompt}</p>
          <div className="d-flex flex-wrap gap-4">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="is_senior" checked={form.is_senior} onChange={(e) => update('is_senior', e.target.checked)} />
              <label className="form-check-label" htmlFor="is_senior">{t.senior}</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="is_pwd" checked={form.is_pwd} onChange={(e) => update('is_pwd', e.target.checked)} />
              <label className="form-check-label" htmlFor="is_pwd">{t.pwd}</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="is_pregnant" checked={form.is_pregnant} onChange={(e) => update('is_pregnant', e.target.checked)} />
              <label className="form-check-label" htmlFor="is_pregnant">{t.pregnant}</label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Company Details
// ---------------------------------------------------------------------------

function CompanyDetailsStep({ form, update, errors, cities }: StepProps & { cities: CityMunicipality[] }) {
  const { t } = useIntakeLang();

  return (
    <>
      <p className="pacu-eyebrow mb-3">{t.companySection}</p>
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <label className="form-label">{t.companyName} <span style={{ color: 'red' }}>*</span></label>
          <div className={`pacu-wizard-field${errors.employer ? ' is-error' : ''}`}>
            <input className="form-control" value={form.employer} onChange={(e) => update('employer', e.target.value)} />
            {errors.employer && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.employer}</div>
            )}
          </div>
        </div>

        <div className="col-lg-6">
          <label className="form-label">{t.companyAddress} <span style={{ color: 'red' }}>*</span></label>
          <div className={`pacu-wizard-field${errors.company_city_id ? ' is-error' : ''}`}>
            <SearchableSelect
              options={toCityOptions(cities)}
              value={form.company_city_id ?? null}
              onChange={(id) => update('company_city_id', id ?? undefined)}
              placeholder={t.citySearchPlaceholder}
            />
            {errors.company_city_id && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.company_city_id}</div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-2">
        <label className="form-label">{t.pendingComplaint}</label>
        <MultiSelectChips
          options={PENDING_COMPLAINT_TYPES}
          selected={form.pending_complaint_types ?? []}
          onChange={(values) => update('pending_complaint_types', values as PendingComplaintType[])}
          placeholder={t.complaintPlaceholder}
        />
        {form.pending_complaint_types?.includes('Others') && (
          <div className={`pacu-wizard-field mt-2${errors.pending_complaint_other ? ' is-error' : ''}`}>
            <input
              className="form-control"
              type="text"
              placeholder={t.pendingComplaintOtherPlaceholder}
              value={form.pending_complaint_other ?? ''}
              onChange={(e) => update('pending_complaint_other', e.target.value)}
            />
            {errors.pending_complaint_other && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.pending_complaint_other}</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Review & Submit
// ---------------------------------------------------------------------------

function ReviewStep({ form, cities }: { form: IntakeBody; cities: CityMunicipality[] }) {
  const { t } = useIntakeLang();
  const fullName = [form.first_name, form.middle_name, form.last_name, form.suffix].filter(Boolean).join(' ');
  const cityName = cities.find((c) => c.id === form.city_id)?.city_municipality;
  const companyCityName = cities.find((c) => c.id === form.company_city_id)?.city_municipality;

  return (
    <>
      <p className="text-muted mb-4">{t.reviewIntro}</p>

      <div className="pacu-wizard-review-section mb-4">
        <p className="pacu-eyebrow mb-2">{t.steps[0]}</p>
        <div className="card">
          <div className="card-body p-3">
            <div className="pacu-wizard-review-row"><span className="text-muted">{t.reviewName}</span><span className="fw-medium">{fullName || '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">{t.sex}</span><span className="fw-medium text-capitalize">{form.sex ?? '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">{t.mobile}</span><span className="fw-medium">{form.contact_no && form.contact_no !== '09' ? form.contact_no : '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">{t.telephone}</span><span className="fw-medium">{form.telephone_no || '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">{t.email}</span><span className="fw-medium">{form.email || '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">{t.reviewAddress}</span><span className="fw-medium">{cityName || '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">{t.workPosition}</span><span className="fw-medium">{form.occupation || '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">{t.dateEmployment}</span><span className="fw-medium">{form.date_of_employment || '—'}</span></div>
            <div className="pacu-wizard-review-row">
              <span className="text-muted">{t.union}</span>
              <span className="fw-medium">{form.union_member === undefined ? '—' : form.union_member ? t.yes : t.no}</span>
            </div>
            <div className="pacu-wizard-review-row">
              <span className="text-muted">{t.specialStatus}</span>
              <span className="fw-medium">
                {[form.is_senior && t.senior, form.is_pwd && t.pwdShort, form.is_pregnant && t.pregnant].filter(Boolean).join(', ') || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pacu-wizard-review-section">
        <p className="pacu-eyebrow mb-2">{t.companySection}</p>
        <div className="card">
          <div className="card-body p-3">
            <div className="pacu-wizard-review-row"><span className="text-muted">{t.companyNameLabel}</span><span className="fw-medium">{form.employer || '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">{t.companyAddressLabel}</span><span className="fw-medium">{companyCityName || '—'}</span></div>
            <div className="pacu-wizard-review-row">
              <span className="text-muted">{t.pendingLabel}</span>
              <span className="d-flex flex-wrap gap-1 justify-content-end">
                {form.pending_complaint_types && form.pending_complaint_types.length > 0 ? (
                  form.pending_complaint_types.map((tag) => (
                    <span key={tag} className="pacu-badge">{tag}</span>
                  ))
                ) : (
                  <span className="fw-medium">—</span>
                )}
              </span>
            </div>
            {form.pending_complaint_types?.includes('Others') && form.pending_complaint_other && (
              <div className="pacu-wizard-review-row">
                <span className="text-muted">{t.pendingOtherLabel}</span>
                <span className="fw-medium">{form.pending_complaint_other}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
