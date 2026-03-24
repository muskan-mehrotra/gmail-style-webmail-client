const path = require("path");

module.exports = {
  entry: "./src/main.ts",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "public/dist"),
    publicPath: "/dist/",
    clean: true
  },
  devtool: "source-map",
  resolve: { extensions: [".ts", ".js"] },
  module: {
    rules: [{ test: /\.ts$/, use: "ts-loader", exclude: /node_modules/ }]
  },
  devServer: {
    static: { directory: path.join(__dirname, "public") },
    port: 3002,
    hot: true,
    devMiddleware: {
      publicPath: "/dist/"
    }
  }
};