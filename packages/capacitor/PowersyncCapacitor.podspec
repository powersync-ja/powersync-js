require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'PowersyncCapacitor'
  version = package['version']
  if version.include?('-dev')
    s.version = '0.0.0'
  else
    s.version = version
  end
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['repository']['url']
  s.author = package['author']
  s.source = { :git => package['repository']['url'], :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}'
   s.dependency "SQLCipher", "~> 4.0"
  s.public_header_files = 'ios/Sources/CPowerSyncPlugin/include/*.h'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
  s.dependency "powersync-sqlite-core", "~> 0.4.4"
   s.xcconfig = {
    'OTHER_CFLAGS' => '$(inherited) -DSQLITE_DBCONFIG_ENABLE_LOAD_EXTENSION=1',
    'HEADER_SEARCH_PATHS' => '$(inherited) "$(PODS_ROOT)/SQLCipher"'
  }
end
