import rawPlugin from "vite-raw-plugin";

export default {
  base: "/physarum/",
  plugins: [
    rawPlugin({
      fileRegex: /\.wgsl$/,
    }),
  ],
};
