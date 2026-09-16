const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  entry: {
    main: './src/main.ts',
    'lambda/notifications':
      './src/app/modules/notifications/queue/lambda/index.ts',
  },
  output: {
    path: join(__dirname, '../../dist/apps/epc-crm'),
    filename: '[name].js',
    clean: true,
    libraryTarget: 'commonjs2',
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  target: 'node',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  externalsPresets: { node: true },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true,
      fileReplacements:
        process.env.NODE_ENV === 'production'
          ? [
              {
                replace: 'apps/epc-crm/environments/environment.ts',
                with: 'apps/epc-crm/environments/environment.prod.ts',
              },
            ]
          : [],
    }),
  ],
};
