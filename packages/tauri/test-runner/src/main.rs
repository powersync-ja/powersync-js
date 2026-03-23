/// A simple Tauri app that allows all commands.
///
/// We run this app through the Tauri web driver wrapper, which will make it load the vitest browser
/// UI through which we test the Tauri plugin.
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_powersync::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
