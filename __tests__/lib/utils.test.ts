import {
  generateEventCode,
  generateQRCode,
  isAdmin,
  isSuperAdmin,
  calculateScorePercentage,
  calculateAgeFromDateOfBirth,
  convertFirestoreTimestamp,
  formatTimestamp,
  formatFullTimestamp,
  cn,
} from '../../lib/utils';

describe('lib/utils', () => {
  describe('generateEventCode', () => {
    it('returns a 6-character string', () => {
      const code = generateEventCode();
      expect(code).toHaveLength(6);
    });

    it('contains only uppercase alphanumeric characters', () => {
      for (let i = 0; i < 20; i++) {
        const code = generateEventCode();
        expect(code).toMatch(/^[A-Z0-9]{6}$/);
      }
    });

    it('generates different codes on successive calls', () => {
      const codes = new Set(Array.from({ length: 50 }, () => generateEventCode()));
      // With 36^6 possibilities, 50 codes should all be unique
      expect(codes.size).toBe(50);
    });
  });

  describe('isAdmin', () => {
    it('returns true for ADMIN', () => {
      expect(isAdmin('ADMIN')).toBe(true);
    });

    it('returns true for SUPER_ADMIN', () => {
      expect(isAdmin('SUPER_ADMIN')).toBe(true);
    });

    it('returns false for COMPETITOR', () => {
      expect(isAdmin('COMPETITOR')).toBe(false);
    });

    it('returns false for VIEWER', () => {
      expect(isAdmin('VIEWER')).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    it('returns true for SUPER_ADMIN', () => {
      expect(isSuperAdmin('SUPER_ADMIN')).toBe(true);
    });

    it('returns false for ADMIN', () => {
      expect(isSuperAdmin('ADMIN')).toBe(false);
    });

    it('returns false for COMPETITOR', () => {
      expect(isSuperAdmin('COMPETITOR')).toBe(false);
    });
  });

  describe('calculateScorePercentage', () => {
    it('calculates correct percentage', () => {
      expect(calculateScorePercentage(75, 100)).toBe(75);
    });

    it('returns 0 when maxScore is 0', () => {
      expect(calculateScorePercentage(50, 0)).toBe(0);
    });

    it('rounds to nearest integer', () => {
      expect(calculateScorePercentage(1, 3)).toBe(33);
    });

    it('handles score equal to max', () => {
      expect(calculateScorePercentage(100, 100)).toBe(100);
    });

    it('handles score of 0', () => {
      expect(calculateScorePercentage(0, 100)).toBe(0);
    });
  });

  describe('calculateAgeFromDateOfBirth', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-15').getTime());
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calculates age when birthday has passed this year', () => {
      const dob = new Date('1990-01-15');
      expect(calculateAgeFromDateOfBirth(dob)).toBe(36);
    });

    it('calculates age when birthday has not yet occurred this year', () => {
      const dob = new Date('1990-12-25');
      expect(calculateAgeFromDateOfBirth(dob)).toBe(35);
    });

    it('calculates age on the birthday itself', () => {
      const dob = new Date('1990-06-15');
      expect(calculateAgeFromDateOfBirth(dob)).toBe(36);
    });
  });

  describe('convertFirestoreTimestamp', () => {
    it('returns null for null/undefined', () => {
      expect(convertFirestoreTimestamp(null)).toBeNull();
      expect(convertFirestoreTimestamp(undefined)).toBeNull();
    });

    it('converts Firestore { seconds } object', () => {
      const ts = { seconds: 1700000000 };
      const result = convertFirestoreTimestamp(ts);
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBe(1700000000 * 1000);
    });

    it('converts Firestore { toDate() } object', () => {
      const expected = new Date('2024-01-01');
      const ts = { toDate: () => expected };
      expect(convertFirestoreTimestamp(ts)).toBe(expected);
    });

    it('passes through Date instances', () => {
      const date = new Date('2024-06-15');
      expect(convertFirestoreTimestamp(date)).toEqual(date);
    });

    it('converts valid string dates', () => {
      const result = convertFirestoreTimestamp('2024-06-15');
      expect(result).toBeInstanceOf(Date);
      expect(result!.getFullYear()).toBe(2024);
    });

    it('returns null for invalid string dates', () => {
      expect(convertFirestoreTimestamp('not-a-date')).toBeNull();
    });

    it('converts numeric timestamps', () => {
      const ms = 1700000000000;
      const result = convertFirestoreTimestamp(ms);
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBe(ms);
    });
  });

  describe('formatTimestamp', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-15T12:00:00Z').getTime());
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns "Just now" for timestamps less than 1 minute ago', () => {
      const recent = new Date('2026-06-15T11:59:30Z');
      expect(formatTimestamp(recent)).toBe('Just now');
    });

    it('returns minutes ago for timestamps within the hour', () => {
      const fiveMinAgo = new Date('2026-06-15T11:55:00Z');
      expect(formatTimestamp(fiveMinAgo)).toBe('5 minutes ago');
    });

    it('returns singular "minute" for 1 minute', () => {
      const oneMinAgo = new Date('2026-06-15T11:59:00Z');
      expect(formatTimestamp(oneMinAgo)).toBe('1 minute ago');
    });

    it('returns hours ago for timestamps within the day', () => {
      const threeHoursAgo = new Date('2026-06-15T09:00:00Z');
      expect(formatTimestamp(threeHoursAgo)).toBe('3 hours ago');
    });

    it('returns days ago for timestamps within the week', () => {
      const twoDaysAgo = new Date('2026-06-13T12:00:00Z');
      expect(formatTimestamp(twoDaysAgo)).toBe('2 days ago');
    });

    it('returns formatted date for timestamps older than 7 days', () => {
      const old = new Date('2026-01-01T00:00:00Z');
      const result = formatTimestamp(old);
      expect(result).toContain('2026');
      expect(result).toContain('Jan');
    });

    it('handles Firestore timestamp format', () => {
      const firestoreTs = {
        type: 'firestore/timestamp/1.0' as const,
        seconds: Math.floor(new Date('2026-06-15T11:50:00Z').getTime() / 1000),
        nanoseconds: 0,
      };
      expect(formatTimestamp(firestoreTs)).toBe('10 minutes ago');
    });
  });

  describe('formatFullTimestamp', () => {
    it('returns full date and time by default', () => {
      const date = new Date('2026-06-15T14:30:00');
      const result = formatFullTimestamp(date);
      expect(result).toContain('2026');
      expect(result).toContain('Jun');
      expect(result).toContain('15');
    });

    it('returns date only when dateOnly option is true', () => {
      const date = new Date('2026-06-15T14:30:00');
      const result = formatFullTimestamp(date, { dateOnly: true });
      expect(result).toContain('Jun');
      expect(result).toContain('15');
      expect(result).toContain('2026');
      // Should not contain time
      expect(result).not.toMatch(/\d{1,2}:\d{2}/);
    });

    it('handles string timestamps', () => {
      const result = formatFullTimestamp('2026-03-15T10:00:00Z');
      expect(result).toContain('2026');
    });

    it('handles numeric timestamps', () => {
      const result = formatFullTimestamp(1700000000000);
      expect(result).toContain('2023');
    });

    it('handles Firestore timestamp format', () => {
      const ts = {
        type: 'firestore/timestamp/1.0' as const,
        seconds: 1700000000,
        nanoseconds: 0,
      };
      const result = formatFullTimestamp(ts);
      expect(result).toContain('2023');
    });

    it('falls back to current date for unknown types', () => {
      const result = formatFullTimestamp({} as any);
      expect(result).toBeTruthy();
    });
  });

  describe('cn', () => {
    it('merges class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
    });

    it('merges tailwind classes correctly', () => {
      expect(cn('px-4 py-2', 'px-8')).toBe('py-2 px-8');
    });
  });

  describe('generateQRCode', () => {
    // QRCode needs TextEncoder which jsdom doesn't have, so we mock it
    let mockToDataURL: jest.SpyInstance;

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const QRCode = require('qrcode');
      mockToDataURL = jest
        .spyOn(QRCode, 'toDataURL')
        .mockResolvedValue('data:image/png;base64,MOCK');
    });

    afterEach(() => {
      mockToDataURL.mockRestore();
    });

    it('returns a data URL string', async () => {
      const result = await generateQRCode('https://example.com');
      expect(result).toBe('data:image/png;base64,MOCK');
    });

    it('calls QRCode.toDataURL with correct options', async () => {
      await generateQRCode('test-data');
      expect(mockToDataURL).toHaveBeenCalledWith(
        'test-data',
        expect.objectContaining({
          width: 300,
          margin: 2,
        }),
      );
    });

    it('throws when QRCode fails', async () => {
      mockToDataURL.mockRejectedValueOnce(new Error('QR error'));
      await expect(generateQRCode('bad')).rejects.toThrow('QR error');
    });
  });

  describe('formatTimestamp edge cases', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-15T12:00:00Z').getTime());
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('handles singular "hour"', () => {
      const oneHourAgo = new Date('2026-06-15T11:00:00Z');
      expect(formatTimestamp(oneHourAgo)).toBe('1 hour ago');
    });

    it('handles singular "day"', () => {
      const oneDayAgo = new Date('2026-06-14T12:00:00Z');
      expect(formatTimestamp(oneDayAgo)).toBe('1 day ago');
    });

    it('handles string input', () => {
      const result = formatTimestamp('2026-06-15T11:55:00Z');
      expect(result).toBe('5 minutes ago');
    });

    it('handles number input', () => {
      const fiveMinAgoMs = new Date('2026-06-15T11:55:00Z').getTime();
      const result = formatTimestamp(fiveMinAgoMs);
      expect(result).toBe('5 minutes ago');
    });

    it('falls back to current date for unknown type', () => {
      const result = formatTimestamp({} as any);
      expect(result).toBe('Just now');
    });
  });
});
