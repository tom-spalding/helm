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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VaultConfig {
    pub id: String,
    pub name: String,
    pub path: String,
}

#[tauri::command]
pub async fn get_vaults(app: AppHandle) -> Result<Vec<VaultConfig>, String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    if let Some(v) = store.get("vaults") {
        let vaults: Vec<VaultConfig> = serde_json::from_value(v).map_err(|e| e.to_string())?;
        Ok(vaults)
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub async fn set_vaults(app: AppHandle, vaults: Vec<VaultConfig>) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    let val = serde_json::to_value(&vaults).map_err(|e| e.to_string())?;
    store.set("vaults", val);
    store.save().map_err(|e| e.to_string())
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

fn collect_folders(dir: &PathBuf, folders: &mut Vec<String>) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            if name_str.starts_with('.') || name_str == "assets" {
                continue; // skip hidden dirs and the assets directory
            }
            folders.push(path.to_string_lossy().to_string());
            collect_folders(&path, folders)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn list_folders(vault_path: String) -> Result<Vec<String>, String> {
    let path = validate_path(&vault_path)?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let mut folders = Vec::new();
    collect_folders(&path, &mut folders)?;
    Ok(folders)
}

fn collect_notes(dir: &PathBuf, notes: &mut Vec<NoteFile>) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_path = entry.path();
        if file_path.is_dir() {
            collect_notes(&file_path, notes)?;
        } else if file_path.extension().and_then(|e| e.to_str()) == Some("md") {
            let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
            notes.push(NoteFile {
                path: file_path.to_string_lossy().to_string(),
                file_name: entry.file_name().to_string_lossy().to_string(),
                content,
            });
        }
    }
    Ok(())
}

fn list_notes_impl(vault_path: &str) -> Result<Vec<NoteFile>, String> {
    let path = validate_path(vault_path)?;
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }

    let mut notes = Vec::new();
    collect_notes(&path, &mut notes)?;
    Ok(notes)
}

#[tauri::command]
pub async fn list_notes(vault_path: String) -> Result<Vec<NoteFile>, String> {
    list_notes_impl(&vault_path)
}

#[tauri::command]
pub async fn read_note(file_path: String) -> Result<String, String> {
    let path = validate_path(&file_path)?;
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

// Crash-safe write: write to a temp file in the same directory, then rename
// over the target. Rename is atomic on POSIX, so a crash mid-write can never
// leave the note truncated — the old content survives until the rename lands.
fn atomic_write(path: &std::path::Path, content: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("Path has no parent directory: {}", path.display()))?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;

    let file_name = path
        .file_name()
        .ok_or_else(|| format!("Path has no file name: {}", path.display()))?;
    let tmp = parent.join(format!(".{}.tmp-{}", file_name.to_string_lossy(), std::process::id()));

    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        e.to_string()
    })
}

#[tauri::command]
pub async fn write_note(file_path: String, content: String) -> Result<(), String> {
    let path = validate_path(&file_path)?;
    atomic_write(&path, content.as_bytes())
}

