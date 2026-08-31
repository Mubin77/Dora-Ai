/**
 * Dora Device Pairing & Companion Authentication Service
 * 
 * Manages the secure pairing lifecycle between Dora and the Android companion app:
 * 1. Generates short-lived (10-min) 6-character alphanumeric pairing codes (e.g. DORA-9X42)
 * 2. Provides QR code payloads (dora://pair?code=...&server=...)
 * 3. Exchanges pairing codes for authenticated device session tokens
 * 4. Tracks heartbeat, connection health, and computes truthful deployment states:
 *    - NOT_CONFIGURED
 *    - ACCESSIBILITY_DISABLED
 *    - READY
 *    - CONNECTED
 *    - ERROR
 */

import {
  DeviceAuthToken,
  DeviceDeploymentStatus,
  DevicePairingSession,
  DevicePermissionStatus,
} from "../../types/device";

export class DevicePairingService {
  private static instance: DevicePairingService;

  // Active pairing sessions (pairingCode -> session)
  private pairingSessions: Map<string, DevicePairingSession> = new Map();

  // Paired devices (deviceId -> token)
  private pairedTokens: Map<string, DeviceAuthToken> = new Map();

  // Active connected device state
  private activeDevice: {
    deviceId: string;
    deviceModel: string;
    androidVersion: string;
    accessibilityEnabled: boolean;
    lastHeartbeat: number;
    isConnected: boolean;
  } | null = null;

