use serde::Serialize;
use nokhwa::{native_api_backend, query};


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_camera_devices
        ])
        .setup(|app| {
            Ok(())
        })
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