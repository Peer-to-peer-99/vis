import { invoke } from '@tauri-apps/api/core';
export class CameraService {
  static async getDevices() {
    return await invoke('get_camera_devices');
  }

  static async startCamera(deviceId: string) {
    return await invoke('start_camera', { deviceId });
  }

  static async stopCamera() {
    return await invoke('stop_camera');
  }
}
