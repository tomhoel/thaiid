import React, { createContext, useContext, useState, useCallback } from 'react';

type Lang = 'en' | 'th';

interface LangContextType {
  lang: Lang;
  toggle: () => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Lang, string>> = {
  // Header
  'header.title': { en: 'Thai National ID', th: 'บัตรประจำตัวประชาชน' },
  'header.sub': { en: 'บัตรประจำตัวประชาชน', th: 'Thai National ID Card' },

  // Card
  'card.flipHint': { en: 'Tap card to flip', th: 'แตะเพื่อพลิกบัตร' },

  // Sections
  'section.cardholder': { en: 'Cardholder', th: 'ผู้ถือบัตร' },
  'section.cardInfo': { en: 'Card Information', th: 'ข้อมูลบัตร' },
  'section.qrDetails': { en: 'QR Details', th: 'รายละเอียด QR' },

  // Cardholder
  'id.label': { en: 'Identification Number', th: 'เลขประจำตัวประชาชน' },

  // Info rows
  'info.dob': { en: 'Date of Birth', th: 'วันเกิด' },
  'info.province': { en: 'Province', th: 'จังหวัด' },
  'info.district': { en: 'District', th: 'อำเภอ' },
  'info.issued': { en: 'Issued', th: 'วันที่ออกบัตร' },
  'info.expires': { en: 'Expires', th: 'วันหมดอายุ' },
  'info.laser': { en: 'Laser Code', th: 'รหัสเลเซอร์' },

  // Digital tab
  'digital.title': { en: 'Digital ID', th: 'บัตรดิจิทัล' },
  'digital.sub': { en: 'บัตรประชาชนดิจิทัล', th: 'Digital Identity Card' },
  'digital.scanHint': { en: 'Scan to verify identity', th: 'สแกนเพื่อยืนยันตัวตน' },
  'digital.generated': { en: 'Generated', th: 'สร้างเมื่อ' },
  'digital.refreshes': { en: 'Refreshes in', th: 'รีเฟรชใน' },
  'digital.scanCount': { en: 'Scan Count', th: 'จำนวนสแกน' },
  'digital.encryption': { en: 'Encryption', th: 'การเข้ารหัส' },
  'digital.protocol': { en: 'Protocol', th: 'โปรโตคอล' },
  'digital.disclaimer': {
    en: 'This digital ID is for reference only. Present your physical card for official verification.',
    th: 'บัตรดิจิทัลนี้ใช้เพื่ออ้างอิงเท่านั้น กรุณาแสดงบัตรตัวจริงเพื่อการยืนยันอย่างเป็นทางการ',
  },

  // Settings
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
  'settings.version': { en: 'Version', th: 'เวอร์ชัน' },
  'settings.terms': { en: 'Terms', th: 'ข้อกำหนด' },
  'settings.privacyPolicy': { en: 'Privacy', th: 'นโยบายส่วนตัว' },
  'settings.support': { en: 'Support', th: 'ช่วยเหลือ' },
  'settings.dark': { en: 'Dark', th: 'มืด' },

  // Tab labels
  'tab.identity': { en: 'Identity', th: 'บัตร' },
  'tab.qr': { en: 'QR Code', th: 'คิวอาร์โค้ด' },
  'tab.settings': { en: 'Settings', th: 'ตั้งค่า' },
};

const LangContext = createContext<LangContextType>({
  lang: 'en',
  toggle: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  const toggle = useCallback(() => {
    setLang(prev => prev === 'en' ? 'th' : 'en');
  }, []);

  const t = useCallback((key: string) => {
    return translations[key]?.[lang] ?? key;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
