use serde::Serialize;
use std::sync::Mutex;

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

use tauri::State;

struct CameraState {
    camera: Mutex<Option<Camera>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CameraState {
            camera: Mutex::new(None),
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

#[derive(Serialize)]
struct CameraDevice {
    id: String,
    name: String,
}

#[tauri::command]
fn get_camera_devices() -> Result<Vec<CameraDevice>, String> {
    let backend = native_api_backend()
        .ok_or("Camera backend not available")?;

    let cameras = query(backend)
        .map_err(|error| error.to_string())?;

    let devices = cameras
        .into_iter()
        .enumerate()
        .map(|(index, camera)| CameraDevice {
            id: index.to_string(),
            name: camera.human_name(),
        })
        .collect();

    Ok(devices)
}

#[tauri::command]
fn start_camera(
    device_id: String,
    state: State<'_, CameraState>,
) -> Result<(), String> {
    let index = device_id
        .parse::<u32>()
        .map_err(|error| error.to_string())?;

    let camera_index = CameraIndex::Index(index);

    let format = RequestedFormat::new::<RgbFormat>(
        RequestedFormatType::AbsoluteHighestFrameRate,
    );

    let mut camera = Camera::new(camera_index, format)
        .map_err(|error| error.to_string())?;

    camera.open_stream()
        .map_err(|error| error.to_string())?;

    let mut current_camera = state.camera
        .lock()
        .map_err(|error| error.to_string())?;

    *current_camera = Some(camera);

    Ok(())
}

#[tauri::command]
fn stop_camera(
    state: State<'_, CameraState>,
) -> Result<(), String> {
    let mut current_camera = state.camera
        .lock()
        .map_err(|error| error.to_string())?;

    if let Some(mut camera) = current_camera.take() {
        camera.stop_stream()
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}