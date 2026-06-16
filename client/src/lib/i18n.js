/**
 * i18n.js — Simple English/Hindi string dictionary.
 *
 * No i18n library — just a plain object lookup.
 * Only static UI labels are translated; dynamic data (names, numbers) pass through.
 */

const strings = {
  en: {
    // Patient Display
    nowServing: 'Now Serving',
    upNext: 'Up Next',
    estimatedWait: 'Estimated Wait',
    minutes: 'min',
    noOneServing: 'No patient being served',
    waitingRoom: 'Waiting Room Display',
    queueEmpty: 'Queue is empty',
    patientsWaiting: 'patients waiting',
    tokenLabel: 'Token',
    langToggle: 'हिंदी',

    // Receptionist
    receptionistTitle: 'Receptionist Console',
    addPatient: 'Add to Queue',
    patientName: 'Patient Name',
    callNext: 'Call Next',
    undoLastCall: 'Undo Last Call',
    avgConsultTime: 'Avg. Consultation Time',
    setTime: 'Set',
    minutesLabel: 'minutes',
    waitingList: 'Waiting List',
    noPatients: 'No patients waiting',
    nothingToUndo: 'Nothing to undo',
    currentlyServing: 'Currently Serving',
    connected: 'Connected',
    disconnected: 'Disconnected',
    reconnecting: 'Reconnecting…',
  },
  hi: {
    // Patient Display
    nowServing: 'अभी सेवा में',
    upNext: 'अगला',
    estimatedWait: 'अनुमानित प्रतीक्षा',
    minutes: 'मिनट',
    noOneServing: 'कोई मरीज सेवा में नहीं',
    waitingRoom: 'प्रतीक्षालय प्रदर्शन',
    queueEmpty: 'कतार खाली है',
    patientsWaiting: 'मरीज प्रतीक्षा में',
    tokenLabel: 'टोकन',
    langToggle: 'English',

    // Receptionist
    receptionistTitle: 'रिसेप्शनिस्ट कंसोल',
    addPatient: 'कतार में जोड़ें',
    patientName: 'मरीज का नाम',
    callNext: 'अगला बुलाएं',
    undoLastCall: 'पिछला पूर्ववत करें',
    avgConsultTime: 'औसत परामर्श समय',
    setTime: 'सेट करें',
    minutesLabel: 'मिनट',
    waitingList: 'प्रतीक्षा सूची',
    noPatients: 'कोई मरीज प्रतीक्षा में नहीं',
    nothingToUndo: 'पूर्ववत करने को कुछ नहीं',
    currentlyServing: 'वर्तमान में सेवा में',
    connected: 'कनेक्टेड',
    disconnected: 'डिस्कनेक्टेड',
    reconnecting: 'पुनः कनेक्ट हो रहा है…',
  },
};

export function t(lang, key) {
  return (strings[lang] && strings[lang][key]) || strings.en[key] || key;
}

export const LANGUAGES = ['en', 'hi'];
