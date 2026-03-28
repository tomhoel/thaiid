import { type CountryConfig } from '../context/CountryContext';
import { DEFAULT_PORTRAIT_URI } from '../constants/defaultPortrait';

function toVnDate(en: string): string {
  // Convert "27 Dec. 1996" → "27/12/1996"
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const parts = en.replace(/\./g, '').split(' ');
  if (parts.length !== 3) return en;
  return `${parts[0].padStart(2, '0')}/${months[parts[1]] ?? '01'}/${parts[2]}`;
}

export const VIETNAM_CONFIG: CountryConfig = {
  code: 'VN',
  name: { english: 'REPUBLIC OF VIETNAM', primary: 'CỘNG HÒA VIỆT NAM' },
  issuer: { english: 'Ministry of Public Security', primary: 'Bộ Công An' },
  ministry: 'BỘ CÔNG AN · VIỆT NAM',
  splashFooter: 'Hệ thống Căn Cước Công Dân',
  qrType: 'VN_CCCD',
  systemReference: 'VN-MPS-CCCD',
  chipSerial: 'VNC-5B7E-3A81-D2F4',
  cardDescription: 'Vietnamese Citizen Identity Card (Căn Cước Công Dân)',
  cardPromptHint: 'This is a horizontal Vietnamese citizen identity card (CCCD). The portrait photo is on the LEFT side, below the national emblem. Text fields (number, full name, date of birth, sex, nationality, place of origin, place of residence) are on the RIGHT side. The card has a light blue/teal background with Vietnamese decorative patterns and a watermark. The national emblem (gold star on red) is in the upper left. There is a gold chip on the lower left below the portrait. The header reads "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" and "CĂN CƯỚC CÔNG DÂN".',

  emblemAsset: require('../../assets/vn-emblem.png'),
  cardImages: {
    front: require('../../assets/cards/vn-front.webp'),
    back: require('../../assets/cards/vn-back.webp'),
  },

  flagLabel: 'Việt Nam',

  secondaryLanguage: { code: 'vi', label: 'Tiếng Việt', langName: 'Vietnamese' },

  dateFormat: {
    toLocal: toVnDate,
  },

  holoStripSide: 'left',
  holoStripOffset: 0.06,

  addressFormatter: (data: Record<string, any>, lang: string) => {
    if (lang === 'en') {
      return [data.addressNumber, data.subDistrict, data.district, data.province]
        .filter(Boolean).join(', ');
    }
    return data.addressThai; // addressThai field reused for local address
  },

  translations: {
    'header.title': { en: 'Vietnam ID Card', vi: 'Căn Cước Công Dân' },
    'header.sub': { en: 'Căn Cước Công Dân', vi: 'Vietnam Citizen ID Card' },
    'card.flipHint': { en: 'Tap card to flip', vi: 'Chạm để lật thẻ' },
    'card.updated': { en: 'ID Card Updated', vi: 'Thẻ đã cập nhật' },
    'section.cardholder': { en: 'Cardholder', vi: 'Chủ thẻ' },
    'section.cardInfo': { en: 'Card Information', vi: 'Thông tin thẻ' },
    'section.qrDetails': { en: 'QR Details', vi: 'Chi tiết QR' },
    'id.label': { en: 'ID Number', vi: 'Số CCCD' },
    'id.personalNo': { en: 'ID NO.', vi: 'Số' },
    'info.dob': { en: 'DATE OF BIRTH', vi: 'NGÀY SINH' },
    'info.age': { en: 'AGE', vi: 'TUỔI' },
    'info.ageUnit': { en: ' yrs', vi: ' tuổi' },
    'info.province': { en: 'Province/City', vi: 'Tỉnh/TP' },
    'info.district': { en: 'District', vi: 'Quận/Huyện' },
    'info.issued': { en: 'DATE OF ISSUE', vi: 'NGÀY CẤP' },
    'info.expires': { en: 'DATE OF EXPIRY', vi: 'NGÀY HẾT HẠN' },
    'info.address': { en: 'ADDRESS', vi: 'ĐỊA CHỈ' },
    'info.laser': { en: 'Serial No.', vi: 'Số Seri' },
    'digital.title': { en: 'Digital ID', vi: 'CCCD Điện Tử' },
    'digital.sub': { en: 'Xác thực số công dân', vi: 'Digital Citizen ID' },
    'digital.scanHint': { en: 'Scan to verify identity', vi: 'Quét để xác thực danh tính' },
    'digital.regen': { en: 'REGEN', vi: 'LÀM MỚI' },
    'digital.expires': { en: 'EXPIRES', vi: 'HẾT HẠN' },
    'digital.generated': { en: 'Generated', vi: 'Tạo lúc' },
    'digital.refreshes': { en: 'Refreshes in', vi: 'Làm mới sau' },
    'digital.scanCount': { en: 'Scan Count', vi: 'Số lần quét' },
    'digital.encryption': { en: 'Encryption', vi: 'Mã hóa' },
    'digital.protocol': { en: 'Protocol', vi: 'Giao thức' },
    'digital.disclaimer': {
      en: 'This digital ID is for reference only. Present your physical card for official verification.',
      vi: 'CCCD điện tử chỉ mang tính tham khảo. Vui lòng xuất trình thẻ gốc để xác thực chính thức.',
    },
    'settings.subNative': { en: 'Cài đặt ứng dụng', vi: 'Application Settings' },
    'settings.title': { en: 'Settings', vi: 'Cài đặt' },
    'settings.security': { en: 'Security', vi: 'Bảo mật' },
    'settings.preferences': { en: 'Preferences', vi: 'Tùy chọn' },
    'settings.about': { en: 'About', vi: 'Giới thiệu' },
    'settings.biometric': { en: 'Biometric Lock', vi: 'Khóa sinh trắc học' },
    'settings.pin': { en: 'Change PIN', vi: 'Đổi mã PIN' },
    'settings.privacy': { en: 'Privacy Mode', vi: 'Chế độ riêng tư' },
    'settings.notifications': { en: 'Notifications', vi: 'Thông báo' },
    'settings.language': { en: 'Language', vi: 'Ngôn ngữ' },
    'settings.theme': { en: 'Theme', vi: 'Giao diện' },
    'settings.country': { en: 'Country', vi: 'Quốc gia' },
    'settings.version': { en: 'Version', vi: 'Phiên bản' },
    'settings.terms': { en: 'Terms', vi: 'Điều khoản' },
    'settings.privacyPolicy': { en: 'Privacy', vi: 'Quyền riêng tư' },
    'settings.support': { en: 'Support', vi: 'Hỗ trợ' },
    'settings.dark': { en: 'Dark', vi: 'Tối' },
    'tab.identity': { en: 'Identity', vi: 'Thẻ CCCD' },
    'tab.qr': { en: 'QR Code', vi: 'Mã QR' },
    'tab.settings': { en: 'Settings', vi: 'Cài đặt' },
    'lock.title': { en: 'Vietnam CCCD', vi: 'Căn Cước Công Dân' },
    'lock.message': { en: 'Authentication required\nto access your ID card', vi: 'Cần xác thực\nđể truy cập thẻ CCCD' },
    'lock.button': { en: 'Authenticate', vi: 'Xác thực' },
    'expanded.smartCard': { en: 'SMART CARD', vi: 'THẺ THÔNG MINH' },
    'expanded.chipSerial': { en: 'CHIP SERIAL', vi: 'SỐ SERI CHIP' },
    'expanded.generation': { en: 'GENERATION', vi: 'THẾ HỆ' },
    'expanded.interface': { en: 'INTERFACE', vi: 'GIAO DIỆN' },
    'expanded.standard': { en: 'STANDARD', vi: 'TIÊU CHUẨN' },
    'expanded.biometric': { en: 'BIOMETRIC DATA', vi: 'DỮ LIỆU SINH TRẮC HỌC' },
    'expanded.fingerprint': { en: 'FINGERPRINT', vi: 'VÂN TAY' },
    'expanded.faceTemplate': { en: 'FACE TEMPLATE', vi: 'MẪU KHUÔN MẶT' },
    'expanded.irisScan': { en: 'IRIS SCAN', vi: 'QUÉT MỐNG MẮT' },
    'expanded.enrolled': { en: 'ENROLLED', vi: 'ĐÃ ĐĂNG KÝ' },
    'expanded.na': { en: 'N/A', vi: 'Không có' },
    'expanded.genValue': { en: 'Gen 5 · Smart Card', vi: 'Thế hệ 5 · Thẻ thông minh' },
    'expanded.interfaceValue': { en: 'Contact + NFC', vi: 'Tiếp xúc + NFC' },
    'details.cardDetails': { en: 'Card Details', vi: 'Chi tiết thẻ' },
    'details.personal': { en: 'Personal', vi: 'Cá nhân' },
    'details.identification': { en: 'Identification', vi: 'Nhận dạng' },
    'details.validity': { en: 'Validity', vi: 'Hiệu lực' },
    'details.name': { en: 'Name', vi: 'Họ và tên' },
    'details.dob': { en: 'Date of Birth', vi: 'Ngày sinh' },
    'details.idNumber': { en: 'ID Number', vi: 'Số CCCD' },
    'details.reference': { en: 'Reference', vi: 'Mã tham chiếu' },
    'details.subDistrict': { en: 'Ward', vi: 'Phường/Xã' },
    'details.issued': { en: 'Issued', vi: 'Ngày cấp' },
    'details.expires': { en: 'Expires', vi: 'Hết hạn' },
    'details.status': { en: 'Status', vi: 'Trạng thái' },
    'details.statusActive': { en: 'Active', vi: 'Còn hiệu lực' },
    'details.statusExpiring': { en: 'Expiring Soon', vi: 'Sắp hết hạn' },
    'details.statusExpired': { en: 'Expired', vi: 'Hết hạn' },
    'attribution.dept': { en: 'MINISTRY OF PUBLIC SECURITY', vi: 'BỘ CÔNG AN' },
    'attribution.note': { en: 'Authorized digital identification application\nFor official use only', vi: 'Ứng dụng xác thực số được ủy quyền\nChỉ dành cho mục đích chính thức' },
  },

  // Vietnamese red accent — emblem is pre-colored yellow (no tint)
  emblemTinted: false,
  accent: {
    dark: {
      gold: '#DA251D',
      goldLight: '#FF4136',
      goldBg: 'rgba(218, 37, 29, 0.10)',
      goldBorder: 'rgba(218, 37, 29, 0.18)',
      navy: '#8B1A15',
    },
    light: {
      gold: '#C8201A',
      goldLight: '#DA251D',
      goldBg: 'rgba(200, 32, 26, 0.08)',
      goldBorder: 'rgba(200, 32, 26, 0.15)',
      navy: '#8B1A15',
    },
  },

  defaultCardData: {
    titleThai: 'Căn Cước Công Dân',
    titleEnglish: 'Vietnamese Citizen ID Card',
    idNumber: '079 096 038 217',
    idNumberCompact: '079096038217',
    nameThai: 'NGUYỄN VĂN ANH',
    namePrefix: 'Mr.',
    firstName: 'Van Anh',
    lastName: 'Nguyen',
    fullNameEnglish: 'Mr. Nguyen Van Anh',
    dateOfBirthThai: '27/12/1996',
    dateOfBirth: '27 Dec. 1996',
    addressThai: '45 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    addressNumber: '45',
    moo: '',
    subDistrict: 'Phường Bến Nghé',
    district: 'Quận 1',
    province: 'TP. Hồ Chí Minh',
    dateOfIssueThai: '05/09/2023',
    dateOfIssue: '5 Sep. 2023',
    dateOfExpiryThai: '26/12/2031',
    dateOfExpiry: '26 Dec. 2031',
    sex: 'Male',
    sexThai: 'Nam',
    nationality: 'Vietnamese',
    nationalityThai: 'Việt Nam',
    bloodType: 'B+',
    reference: 'MPS-2023-001204012',
    laserCode: 'VN2-0012040-23',
    isValid: true,
    pictureUri: DEFAULT_PORTRAIT_URI,
  },
};
