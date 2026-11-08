import { invoke } from '@tauri-apps/api/core';

export class VirtualCameraService {
  static async start(width: number, height: number): Promise<void> {
    await invoke('start_virtual_camera', {
      width,
      height,
    });
  }

  static async writeFrame(frame: Uint8Array): Promise<void> {
    await invoke('write_virtual_frame', frame);
  }

  static async stop(): Promise<void> {
    await invoke('stop_virtual_camera');
  }
}
