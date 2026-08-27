import { ProfileType } from '../types/profile';

export interface DigitalIdPayload {
  version: string;
  idNumber: string;
  fullName: string;
  issuer: string;
  country: string;
  validUntil: number;
  token: string;
  checksum: string;
}

export class TokenService {
  /** Generate a fast checksum for tamper-evidence */
  private static calculateChecksum(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /** Generate a rotating 15-second verification token */
  static generateToken(idNumber: string, epochSeconds = Math.floor(Date.now() / 1000)): string {
    const timeStep = Math.floor(epochSeconds / 15);
    const raw = `${idNumber}:${timeStep}:TH-DIGITAL-ID-SECURE`;
    return this.calculateChecksum(raw).toUpperCase();
  }

  /** Build standard Digital ID QR JSON payload */
  static generateQrPayload(profile: ProfileType, countryCode: string): string {
    const now = Math.floor(Date.now() / 1000);
    const validUntil = now + 15;
    const token = this.generateToken(profile.idNumber, now);

    const baseData = {
      v: '1.0',
      id: profile.idNumberCompact || profile.idNumber,
      name: profile.fullNameEnglish,
      country: countryCode,
      exp: validUntil,
      tok: token,
    };

    const checksum = this.calculateChecksum(JSON.stringify(baseData));

    const payload = {
      ...baseData,
      sig: checksum,
    };

    return JSON.stringify(payload);
  }
}
