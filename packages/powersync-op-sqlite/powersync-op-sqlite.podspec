require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "powersync-op-sqlite"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/powersync-ja/powersync-js.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,cpp}"

  s.dependency "React-callinvoker"
  s.dependency "React"
  s.dependency "powersync-sqlite-core", "~> 0.3.8"
  if defined?(install_modules_dependencies())
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end
