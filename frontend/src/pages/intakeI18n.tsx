import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

// Language selector for the intake kiosk. State is deliberately kept local to the
// intake page (component state threaded through this context) so switching the
// kiosk language never affects the authenticated staff-facing app.
export type IntakeLang = 'en' | 'tl';

export interface IntakeStrings {
  // Navbar controls
  themeLabel: string;
  langLabel: string;

  // Main card
  welcome: string;
  welcomeSub: string;
  steps: [string, string, string, string];
  prev: string;
  next: string;
  submit: string;

  // Success screen
  queueEyebrow: string;
  queueSeat: string;
  refNumber: string;
  startNew: string;

  // Client info — name
  nameSection: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  suffixPlaceholder: string;
  sex: string;
  select: string;
  male: string;
  female: string;

  // Client info — contact
  contactSection: string;
  mobile: string;
  telephone: string;
  telephonePlaceholder: string;
  email: string;

  // Client info — address
  addressSection: string;
  city: string;
  citySearchPlaceholder: string;

  // Employment
  employmentSection: string;
  workPosition: string;
  dateEmployment: string;
  union: string;
  yes: string;
  no: string;
  statusPrompt: string;
  senior: string;
  pwd: string;
  pregnant: string;

  // Company
  companySection: string;
  companyName: string;
  companyAddress: string;
  pendingComplaint: string;
  complaintPlaceholder: string;
  pendingComplaintOtherPlaceholder: string;

  // Review
  reviewIntro: string;
  reviewName: string;
  reviewAddress: string;
  specialStatus: string;
  pwdShort: string;
  companyNameLabel: string;
  companyAddressLabel: string;
  pendingLabel: string;
  pendingOtherLabel: string;

  // Validation
  reqFirstName: string;
  reqLastName: string;
  reqSex: string;
  reqCity: string;
  invalidMobile: string;
  invalidEmail: string;
  reqWorkPosition: string;
  reqDateEmployment: string;
  reqUnion: string;
  reqCompany: string;
  reqCompanyAddress: string;
  reqPendingComplaintOther: string;

  // Dialogs
  citiesErrTitle: string;
  tryAgain: string;
  contactBlankTitle: string;
  contactBlankText: string;
  proceed: string;
  goBackFill: string;
  confirmTitle: string;
  confirmText: string;
  confirmYes: string;
  cancel: string;
  submitErrTitle: string;
  nextClientTitle: string;
  nextClientHtml: string;
  nextClientYes: string;
  goBack: string;

  // Privacy notice modal
  privacyTitle: string;
  privacySubtitle: string;
  privacyParas: string[];
  contactDPO: string;
  contactMobileNo: string;
  contactEmailNo: string;
  contactLegal: string;
  contactLandlineNo: string;
  scrollHint: string;
  acknowledge: string;

  // Anonymous modal
  anonTitle: string;
  anonSubtitle: string;
  anonParas: string[];
  anonReadHint: string;
  anonYes: string;
  anonNo: string;
}

