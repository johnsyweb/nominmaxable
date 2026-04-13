import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sitemapPath = path.join(__dirname, "..", "dist", "sitemap.xml");

if (!fs.existsSync(sitemapPath)) {
  console.warn("update-sitemap-lastmod: sitemap.xml not found, skipping");
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
const content = fs.readFileSync(sitemapPath, "utf8");
const updatedContent = content.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`);

fs.writeFileSync(sitemapPath, updatedContent);
