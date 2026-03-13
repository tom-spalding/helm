use notify::{recommended_watcher, Event, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::thread;
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

fn validate_path(file_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(file_path);
    // Reject relative paths
    if path.is_relative() {
        return Err(format!("Path must be absolute: {}", file_path));
    }
    // Reject paths with .. components
    if path.components().any(|c| c == std::path::Component::ParentDir) {
        return Err(format!("Path traversal not allowed: {}", file_path));
    }
    Ok(path)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NoteFile {
    pub path: String,
    pub file_name: String,
    pub content: String,
}

#[tauri::command]
pub async fn get_vault_path(app: AppHandle) -> Result<Option<String>, String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    Ok(store.get("vault_path").and_then(|v| v.as_str().map(|s| s.to_string())))
}

#[tauri::command]
pub async fn set_vault_path(app: AppHandle, path: String) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    store.set("vault_path", path);
    store.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_notes(vault_path: String) -> Result<Vec<NoteFile>, String> {
    let path = PathBuf::from(&vault_path);
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }

    let mut notes = Vec::new();
    for entry in fs::read_dir(&path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_path = entry.path();
        if file_path.extension().and_then(|e| e.to_str()) == Some("md") {
            let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
            notes.push(NoteFile {
                path: file_path.to_string_lossy().to_string(),
                file_name: entry.file_name().to_string_lossy().to_string(),
                content,
            });
        }
    }
    Ok(notes)
}

#[tauri::command]
pub async fn read_note(file_path: String) -> Result<String, String> {
    let path = validate_path(&file_path)?;
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_note(file_path: String, content: String) -> Result<(), String> {
    let path = validate_path(&file_path)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_note(file_path: String) -> Result<(), String> {
    let path = validate_path(&file_path)?;
    fs::remove_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_note(old_path: String, new_path: String) -> Result<(), String> {
    let old = validate_path(&old_path)?;
    let new = validate_path(&new_path)?;
    fs::rename(&old, &new).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn watch_vault(app: AppHandle, vault_path: String) -> Result<(), String> {
    let app_clone = app.clone();

    thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel::<Result<Event, notify::Error>>();

        let mut watcher = match recommended_watcher(tx) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("Failed to create watcher: {}", e);
                return;
            }
        };

        if let Err(e) = watcher.watch(std::path::Path::new(&vault_path), RecursiveMode::NonRecursive) {
            eprintln!("Failed to watch vault: {}", e);
            return;
        }

        for result in rx {
            if let Ok(event) = result {
                let paths: Vec<String> = event
                    .paths
                    .iter()
                    .filter(|p| p.extension().and_then(|e| e.to_str()) == Some("md"))
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
                if !paths.is_empty() {
                    let _ = app_clone.emit("vault-changed", paths);
                }
            }
        }
    });

    Ok(())
}
