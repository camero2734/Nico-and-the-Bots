module.exports = {
    outDir: "./dist",
    esbuild: {
      minify: false,
      target: "esnext",
      entryPoints: ["app.ts"]
    },
    assets: {
      baseDir: "./src", // Change this to your folder name
      filePatterns: ["**/*.ts", "**/*.js", "**/*.json"], 
    },
  }
  