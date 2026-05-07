mod vault;
use vault::*;
use tauri::Emitter;
use tauri::menu::{MenuItemBuilder, SubmenuBuilder, MenuBuilder, PredefinedMenuItem};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let new_note_item = MenuItemBuilder::new("New Note")
                .id("new_note")
                .accelerator("CmdOrCtrl+N")
                .build(app)?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_note_item)
                .separator()
                .item(&PredefinedMenuItem::close_window(app, None)?)
                .item(&PredefinedMenuItem::quit(app, None)?)
                .build()?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .item(&PredefinedMenuItem::undo(app, None)?)
                .item(&PredefinedMenuItem::redo(app, None)?)
                .separator()
                .item(&PredefinedMenuItem::cut(app, None)?)
                .item(&PredefinedMenuItem::copy(app, None)?)
                .item(&PredefinedMenuItem::paste(app, None)?)
                .item(&PredefinedMenuItem::select_all(app, None)?)
                .build()?;

            let mcp_setup_item = MenuItemBuilder::new("MCP Setup")
                .id("mcp_setup")
                .build(app)?;

            let help_menu = SubmenuBuilder::new(app, "Help")
                .item(&mcp_setup_item)
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&help_menu)
                .build()?;

            app.set_menu(menu)?;

            let app_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                match event.id().as_ref() {
                    "new_note" => { let _ = app_handle.emit("new-note", ()); }
                    "mcp_setup" => { let _ = app_handle.emit("show-mcp-setup", ()); }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_vault_path,
            set_vault_path,
            get_vaults,
            set_vaults,
            list_notes,
            read_note,
            write_note,
            delete_note,
            rename_note,
            watch_vault,
            write_asset,
            list_folders,
            create_folder,
            delete_folder,
            rename_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
