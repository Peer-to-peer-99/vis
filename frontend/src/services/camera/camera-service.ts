import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {CameraDevice} from "@/types/camera.ts";
export class CameraService {
  static async getDevices(): Promise<CameraDevice[]> {
    return await invoke<CameraDevice[]>('get_camera_devices');
  }

  static async startCamera(deviceId: string) {
    return await invoke('start_camera', { deviceId });
  }

  static async stopCamera() {
    return await invoke('stop_camera');
  }

  static async onFrame(callback: (frame: string) => void): Promise<UnlistenFn>{
    return await listen<string>('camera-frame', (event) =>{
      callback(event.payload);
    });
  }

  static async onError(callback: (error: string) => void): Promise<UnlistenFn>{
    return await listen<string>('camera-error', (event) => {
      callback(event.payload);
    });
  }
}
