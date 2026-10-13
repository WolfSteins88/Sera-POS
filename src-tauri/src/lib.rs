// Tauri shell for Sora POS.
// Starts the bundled Node sidecar (desktop/launcher.mjs), which opens the local PGlite
// database and the Next.js server, then points the window at that local server.
use std::collections::VecDeque;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager, RunEvent, Url};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

const READY_PREFIX: &str = "SORA_READY ";
const LOG_TAIL_LINES: usize = 80;

struct Sidecar {
    child: Mutex<Option<CommandChild>>,
    exited: Arc<AtomicBool>,
}

fn start_sidecar(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = app.path().app_data_dir()?;
    let log_dir = app.path().app_log_dir()?;
    fs::create_dir_all(&data_dir)?;
    fs::create_dir_all(&log_dir)?;
    let app_dir = plain_path(app.path().resource_dir()?.join("app"));
    let data_dir = plain_path(data_dir);

    let (mut rx, child) = app
        .shell()
        .sidecar("node")?
        .args([app_dir.join("launcher.mjs").to_string_lossy().to_string()])
        .env("SORA_DATA_DIR", data_dir.to_string_lossy().to_string())
        .current_dir(&app_dir)
        .spawn()?;

    let exited = Arc::new(AtomicBool::new(false));
    app.manage(Sidecar {
        child: Mutex::new(Some(child)),
        exited: exited.clone(),
    });

    let handle = app.clone();
    let mut log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_dir.join("server.log"))?;
    tauri::async_runtime::spawn(async move {
        let mut tail: VecDeque<String> = VecDeque::new();
        let mut ready = false;
        while let Some(event) = rx.recv().await {
            let line = match &event {
                CommandEvent::Stdout(bytes) | CommandEvent::Stderr(bytes) => {
                    String::from_utf8_lossy(bytes).trim_end().to_string()
                }
                CommandEvent::Error(err) => format!("error: {err}"),
                CommandEvent::Terminated(payload) => {
                    format!("server stopped (code {:?})", payload.code)
                }
                _ => continue,
            };
            let _ = writeln!(log_file, "{line}");
            tail.push_back(line.clone());
            if tail.len() > LOG_TAIL_LINES {
                tail.pop_front();
            }

            if !ready {
                if let Some(url) = line.lines().find_map(|l| l.trim().strip_prefix(READY_PREFIX)) {
                    if let (Some(window), Ok(url)) = (handle.get_webview_window("main"), Url::parse(url)) {
                        ready = true;
                        let _ = window.navigate(url);
                    }
                }
            }

            if let CommandEvent::Terminated(_) = event {
                exited.store(true, Ordering::SeqCst);
                if !ready {
                    if let Some(window) = handle.get_webview_window("main") {
                        let log = tail.iter().cloned().collect::<Vec<_>>().join("\n");
                        let js = format!("window.soraFailed && window.soraFailed({})", json_string(&log));
                        let _ = window.eval(&js);
                    }
                }
                break;
            }
        }
    });
    Ok(())
}

/// Drops the Windows `\\?\` verbatim prefix, which Node's module loader does not accept.
fn plain_path(path: PathBuf) -> PathBuf {
    let text = path.to_string_lossy();
    match text.strip_prefix(r"\\?\") {
        Some(rest) if !rest.starts_with("UNC\\") => PathBuf::from(rest),
        _ => path,
    }
}

/// Minimal JSON string encoding, so the error log can be passed to the splash page.
fn json_string(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 || c == '\u{2028}' || c == '\u{2029}' => {
                out.push_str(&format!("\\u{:04x}", c as u32))
            }
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

/// Asks the sidecar to close the database cleanly, then waits briefly before forcing it.
fn stop_sidecar(app: &AppHandle) {
    let Some(state) = app.try_state::<Sidecar>() else { return };
    let Some(mut child) = state.child.lock().unwrap().take() else { return };
    let _ = child.write(b"quit\n");
    let deadline = Instant::now() + Duration::from_secs(8);
    while !state.exited.load(Ordering::SeqCst) && Instant::now() < deadline {
        std::thread::sleep(Duration::from_millis(100));
    }
    if !state.exited.load(Ordering::SeqCst) {
        let _ = child.kill();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Two copies must never open the same database folder at once.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            start_sidecar(app.handle())?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Sora POS")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                stop_sidecar(app);
            }
        });
}
