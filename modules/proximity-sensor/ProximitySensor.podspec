Pod::Spec.new do |s|
  s.name           = 'ProximitySensor'
  s.version        = '1.0.0'
  s.summary        = 'FieldLog local proximity sensor module'
  s.description    = 'Exposes Android and iOS proximity sensor state to FieldLog.'
  s.license        = { :type => 'MIT' }
  s.author         = 'FieldLog'
  s.homepage       = 'https://example.invalid/fieldlog-proximity-sensor'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = {
    :git => 'https://example.invalid/fieldlog-proximity-sensor.git',
    :tag => s.version.to_s
  }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = 'ios/**/*.{h,m,mm,swift}'
end
