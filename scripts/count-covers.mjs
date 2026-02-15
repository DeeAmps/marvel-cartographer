import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, "..", "data", "collected_editions.json"), "utf-8"));
const missing = data.filter(e => !e.cover_image_url).length;
const hasCover = data.filter(e => !!e.cover_image_url).length;
console.log(`Total: ${data.length} | Has cover: ${hasCover} | Missing: ${missing}`);
