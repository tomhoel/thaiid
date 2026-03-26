import { type CountryConfig } from '../context/CountryContext';
import { DEFAULT_PORTRAIT_URI } from '../constants/defaultPortrait';

const THAI_MONTHS: Record<string, string> = {
  Jan: 'ม.ค.', Feb: 'ก.พ.', Mar: 'มี.ค.', Apr: 'เม.ย.', May: 'พ.ค.', Jun: 'มิ.ย.',
  Jul: 'ก.ค.', Aug: 'ส.ค.', Sep: 'ก.ย.', Oct: 'ต.ค.', Nov: 'พ.ย.', Dec: 'ธ.ค.',
};

function toThaiDate(en: string): string {
  const parts = en.replace('.', '').split(' ');
  if (parts.length !== 3) return en;
  const day = parts[0];
  const month = THAI_MONTHS[parts[1]] ?? parts[1];
  const year = (parseInt(parts[2], 10) + 543).toString();
  return `${day} ${month} ${year}`;
}

export const THAILAND_CONFIG: CountryConfig = {
  code: 'TH',
  name: { english: 'KINGDOM OF THAILAND', primary: 'ราชอาณาจักรไทย' },
  issuer: { english: 'Dept. of Provincial Administration', primary: 'กรมการปกครอง' },
  ministry: 'MINISTRY OF INTERIOR · KINGDOM OF THAILAND',
  splashFooter: 'ระบบบัตรประจำตัวประชาชน',
  qrType: 'THAI_NATIONAL_ID',
  systemReference: 'TH-DPA-BORA',
  chipSerial: 'THC-4A2B-7F91-E3D0',
  cardDescription: 'Thai National ID card',

  emblemAsset: require('../../assets/garuda.png'),
  cardImages: {
    front: require('../../pics/1.png'),
    back: require('../../pics/2.png'),
  },

  flagLabel: 'ไทย',

  secondaryLanguage: { code: 'th', label: 'ไทย', langName: 'Thai' },

  dateFormat: {
    toLocal: toThaiDate,
  },

  holoStripSide: 'left',
  holoStripOffset: 0.08,

  addressFormatter: (data: any, lang: string) => {
    if (lang === 'en') {
      return `${data.addressNumber} Moo ${data.moo}, ${data.subDistrict}, ${data.district}, ${data.province}`;
    }
    return data.addressThai;
  },

  translations: {
    'header.title': { en: 'Thai National ID', th: 'บัตรประจำตัวประชาชน' },
    'header.sub': { en: 'บัตรประจำตัวประชาชน', th: 'Thai National ID Card' },
    'card.flipHint': { en: 'Tap card to flip', th: 'แตะเพื่อพลิกบัตร' },
    'section.cardholder': { en: 'Cardholder', th: 'ผู้ถือบัตร' },
    'section.cardInfo': { en: 'Card Information', th: 'ข้อมูลบัตร' },
    'section.qrDetails': { en: 'QR Details', th: 'รายละเอียด QR' },
    'id.label': { en: 'Identification Number', th: 'เลขประจำตัวประชาชน' },
    'id.personalNo': { en: 'PERSONAL NO.', th: 'เลขประจำตัว' },
    'info.dob': { en: 'DATE OF BIRTH', th: 'วันเกิด' },
    'info.age': { en: 'AGE', th: 'อายุ' },
    'info.ageUnit': { en: ' yrs', th: ' ปี' },
    'info.province': { en: 'Province', th: 'จังหวัด' },
    'info.district': { en: 'District', th: 'อำเภอ' },
    'info.issued': { en: 'DATE OF ISSUE', th: 'ออกบัตร' },
    'info.expires': { en: 'DATE OF EXPIRY', th: 'หมดอายุ' },
    'info.address': { en: 'ADDRESS', th: 'ที่อยู่' },
    'info.laser': { en: 'Laser Code', th: 'รหัสเลเซอร์' },
    'digital.title': { en: 'Digital ID', th: 'บัตรดิจิทัล' },
    'digital.sub': { en: 'บัตรประชาชนดิจิทัล', th: 'Digital Identity Card' },
    'digital.scanHint': { en: 'Scan to verify identity', th: 'สแกนเพื่อยืนยันตัวตน' },
    'digital.regen': { en: 'REGEN', th: 'สร้างใหม่' },
    'digital.expires': { en: 'EXPIRES', th: 'หมดอายุ' },
    'digital.generated': { en: 'Generated', th: 'สร้างเมื่อ' },
    'digital.refreshes': { en: 'Refreshes in', th: 'รีเฟรชใน' },
    'digital.scanCount': { en: 'Scan Count', th: 'จำนวนสแกน' },
    'digital.encryption': { en: 'Encryption', th: 'การเข้ารหัส' },
    'digital.protocol': { en: 'Protocol', th: 'โปรโตคอล' },
    'digital.disclaimer': {
      en: 'This digital ID is for reference only. Present your physical card for official verification.',
      th: 'บัตรดิจิทัลนี้ใช้เพื่ออ้างอิงเท่านั้น กรุณาแสดงบัตรตัวจริงเพื่อการยืนยันอย่างเป็นทางการ',
    },
    'settings.subNative': { en: 'ตั้งค่าแอปพลิเคชัน', th: 'Application Settings' },
    'settings.title': { en: 'Settings', th: 'การตั้งค่า' },
    'settings.security': { en: 'Security', th: 'ความปลอดภัย' },
    'settings.preferences': { en: 'Preferences', th: 'การตั้งค่า' },
    'settings.about': { en: 'About', th: 'เกี่ยวกับ' },
    'settings.biometric': { en: 'Biometric Lock', th: 'ล็อกด้วยไบโอเมตริกซ์' },
    'settings.pin': { en: 'Change PIN', th: 'เปลี่ยน PIN' },
    'settings.privacy': { en: 'Privacy Mode', th: 'โหมดความเป็นส่วนตัว' },
    'settings.notifications': { en: 'Notifications', th: 'การแจ้งเตือน' },
    'settings.language': { en: 'Language', th: 'ภาษา' },
    'settings.theme': { en: 'Theme', th: 'ธีม' },
    'settings.country': { en: 'Country', th: 'ประเทศ' },
    'settings.version': { en: 'Version', th: 'เวอร์ชัน' },
    'settings.terms': { en: 'Terms', th: 'ข้อกำหนด' },
    'settings.privacyPolicy': { en: 'Privacy', th: 'นโยบายส่วนตัว' },
    'settings.support': { en: 'Support', th: 'ช่วยเหลือ' },
    'settings.dark': { en: 'Dark', th: 'มืด' },
    'tab.identity': { en: 'Identity', th: 'บัตร' },
    'tab.qr': { en: 'QR Code', th: 'คิวอาร์โค้ด' },
    'tab.settings': { en: 'Settings', th: 'ตั้งค่า' },
    'lock.title': { en: 'Thai National ID', th: 'บัตรประจำตัวประชาชน' },
    'lock.message': { en: 'Authentication required\nto access your ID card', th: 'ต้องยืนยันตัวตน\nเพื่อเข้าถึงบัตรประจำตัว' },
    'lock.button': { en: 'Authenticate', th: 'ยืนยันตัวตน' },
    'expanded.smartCard': { en: 'SMART CARD', th: 'สมาร์ทการ์ด' },
    'expanded.chipSerial': { en: 'CHIP SERIAL', th: 'ชิปซีเรียล' },
    'expanded.generation': { en: 'GENERATION', th: 'รุ่น' },
    'expanded.interface': { en: 'INTERFACE', th: 'อินเตอร์เฟส' },
    'expanded.standard': { en: 'STANDARD', th: 'มาตรฐาน' },
    'expanded.biometric': { en: 'BIOMETRIC DATA', th: 'ข้อมูลไบโอเมตริก' },
    'expanded.fingerprint': { en: 'FINGERPRINT', th: 'ลายนิ้วมือ' },
    'expanded.faceTemplate': { en: 'FACE TEMPLATE', th: 'แม่แบบใบหน้า' },
    'expanded.irisScan': { en: 'IRIS SCAN', th: 'สแกนม่านตา' },
    'expanded.enrolled': { en: 'ENROLLED', th: 'ลงทะเบียน' },
    'expanded.na': { en: 'N/A', th: 'ไม่มี' },
    'expanded.genValue': { en: 'Gen 4 · Smart Card', th: 'รุ่น 4 · สมาร์ทการ์ด' },
    'expanded.interfaceValue': { en: 'Contact + RFID', th: 'สัมผัส + RFID' },
    'attribution.dept': { en: 'DEPARTMENT OF PROVINCIAL ADMINISTRATION', th: 'กรมการปกครอง' },
    'attribution.note': { en: 'Authorized digital identification application\nสำหรับใช้งานอย่างเป็นทางการเท่านั้น', th: 'แอปพลิเคชันยืนยันตัวตนดิจิทัลอย่างเป็นทางการ\nAuthorized digital identification application' },
  },

  defaultCardData: {
    titleThai: 'บัตรประจำตัวประชาชน',
    titleEnglish: 'Thai National ID Card',
    idNumber: '1 6501 00094 20 4',
    idNumberCompact: '1650100094204',
    nameThai: 'นาย กรวิชญ์ ฉ่ำไกร',
    namePrefix: 'Mr.',
    firstName: 'Korawit',
    lastName: 'Chamkrai',
    fullNameEnglish: 'Mr. Korawit Chamkrai',
    dateOfBirthThai: '27 ธ.ค. 2539',
    dateOfBirth: '27 Dec. 1996',
    addressThai: '65/2 หมู่ที่ 3 ต.หัวรอ อ.เมืองพิษณุโลก จ.พิษณุโลก',
    addressNumber: '65/2',
    moo: '3',
    subDistrict: 'หัวรอ',
    district: 'เมืองพิษณุโลก',
    province: 'พิษณุโลก',
    dateOfIssueThai: '5 ก.ย. 2566',
    dateOfIssue: '5 Sep. 2023',
    dateOfExpiryThai: '26 ธ.ค. 2574',
    dateOfExpiry: '26 Dec. 2031',
    sex: 'Male',
    sexThai: 'ชาย',
    nationality: 'Thai',
    nationalityThai: 'ไทย',
    bloodType: 'O+',
    reference: '6501-02-09051034',
    laserCode: 'ME5-1694541-81',
    isValid: true,
    pictureUri: DEFAULT_PORTRAIT_URI,
  },
};
