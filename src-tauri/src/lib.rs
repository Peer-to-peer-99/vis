use base64::{Engine, engine::general_purpose::STANDARD};
use image::codecs::jpeg::JpegEncoder;
use nokhwa::{
    Camera, native_api_backend,
    pixel_format::RgbFormat,
    query,
    utils::{CameraIndex, RequestedFormat, RequestedFormatType},
};
use serde::Serialize;
use std::{
    io::{Cursor, Write},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    thread::JoinHandle,
    time::Duration,
};
use tauri::{
    AppHandle, Emitter, State,
    ipc::{InvokeBody, Request},
};
use v4l::{Format, FourCC, device::Device as V4lDevice, video::Output};

struct CameraTask {
    stop: Arc<AtomicBool>,
    handle: JoinHandle<()>,
}

struct CameraState {
    task: Mutex<Option<CameraTask>>,
}

struct VirtualCamera {
    device: V4lDevice,
    width: u32,
    height: u32,
}

struct VirtualCameraState {
    device: Mutex<Option<VirtualCamera>>,
}

#[derive(Serialize)]
struct CameraDevice {
    id: String,
    name: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CameraState {
            task: Mutex::new(None),
        })
        .manage(VirtualCameraState {
            device: Mutex::new(None),
        })
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_camera_devices,
            start_camera,
            stop_camera,
            start_virtual_camera,
            write_virtual_frame,
            stop_virtual_camera
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}

#[tauri::command]
fn get_camera_devices() -> Result<Vec<CameraDevice>, String> {
    let backend = native_api_backend().ok_or("Camera backend not available")?;

    let cameras = query(backend).map_err(|error| error.to_string())?;

    Ok(cameras
        .into_iter()
        .map(|camera| CameraDevice {
            id: camera.index().to_string(),
            name: camera.human_name(),
        })
        .collect())
}

#[tauri::command]
fn start_camera(
    device_id: String,
    app: AppHandle,
    state: State<'_, CameraState>,
) -> Result<(), String> {
    let mut task = state.task.lock().map_err(|error| error.to_string())?;

    if task.is_some() {
        return Err("Camera is already running".into());
    }

    let index = device_id
        .parse::<u32>()
        .map_err(|error| format!("Invalid camera ID: {error}"))?;

    let format = RequestedFormat::new::<RgbFormat>(RequestedFormatType::HighestFrameRate(30));

    let mut camera = Camera::new(CameraIndex::Index(index), format)
        .map_err(|error| format!("Failed to initialize camera: {error}"))?;

    camera
        .open_stream()
        .map_err(|error| format!("Failed to open camera stream: {error}"))?;

    let stop = Arc::new(AtomicBool::new(false));
    let thread_stop = Arc::clone(&stop);

    let handle = std::thread::spawn(move || {
        loop {
            if thread_stop.load(Ordering::Relaxed) {
                break;
            }

            let frame = match camera.frame() {
                Ok(frame) => frame,
                Err(error) => {
                    let _ = app.emit("camera-error", format!("Failed to capture frame: {error}"));
                    break;
                }
            };

            let decoded = match frame.decode_image::<RgbFormat>() {
                Ok(image) => image,
                Err(error) => {
                    let _ = app.emit("camera-error", format!("Failed to decode frame: {error}"));
                    break;
                }
            };

            let mut jpeg = Cursor::new(Vec::new());
            let mut encoder = JpegEncoder::new_with_quality(&mut jpeg, 75);

            if let Err(error) = encoder.encode_image(&decoded) {
                let _ = app.emit("camera-error", format!("Failed to encode JPEG: {error}"));
                break;
            }

            let encoded = STANDARD.encode(jpeg.into_inner());

            if app.emit("camera-frame", encoded).is_err() {
                break;
            }

            std::thread::sleep(Duration::from_millis(30));
        }

        let _ = camera.stop_stream();
    });

    *task = Some(CameraTask { stop, handle });

    Ok(())
}

