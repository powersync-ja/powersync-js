require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "powersync-op-sqlite"
  # Our development versions are not recognized by Cocoapods
  version = package['version']
  if version.include?('-dev')
    s.version = '0.0.0'
  else
    s.version = version
  end
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/powersync-ja/powersync-js.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,cpp}"

  s.dependency "React-callinvoker"
  s.dependency "React"
  s.dependency "powersync-sqlite-core", "~> 0.4.11"
  if defined?(install_modules_dependencies())
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end
