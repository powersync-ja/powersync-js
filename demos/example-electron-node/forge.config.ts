import { createRequire } from 'node:module';

import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import type { Configuration, ModuleOptions } from 'webpack';
import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

const require = createRequire(import.meta.url);

const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

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
  plugins: webpackPlugins,
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
