import OS from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { type Configuration, type ModuleOptions, type DefinePlugin } from 'webpack';
import * as dotenv from 'dotenv';
import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import type ICopyPlugin from 'copy-webpack-plugin';

dotenv.config({path: '.env.local'});

const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyPlugin: typeof ICopyPlugin = require('copy-webpack-plugin');
const DefinePluginImpl: typeof DefinePlugin = require('webpack').DefinePlugin;

const webpackPlugins = [
  new ForkTsCheckerWebpackPlugin({
    //logger: 'webpack-infrastructure'
  })
];

const defaultWebpackRules: () => Required<ModuleOptions>['rules'] = () => {
  return [
    // Add support for native node modules
    {
      // We're specifying native_modules in the test because the asset relocator loader generates a
      // "fake" .node file which is really a cjs file.
      test: /native_modules[/\\].+\.node$/,
      use: 'node-loader'
    },
    {
      test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
      parser: { amd: false },
      use: {
        loader: '@vercel/webpack-asset-relocator-loader',
        options: {
          outputAssetBase: 'native_modules'
        }
      }
    },
    {
      test: /\.tsx?$/,
      exclude: /(node_modules|\.webpack)/,
      use: {
        loader: 'ts-loader',
        options: {
          transpileOnly: true
        }
      }
    }
  ];
};

const platform = OS.platform();
let extensionPath: string;
if (platform === 'win32') {
  extensionPath = 'powersync.dll';
} else if (platform === 'linux') {
  extensionPath = 'libpowersync.so';
} else if (platform === 'darwin') {
  extensionPath = 'libpowersync.dylib';
} else {
  throw 'Unknown platform, PowerSync for Node.js currently supports Windows, Linux and macOS.';
}

const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main/index.ts',
  // Put your normal webpack config below here
  module: {
    rules: defaultWebpackRules(),
  },
  plugins: [
    ...webpackPlugins,
    new CopyPlugin({
      patterns: [{
        from: path.resolve(require.resolve('@powersync/node/package.json'), `../lib/${extensionPath}`),
        to: extensionPath,
      }],
    }),
    new DefinePluginImpl({
      POWERSYNC_URL: JSON.stringify(process.env.POWERSYNC_URL),
      POWERSYNC_TOKEN: JSON.stringify(process.env.POWERSYNC_TOKEN),
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json']
  }
};

const rendererConfig: Configuration = {
  module: {
    rules: [
      ...defaultWebpackRules(),
      {
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }]
      }
    ],
  },
  plugins: webpackPlugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css']
  }
};

const config: ForgeConfig = {
  packagerConfig: {
    asar: true
  },
  rebuildConfig: {
    force: true,
  },
  makers: [
    new MakerSquirrel(),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({ options: { icon: './public/icons/icon' } }),
    new MakerDeb({ options: { icon: './public/icons/icon' } })
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            name: 'main_window',
            html: './src/render/index.html',
            js: './src/render/main.ts',
            preload: {
              js: './src/render/preload.ts',
            }
          }
        ]
      }
    })
  ]
};

export default config;
