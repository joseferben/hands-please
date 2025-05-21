import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/config.ts", "src/bin.ts"],
  outDir: "dist",
  format: "esm",
  dts: true,
  sourcemap: true,
  clean: true,
});
