use std::env;
use tauri::Manager;
use url::Url;

use log::info;

/// A simple Tauri app that allows all commands.
///
/// We run this app through the Tauri web driver wrapper, which will make it load the vitest browser
/// UI through which we test the Tauri plugin.
fn main() {
    env_logger::init();

    // Use default options, but open window with URL from args.
    let mut context = tauri::generate_context!();
    if let Some(url) = env::args().skip(1).next() {
        let config = context.config_mut();
        config.build.dev_url = Some(Url::parse(&url).expect("Could not parse URL"));
    }

    info!("Running test tauri application");
    tauri::Builder::default()
        .plugin(tauri_plugin_powersync::init())
        .setup(|app| {
            for (name, window) in app.webview_windows() {
                info!("Found window {name} on {}", window.url()?);
            }

            Ok(())
        })
        .run(context)
        .expect("error while running tauri application");
}
