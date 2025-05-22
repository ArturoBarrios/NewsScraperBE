import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node18",
  sourcemap: true,    
  clean: true,
  shims: true,
  splitting: false,  
  // 👇 THIS LINE IS THE FIX
  external: ["express", "cors", "cookie-parser", "jsonwebtoken", "body-parser", "path"],
  onSuccess: () => {
    // Automatically copy schema.graphql from src to dist
    const from = "src/schema.graphql";
    const to = "dist/schema.graphql";

    try {
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
      console.log("📄 schema.graphql copied to dist/");
    } catch (err) {
      console.error("❌ Failed to copy schema.graphql:", err);
    }
  },
});