export const STRINGS: Record<IntakeLang, IntakeStrings> = {
  en: {
    themeLabel: 'Theme',
    langLabel: 'Language',

    welcome: 'Welcome',
    welcomeSub: 'Please tell us about yourself and what brings you in today.',
    steps: ['Client Information', 'Employment & Status', 'Company Details', 'Review'],
    prev: 'Previous',
    next: 'Next',
    submit: 'Submit Intake',

    queueEyebrow: "You're in the queue",
    queueSeat: "Please have a seat. You'll be called by this number.",
    refNumber: 'Reference number:',
    startNew: 'Start a New Entry',

    nameSection: 'Name of Client',
    firstName: 'First name',
    middleName: 'Middle name',
    lastName: 'Last name',
    suffix: 'Suffix',
    suffixPlaceholder: 'Jr., Sr., III',
    sex: 'Sex',
    select: 'Select',
    male: 'Male',
    female: 'Female',

    contactSection: 'Contact Details',
    mobile: 'Mobile number',
    telephone: 'Telephone number',
    telephonePlaceholder: 'e.g. (02) 8527-3000',
    email: 'Email',

    addressSection: 'Address',
    city: 'City/Municipality',
    citySearchPlaceholder: 'Search for a city or municipality…',

    employmentSection: 'Employment',
    workPosition: 'Work Position',
    dateEmployment: 'Date of Employment',
    union: 'Union Membership',
    yes: 'Yes',
    no: 'No',
    statusPrompt: 'Does any of this apply to you?',
    senior: 'Senior citizen',
    pwd: 'Person with disability',
    pregnant: 'Pregnant',

    companySection: 'Company Details',
    companyName: 'Name of Company',
    companyAddress: 'Address of Company (City/Municipality)',
    pendingComplaint: 'Presence of Pending Labor Complaint/Case Against the Company',
    complaintPlaceholder: 'Search complaint types…',
    pendingComplaintOtherPlaceholder: 'Please specify…',

    reviewIntro: 'Please review your information before submitting.',
    reviewName: 'Name',
    reviewAddress: 'Address',
    specialStatus: 'Special status',
    pwdShort: 'PWD',
    companyNameLabel: 'Company Name',
    companyAddressLabel: 'Company Address',
    pendingLabel: 'Pending Labor Complaint/Case',
    pendingOtherLabel: 'Other (specify)',

    reqFirstName: 'First name is required',
    reqLastName: 'Last name is required',
    reqSex: 'Sex is required',
    reqCity: 'City/Municipality is required',
    invalidMobile: 'Enter a valid mobile number',
    invalidEmail: 'Enter a valid email address',
    reqWorkPosition: 'Work position is required',
    reqDateEmployment: 'Date of employment is required',
    reqUnion: 'Please indicate union membership',
    reqCompany: 'Company name is required',
    reqCompanyAddress: 'Company address is required',
    reqPendingComplaintOther: 'Please specify the other complaint type',

    citiesErrTitle: 'Could not load cities',
    tryAgain: 'Please try again',
    contactBlankTitle: 'Contact details left blank',
    contactBlankText:
      'Leaving your mobile number or email blank may limit our ability to follow up with you regarding the status of your concern.',
    proceed: 'Proceed',
    goBackFill: 'Go back to fill it up',
    confirmTitle: 'Confirm Submission',
    confirmText:
      'Please review the information carefully. Are you sure all the details you have provided are complete and correct?',
    confirmYes: 'Yes, Submit',
    cancel: 'Cancel',
    submitErrTitle: 'Could not submit',
    nextClientTitle: 'Ready for the next client?',
    nextClientHtml:
      'Please make sure the client has taken note of their <strong>queue number</strong> and <strong>reference number</strong> before proceeding.',
    nextClientYes: 'Yes, start new entry',
    goBack: 'Go back',

    privacyTitle: 'Privacy Notice',
    privacySubtitle: 'Data Privacy Act of 2012 — Republic Act No. 10173',
    privacyParas: [
      'By submitting this form, you acknowledge that the Department of Labor and Employment (DOLE) collects and processes your personal information, such as your name, age, and email address, for the purpose of responding to your legal query, in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173), its Implementing Rules and Regulations, and relevant issuances of the National Privacy Commission.',
      'DOLE assures data subjects that all personal data collected through this platform shall be processed with due diligence and prudence and shall be used solely for the declared purpose.',
      'Access to your personal information is limited to duly authorized DOLE personnel. Your personal data shall be stored in a secure database.',
      'As a data subject, you have the right to be informed, to access, and to request the correction of your personal data processed by DOLE, subject to the limitations provided by law. You may exercise these rights by contacting DOLE during office hours, from Monday to Friday, 8:00 a.m. to 5:00 p.m., except holidays, through the following contact details:',
    ],
    contactDPO: 'DOLE Data Protection Officer',
    contactMobileNo: 'Mobile No.:',
    contactEmailNo: 'Email:',
    contactLegal: 'DOLE Legal Service',
    contactLandlineNo: 'Landline No.:',
    scrollHint: 'Scroll down to read the full notice',
    acknowledge: 'I Understand & Acknowledge',

    anonTitle: 'Anonymous Inquiry',
    anonSubtitle: 'Would you like to remain anonymous?',
    anonParas: [
      'You may choose to remain anonymous. If you select Yes, your name and personal contact details will not be required. Your legal concern will still be documented and attended to by DOLE personnel.',
      'Note that choosing anonymity may limit our ability to follow up with you regarding the status of your concern.',
    ],
    anonReadHint: 'Please take a moment to read',
    anonYes: 'Yes, stay anonymous',
    anonNo: "No, don't stay anonymous",
  },
  tl: {
    themeLabel: 'Tema',
    langLabel: 'Wika',

    welcome: 'Maligayang Pagdating',
    welcomeSub: 'Pakisabi sa amin ang tungkol sa iyong sarili at kung ano ang dahilan ng iyong pagbisita ngayon.',
    steps: ['Impormasyon ng Kliyente', 'Trabaho at Katayuan', 'Detalye ng Kumpanya', 'Pagsusuri'],
    prev: 'Nakaraan',
    next: 'Susunod',
    submit: 'Isumite',

    queueEyebrow: 'Ikaw ay nasa pila na',
    queueSeat: 'Mangyaring maupo. Tatawagin ka sa numerong ito.',
    refNumber: 'Numero ng sanggunian:',
    startNew: 'Magsimula ng Bagong Entry',

    nameSection: 'Pangalan ng Kliyente',
    firstName: 'Pangalan',
    middleName: 'Gitnang Pangalan',
    lastName: 'Apelyido',
    suffix: 'Suffix',
    suffixPlaceholder: 'Jr., Sr., III',
    sex: 'Kasarian',
    select: 'Pumili',
    male: 'Lalaki',
    female: 'Babae',

    contactSection: 'Mga Detalye ng Pakikipag-ugnayan',
    mobile: 'Numero ng Mobile',
    telephone: 'Numero ng Telepono',
    telephonePlaceholder: 'hal. (02) 8527-3000',
    email: 'Email',

    addressSection: 'Tirahan',
    city: 'Lungsod/Munisipalidad',
    citySearchPlaceholder: 'Maghanap ng lungsod o munisipalidad…',

    employmentSection: 'Trabaho',
    workPosition: 'Posisyon sa Trabaho',
    dateEmployment: 'Petsa ng Pagkakaempleyo',
    union: 'Miyembro ng Unyon ng Manggagawa',
    yes: 'Oo',
    no: 'Hindi',
    statusPrompt: 'Naaangkop ba ang alinman sa mga ito sa iyo?',
    senior: 'Senior citizen',
    pwd: 'Taong may kapansanan (PWD)',
    pregnant: 'Buntis',

    companySection: 'Detalye ng Kumpanya',
    companyName: 'Pangalan ng Kumpanya',
    companyAddress: 'Address ng Kumpanya (Lungsod/Munisipalidad)',
    pendingComplaint: 'Presensya ng Nakabinbing Reklamo/Kaso sa Paggawa Laban sa Kumpanya',
    complaintPlaceholder: 'Maghanap ng uri ng reklamo…',
    pendingComplaintOtherPlaceholder: 'Pakipaliwanag…',

    reviewIntro: 'Pakisuri ang iyong impormasyon bago isumite.',
    reviewName: 'Pangalan',
    reviewAddress: 'Tirahan',
    specialStatus: 'Natatanging katayuan',
    pwdShort: 'PWD',
    companyNameLabel: 'Pangalan ng Kumpanya',
    companyAddressLabel: 'Address ng Kumpanya',
    pendingLabel: 'Nakabinbing Reklamo/Kaso sa Paggawa',
    pendingOtherLabel: 'Iba pa (ipaliwanag)',

    reqFirstName: 'Kailangan ang pangalan',
    reqLastName: 'Kailangan ang apelyido',
    reqSex: 'Kailangan ang kasarian',
    reqCity: 'Kailangan ang lungsod/munisipalidad',
    invalidMobile: 'Maglagay ng wastong numero ng mobile',
    invalidEmail: 'Maglagay ng wastong email address',
    reqWorkPosition: 'Kailangan ang posisyon sa trabaho',
    reqDateEmployment: 'Kailangan ang petsa ng pagkakaempleyo',
    reqUnion: 'Pakitukoy ang pagiging miyembro ng unyon',
    reqCompany: 'Kailangan ang pangalan ng kumpanya',
    reqCompanyAddress: 'Kailangan ang address ng kumpanya',
    reqPendingComplaintOther: 'Pakipaliwanag ang ibang uri ng reklamo',

    citiesErrTitle: 'Hindi ma-load ang mga lungsod',
    tryAgain: 'Pakisubukang muli',
    contactBlankTitle: 'Walang nailagay na detalye ng pakikipag-ugnayan',
    contactBlankText:
      'Ang hindi paglalagay ng iyong numero ng mobile o email ay maaaring maglimita sa aming kakayahang makipag-ugnayan sa iyo tungkol sa katayuan ng iyong alalahanin.',
    proceed: 'Magpatuloy',
    goBackFill: 'Bumalik upang punan ito',
    confirmTitle: 'Kumpirmahin ang Pagsusumite',
    confirmText:
      'Pakisuri nang mabuti ang impormasyon. Sigurado ka ba na kumpleto at tama ang lahat ng detalyeng iyong ibinigay?',
    confirmYes: 'Oo, Isumite',
    cancel: 'Kanselahin',
    submitErrTitle: 'Hindi maisumite',
    nextClientTitle: 'Handa na ba para sa susunod na kliyente?',
    nextClientHtml:
      'Tiyaking naitala ng kliyente ang kanilang <strong>queue number</strong> at <strong>reference number</strong> bago magpatuloy.',
    nextClientYes: 'Oo, magsimula ng bagong entry',
    goBack: 'Bumalik',

    privacyTitle: 'Paunawa sa Privacy',
    privacySubtitle: 'Data Privacy Act of 2012 — Republic Act No. 10173',
    privacyParas: [
      'Sa pamamagitan ng pagsumite ng pormang ito, kinikilala mo na ang Department of Labor and Employment (DOLE) ay nangongolekta at nagpoproseso ng iyong personal na impormasyon, gaya ng iyong pangalan, edad, at email address, para sa layuning tumugon sa iyong legal na katanungan, alinsunod sa Data Privacy Act of 2012 (Republic Act No. 10173), sa mga Implementing Rules and Regulations nito, at sa mga kaugnay na kautusan ng National Privacy Commission.',
      'Tinitiyak ng DOLE sa mga data subject na ang lahat ng personal na datos na makokolekta sa pamamagitan ng platapormang ito ay ipoproseso nang may nararapat na pag-iingat at pagkamahinahon at gagamitin lamang para sa ipinahayag na layunin.',
      'Ang pag-access sa iyong personal na impormasyon ay limitado lamang sa mga duly authorized personnel ng DOLE. Ang iyong personal na datos ay itatago sa isang ligtas na database.',
      'Bilang isang data subject, ikaw ay may karapatang mabigyan ng impormasyon, magkaroon ng access, at humiling ng pagwawasto ng iyong personal na datos na pinoproseso ng DOLE, alinsunod sa mga limitasyong itinakda ng batas. Maaari mong gamitin ang mga karapatang ito sa pamamagitan ng pakikipag-ugnayan sa DOLE sa oras ng opisina, mula Lunes hanggang Biyernes, ika-8:00 ng umaga hanggang ika-5:00 ng hapon, maliban sa mga pista opisyal, sa pamamagitan ng mga sumusunod na detalye:',
    ],
    contactDPO: 'DOLE Data Protection Officer',
    contactMobileNo: 'Mobile No.:',
    contactEmailNo: 'Email:',
    contactLegal: 'DOLE Legal Service',
    contactLandlineNo: 'Landline No.:',
    scrollHint: 'Mag-scroll pababa upang basahin ang buong paunawa',
    acknowledge: 'Nauunawaan at Kinikilala Ko',

    anonTitle: 'Anonimong Katanungan',
    anonSubtitle: 'Nais mo bang manatiling anonymous?',
    anonParas: [
      'Maaari kang pumili na manatiling anonymous. Kung pipiliin mo ang Oo, hindi na kakailanganin ang iyong pangalan at personal na impormasyon. Ang iyong legal na alalahanin ay idodokumento pa rin at haharapin ng mga tauhan ng DOLE.',
      'Tandaan na ang pagpili ng anonymity ay maaaring maglimita sa kakayahan naming makipag-ugnayan sa iyo tungkol sa katayuan ng iyong alalahanin.',
    ],
    anonReadHint: 'Maglaan ng sandali upang basahin',
    anonYes: 'Oo, manatiling anonymous',
    anonNo: 'Hindi, ayaw kong maging anonymous',
  },
};

interface IntakeLangCtx {
  lang: IntakeLang;
  setLang: (lang: IntakeLang) => void;
  t: IntakeStrings;
}

const IntakeLangContext = createContext<IntakeLangCtx | null>(null);

export function IntakeLangProvider({
  lang,
  setLang,
  children,
}: {
  lang: IntakeLang;
  setLang: (lang: IntakeLang) => void;
  children: ReactNode;
}) {
  return (
    <IntakeLangContext.Provider value={{ lang, setLang, t: STRINGS[lang] }}>
      {children}
    </IntakeLangContext.Provider>
  );
}

export function useIntakeLang(): IntakeLangCtx {
  const ctx = useContext(IntakeLangContext);
  if (!ctx) throw new Error('useIntakeLang must be used within IntakeLangProvider');
  return ctx;
}

const LANG_OPTIONS: { value: IntakeLang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'tl', label: 'Tagalog' },
];

export function LanguageSwitch() {
  const { lang, setLang } = useIntakeLang();

  return (
    <div className="pacu-lang-switch" role="radiogroup" aria-label="Language">
      {LANG_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={lang === opt.value}
          className={lang === opt.value ? 'active' : ''}
          onClick={() => setLang(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
