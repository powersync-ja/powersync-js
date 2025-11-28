import path from 'node:path';

import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { getPowerSyncExtensionFilename } from '@powersync/node/worker.js';
import type ICopyPlugin from 'copy-webpack-plugin';
import * as dotenv from 'dotenv';
import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import { type Configuration, type DefinePlugin, type ModuleOptions } from 'webpack';
dotenv.config({ path: '.env.local' });

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

let extensionFilename = getPowerSyncExtensionFilename();

const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main/index.ts',
  // Put your normal webpack config below here
  module: {
    rules: defaultWebpackRules()
  },
  plugins: [
    ...webpackPlugins,
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(require.resolve('@powersync/node/package.json'), `../lib/${extensionFilename}`),
          to: path.join('powersync', extensionFilename)
        }
      ]
    }),
    new DefinePluginImpl({
      POWERSYNC_URL: JSON.stringify(process.env.POWERSYNC_URL),
      POWERSYNC_TOKEN: JSON.stringify(process.env.POWERSYNC_TOKEN)
    })
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json']
  },
  target: 'electron-main'
};

const rendererConfig: Configuration = {
  module: {
    rules: [
      ...defaultWebpackRules(),
      {
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }]
      }
    ]
  },
  plugins: webpackPlugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css']
  }
};

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/{.**,**}/**/powersync/*'
    }
  },
  rebuildConfig: {
    force: true
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
              js: './src/render/preload.ts'
            }
          }
        ]
      }
    })
  ]
};

export default config;
