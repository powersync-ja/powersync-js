#!/bin/sh
set -e

SQLITE_VERSION="2.7.6"
POWERSYNC_CORE_VERSION="0.4.0"
SQLITE_PATH="sql.js"

if [ -d "$SQLITE_PATH" ]; then
  echo "Deleting existing clone"
  rm -rf $SQLITE_PATH
fi

git clone --depth 1 https://github.com/sql-js/sql.js.git $SQLITE_PATH

cd $SQLITE_PATH
git apply ../patches/*
mkdir -p powersync-libs
curl -L -o powersync-libs/libpowersync-wasm.a "https://github.com/powersync-ja/powersync-sqlite-core/releases/download/v${POWERSYNC_CORE_VERSION}/libpowersync-wasm.a"

make 

cd ../
mkdir -p dist
cp -r $SQLITE_PATH/dist/ dist
