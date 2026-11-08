import type { SegmentationResult } from './background-service';

export interface BackgroundSettings {
  zoom: number;
  positionX: number;
  positionY: number;
  fit: 'cover' | 'contain';
}

export class CompositionService {
  private foregroundCanvas = document.createElement('canvas');
  private maskCanvas = document.createElement('canvas');

  render(
    frame: HTMLImageElement,
    background: HTMLImageElement,
    result: SegmentationResult,
    canvas: HTMLCanvasElement,
    settings: BackgroundSettings,
  ): void {
    const width = frame.naturalWidth;
    const height = frame.naturalHeight;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    if (
      this.foregroundCanvas.width !== width ||
      this.foregroundCanvas.height !== height
    ) {
      this.foregroundCanvas.width = width;
      this.foregroundCanvas.height = height;
    }

    if (
      this.maskCanvas.width !== result.width ||
      this.maskCanvas.height !== result.height
    ) {
      this.maskCanvas.width = result.width;
      this.maskCanvas.height = result.height;
    }

    const foregroundContext = this.foregroundCanvas.getContext('2d');
    const maskContext = this.maskCanvas.getContext('2d');
    const outputContext = canvas.getContext('2d');

    if (!foregroundContext || !maskContext || !outputContext) {
      throw new Error('Canvas context unavailable.');
    }

    const maskImage = maskContext.createImageData(
      result.width,
      result.height,
    );

    for (let i = 0; i < result.mask.length; i++) {
      const value = Math.round(
        Math.max(0, Math.min(1, result.mask[i] ?? 0)) * 255,
      );

      const offset = i * 4;

      maskImage.data[offset] = 255;
      maskImage.data[offset + 1] = 255;
      maskImage.data[offset + 2] = 255;
      maskImage.data[offset + 3] = value;
    }

    maskContext.putImageData(maskImage, 0, 0);

    foregroundContext.clearRect(0, 0, width, height);
    foregroundContext.globalCompositeOperation = 'source-over';
    foregroundContext.drawImage(frame, 0, 0, width, height);

    foregroundContext.globalCompositeOperation = 'destination-in';

    foregroundContext.drawImage(
      this.maskCanvas,
      0,
      0,
      width,
      height,
    );

    foregroundContext.globalCompositeOperation = 'source-over';

    outputContext.clearRect(0, 0, width, height);

    this.drawBackground(
      outputContext,
      background,
      width,
      height,
      settings,
    );

    outputContext.drawImage(
      this.foregroundCanvas,
      0,
      0,
      width,
      height,
    );
  }

  private drawBackground(
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    width: number,
    height: number,
    settings: BackgroundSettings,
  ): void {
    const scale = settings.fit === 'cover'
      ? Math.max(
        width / image.naturalWidth,
        height / image.naturalHeight,
      )
      : Math.min(
        width / image.naturalWidth,
        height / image.naturalHeight,
      );

    const finalScale = scale * settings.zoom;

    const imageWidth = image.naturalWidth * finalScale;
    const imageHeight = image.naturalHeight * finalScale;

    const x = (width - imageWidth) * settings.positionX / 100;
    const y = (height - imageHeight) * settings.positionY / 100;

    context.fillStyle = '#17191f';
    context.fillRect(0, 0, width, height);

    context.drawImage(
      image,
      x,
      y,
      imageWidth,
      imageHeight,
    );
  }
}
