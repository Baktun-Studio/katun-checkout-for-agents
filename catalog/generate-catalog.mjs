#!/usr/bin/env node
// Generates the synthetic catalog (catalog/products.csv) and two placeholder images per product: catalog/images/{sku}.png (the
// one the CSV points to) and catalog/images/{sku}.svg (kept for reference). PNG because the Airwallex catalog uses the Google
// Merchant Center format, which does not accept SVG images.
// Deterministic, no dependencies. Format read from the Katun sandbox merchant guide on 2026-10-26:
//   sku,name,description,price,stock,category,image
// Everything is fictional: an outdoor-equipment store that does not exist, with invented names and prices.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { placeholderPng } from "./png.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const IMAGE_BASE = opt("--image-base", "https://raw.githubusercontent.com/Baktun-Studio/katun-checkout-for-agents/main/catalog/images/").replace(/\/?$/, "/");
const COUNT = Number(opt("--count", "100"));
const FORMAT = opt("--image-format", "png");
if (FORMAT !== "png" && FORMAT !== "svg") {
  console.error("--image-format must be png or svg");
  process.exit(1);
}
if (!IMAGE_BASE.startsWith("https://")) {
  console.error("--image-base must be an https URL: the sandbox only publishes products whose photo is served over https");
  process.exit(1);
}

// Ten categories, ten base items each. Prices are chosen so that a single item or a small cart crosses a USD 150 order limit
// naturally (the demo's exception path) while most items stay below it.
const CATEGORIES = [
  { code: "TNT", name: "Tents", items: [["Ridgeline 2-person tent", 189], ["Basin 3-person tent", 249], ["Summit 1-person tent", 159], ["Meadow 4-person tent", 329], ["Trail tarp 3x3 m", 59], ["Bivy shelter", 129], ["Tent footprint, 2-person", 29], ["Tent repair kit", 12], ["Aluminum tent stakes, 10 pack", 18], ["Guyline set with tensioners", 11]] },
  { code: "SLP", name: "Sleeping", items: [["Down sleeping bag, 20 F", 219], ["Synthetic sleeping bag, 35 F", 119], ["Insulated sleeping pad", 139], ["Closed-cell foam pad", 34], ["Inflatable pillow", 24], ["Sleeping bag liner", 39], ["Hammock with straps", 69], ["Bug net for hammock", 44], ["Compression sack, 20 L", 22], ["Camp cot, folding", 109]] },
  { code: "CKG", name: "Cooking", items: [["Canister stove", 49], ["Stove and pot system, 1 L", 129], ["Titanium pot, 750 ml", 42], ["Titanium spork", 9], ["Collapsible kettle", 36], ["Two-burner camp stove", 149], ["Fuel canister, 230 g", 8], ["Cast-iron skillet, 10 in", 38], ["Camp coffee press", 29], ["Cooler, 45 L", 199]] },
  { code: "LGT", name: "Lighting", items: [["Headlamp, 400 lumen", 45], ["Headlamp, 1000 lumen rechargeable", 89], ["Lantern, 600 lumen", 54], ["String lights, 10 m", 26], ["Pocket flashlight", 19], ["Solar lantern, inflatable", 24], ["Candle lantern", 32], ["Spare batteries, AAA 12 pack", 10], ["Headlamp strap, replacement", 7], ["Red-light night marker", 14]] },
  { code: "PCK", name: "Packs", items: [["Backpack, 65 L", 279], ["Backpack, 45 L", 219], ["Daypack, 22 L", 89], ["Hip pack, 3 L", 34], ["Pack rain cover, 50 to 70 L", 29], ["Dry bag set, 3 sizes", 39], ["Stuff sacks, 4 pack", 24], ["Packing cubes, 3 pack", 32], ["Trekking umbrella", 44], ["Pack liner, 70 L", 16]] },
  { code: "APL", name: "Apparel", items: [["Rain jacket", 169], ["Insulated jacket", 199], ["Fleece pullover", 79], ["Hiking pants", 89], ["Merino base layer top", 95], ["Merino socks, 2 pack", 36], ["Sun hat, wide brim", 34], ["Gaiters", 49], ["Liner gloves", 22], ["Buff neck gaiter", 18]] },
  { code: "TLS", name: "Tools", items: [["Folding knife", 54], ["Multi-tool", 99], ["Folding saw", 32], ["Hatchet", 64], ["Trowel, ultralight", 19], ["Paracord, 30 m", 12], ["Duct tape, mini roll", 6], ["Ferro rod fire starter", 15], ["Carabiners, 4 pack", 14], ["Trekking poles, pair", 129]] },
  { code: "NAV", name: "Navigation", items: [["Baseplate compass", 29], ["Mirror sighting compass", 59], ["Handheld GPS unit", 299], ["Satellite messenger", 399], ["Topographic map case", 18], ["Altimeter watch", 249], ["Map and compass guide, book", 16], ["Whistle with lanyard", 7], ["Signal mirror", 9], ["Route marking tape", 5]] },
  { code: "WTR", name: "Water", items: [["Squeeze water filter", 44], ["Gravity filter, 3 L", 119], ["Purification tablets, 50", 14], ["UV purifier pen", 89], ["Bottle, 1 L, stainless", 32], ["Hydration reservoir, 3 L", 49], ["Collapsible bottle, 1 L", 19], ["Water bag, 10 L", 29], ["Electrolyte tablets, 20", 11], ["Insulated bottle, 750 ml", 39]] },
  { code: "SFT", name: "Safety", items: [["First aid kit, 2-person", 36], ["First aid kit, group", 89], ["Emergency bivy", 22], ["Emergency blanket, 2 pack", 8], ["Bear spray", 49], ["Bear-resistant food canister", 84], ["Snake gaiters", 79], ["Personal locator beacon", 349], ["Sunscreen, SPF 50, 100 ml", 13], ["Insect repellent, 100 ml", 10]] },
];

