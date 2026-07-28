# [파일 역할] CocoaPods가 iOS Swift source와 ExpoModulesCore 의존성을 app target에 연결하는 명세입니다.
Pod::Spec.new do |s|
  # [Ruby 문법] do |s| ... end block의 s가 지금 구성 중인 Pod::Spec 객체입니다.
  s.name           = 'ProximitySensor'
  s.version        = '1.0.0'
  s.summary        = 'FieldLog local proximity sensor module'
  s.description    = 'Exposes Android and iOS proximity sensor state to FieldLog.'
  s.license        = { :type => 'MIT' }
  s.author         = 'FieldLog'
  s.homepage       = 'https://example.invalid/fieldlog-proximity-sensor'
  # 이 native module을 컴파일할 최소 iOS와 Swift language version입니다.
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  # local Expo module이지만 CocoaPods spec 형식을 완성하기 위한 source metadata입니다.
  s.source         = {
    :git => 'https://example.invalid/fieldlog-proximity-sensor.git',
    :tag => s.version.to_s
  }
  # app binary에 정적으로 연결되는 framework로 빌드합니다.
  s.static_framework = true

  # Swift의 Module/Events/AsyncFunction DSL을 제공하는 Expo native core Pod입니다.
  s.dependency 'ExpoModulesCore'

  # [라이브러리] CocoaPods가 생성하는 Xcode target의 module 생성과 Swift compile 방식을 지정합니다.
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  # glob에 맞는 ios 폴더의 Objective-C/C++/Swift source만 Pod compile 대상입니다.
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
end