  private constructor() {
    // Periodic cleanup of expired pairing sessions
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanupExpiredSessions(), 60000);
    }
  }

  public static getInstance(): DevicePairingService {
    if (!DevicePairingService.instance) {
      DevicePairingService.instance = new DevicePairingService();
    }
    return DevicePairingService.instance;
  }

  /**
   * Generates a new 6-character short-lived pairing session
   */
  public generatePairingSession(serverBaseUrl?: string): DevicePairingSession {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Exclude ambiguous 0/O, 1/I
    let code = "DORA-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const defaultUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const serverUrl = serverBaseUrl || defaultUrl;
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    const qrPayload = `dora://pair?code=${encodeURIComponent(code)}&server=${encodeURIComponent(serverUrl)}`;

    const session: DevicePairingSession = {
      pairingCode: code,
      qrPayload,
      createdAt: now,
      expiresAt,
      serverUrl,
    };

    this.pairingSessions.set(code, session);
    return session;
  }

  /**
   * Exchanges a valid pairing code for an authenticated device session token
   */
  public verifyAndPairDevice(
    pairingCode: string,
    deviceInfo: {
      deviceId?: string;
      deviceModel?: string;
      androidVersion?: string;
      accessibilityEnabled?: boolean;
    }
  ): { success: boolean; token?: DeviceAuthToken; error?: string } {
    const cleanCode = pairingCode.trim().toUpperCase();
    const session = this.pairingSessions.get(cleanCode);

    if (!session) {
      return { success: false, error: "Invalid or expired pairing code. Please generate a new code." };
    }

    if (Date.now() > session.expiresAt) {
      this.pairingSessions.delete(cleanCode);
      return { success: false, error: "Pairing code has expired. Please generate a fresh code." };
    }

    // Generate unique device ID if not provided
    const deviceId = deviceInfo.deviceId || `dora_android_${Math.random().toString(36).substring(2, 10)}`;
    const randomSecret = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const tokenString = `dora_token_${Date.now()}_${randomSecret}`;

    const authToken: DeviceAuthToken = {
      deviceId,
      token: tokenString,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      deviceModel: deviceInfo.deviceModel || "Android Device",
      androidVersion: deviceInfo.androidVersion || "Android 14",
    };

    // Store paired token
    this.pairedTokens.set(deviceId, authToken);

    // Set active device
    this.activeDevice = {
      deviceId,
      deviceModel: authToken.deviceModel || "Android Device",
      androidVersion: authToken.androidVersion || "Android 14",
      accessibilityEnabled: Boolean(deviceInfo.accessibilityEnabled),
      lastHeartbeat: Date.now(),
      isConnected: true,
    };

    // Consume single-use pairing code
    this.pairingSessions.delete(cleanCode);

    return { success: true, token: authToken };
  }

  /**
   * Validates an authenticated device token during connection/reconnection
   */
  public authenticateDevice(tokenString: string, deviceId: string): boolean {
    const stored = this.pairedTokens.get(deviceId);
    if (!stored) return false;
    if (stored.token !== tokenString) return false;
    if (Date.now() > stored.expiresAt) {
      this.pairedTokens.delete(deviceId);
      return false;
    }
    return true;
  }

  /**
   * Updates device heartbeat and accessibility status
   */
  public recordHeartbeat(
    deviceId: string,
    statusUpdate?: {
      accessibilityEnabled?: boolean;
      deviceModel?: string;
      androidVersion?: string;
    }
  ): boolean {
    const stored = this.pairedTokens.get(deviceId);
    if (!stored) return false;

    if (!this.activeDevice || this.activeDevice.deviceId === deviceId) {
      this.activeDevice = {
        deviceId,
        deviceModel: statusUpdate?.deviceModel || this.activeDevice?.deviceModel || stored.deviceModel || "Android Device",
        androidVersion: statusUpdate?.androidVersion || this.activeDevice?.androidVersion || stored.androidVersion || "Android 14",
        accessibilityEnabled: statusUpdate?.accessibilityEnabled !== undefined
          ? statusUpdate.accessibilityEnabled
          : this.activeDevice?.accessibilityEnabled || false,
        lastHeartbeat: Date.now(),
        isConnected: true,
      };
    }
    return true;
  }

  /**
   * Marks device as disconnected
   */
  public disconnectDevice(deviceId: string): void {
    if (this.activeDevice?.deviceId === deviceId) {
      this.activeDevice.isConnected = false;
    }
  }

  /**
   * Unpairs device and revokes authentication
   */
  public unpairDevice(deviceId: string): boolean {
    this.pairedTokens.delete(deviceId);
    if (this.activeDevice?.deviceId === deviceId) {
      this.activeDevice = null;
    }
    return true;
  }

  /**
   * Evaluates and returns the truthful deployment status
   */
  public getDeploymentStatus(): DevicePermissionStatus {
    // Check if active device exists
    if (!this.activeDevice || this.pairedTokens.size === 0) {
      return {
        accessibilityEnabled: false,
        bridgeConnected: false,
        deploymentStatus: "NOT_CONFIGURED",
        deviceModel: "No Device Paired",
        androidVersion: "",
        pairedDeviceId: undefined,
        isRealDevice: false,
      };
    }

    const now = Date.now();
    const isRecentHeartbeat = (now - this.activeDevice.lastHeartbeat) < 45000; // within 45s
    const isConnected = this.activeDevice.isConnected && isRecentHeartbeat;

    let status: DeviceDeploymentStatus;

    if (!isConnected) {
      status = "READY"; // Paired but waiting for socket connection
    } else if (!this.activeDevice.accessibilityEnabled) {
      status = "ACCESSIBILITY_DISABLED";
    } else {
      status = "CONNECTED";
    }

    return {
      accessibilityEnabled: this.activeDevice.accessibilityEnabled,
      bridgeConnected: isConnected,
      deploymentStatus: status,
      deviceModel: this.activeDevice.deviceModel,
      androidVersion: this.activeDevice.androidVersion,
      pairedDeviceId: this.activeDevice.deviceId,
      lastHeartbeat: this.activeDevice.lastHeartbeat,
      isRealDevice: true,
    };
  }

  public getActiveDevice() {
    return this.activeDevice;
  }

  public getActivePairingSessions(): DevicePairingSession[] {
    this.cleanupExpiredSessions();
    return Array.from(this.pairingSessions.values());
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [code, session] of this.pairingSessions.entries()) {
      if (now > session.expiresAt) {
        this.pairingSessions.delete(code);
      }
    }
  }
}

export const devicePairingService = DevicePairingService.getInstance();
