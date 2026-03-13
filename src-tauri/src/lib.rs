mod vault;
use vault::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_vault_path,
            set_vault_path,
            list_notes,
            read_note,
            write_note,
            delete_note,
            rename_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
