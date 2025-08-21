import { Injectable, signal } from '@angular/core';

/**
 * DeviceIdService
 * Stores a pseudonymous device identifier in localStorage and exposes it as a signal.
 * This is not PII; it's a random UUID used to associate anonymous comments with a device.
 */
@Injectable({ providedIn: 'root' })
export class DeviceIdService {
  private static readonly STORAGE_KEY = 'tdc_device_id';

  private readonly _deviceId = signal<string>(DeviceIdService.loadOrCreate());

  /** Readonly device id signal */
  readonly deviceId = this._deviceId.asReadonly();

  /**
   * Resets the device id (e.g., for privacy reset). Generates a new UUID and persists it.
   */
  reset(): void {
    const id = DeviceIdService.generateUuid();
    localStorage.setItem(DeviceIdService.STORAGE_KEY, id);
    this._deviceId.set(id);
  }

  private static loadOrCreate(): string {
    const existing = localStorage.getItem(DeviceIdService.STORAGE_KEY);
    if (existing && existing.trim()) return existing.trim();
    const id = DeviceIdService.generateUuid();
    localStorage.setItem(DeviceIdService.STORAGE_KEY, id);
    return id;
  }

  // RFC4122 v4 UUID generator using crypto if available
  private static generateUuid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as any).randomUUID();
    }
    // Fallback
    const s: string[] = [];
    const hex = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    for (const c of hex) {
      if (c === 'x' || c === 'y') {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        s.push(v.toString(16));
      } else {
        s.push(c);
      }
    }
    return s.join('');
  }
}
