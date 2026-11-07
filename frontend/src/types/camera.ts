

interface CameraDevice
{
  id: string;
  name: string;
}

interface CameraState
{
  devices: CameraDevice[],
  selectedDeviceId: string;
  isRunning: boolean;
  loading: boolean;
  error: string | null;
}

export  {
  CameraDevice,
  CameraState
}