// Small deterministic generator for stock and descriptions, so the file never changes between runs.
function seeded(n) {
  let s = n * 2654435761 % 4294967296;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const MATERIAL = ["ripstop nylon", "recycled polyester", "anodized aluminum", "titanium", "merino wool", "stainless steel", "silicone", "canvas"];
const USE = ["weekend trips", "thru-hikes", "car camping", "alpine routes", "family campsites", "desert travel", "rainy seasons", "winter outings"];

const rows = [];
let n = 0;
outer: for (const cat of CATEGORIES) {
  for (let i = 0; i < cat.items.length; i++) {
    if (n >= COUNT) break outer;
    n += 1;
    const [name, price] = cat.items[i];
    const sku = `${cat.code}-${String(i + 1).padStart(2, "0")}`;
    const rnd = seeded(n);
    const stock = 3 + Math.floor(rnd() * 40);
    const description = `${name}. Made of ${MATERIAL[Math.floor(rnd() * MATERIAL.length)]}, sized for ${USE[Math.floor(rnd() * USE.length)]}. Synthetic demo product, not for sale.`;
    rows.push({ sku, name, description, price: price.toFixed(2), stock, category: cat.name, image: `${IMAGE_BASE}${sku}.${FORMAT}` });
  }
}

const q = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const csv = ["sku,name,description,price,stock,category,image", ...rows.map((r) => [r.sku, r.name, r.description, r.price, r.stock, r.category, r.image].map(q).join(","))].join("\n") + "\n";
writeFileSync(join(HERE, "products.csv"), csv, "utf8");

mkdirSync(join(HERE, "images"), { recursive: true });
for (const r of rows) {
  const hue = (parseInt(r.sku.replace(/\D/g, ""), 10) * 37 + r.category.length * 23) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" role="img" aria-label="${r.name}">
  <rect width="600" height="600" fill="hsl(${hue} 35% 92%)"/>
  <rect x="40" y="40" width="520" height="520" rx="24" fill="none" stroke="hsl(${hue} 40% 45%)" stroke-width="6"/>
  <text x="300" y="270" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="hsl(${hue} 40% 25%)">${r.name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
  <text x="300" y="330" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="hsl(${hue} 30% 40%)">${r.category} · ${r.sku}</text>
  <text x="300" y="520" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="hsl(${hue} 20% 50%)">synthetic demo product</text>
</svg>
`;
  writeFileSync(join(HERE, "images", `${r.sku}.svg`), svg, "utf8");
  writeFileSync(join(HERE, "images", `${r.sku}.png`), placeholderPng({ name: r.name, category: r.category, sku: r.sku, hue }));
}
console.log(`wrote ${rows.length} products to catalog/products.csv and ${rows.length * 2} images (PNG and SVG) to catalog/images/; the CSV points to the ${FORMAT} files`);
