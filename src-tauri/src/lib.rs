mod vault;
use vault::*;
use tauri::Emitter;
use tauri::menu::{MenuItemBuilder, SubmenuBuilder, MenuBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let mcp_setup_item = MenuItemBuilder::new("MCP Setup")
                .id("mcp_setup")
                .build(app)?;

            let help_menu = SubmenuBuilder::new(app, "Help")
                .item(&mcp_setup_item)
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&help_menu)
                .build()?;

            app.set_menu(menu)?;

            let app_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                if event.id().as_ref() == "mcp_setup" {
                    let _ = app_handle.emit("show-mcp-setup", ());
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
