use std::env;
use url::Url;

/// A simple Tauri app that allows all commands.
///
/// We run this app through the Tauri web driver wrapper, which will make it load the vitest browser
/// UI through which we test the Tauri plugin.
fn main() {
    // Use default options, but open window with URL from args.
    let mut context = tauri::generate_context!();
    if let Some(url) = env::args().skip(1).next() {
        let config = context.config_mut();
        config.build.dev_url = Some(Url::parse(&url).expect("Could not parse URL"));
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_powersync::init())
        .run(context)
        .expect("error while running tauri application");
}
