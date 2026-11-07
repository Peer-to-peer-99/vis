import {defineStore} from 'pinia';
import type {CameraState} from "@/types/camera";
import {CameraService} from "@/services/camera/camera-service";

export const useCameraStore = defineStore('camera', {
  state: (): CameraState => ({
    devices: [],
    selectedDeviceId: '',
    isRunning: false,
    loading: false,
    error: null,
  }),
  actions: {
    async loadDevices()
    {
      this.devices = await CameraService.getDevices();
    },
    async startCamera()
    {
      if(!this.selectedDeviceId){
        this.error = 'Select a camera';
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        await CameraService.startCamera(this.selectedDeviceId);
        this.isRunning = true;
      } catch (error) {
        this.error = 'Unable to start the camera.';
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    async stopCamera() {
      try {
        await CameraService.stopCamera();
        this.isRunning = false;
      } catch (error) {
        this.error = 'It was not possible to turn off the camera.';
        console.error(error);
      }
    },
  },

});
