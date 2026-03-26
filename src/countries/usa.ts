import { type CountryConfig } from '../context/CountryContext';
import { DEFAULT_PORTRAIT_URI } from '../constants/defaultPortrait';

function toUsDate(en: string): string {
  // Convert "27 Dec. 1996" → "12/27/1996"
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const parts = en.replace('.', '').split(' ');
  if (parts.length !== 3) return en;
  return `${months[parts[1]] ?? '01'}/${parts[0].padStart(2, '0')}/${parts[2]}`;
}

export const USA_CONFIG: CountryConfig = {
  code: 'US',
  name: { english: 'THE CITY OF NEW YORK', primary: 'NYC IDENTIFICATION' },
  issuer: { english: 'Human Resources Administration', primary: 'IDNYC Program' },
  ministry: 'HUMAN RESOURCES ADMINISTRATION · THE CITY OF NEW YORK',
  splashFooter: 'NYC Municipal Identification Card Program',
  qrType: 'NYC_IDNYC',
  systemReference: 'US-NYC-IDNYC',
  chipSerial: 'NYC-3B8F-7E21-A4D6',
  cardDescription: 'NYC IDNYC Identification Card',

  emblemAsset: require('../../assets/us-emblem.png'),
  cardImages: {
    front: require('../../pics/us-front.png'),
    back: require('../../pics/us-back.png'),
  },

  flagLabel: 'NYC',

  secondaryLanguage: { code: 'es', label: 'ES', langName: 'Español' },

  dateFormat: {
    toLocal: toUsDate,
  },

  holoStripSide: 'right',
  holoStripOffset: 0.06,

  addressFormatter: (data: any, lang: string) => {
    if (lang === 'en') {
      return `${data.addressNumber} ${data.subDistrict}, ${data.district}, NY ${data.province}`;
    }
    return data.addressThai;
  },

  // NYC blue accent
  accent: {
    dark: {
      gold: '#1A5276',
      goldLight: '#2980B9',
      goldBg: 'rgba(41, 128, 185, 0.1)',
      goldBorder: 'rgba(41, 128, 185, 0.18)',
      navy: '#0D2240',
    },
    light: {
      gold: '#1A5276',
      goldLight: '#1A6DA8',
      goldBg: 'rgba(26, 82, 118, 0.08)',
      goldBorder: 'rgba(26, 82, 118, 0.15)',
      navy: '#0D2240',
    },
  },

  translations: {
    'header.title': { en: 'NYC ID Card', es: 'Tarjeta de ID NYC' },
    'header.sub': { en: 'Tarjeta de Identificación', es: 'NYC Identification Card' },
    'card.flipHint': { en: 'Tap card to flip', es: 'Toca para voltear' },
    'section.cardholder': { en: 'Cardholder', es: 'Titular' },
    'section.cardInfo': { en: 'Card Information', es: 'Información de Tarjeta' },
    'section.qrDetails': { en: 'QR Details', es: 'Detalles QR' },
    'id.label': { en: 'ID Number', es: 'Número de ID' },
    'id.personalNo': { en: 'ID NO.', es: 'NÚM. ID' },
    'info.dob': { en: 'DATE OF BIRTH', es: 'FECHA DE NACIMIENTO' },
    'info.age': { en: 'AGE', es: 'EDAD' },
    'info.ageUnit': { en: ' yrs', es: ' años' },
    'info.province': { en: 'ZIP', es: 'Código Postal' },
    'info.district': { en: 'Borough', es: 'Distrito' },
    'info.issued': { en: 'DATE OF ISSUE', es: 'FECHA DE EMISIÓN' },
    'info.expires': { en: 'EXPIRATION', es: 'VENCIMIENTO' },
    'info.address': { en: 'ADDRESS', es: 'DIRECCIÓN' },
    'info.laser': { en: 'Card No.', es: 'Nº de Tarjeta' },
    'digital.title': { en: 'Digital ID', es: 'ID Digital' },
    'digital.sub': { en: 'Identificación Digital', es: 'Digital Identification Card' },
    'digital.scanHint': { en: 'Scan to verify identity', es: 'Escanear para verificar' },
    'digital.regen': { en: 'REGEN', es: 'ACTUALIZAR' },
    'digital.expires': { en: 'EXPIRES', es: 'VENCE' },
    'digital.generated': { en: 'Generated', es: 'Generado' },
    'digital.refreshes': { en: 'Refreshes in', es: 'Actualiza en' },
    'digital.scanCount': { en: 'Scan Count', es: 'Conteo' },
    'digital.encryption': { en: 'Encryption', es: 'Cifrado' },
    'digital.protocol': { en: 'Protocol', es: 'Protocolo' },
    'digital.disclaimer': {
      en: 'This digital ID is for reference only. Present your physical card for official verification.',
      es: 'Esta ID digital es solo de referencia. Presente su tarjeta física para verificación oficial.',
    },
    'settings.subNative': { en: 'Configuración de la Aplicación', es: 'Application Settings' },
    'settings.title': { en: 'Settings', es: 'Configuración' },
    'settings.security': { en: 'Security', es: 'Seguridad' },
    'settings.preferences': { en: 'Preferences', es: 'Preferencias' },
    'settings.about': { en: 'About', es: 'Acerca de' },
    'settings.biometric': { en: 'Biometric Lock', es: 'Bloqueo Biométrico' },
    'settings.pin': { en: 'Change PIN', es: 'Cambiar PIN' },
    'settings.privacy': { en: 'Privacy Mode', es: 'Modo Privacidad' },
    'settings.notifications': { en: 'Notifications', es: 'Notificaciones' },
    'settings.language': { en: 'Language', es: 'Idioma' },
    'settings.theme': { en: 'Theme', es: 'Tema' },
    'settings.country': { en: 'Country', es: 'País' },
    'settings.version': { en: 'Version', es: 'Versión' },
    'settings.terms': { en: 'Terms', es: 'Términos' },
    'settings.privacyPolicy': { en: 'Privacy', es: 'Privacidad' },
    'settings.support': { en: 'Support', es: 'Soporte' },
    'settings.dark': { en: 'Dark', es: 'Oscuro' },
    'tab.identity': { en: 'Identity', es: 'Identidad' },
    'tab.qr': { en: 'QR Code', es: 'Código QR' },
    'tab.settings': { en: 'Settings', es: 'Ajustes' },
    'lock.title': { en: 'NYC ID Card', es: 'Tarjeta de ID NYC' },
    'lock.message': { en: 'Authentication required\nto access your ID card', es: 'Se requiere autenticación\npara acceder a su tarjeta' },
    'lock.button': { en: 'Authenticate', es: 'Autenticar' },
    'expanded.smartCard': { en: 'SMART CARD', es: 'TARJETA INTELIGENTE' },
    'expanded.chipSerial': { en: 'CHIP SERIAL', es: 'SERIAL DEL CHIP' },
    'expanded.generation': { en: 'GENERATION', es: 'GENERACIÓN' },
    'expanded.interface': { en: 'INTERFACE', es: 'INTERFAZ' },
    'expanded.standard': { en: 'STANDARD', es: 'ESTÁNDAR' },
    'expanded.biometric': { en: 'BIOMETRIC DATA', es: 'DATOS BIOMÉTRICOS' },
    'expanded.fingerprint': { en: 'FINGERPRINT', es: 'HUELLA DACTILAR' },
    'expanded.faceTemplate': { en: 'FACE TEMPLATE', es: 'PLANTILLA FACIAL' },
    'expanded.irisScan': { en: 'IRIS SCAN', es: 'ESCANEO DE IRIS' },
    'expanded.enrolled': { en: 'ENROLLED', es: 'REGISTRADO' },
    'expanded.na': { en: 'N/A', es: 'N/D' },
    'expanded.genValue': { en: 'Gen 2 · Smart Card', es: 'Gen 2 · Tarjeta Inteligente' },
    'expanded.interfaceValue': { en: 'Contact + NFC', es: 'Contacto + NFC' },
    'attribution.dept': { en: 'HUMAN RESOURCES ADMINISTRATION', es: 'ADMINISTRACIÓN DE RECURSOS HUMANOS' },
    'attribution.note': { en: 'Authorized municipal identification application\nFor official use only', es: 'Aplicación autorizada de identificación municipal\nPara uso oficial solamente' },
  },

  defaultCardData: {
    titleThai: 'Tarjeta de Identificación NYC',
    titleEnglish: 'NYC Identification Card',
    idNumber: '7841 29063518 4923',
    idNumberCompact: '78412906351849',
    nameThai: 'Ryan Suwan',
    namePrefix: 'Mr.',
    firstName: 'Ryan',
    lastName: 'Suwan',
    fullNameEnglish: 'Mr. Ryan Suwan',
    dateOfBirthThai: '12/27/1996',
    dateOfBirth: '27 Dec. 1996',
    addressThai: '247 East 28th Street, Apt 4B, Manhattan, NY 10016',
    addressNumber: '247',
    moo: '',
    subDistrict: 'East 28th Street Apt 4B',
    district: 'Manhattan',
    province: '10016',
    dateOfIssueThai: '03/15/2024',
    dateOfIssue: '15 Mar. 2024',
    dateOfExpiryThai: '03/15/2029',
    dateOfExpiry: '15 Mar. 2029',
    sex: 'Male',
    sexThai: 'M',
    nationality: 'American',
    nationalityThai: 'Americano',
    bloodType: 'O+',
    reference: 'NYC-HRA-2024-87429',
    laserCode: 'NY4-8742930-15',
    isValid: true,
    pictureUri: DEFAULT_PORTRAIT_URI,
  },
};
