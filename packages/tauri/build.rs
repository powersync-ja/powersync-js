const COMMANDS: &[&str] = &["powersync_command"];

fn main() {
  tauri_plugin::Builder::new(COMMANDS)
    .build();
}
