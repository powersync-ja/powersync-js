project(PowersyncOpSqlite)
cmake_minimum_required(VERSION 3.9.0)

set (PACKAGE_NAME "powersync-opsqlite")
set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 17)
set (BUILD_DIR ${CMAKE_SOURCE_DIR}/build)

add_library(
  ${PACKAGE_NAME}
  SHARED
)

set_target_properties(
  ${PACKAGE_NAME} PROPERTIES
  CXX_STANDARD 17
  CXX_EXTENSIONS OFF
  POSITION_INDEPENDENT_CODE ON
)

find_package(ReactAndroid REQUIRED CONFIG)
find_package(fbjni REQUIRED CONFIG)
find_package(powersync_sqlite_core REQUIRED CONFIG)
find_library(LOG_LIB log)

if(${USE_HERMES})
  set(JSEXECUTOR_LIB ReactAndroid::hermes_executor)
else()
  set(JSEXECUTOR_LIB ReactAndroid::jscexecutor)
endif()


target_link_libraries(
  ${PACKAGE_NAME}
  ${LOG_LIB}
  fbjni::fbjni
  ReactAndroid::jsi
  ReactAndroid::turbomodulejsijni
  ReactAndroid::react_nativemodule_core
  ${JSEXECUTOR_LIB}
  android
  powersync_sqlite_core::powersync
)
