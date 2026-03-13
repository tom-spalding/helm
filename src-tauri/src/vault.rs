use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

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
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_note(file_path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&file_path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_note(file_path: String) -> Result<(), String> {
    fs::remove_file(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_note(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}
