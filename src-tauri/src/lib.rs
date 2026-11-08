use base64::{engine::general_purpose::STANDARD, Engine};
use image::codecs::jpeg::JpegEncoder;
use nokhwa::{
    native_api_backend,
    query,
    Camera,
    pixel_format::RgbFormat,
    utils::{
        CameraIndex,
        RequestedFormat,
        RequestedFormatType,
    },
};
use serde::Serialize;
use std::{
    io::Cursor,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
        Mutex,
    },
    thread::JoinHandle,
    time::Duration,
};
use tauri::{AppHandle, Emitter, State};

struct CameraTask {
    stop: Arc<AtomicBool>,
    handle: JoinHandle<()>,
}

struct CameraState {
    task: Mutex<Option<CameraTask>>,
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
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_camera_devices,
            start_camera,
            stop_camera
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}

#[tauri::command]
fn get_camera_devices() -> Result<Vec<CameraDevice>, String> {
    let backend =
        native_api_backend().ok_or("Camera backend not available")?;

    let cameras = query(backend)
        .map_err(|error| error.to_string())?;

    Ok(cameras
        .into_iter()
        .enumerate()
        .map(|(index, camera)| CameraDevice {
            id: index.to_string(),
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
    let mut task = state
        .task
        .lock()
        .map_err(|error| error.to_string())?;

    if task.is_some() {
        return Err("Camera is already running".into());
    }

    let index = device_id
        .parse::<u32>()
        .map_err(|error| error.to_string())?;

    let format = RequestedFormat::new::<RgbFormat>(
        RequestedFormatType::AbsoluteHighestFrameRate,
    );

    let mut camera = Camera::new(CameraIndex::Index(index), format)
        .map_err(|error| error.to_string())?;

    camera
        .open_stream()
        .map_err(|error| error.to_string())?;

    let stop = Arc::new(AtomicBool::new(false));
    let thread_stop = Arc::clone(&stop);

    let handle = std::thread::spawn(move || {
        while !thread_stop.load(Ordering::Relaxed) {
            let frame = match camera.frame() {
                Ok(frame) => frame,
                Err(error) => {
                    let _ = app.emit("camera-error", error.to_string());
                    break;
                }
            };

            let decoded = match frame.decode_image::<RgbFormat>() {
                Ok(image) => image,
                Err(error) => {
                    let _ = app.emit("camera-error", error.to_string());
                    break;
                }
            };

            let mut jpeg = Cursor::new(Vec::new());

            let mut encoder =
                JpegEncoder::new_with_quality(&mut jpeg, 75);

            if let Err(error) = encoder.encode_image(&decoded) {
                let _ = app.emit("camera-error", error.to_string());
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

    *task = Some(CameraTask {
        stop,
        handle,
    });

    Ok(())
}

#[tauri::command]
fn stop_camera(
    state: State<'_, CameraState>,
) -> Result<(), String> {
    let mut task = state
        .task
        .lock()
        .map_err(|error| error.to_string())?;

    if let Some(camera_task) = task.take() {
        camera_task
            .stop
            .store(true, Ordering::Relaxed);

        camera_task
            .handle
            .join()
            .map_err(|_| "Camera thread failed".to_string())?;
    }

    Ok(())
}