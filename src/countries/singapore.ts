import { type CountryConfig } from '../context/CountryContext';
import { DEFAULT_PORTRAIT_URI } from '../constants/defaultPortrait';

function toSgDate(en: string): string {
  // Convert "15 Mar. 1990" → "15/03/1990"
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const parts = en.replace(/\./g, '').split(' ');
  if (parts.length !== 3) return en;
  return `${parts[0].padStart(2, '0')}/${months[parts[1]] ?? '01'}/${parts[2]}`;
}

export const SINGAPORE_CONFIG: CountryConfig = {
  code: 'SG',
  name: { english: 'REPUBLIC OF SINGAPORE', primary: '新加坡共和国' },
  issuer: { english: 'Immigration & Checkpoints Authority', primary: '移民与关卡局' },
  ministry: 'MINISTRY OF HOME AFFAIRS · REPUBLIC OF SINGAPORE',
  splashFooter: 'National Registration Identity Card System',
  qrType: 'SG_NRIC',
  systemReference: 'SG-ICA-NRIC',
  chipSerial: 'SGC-8E3F-2A17-B5C4',
  cardDescription: 'Singapore NRIC card',
  cardPromptHint: 'This is a horizontal NRIC card. The portrait photo is on the RIGHT side. Text fields (name, race, dates) are on the LEFT side. The card has a red gradient header bar and light grey body. There is a chip on the lower left.',

  emblemAsset: require('../../assets/sg-emblem.png'),
  cardImages: {
    front: require('../../assets/cards/sg-front.webp'),
    back: require('../../assets/cards/sg-back.webp'),
  },

  flagLabel: 'SG',

  secondaryLanguage: { code: 'zh', label: '中文', langName: 'Chinese' },

  dateFormat: {
    toLocal: toSgDate,
  },

  holoStripSide: 'right',
  holoStripOffset: 0.06,

  addressFormatter: (data: Record<string, any>, lang: string) => {
    if (lang === 'en') {
      return `Blk ${data.addressNumber}, ${data.subDistrict}, ${data.district}, Singapore ${data.province}`;
    }
    return data.addressThai; // addressThai field reused for local address
  },

  translations: {
    'header.title': { en: 'Singapore NRIC', zh: '新加坡身份证' },
    'header.sub': { en: '新加坡身份证', zh: 'Singapore NRIC' },
    'card.flipHint': { en: 'Tap card to flip', zh: '点击翻转' },
    'card.updated': { en: 'ID Card Updated', zh: '身份证已更新' },
    'section.cardholder': { en: 'Cardholder', zh: '持卡人' },
    'section.cardInfo': { en: 'Card Information', zh: '卡片信息' },
    'section.qrDetails': { en: 'QR Details', zh: 'QR 详情' },
    'id.label': { en: 'NRIC Number', zh: '身份证号码' },
    'id.personalNo': { en: 'NRIC NO.', zh: '身份证号' },
    'info.dob': { en: 'DATE OF BIRTH', zh: '出生日期' },
    'info.age': { en: 'AGE', zh: '年龄' },
    'info.ageUnit': { en: ' yrs', zh: ' 岁' },
    'info.province': { en: 'Postal Code', zh: '邮政编码' },
    'info.district': { en: 'District', zh: '区域' },
    'info.issued': { en: 'DATE OF ISSUE', zh: '签发日期' },
    'info.expires': { en: 'DATE OF EXPIRY', zh: '到期日期' },
    'info.address': { en: 'ADDRESS', zh: '地址' },
    'info.laser': { en: 'Serial No.', zh: '序列号' },
    'digital.title': { en: 'Digital ID', zh: '数字身份证' },
    'digital.sub': { en: '数字身份验证', zh: 'Digital Identity Card' },
    'digital.scanHint': { en: 'Scan to verify identity', zh: '扫描以验证身份' },
    'digital.regen': { en: 'REGEN', zh: '更新' },
    'digital.expires': { en: 'EXPIRES', zh: '到期' },
    'digital.generated': { en: 'Generated', zh: '生成于' },
    'digital.refreshes': { en: 'Refreshes in', zh: '刷新于' },
    'digital.scanCount': { en: 'Scan Count', zh: '扫描次数' },
    'digital.encryption': { en: 'Encryption', zh: '加密' },
    'digital.protocol': { en: 'Protocol', zh: '协议' },
    'digital.disclaimer': {
      en: 'This digital ID is for reference only. Present your physical card for official verification.',
      zh: '此数字身份证仅供参考。请出示实体卡进行官方验证。',
    },
    'settings.subNative': { en: '应用设置', zh: 'Application Settings' },
    'settings.title': { en: 'Settings', zh: '设置' },
    'settings.security': { en: 'Security', zh: '安全' },
    'settings.preferences': { en: 'Preferences', zh: '偏好设置' },
    'settings.about': { en: 'About', zh: '关于' },
    'settings.biometric': { en: 'Biometric Lock', zh: '生物识别锁' },
    'settings.pin': { en: 'Change PIN', zh: '更改 PIN' },
    'settings.privacy': { en: 'Privacy Mode', zh: '隐私模式' },
    'settings.notifications': { en: 'Notifications', zh: '通知' },
    'settings.language': { en: 'Language', zh: '语言' },
    'settings.theme': { en: 'Theme', zh: '主题' },
    'settings.country': { en: 'Country', zh: '国家' },
    'settings.version': { en: 'Version', zh: '版本' },
    'settings.terms': { en: 'Terms', zh: '条款' },
    'settings.privacyPolicy': { en: 'Privacy', zh: '隐私政策' },
    'settings.support': { en: 'Support', zh: '支持' },
    'settings.dark': { en: 'Dark', zh: '暗色' },
    'tab.identity': { en: 'Identity', zh: '身份证' },
    'tab.qr': { en: 'QR Code', zh: '二维码' },
    'tab.settings': { en: 'Settings', zh: '设置' },
    'lock.title': { en: 'Singapore NRIC', zh: '新加坡身份证' },
    'lock.message': { en: 'Authentication required\nto access your ID card', zh: '需要身份验证\n才能访问您的身份证' },
    'lock.button': { en: 'Authenticate', zh: '验证身份' },
    'expanded.smartCard': { en: 'SMART CARD', zh: '智能卡' },
    'expanded.chipSerial': { en: 'CHIP SERIAL', zh: '芯片序列号' },
    'expanded.generation': { en: 'GENERATION', zh: '代' },
    'expanded.interface': { en: 'INTERFACE', zh: '接口' },
    'expanded.standard': { en: 'STANDARD', zh: '标准' },
    'expanded.biometric': { en: 'BIOMETRIC DATA', zh: '生物识别数据' },
    'expanded.fingerprint': { en: 'FINGERPRINT', zh: '指纹' },
    'expanded.faceTemplate': { en: 'FACE TEMPLATE', zh: '面部模板' },
    'expanded.irisScan': { en: 'IRIS SCAN', zh: '虹膜扫描' },
    'expanded.enrolled': { en: 'ENROLLED', zh: '已录入' },
    'expanded.na': { en: 'N/A', zh: '无' },
    'expanded.genValue': { en: 'Gen 5 · Smart Card', zh: '第5代 · 智能卡' },
    'expanded.interfaceValue': { en: 'Contact + NFC', zh: '接触 + NFC' },
    'details.cardDetails': { en: 'Card Details', zh: '卡片详情' },
    'details.personal': { en: 'Personal', zh: '个人信息' },
    'details.identification': { en: 'Identification', zh: '身份识别' },
    'details.validity': { en: 'Validity', zh: '有效期' },
    'details.name': { en: 'Name', zh: '姓名' },
    'details.dob': { en: 'Date of Birth', zh: '出生日期' },
    'details.idNumber': { en: 'NRIC Number', zh: '身份证号码' },
    'details.reference': { en: 'Reference', zh: '参考编号' },
    'details.subDistrict': { en: 'Street', zh: '街道' },
    'details.issued': { en: 'Issued', zh: '签发' },
    'details.expires': { en: 'Expires', zh: '到期' },
    'details.status': { en: 'Status', zh: '状态' },
    'details.statusActive': { en: 'Active', zh: '有效' },
    'details.statusExpiring': { en: 'Expiring Soon', zh: '即将到期' },
    'details.statusExpired': { en: 'Expired', zh: '已过期' },
    'attribution.dept': { en: 'IMMIGRATION & CHECKPOINTS AUTHORITY', zh: '移民与关卡局' },
    'attribution.note': { en: 'Authorized digital identification application\nFor official use only', zh: '官方授权数字身份验证应用\nAuthorized digital identification application' },
  },

  // Singapore red accent — replaces Thai gold
  accent: {
    dark: {
      gold: '#C42B3B',
      goldLight: '#EE2536',
      goldBg: 'rgba(238, 37, 54, 0.1)',
      goldBorder: 'rgba(238, 37, 54, 0.18)',
      navy: '#6B1520',
    },
    light: {
      gold: '#B71C2C',
      goldLight: '#C62828',
      goldBg: 'rgba(198, 40, 40, 0.08)',
      goldBorder: 'rgba(198, 40, 40, 0.15)',
      navy: '#6B1520',
    },
  },

  defaultCardData: {
    titleThai: '新加坡身份证',
    titleEnglish: 'Singapore NRIC',
    idNumber: 'S 8396 741 B',
    idNumberCompact: 'S8396741B',
    nameThai: '陈伟良',
    namePrefix: 'Mr.',
    firstName: 'Wei Liang',
    lastName: 'Tan',
    fullNameEnglish: 'Mr. Tan Wei Liang',
    dateOfBirthThai: '27/12/1996',
    dateOfBirth: '27 Dec. 1996',
    addressThai: 'Blk 65, Orchard Rd, #02-03, Singapore 238839',
    addressNumber: '65',
    moo: '',
    subDistrict: 'Orchard Rd',
    district: '#02-03',
    province: '238839',
    dateOfIssueThai: '05/09/2023',
    dateOfIssue: '5 Sep. 2023',
    dateOfExpiryThai: '26/12/2031',
    dateOfExpiry: '26 Dec. 2031',
    sex: 'Male',
    sexThai: '男',
    nationality: 'Singaporean',
    nationalityThai: '新加坡',
    bloodType: 'O+',
    reference: 'ICA-2023-8396741',
    laserCode: 'SG9-8396741-23',
    isValid: true,
    pictureUri: DEFAULT_PORTRAIT_URI,
  },
};