fn write_asset_impl(vault_path: &str, filename: &str, data: &[u8]) -> Result<String, String> {
    let vault = validate_path(vault_path)?;
    let assets_dir = vault.join("assets");
    fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;

    // Drop any directory components, then sanitize what remains:
    // allow only alphanumeric, dash, underscore, dot.
    let base_name = std::path::Path::new(filename)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let safe_name: String = base_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' { c } else { '_' })
        .collect();
    let safe_name = safe_name.trim_matches('.').to_string();
    if safe_name.is_empty() {
        return Err(format!("Invalid asset filename: {}", filename));
    }

    let dest = assets_dir.join(&safe_name);
    atomic_write(&dest, data)?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn write_asset(vault_path: String, filename: String, data: Vec<u8>) -> Result<String, String> {
    write_asset_impl(&vault_path, &filename, &data)
}

fn delete_asset_impl(file_path: &str) -> Result<(), String> {
    let path = validate_path(file_path)?;
    if path.extension().and_then(|e| e.to_str()) == Some("md") {
        return Err(format!("Refusing to delete a note file as an asset: {}", file_path));
    }
    fs::remove_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_asset(file_path: String) -> Result<(), String> {
    delete_asset_impl(&file_path)
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
pub async fn create_folder(path: String) -> Result<(), String> {
    let p = validate_path(&path)?;
    fs::create_dir_all(&p).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_folder(path: String) -> Result<(), String> {
    let p = validate_path(&path)?;
    fs::remove_dir_all(&p).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_folder(old_path: String, new_path: String) -> Result<(), String> {
    let old = validate_path(&old_path)?;
    let new_p = validate_path(&new_path)?;
    fs::rename(&old, &new_p).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("helm-vault-test-{}", name));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn atomic_write_creates_file_with_content() {
        let dir = temp_dir("atomic-create");
        let path = dir.join("note.md");
        atomic_write(&path, b"hello").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "hello");
    }

    #[test]
    fn atomic_write_overwrites_existing_file() {
        let dir = temp_dir("atomic-overwrite");
        let path = dir.join("note.md");
        fs::write(&path, "old").unwrap();
        atomic_write(&path, b"new").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "new");
    }

    #[test]
    fn atomic_write_leaves_no_temp_files() {
        let dir = temp_dir("atomic-clean");
        let path = dir.join("note.md");
        atomic_write(&path, b"content").unwrap();
        let entries: Vec<_> = fs::read_dir(&dir).unwrap().collect();
        assert_eq!(entries.len(), 1, "only the target file should remain");
    }

    #[test]
    fn list_notes_impl_rejects_relative_path() {
        assert!(list_notes_impl("relative/path").is_err());
    }

    #[test]
    fn list_notes_impl_rejects_parent_traversal() {
        assert!(list_notes_impl("/tmp/../etc").is_err());
    }

    #[test]
    fn write_asset_impl_rejects_relative_vault_path() {
        assert!(write_asset_impl("relative/vault", "img.png", &[1, 2, 3]).is_err());
    }

    #[test]
    fn write_asset_impl_strips_path_components_from_filename() {
        let dir = temp_dir("asset-sanitize");
        let dest = write_asset_impl(dir.to_str().unwrap(), "../../evil.png", &[1]).unwrap();
        let dest_path = PathBuf::from(&dest);
        // Must land inside <vault>/assets, regardless of traversal attempts
        assert!(dest_path.starts_with(dir.join("assets")));
        assert!(dest_path.exists());
    }

    #[test]
    fn delete_asset_impl_refuses_markdown_files() {
        let dir = temp_dir("asset-refuse-md");
        let md = dir.join("note.md");
        fs::write(&md, "content").unwrap();
        assert!(delete_asset_impl(md.to_str().unwrap()).is_err());
        assert!(md.exists(), "markdown file must not be deleted");
    }

    #[test]
    fn delete_asset_impl_deletes_non_markdown_file() {
        let dir = temp_dir("asset-delete");
        let img = dir.join("img.png");
        fs::write(&img, [1, 2, 3]).unwrap();
        delete_asset_impl(img.to_str().unwrap()).unwrap();
        assert!(!img.exists());
    }
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

        if let Err(e) = watcher.watch(std::path::Path::new(&vault_path), RecursiveMode::Recursive) {
            eprintln!("Failed to watch vault: {}", e);
            return;
        }

        for result in rx {
            if let Ok(event) = result {
                let md_paths: Vec<String> = event
                    .paths
                    .iter()
                    .filter(|p| p.extension().and_then(|e| e.to_str()) == Some("md"))
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
                if !md_paths.is_empty() {
                    // Treat Remove and Rename-from as deletions. On macOS, a
                    // file rename emits Modify(Name(From)) for the old path and
                    // Modify(Name(To)) for the new path — neither is EventKind::Remove.
                    let is_deletion = matches!(event.kind, notify::EventKind::Remove(_))
                        || matches!(
                            event.kind,
                            notify::EventKind::Modify(notify::event::ModifyKind::Name(
                                notify::event::RenameMode::From
                            ))
                        );
                    if is_deletion {
                        let _ = app_clone.emit("vault-note-deleted", &md_paths);
                    } else {
                        let _ = app_clone.emit("vault-changed", &md_paths);
                    }
                }

                // Emit for directory create/remove so the frontend refreshes its folder list
                let has_dir_event = event.paths.iter().any(|p| p.is_dir())
                    || matches!(
                        event.kind,
                        notify::EventKind::Create(notify::event::CreateKind::Folder)
                            | notify::EventKind::Remove(notify::event::RemoveKind::Folder)
                    );
                if has_dir_event {
                    let _ = app_clone.emit("vault-dirs-changed", &vault_path);
                }
            }
        }
    });

    Ok(())
}
