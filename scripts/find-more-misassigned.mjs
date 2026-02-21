import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const editions = JSON.parse(readFileSync(resolve(__dirname, "..", "web", "data", "collected_editions.json"), "utf-8"));

// Specific known fixes based on the user spotting ff-by-jonathan-hickman-the-tp-v4 in dawn-of-krakoa
const fixes = {};

for (const e of editions) {
  const slug = e.slug;
  const title = (e.title || "").toLowerCase();
  const issues = (e.issues_collected || "").toLowerCase();
  const era = e.era_slug;

  // Hickman FF/Avengers TPBs in wrong eras
  if (slug.includes("hickman") || title.includes("hickman")) {
    // FF by Hickman TPBs → hickman-saga (unless X-Men Krakoa era or Ultimate 2024)
    if ((slug.startsWith("ff-by") || slug.startsWith("ff-hickman")) && era !== "hickman-saga") {
      if (!slug.includes("x-men") && !slug.includes("ultimate")) {
        fixes[slug] = { from: era, to: "hickman-saga", title: e.title };
      }
    }
    // Avengers by Hickman TPBs → hickman-saga (unless Ultimate)
    if (slug.startsWith("avengers-by") && slug.includes("hickman") && era !== "hickman-saga") {
      if (!slug.includes("ultimate")) {
        fixes[slug] = { from: era, to: "hickman-saga", title: e.title };
      }
    }
    // Secret Wars by Hickman → hickman-saga (it's the culmination)
    if (slug.includes("secret-wars") && slug.includes("hickman") && era !== "hickman-saga") {
      fixes[slug] = { from: era, to: "hickman-saga", title: e.title };
    }
    // Ultimate Spider-Man Hickman v3, family-business → blood-hunt-doom (2024 content)
    if (slug.includes("ultimate-spider-man") && slug.includes("hickman") && era === "current-ongoings") {
      fixes[slug] = { from: era, to: "blood-hunt-doom", title: e.title };
    }
  }

  // Secret Warriors by Hickman → bendis-avengers (published 2009-2011)
  if (slug === "secret-warriors-hickman-v2" && era !== "bendis-avengers") {
    fixes[slug] = { from: era, to: "bendis-avengers", title: e.title };
  }
}

// Also scan for more broad patterns the first fix script might have missed
// Look at dawn-of-krakoa for things that clearly don't belong
const krakoaEditions = editions.filter(e => e.era_slug === "dawn-of-krakoa");
for (const e of krakoaEditions) {
  const issues = (e.issues_collected || "").toLowerCase();
  const title = (e.title || "").toLowerCase();

  // Check for series years that indicate pre-2019 content
  const yearMatch = issues.match(/\((\d{4})\)/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    // If the series launched before 2015 and the issues are early numbers, likely wrong era
    if (year <= 2012 && !title.includes("x-men") && !title.includes("krakoa") && !title.includes("hox") && !title.includes("pox")) {
      // Check issue numbers - low numbers of old series suggest wrong era
      const issueMatch = issues.match(/#(\d+)/);
      if (issueMatch) {
        const issueNum = parseInt(issueMatch[1]);
        if (issueNum < 50) {
          // Likely a pre-Krakoa run misassigned
          // But skip if it's a known Krakoa-era book
          if (!fixes[e.slug]) {
            console.log(`SUSPECT in dawn-of-krakoa: ${e.slug} | ${e.title} | ${issues.substring(0, 80)}`);
          }
        }
      }
    }
  }
}

console.log("\n=== FIXES TO APPLY ===\n");
for (const [slug, info] of Object.entries(fixes)) {
  console.log(`${slug}: ${info.from} → ${info.to} (${info.title})`);
}
console.log(`\nTotal: ${Object.keys(fixes).length} fixes`);
