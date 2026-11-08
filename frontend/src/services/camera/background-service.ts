import {
  FilesetResolver,
  ImageSegmenter,
} from '@mediapipe/tasks-vision';

export interface SegmentationResult {
  mask: Float32Array;
  width: number;
  height: number;
}

export class BackgroundService {
  private segmenter: ImageSegmenter | null = null;
  private initializing = false;
  private canvas: HTMLCanvasElement | null = null;

  async initialize(): Promise<void> {
    if (this.segmenter || this.initializing) {
      return;
    }

    this.initializing = true;

    try {
      console.log('Initializing MediaPipe...');

      const vision = await FilesetResolver.forVisionTasks('/wasm');

      this.canvas = document.createElement('canvas');
      this.canvas.width = 640;
      this.canvas.height = 480;

      document.body.appendChild(this.canvas);

      this.segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/selfie_segmenter.tflite',
          delegate: 'CPU',
        },
        canvas: this.canvas,
        runningMode: 'VIDEO',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });

      console.log('MediaPipe initialized successfully');
      console.log('Model labels:', this.segmenter.getLabels());
    } catch (error) {
      this.segmenter?.close();
      this.segmenter = null;

      this.canvas?.remove();
      this.canvas = null;

      console.error('MediaPipe initialization failed:', error);

      throw error;
    } finally {
      this.initializing = false;
    }
  }

  processFrame(
    frame: HTMLImageElement,
    callback: (result: SegmentationResult | null) => void,
  ): void {
    if (!this.segmenter) {
      throw new Error('Segmenter not initialized');
    }

    if (!frame.complete || frame.naturalWidth === 0) {
      callback(null);
      return;
    }

    try {
      this.segmenter.segmentForVideo(
        frame,
        performance.now(),
        (result) => {
          let mask: Float32Array | null = null;
          let width = 0;
          let height = 0;

          const categoryMask = result.categoryMask;

          if (categoryMask) {
            const categoryValues = categoryMask.getAsUint8Array();

            console.log('Category mask:', {
              labels: this.segmenter?.getLabels(),
              width: categoryMask.width,
              height: categoryMask.height,
              values: Array.from(new Set(categoryValues)),
            });

            mask = new Float32Array(categoryValues.length);

            for (let i = 0; i < categoryValues.length; i++) {
              mask[i] = categoryValues[i] === 0 ? 1 : 0;
            }

            width = categoryMask.width;
            height = categoryMask.height;
          }

          if (!mask) {
            console.error('No segmentation mask available');
            callback(null);
            return;
          }

          callback({
            mask,
            width,
            height,
          });
        },
      );
    } catch (error) {
      console.error('Frame segmentation failed:', error);
      callback(null);
    }
  }

  dispose(): void {
    this.segmenter?.close();
    this.segmenter = null;

    this.canvas?.remove();
    this.canvas = null;

    this.initializing = false;
  }
}
