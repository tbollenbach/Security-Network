import { v4 as uuidv4 } from 'uuid';

export class DeviceManager {
  constructor(config) {
    this.config = config;
    this.devices = new Map();
  }

  registerDevice(ws, deviceInfo) {
    const deviceId = deviceInfo.deviceId || uuidv4();
    
    const device = {
      id: deviceId,
      name: deviceInfo.deviceName || 'Unknown Device',
      platform: deviceInfo.platform || 'unknown',
      ipAddress: deviceInfo.ipAddress || 'unknown',
      ws: ws,
      lastSeen: new Date(),
      isOnline: true,
      resources: {
        cpuUsage: 0,
        cpuAvailable: 100,
        cpuCores: 0,
        memoryUsage: 0,
        memoryAvailable: 0,
        memoryTotal: 0,
        storageUsage: 0,
        storageAvailable: 0,
        storageTotal: 0,
        hasGPU: false,
        gpuName: null,
        gpuUsage: null
      }
    };

    this.devices.set(deviceId, device);
    return deviceId;
  }

  getDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    // Return device without the ws connection
    const { ws, ...deviceData } = device;
    return deviceData;
  }

  getAllDevices() {
    const devices = [];
    this.devices.forEach((device) => {
      const { ws, ...deviceData } = device;
      devices.push(deviceData);
    });
    return devices;
  }

  getDeviceCount() {
    return this.devices.size;
  }

  updateHeartbeat(deviceId) {
    const device = this.devices.get(deviceId);
    if (device) {
      device.lastSeen = new Date();
      device.isOnline = true;
    }
  }

  updateDeviceResources(deviceId, resources) {
    const device = this.devices.get(deviceId);
    if (device) {
      device.resources = { ...device.resources, ...resources };
      device.lastSeen = new Date();
    }
  }

  removeDevice(deviceId) {
    return this.devices.delete(deviceId);
  }

  cleanupInactiveDevices() {
    const now = new Date();
    const timeout = this.config.monitoring.deviceTimeout;
    const removedDevices = [];

    this.devices.forEach((device, deviceId) => {
      const timeSinceLastSeen = now - device.lastSeen;
      if (timeSinceLastSeen > timeout) {
        this.devices.delete(deviceId);
        removedDevices.push(deviceId);
      }
    });

    return removedDevices;
  }

  getDevicesByPlatform(platform) {
    const devices = [];
    this.devices.forEach((device) => {
      if (device.platform === platform) {
        const { ws, ...deviceData } = device;
        devices.push(deviceData);
      }
    });
    return devices;
  }

  getOnlineDevices() {
    const devices = [];
    this.devices.forEach((device) => {
      if (device.isOnline) {
        const { ws, ...deviceData } = device;
        devices.push(deviceData);
      }
    });
    return devices;
  }
}



