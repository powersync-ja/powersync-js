const COMMANDS: &[&str] = &["powersync"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
