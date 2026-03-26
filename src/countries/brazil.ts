import { type CountryConfig } from '../context/CountryContext';
import { DEFAULT_PORTRAIT_URI } from '../constants/defaultPortrait';

function toBrDate(en: string): string {
  // Convert "27 Dec. 1996" → "27/12/1996"
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const parts = en.replace('.', '').split(' ');
  if (parts.length !== 3) return en;
  return `${parts[0].padStart(2, '0')}/${months[parts[1]] ?? '01'}/${parts[2]}`;
}

export const BRAZIL_CONFIG: CountryConfig = {
  code: 'BR',
  name: { english: 'REPUBLIC OF BRAZIL', primary: 'REPÚBLICA DO BRASIL' },
  issuer: { english: 'State Identification Institute', primary: 'Instituto de Identificação' },
  ministry: 'MINISTÉRIO DA JUSTIÇA E SEGURANÇA PÚBLICA · REPÚBLICA FEDERATIVA DO BRASIL',
  splashFooter: 'Sistema de Carteira de Identidade Nacional',
  qrType: 'BRAZILIAN_CIN',
  systemReference: 'BR-MJC-CIN',
  chipSerial: 'BRC-7D4A-1F82-C9E3',
  cardDescription: 'Brazilian Carteira de Identidade Nacional (CIN)',

  emblemAsset: require('../../assets/br-emblem.png'),
  cardImages: {
    front: require('../../pics/br-front.png'),
    back: require('../../pics/br-back.png'),
  },

  flagLabel: 'Brasil',

  secondaryLanguage: { code: 'pt', label: 'PT', langName: 'Português' },

  dateFormat: {
    toLocal: toBrDate,
  },

  holoStripSide: 'right',
  holoStripOffset: 0.18,

  addressFormatter: (data: any, lang: string) => {
    if (lang === 'en') {
      return `Rua ${data.subDistrict}, ${data.addressNumber}, ${data.district}, ${data.province}`;
    }
    return data.addressThai;
  },

  // Green + yellow accent for Brazil
  accent: {
    dark: {
      gold: '#009739',
      goldLight: '#00A843',
      goldBg: 'rgba(0, 151, 57, 0.1)',
      goldBorder: 'rgba(0, 151, 57, 0.18)',
      navy: '#0A3D1F',
    },
    light: {
      gold: '#007A2F',
      goldLight: '#006B28',
      goldBg: 'rgba(0, 122, 47, 0.08)',
      goldBorder: 'rgba(0, 122, 47, 0.15)',
      navy: '#0A3D1F',
    },
  },

  translations: {
    'header.title': { en: 'Brazil CIN', pt: 'Carteira de Identidade' },
    'header.sub': { en: 'Carteira de Identidade Nacional', pt: 'National Identity Card' },
    'card.flipHint': { en: 'Tap card to flip', pt: 'Toque para virar' },
    'section.cardholder': { en: 'Cardholder', pt: 'Titular' },
    'section.cardInfo': { en: 'Card Information', pt: 'Informações do Cartão' },
    'section.qrDetails': { en: 'QR Details', pt: 'Detalhes QR' },
    'id.label': { en: 'CPF Number', pt: 'Número do CPF' },
    'id.personalNo': { en: 'CPF', pt: 'CPF' },
    'info.dob': { en: 'DATE OF BIRTH', pt: 'DATA DE NASCIMENTO' },
    'info.age': { en: 'AGE', pt: 'IDADE' },
    'info.ageUnit': { en: ' yrs', pt: ' anos' },
    'info.province': { en: 'State', pt: 'Estado' },
    'info.district': { en: 'City', pt: 'Cidade' },
    'info.issued': { en: 'DATE OF ISSUE', pt: 'DATA DE EXPEDIÇÃO' },
    'info.expires': { en: 'DATE OF EXPIRY', pt: 'DATA DE VALIDADE' },
    'info.address': { en: 'ADDRESS', pt: 'ENDEREÇO' },
    'info.laser': { en: 'Serial No.', pt: 'Nº de Série' },
    'digital.title': { en: 'Digital ID', pt: 'ID Digital' },
    'digital.sub': { en: 'Identidade Digital', pt: 'Digital Identity Card' },
    'digital.scanHint': { en: 'Scan to verify identity', pt: 'Escaneie para verificar' },
    'digital.regen': { en: 'REGEN', pt: 'ATUALIZAR' },
    'digital.expires': { en: 'EXPIRES', pt: 'VALIDADE' },
    'digital.generated': { en: 'Generated', pt: 'Gerado em' },
    'digital.refreshes': { en: 'Refreshes in', pt: 'Atualiza em' },
    'digital.scanCount': { en: 'Scan Count', pt: 'Contagem' },
    'digital.encryption': { en: 'Encryption', pt: 'Criptografia' },
    'digital.protocol': { en: 'Protocol', pt: 'Protocolo' },
    'digital.disclaimer': {
      en: 'This digital ID is for reference only. Present your physical card for official verification.',
      pt: 'Este ID digital é apenas para referência. Apresente seu documento físico para verificação oficial.',
    },
    'settings.subNative': { en: 'Configurações do Aplicativo', pt: 'Application Settings' },
    'settings.title': { en: 'Settings', pt: 'Configurações' },
    'settings.security': { en: 'Security', pt: 'Segurança' },
    'settings.preferences': { en: 'Preferences', pt: 'Preferências' },
    'settings.about': { en: 'About', pt: 'Sobre' },
    'settings.biometric': { en: 'Biometric Lock', pt: 'Bloqueio Biométrico' },
    'settings.pin': { en: 'Change PIN', pt: 'Alterar PIN' },
    'settings.privacy': { en: 'Privacy Mode', pt: 'Modo Privacidade' },
    'settings.notifications': { en: 'Notifications', pt: 'Notificações' },
    'settings.language': { en: 'Language', pt: 'Idioma' },
    'settings.theme': { en: 'Theme', pt: 'Tema' },
    'settings.country': { en: 'Country', pt: 'País' },
    'settings.version': { en: 'Version', pt: 'Versão' },
    'settings.terms': { en: 'Terms', pt: 'Termos' },
    'settings.privacyPolicy': { en: 'Privacy', pt: 'Privacidade' },
    'settings.support': { en: 'Support', pt: 'Suporte' },
    'settings.dark': { en: 'Dark', pt: 'Escuro' },
    'tab.identity': { en: 'Identity', pt: 'Identidade' },
    'tab.qr': { en: 'QR Code', pt: 'QR Code' },
    'tab.settings': { en: 'Settings', pt: 'Ajustes' },
    'lock.title': { en: 'Brazil CIN', pt: 'Carteira de Identidade' },
    'lock.message': { en: 'Authentication required\nto access your ID card', pt: 'Autenticação necessária\npara acessar sua identidade' },
    'lock.button': { en: 'Authenticate', pt: 'Autenticar' },
    'expanded.smartCard': { en: 'SMART CARD', pt: 'CARTÃO INTELIGENTE' },
    'expanded.chipSerial': { en: 'CHIP SERIAL', pt: 'SERIAL DO CHIP' },
    'expanded.generation': { en: 'GENERATION', pt: 'GERAÇÃO' },
    'expanded.interface': { en: 'INTERFACE', pt: 'INTERFACE' },
    'expanded.standard': { en: 'STANDARD', pt: 'PADRÃO' },
    'expanded.biometric': { en: 'BIOMETRIC DATA', pt: 'DADOS BIOMÉTRICOS' },
    'expanded.fingerprint': { en: 'FINGERPRINT', pt: 'IMPRESSÃO DIGITAL' },
    'expanded.faceTemplate': { en: 'FACE TEMPLATE', pt: 'MODELO FACIAL' },
    'expanded.irisScan': { en: 'IRIS SCAN', pt: 'ESCANEAMENTO DE ÍRIS' },
    'expanded.enrolled': { en: 'ENROLLED', pt: 'REGISTRADO' },
    'expanded.na': { en: 'N/A', pt: 'N/D' },
    'expanded.genValue': { en: 'Gen 3 · Smart Card', pt: 'Geração 3 · Cartão Inteligente' },
    'expanded.interfaceValue': { en: 'Contact + NFC', pt: 'Contato + NFC' },
    'attribution.dept': { en: 'MINISTRY OF JUSTICE AND PUBLIC SECURITY', pt: 'MINISTÉRIO DA JUSTIÇA E SEGURANÇA PÚBLICA' },
    'attribution.note': { en: 'Authorized digital identification application\nFor official use only', pt: 'Aplicação autorizada de identificação digital\nPara uso oficial apenas' },
  },

  defaultCardData: {
    titleThai: 'Carteira de Identidade Nacional',
    titleEnglish: 'Brazilian National ID (CIN)',
    idNumber: '847.293.610-54',
    idNumberCompact: '84729361054',
    nameThai: 'Lucas Oliveira Santos',
    namePrefix: 'Mr.',
    firstName: 'Lucas',
    lastName: 'Oliveira Santos',
    fullNameEnglish: 'Mr. Lucas Oliveira Santos',
    dateOfBirthThai: '27/12/1996',
    dateOfBirth: '27 Dec. 1996',
    addressThai: 'Rua das Flores, 123, Apt. 402, Copacabana, Rio de Janeiro - RJ, 22041-001',
    addressNumber: '123',
    moo: '',
    subDistrict: 'das Flores',
    district: 'Copacabana',
    province: 'Rio de Janeiro - RJ, 22041-001',
    dateOfIssueThai: '05/09/2023',
    dateOfIssue: '5 Sep. 2023',
    dateOfExpiryThai: '26/12/2031',
    dateOfExpiry: '26 Dec. 2031',
    sex: 'Male',
    sexThai: 'Masculino',
    nationality: 'Brazilian',
    nationalityThai: 'Brasileiro',
    bloodType: 'O+',
    reference: 'SSP-SP-2023-847293',
    laserCode: 'BR7-8472936-10',
    isValid: true,
    pictureUri: DEFAULT_PORTRAIT_URI,
  },
};
