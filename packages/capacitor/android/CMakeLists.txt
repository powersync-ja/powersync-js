cmake_minimum_required(VERSION 3.4.1)

cmake_minimum_required(VERSION 3.4.1)
project(powersync_capacitor)

# Set the name of your native library
set(LIB_NAME powersync_capacitor)

# Add your native source files here
add_library(
    ${LIB_NAME}
    SHARED
    src/main/cpp/powersync_capacitor_jni.c
)

find_package(powersync_sqlite_core REQUIRED CONFIG)

# Link libraries if needed (e.g., log)
target_link_libraries(
    ${LIB_NAME}
    log
    powersync_sqlite_core::powersync
)