#[tauri::command]
fn stop_camera(state: State<'_, CameraState>) -> Result<(), String> {
    let mut task = state.task.lock().map_err(|error| error.to_string())?;

    if let Some(camera_task) = task.take() {
        camera_task.stop.store(true, Ordering::Relaxed);

        camera_task
            .handle
            .join()
            .map_err(|_| "Camera thread failed".to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn start_virtual_camera(
    width: u32,
    height: u32,
    state: State<'_, VirtualCameraState>,
) -> Result<(), String> {
    let mut virtual_camera = state.device.lock().map_err(|error| error.to_string())?;

    if virtual_camera.is_some() {
        return Ok(());
    }

    if width == 0 || height == 0 {
        return Err("Invalid virtual camera dimensions".into());
    }

    if width % 2 != 0 {
        return Err("Virtual camera requires an even width".into());
    }

    let device = V4lDevice::with_path("/dev/video10")
        .map_err(|error| format!("Failed to open /dev/video10: {error}"))?;

    let format = Format::new(width, height, FourCC::new(b"YUYV"));

    device
        .set_format(&format)
        .map_err(|error| format!("Failed to configure virtual camera: {error}"))?;

    *virtual_camera = Some(VirtualCamera {
        device,
        width,
        height,
    });

    Ok(())
}
#[tauri::command]
fn write_virtual_frame(
    request: Request<'_>,
    state: State<'_, VirtualCameraState>,
) -> Result<(), String> {
    let rgba: &[u8] = match request.body() {
        InvokeBody::Raw(bytes) => bytes.as_ref(),
        _ => {
            return Err("Expected raw RGBA frame data".into());
        }
    };

    let mut virtual_camera = state.device.lock().map_err(|error| error.to_string())?;

    let camera = virtual_camera
        .as_mut()
        .ok_or("Virtual camera is not running")?;

    let expected_size = (camera.width as usize)
        .checked_mul(camera.height as usize)
        .and_then(|size| size.checked_mul(4))
        .ok_or("Invalid frame dimensions")?;

    if rgba.len() != expected_size {
        return Err(format!(
            "Invalid RGBA frame size. Expected {}, received {}",
            expected_size,
            rgba.len()
        ));
    }

    let yuyv = rgba_to_yuyv(rgba, camera.width, camera.height);

    camera
        .device
        .write_all(&yuyv)
        .map_err(|error| format!("Failed to write virtual frame: {error}"))?;

    Ok(())
}

#[tauri::command]
fn stop_virtual_camera(state: State<'_, VirtualCameraState>) -> Result<(), String> {
    let mut virtual_camera = state.device.lock().map_err(|error| error.to_string())?;

    *virtual_camera = None;

    Ok(())
}

fn rgba_to_yuyv(rgba: &[u8], width: u32, height: u32) -> Vec<u8> {
    let mut output = Vec::with_capacity((width * height * 2) as usize);

    for y in 0..height {
        for x in (0..width).step_by(2) {
            let index1 = ((y * width + x) * 4) as usize;
            let index2 = ((y * width + x + 1) * 4) as usize;

            let r1 = rgba[index1] as i32;
            let g1 = rgba[index1 + 1] as i32;
            let b1 = rgba[index1 + 2] as i32;

            let r2 = rgba[index2] as i32;
            let g2 = rgba[index2 + 1] as i32;
            let b2 = rgba[index2 + 2] as i32;

            let (y1, u1, v1) = rgb_to_yuv(r1, g1, b1);
            let (y2, u2, v2) = rgb_to_yuv(r2, g2, b2);

            let u = ((u1 + u2) / 2) as u8;
            let v = ((v1 + v2) / 2) as u8;

            output.push(y1 as u8);
            output.push(u);
            output.push(y2 as u8);
            output.push(v);
        }
    }

    output
}

fn rgb_to_yuv(r: i32, g: i32, b: i32) -> (i32, i32, i32) {
    let y = ((66 * r + 129 * g + 25 * b + 128) >> 8) + 16;
    let u = ((-38 * r - 74 * g + 112 * b + 128) >> 8) + 128;
    let v = ((112 * r - 94 * g - 18 * b + 128) >> 8) + 128;

    (y.clamp(0, 255), u.clamp(0, 255), v.clamp(0, 255))
}
