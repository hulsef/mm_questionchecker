// webpack.common.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin"); // <-- ADDED: Import CopyPlugin

module.exports = {
  entry: './src/index.js', // Entry point of your React app

  // Add the devtool option here:
  // 'cheap-module-source-map' is a good balance for development speed
  // and quality, and importantly, it does not use 'eval'.
  devtool: 'cheap-module-source-map',

  output: {
    // Specifies the output directory for bundled files
    path: path.resolve(__dirname, 'build'), // Output to the 'build' directory
    filename: 'bundle.js', // Name of the main JavaScript bundle
    publicPath: './', // Ensures assets are referenced correctly in Electron
  },

  target: 'electron-renderer', // Specifies the target environment

  module: {
    // Defines rules for processing different file types
    rules: [
      {
        // Rule for JavaScript and JSX files
        test: /\.(js|jsx)$/,
        exclude: /node_modules/, // Don't process files in node_modules
        use: {
          loader: 'babel-loader', // Use Babel to transpile JS/JSX
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'], // Use standard presets
          },
        },
      },
      {
        // Rule for CSS files
        test: /\.css$/,
        // Process CSS with style-loader, css-loader, and postcss-loader (for Tailwind)
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        // Rule for image assets
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource', // Handle images as resources
      },
    ],
  },

  plugins: [
    // Generates the index.html file and injects the script bundle
    new HtmlWebpackPlugin({
      template: './index.html', // Use the root index.html as the template
      filename: 'index.html' // Output filename (usually index.html)
    }),
    // --- ADDED: Copy splash.js to the build directory ---
    new CopyPlugin({
      patterns: [
        { from: "src/splash.js", to: "." }, // Copies src/splash.js to build/splash.js
      ],
    }),
    // --- END ADDED ---
  ],

  resolve: {
    // Allows importing modules without specifying these extensions
    extensions: ['.js', '.jsx'],
  },

  // Note: 'mode' (development or production) is set via the npm script arguments
  // (e.g., --mode development), so it doesn't need to be hardcoded here.
};