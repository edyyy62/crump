Pod::Spec.new do |s|
  s.name           = 'AppleGroceries'
  s.version        = '1.0.0'
  s.summary        = 'MapKit grocery search for Crump'
  s.description    = 'Finds nearby grocery stores using Apple Maps.'
  s.license        = 'UNLICENSED'
  s.author         = 'Crump'
  s.homepage       = 'https://github.com/edyyy62/crump'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'MapKit'
  s.source_files   = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
