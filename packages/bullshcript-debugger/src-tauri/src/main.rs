// Opens the UI and runs scripts/data-service.mjs beside it for package reads.
// The opener plugin takes About's and the update prompt's links to the browser.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpListener;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{Manager, RunEvent};

struct DataService {
    child: Mutex<Option<Child>>,
    url: Option<String>,
}

// A dev tool: the script runs from the package (it needs its node_modules),
// unless BSDBG_DATA_SERVICE names another copy.
fn script_path() -> PathBuf {
    std::env::var_os("BSDBG_DATA_SERVICE")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../scripts/data-service.mjs")
        })
}

fn start_data_service() -> DataService {
    let port = TcpListener::bind("127.0.0.1:0")
        .and_then(|listener| listener.local_addr())
        .map(|addr| addr.port());
    let Ok(port) = port else {
        return DataService { child: Mutex::new(None), url: None };
    };
    let mut command = Command::new("node");
    command.arg(script_path()).arg("--port").arg(port.to_string());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // no console window for it
        command.creation_flags(0x0800_0000);
    }
    match command.spawn() {
        Ok(child) => DataService {
            child: Mutex::new(Some(child)),
            url: Some(format!("http://127.0.0.1:{port}")),
        },
        Err(error) => {
            eprintln!("data service did not start: {error}");
            DataService { child: Mutex::new(None), url: None }
        }
    }
}

#[tauri::command]
fn data_service_url(service: tauri::State<DataService>) -> Option<String> {
    service.url.clone()
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(start_data_service())
        .invoke_handler(tauri::generate_handler![data_service_url])
        .build(tauri::generate_context!())
        .expect("error while building the debugger window");
    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            if let Some(mut child) = handle.state::<DataService>().child.lock().unwrap().take() {
                let _ = child.kill();
            }
        }
    });
}
