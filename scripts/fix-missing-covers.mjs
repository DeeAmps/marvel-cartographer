import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "collected_editions.json");

const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

async function tryOpenLibrary(isbn) {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  try {
    const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
    return resp.ok;
  } catch {
    return false;
  }
}

async function tryGoogleBooks(query) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`;
  const resp = await fetch(url);
  const d = await resp.json();
  if (!d.items) return null;
  for (const item of d.items) {
    const links = item.volumeInfo?.imageLinks;
    if (links?.thumbnail) {
      return links.thumbnail
        .replace("http://", "https://")
        .replace("zoom=1", "zoom=0")
        .replace("zoom=5", "zoom=0");
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const missingWithIsbn = data.filter((e) => e.isbn && !e.cover_image_url);

  // First try Open Library for editions with ISBNs
  for (const e of missingWithIsbn) {
    const ok = await tryOpenLibrary(e.isbn);
    if (ok) {
      e.cover_image_url = `https://covers.openlibrary.org/b/isbn/${e.isbn}-L.jpg`;
      console.log(`OL FOUND: ${e.slug}`);
    } else {
      console.log(`OL MISS:  ${e.slug} (ISBN: ${e.isbn})`);
    }
    await sleep(500);
  }

  // Alt search queries for remaining missing
  const altQueries = {
    "asm-omnibus-v3": "Amazing Spider-Man Omnibus Volume 3 Marvel Comics",
    "avengers-omnibus-v1": "Avengers Omnibus Volume 1 Stan Lee Jack Kirby Marvel",
    "avengers-korvac-saga": "Avengers Korvac Saga Marvel TPB",
    "avengers-under-siege": "Avengers Under Siege Roger Stern Marvel",
    "uxm-claremont-omnibus-v3": "Uncanny X-Men Omnibus Volume 3 Chris Claremont Marvel",
    "xmen-mutant-massacre": "X-Men Mutant Massacre Marvel Omnibus",
    "xmen-inferno-omnibus": "X-Men Inferno Omnibus Marvel",
    "secret-wars-1984-omnibus": "Marvel Super Heroes Secret Wars Omnibus Jim Shooter",
    "secret-wars-2015-omnibus": "Secret Wars 2015 Jonathan Hickman Marvel",
    "cap-brubaker-v1": "Captain America Ed Brubaker Omnibus Volume 1 Winter Soldier",
    "moon-knight-lemire": "Moon Knight Jeff Lemire Marvel",
  };

  const stillMissing = data.filter((e) => !e.cover_image_url);
  for (const e of stillMissing) {
    const q = altQueries[e.slug] || `${e.title} Marvel Comics`;
    console.log(`Retry: ${e.slug} -> ${q}`);
    const url = await tryGoogleBooks(q);
    if (url) {
      e.cover_image_url = url;
      console.log("  FOUND!");
    } else {
      console.log("  Still no cover");
    }
    await sleep(800);
  }

  writeFileSync(DATA_PATH, JSON.stringify(data, null, 4) + "\n");
  const finalMissing = data.filter((e) => !e.cover_image_url);
  console.log(`\nFinal missing: ${finalMissing.length}`);
  finalMissing.forEach((e) => console.log(`  ${e.slug}`));
}

main();
