import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function serveStatic(app: Express) {
  // Works for both ESM and CJS bundled output on Vercel
  const distPath = path.resolve(
    typeof __dirname !== "undefined" 
      ? __dirname 
      : path.dirname(fileURLToPath(import.meta.url)),
    "public"
  );

  if (!fs.existsSync(distPath)) {
    // Fallback: try relative to process.cwd()
    const cwdPath = path.resolve(process.cwd(), "dist/public");
    if (fs.existsSync(cwdPath)) {
      app.use(express.static(cwdPath));
      app.use("/{*path}", (_req, res) => {
        res.sendFile(path.resolve(cwdPath, "index.html"));
      });
      return;
    }
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
