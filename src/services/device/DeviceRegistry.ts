/**
 * Dora Device Registry
 * 
 * Manages registered physical and companion devices.
 * Supports multiple Android devices and future PC integrations.
 */

import { Device, DeviceType, DevicePermissionStatus } from "./DeviceActionTypes";
import { androidControlService } from "./AndroidControlService";

export class DeviceRegistry {
  private static instance: DeviceRegistry;
  private devices: Map<string, Device> = new Map();
  private primaryDeviceId: string | null = null;

  private constructor() {
    this.registerDefaultDevices();
  }

  public static getInstance(): DeviceRegistry {
    if (!DeviceRegistry.instance) {
      DeviceRegistry.instance = new DeviceRegistry();
    }
    return DeviceRegistry.instance;
  }

  private registerDefaultDevices(): void {
    // Register Default Android Companion Slot
    const defaultAndroid: Device = {
      deviceId: "default-android-companion",
      deviceType: "android",
      deviceName: "Primary Android Phone",
      platform: "android",
      isConnected: false,
      accessibilityEnabled: false,
      capabilities: [
        "open_application",
        "open_url",
        "take_screenshot",
        "read_screen",
        "tap",
        "type_text",
        "swipe",
        "scroll",
        "press_back",
        "press_home",
      ],
      lastSeen: Date.now(),
    };

    this.devices.set(defaultAndroid.deviceId, defaultAndroid);
    this.primaryDeviceId = defaultAndroid.deviceId;
  }

  public registerDevice(device: Device): void {
    this.devices.set(device.deviceId, device);
    if (!this.primaryDeviceId) {
      this.primaryDeviceId = device.deviceId;
    }
  }

  public getDevice(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  public getPrimaryDevice(type: DeviceType = "android"): Device | undefined {
    for (const d of this.devices.values()) {
      if (d.deviceType === type) {
        return d;
      }
    }
    return undefined;
  }

  public getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  public async updateDeviceStatus(
    deviceId: string,
    status: Partial<DevicePermissionStatus>
  ): Promise<Device | undefined> {
    const device = this.devices.get(deviceId);
    if (!device) return undefined;

    if (status.accessibilityEnabled !== undefined) {
      device.accessibilityEnabled = status.accessibilityEnabled;
    }
    if (status.bridgeConnected !== undefined) {
      device.isConnected = status.bridgeConnected;
    }
    if (status.deviceModel) {
      device.deviceName = status.deviceModel;
    }
    device.lastSeen = Date.now();
    return device;
  }

  /**
   * Refreshes dynamic status from AndroidControlService
   */
  public async refreshPrimaryAndroidStatus(): Promise<DevicePermissionStatus> {
    const status = await androidControlService.getPermissionStatus();
    const primary = this.getPrimaryDevice("android");
    if (primary) {
      primary.isConnected = status.bridgeConnected;
      primary.accessibilityEnabled = status.accessibilityEnabled;
      if (status.deviceModel) {
        primary.deviceName = status.deviceModel;
      }
      primary.lastSeen = Date.now();
    }
    return status;
  }
}

export const deviceRegistry = DeviceRegistry.getInstance();
