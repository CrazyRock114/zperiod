// test/chemical_assertions.test.mjs
// Formal 21-point chemical accuracy & regression assertion suite for Zperiod

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("🧪 Starting Zperiod Chemical Accuracy & Regression Test Suite...\n");

let passedCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}: PASS`);
    passedCount++;
  } catch (err) {
    console.error(`✗ ${name}: FAIL`);
    console.error(err);
    process.exit(1);
  }
}

async function run() {
  const { calculateMolarMassModal, parseFormulaStrict } = await import(
    "../js/modules/chemistryTools.js"
  );
  const { balanceEquation } = await import(
    "../js/modules/equationBalancer.js"
  );
  const { finallyData } = await import(
    "../js/data/elementsData.js"
  );

  // Read chemToolInteractions.js to extract calculateSolubility function
  const chemToolCode = fs.readFileSync(
    path.join(rootDir, "js/modules/chemToolInteractions.js"),
    "utf-8"
  );
  // Extract calculateSolubility using Function constructor with mock `t`
  const match = chemToolCode.match(/function calculateSolubility\(formula\) \{([\s\S]*?)\n\}\n\nfunction smartParseFormula/);
  assert.ok(match, "Could not extract calculateSolubility from chemToolInteractions.js");
  const calculateSolubility = new Function("formula", `
    const t = (k) => k;
    ${match[1]}
  `);

  // 1. Element Count & Whitelist
  test("118 elements data table integrity", () => {
    assert.equal(Object.keys(finallyData).length, 118, "Must contain all 118 IUPAC elements");
    assert.equal(finallyData["1"].symbol, "H");
    assert.equal(finallyData["118"].symbol, "Og");
  });

  // 2. Strict Formula Parsing
  test("Strict formula parser - H2O", () => {
    const counts = parseFormulaStrict("H2O");
    assert.deepEqual(counts, { H: 2, O: 1 });
  });

  test("Strict formula parser - (NH4)2SO4", () => {
    const counts = parseFormulaStrict("(NH4)2SO4");
    assert.deepEqual(counts, { N: 2, H: 8, S: 1, O: 4 });
  });

  test("Hydrate dot parsing - CuSO4·5H2O", () => {
    const counts = parseFormulaStrict("CuSO4·5H2O");
    assert.deepEqual(counts, { Cu: 1, S: 1, O: 9, H: 10 });
  });

  // 3. Molar Mass Calculations
  test("Molar mass - CuSO4·5H2O exact weight", () => {
    const res = calculateMolarMassModal("CuSO4·5H2O", true);
    const weight = parseFloat(res.total);
    assert.ok(Math.abs(weight - 249.70) < 0.1, `Expected ~249.70, got ${weight}`);
  });

  test("Molar mass - FeSO4·7H2O exact weight", () => {
    const res = calculateMolarMassModal("FeSO4·7H2O", true);
    const weight = parseFloat(res.total);
    assert.ok(Math.abs(weight - 278.01) < 0.2, `Expected ~278.01, got ${weight}`);
  });

  test("Molar mass - BaCl2·2H2O exact weight", () => {
    const res = calculateMolarMassModal("BaCl2·2H2O", true);
    const weight = parseFloat(res.total);
    assert.ok(Math.abs(weight - 244.26) < 0.2, `Expected ~244.26, got ${weight}`);
  });

  // 4. Chemical Equation Balancer
  test("Equation balancer - H2 + O2 -> H2O", () => {
    const res = balanceEquation("H2 + O2 -> H2O");
    assert.equal(res.formatted, "2H2 + O2 -> 2H2O");
  });

  test("Equation balancer - CH4 + O2 -> CO2 + H2O", () => {
    const res = balanceEquation("CH4 + O2 -> CO2 + H2O");
    assert.equal(res.formatted, "CH4 + 2O2 -> CO2 + 2H2O");
  });

  test("Equation balancer - KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O", () => {
    const res = balanceEquation("KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O");
    assert.equal(res.formatted, "2KMnO4 + 16HCl -> 2KCl + 2MnCl2 + 5Cl2 + 8H2O");
  });

  test("Equation balancer - Hydrate CuSO4·5H2O decomposition", () => {
    const res = balanceEquation("CuSO4·5H2O -> CuSO4 + H2O");
    assert.ok(res.formatted.includes("CuSO4") && res.formatted.includes("5H2O"));
  });

  // 5. Solubility Rules & Vaccine Assertions
  test("Solubility - Group 1 & Nitrates (NaCl, KNO3) are soluble", () => {
    const r1 = calculateSolubility("NaCl");
    assert.equal(r1.soluble, true);
    const r2 = calculateSolubility("KNO3");
    assert.equal(r2.soluble, true);
  });

  test("Solubility - Silver & Lead halides (AgCl, PbI2) are insoluble precipitates", () => {
    const r1 = calculateSolubility("AgCl");
    assert.equal(r1.insoluble, true);
    const r2 = calculateSolubility("PbI2");
    assert.equal(r2.insoluble, true);
  });

  test("Solubility vaccine - HgCl2 is correctly recognized as soluble", () => {
    const r1 = calculateSolubility("HgCl2");
    assert.equal(r1.soluble, true, "HgCl2 must be recognized as soluble halide");
  });

  test("Solubility vaccine - Hg2Cl2 is recognized as insoluble precipitate", () => {
    const r1 = calculateSolubility("Hg2Cl2");
    assert.equal(r1.insoluble, true, "Hg2Cl2 (calomel) must be recognized as insoluble");
  });

  test("Solubility vaccine - Organic alcohols (CH3OH, C2H5OH) are not flagged as metal hydroxides", () => {
    const r1 = calculateSolubility("CH3OH");
    assert.equal(r1.soluble, true, "CH3OH must be soluble/miscible, not insoluble hydroxide");
    const r2 = calculateSolubility("C2H5OH");
    assert.equal(r2.soluble, true, "C2H5OH must be soluble/miscible");
  });

  test("Solubility vaccine - Non-sulfides (SiO2, SnO2, SrO, ZnSe) not false-matched as sulfide", () => {
    for (const compound of ["SiO2", "SnO2", "SrO", "ZnSe"]) {
      const res = calculateSolubility(compound);
      assert.notEqual(res.reason, "solubility.reasonCarbonatePhosphateSulfide", `${compound} must not be classified as sulfide`);
    }
  });

  test("Solubility - True sulfides (CuS, PbS, FeS, Ag2S) are insoluble precipitates", () => {
    for (const compound of ["CuS", "PbS", "FeS", "Ag2S"]) {
      const res = calculateSolubility(compound);
      assert.equal(res.insoluble, true, `${compound} must be insoluble precipitate`);
    }
  });

  test("Solubility - Sulfate & Carbonate precipitates (BaSO4, CaCO3)", () => {
    const r1 = calculateSolubility("BaSO4");
    assert.equal(r1.insoluble, true);
    const r2 = calculateSolubility("CaCO3");
    assert.equal(r2.insoluble, true);
  });

  // 6. Zero-CJK in English Base Code & Index
  test("Zero-CJK gate - index.html has 0 CJK characters", () => {
    const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
    const cjkMatches = html.match(/[\u4e00-\u9fff]/g);
    assert.equal(cjkMatches, null, `Found CJK in index.html: ${cjkMatches?.join(", ")}`);
  });

  test("Zero-CJK gate - root JS and modules have 0 CJK strings", () => {
    const files = [
      "script.js",
      "js/modules/chemToolInteractions.js",
      "js/modules/chemistryTools.js",
      "js/modules/equationBalancer.js"
    ];
    let totalCjk = 0;
    for (const file of files) {
      const code = fs.readFileSync(path.join(rootDir, file), "utf-8");
      // ignore regex tests or comments that specifically test or handle CJK if any
      const matches = code.match(/[\u4e00-\u9fff]/g);
      if (matches) totalCjk += matches.length;
    }
    assert.equal(totalCjk, 0, `Found ${totalCjk} CJK characters in core JS`);
  });

  // 7. Ecosystem Nav & Mobile Bypass Integration
  test("Ecosystem TopBar & Mobile Bypass buttons present in index.html", () => {
    const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
    assert.ok(html.includes("https://www.igcse.xyz/ecosystem-nav.js"), "Must include ecosystem-nav.js script");
    assert.ok(html.includes('<igcse-nav active="zperiod" sticky></igcse-nav>'), "Must mount <igcse-nav>");
    assert.ok(html.includes('id="bypass-mobile-overlay-btn"'), "Must include #bypass-mobile-overlay-btn");
    assert.ok(html.includes('data-i18n="ionModal.charge"'), "Must correct charge label to data-i18n='ionModal.charge'");
  });

  // 8. Ion Table & Classic Scripts Bundling Vaccine
  test("Ions & Worksheet classic scripts staged in public/js for Vite production build", () => {
    assert.ok(fs.existsSync(path.join(rootDir, "public/js/ion-animations.js")), "public/js/ion-animations.js must exist");
    assert.ok(fs.existsSync(path.join(rootDir, "public/js/worksheet-generator.js")), "public/js/worksheet-generator.js must exist");
    const scriptJs = fs.readFileSync(path.join(rootDir, "script.js"), "utf-8");
    assert.ok(
      scriptJs.includes("Ion animations failed to load, proceeding with static table"),
      "ensureIonsTableReady must be resilient to script load failures"
    );
  });

  test("Ions dataset completeness across all 4 sections", async () => {
    const { ionsData } = await import("../js/data/ionsData.js");
    assert.ok(Array.isArray(ionsData) && ionsData.length >= 30, "ionsData must contain at least 30 ions");
    const sections = new Set(ionsData.map(i => i.section));
    assert.ok(sections.has("basic"), "ionsData must have basic ions");
    assert.ok(sections.has("core"), "ionsData must have core polyatomic ions");
    assert.ok(sections.has("trans"), "ionsData must have transition metal ions");
    assert.ok(sections.has("special"), "ionsData must have special/organic ions");
  });

  // 9. v3.4.0 Phase 1 Alignment Vaccine
  test("Nav controls - fullscreen and dark mode toggles in nav-right-section", () => {
    const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
    assert.ok(html.includes('id="dark-mode-toggle"'), "Must include #dark-mode-toggle");
    assert.ok(html.includes('id="fullscreen-mode-toggle"'), "Must include #fullscreen-mode-toggle");
    const scriptJs = fs.readFileSync(path.join(rootDir, "script.js"), "utf-8");
    assert.ok(scriptJs.includes("zperiod_dark_mode"), "Must persist dark mode to localStorage");
  });

  test("Modal carousel navigation - element & ion prev/next buttons", () => {
    const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
    assert.ok(html.includes('id="elem-nav-prev"'), "Must include #elem-nav-prev");
    assert.ok(html.includes('id="elem-nav-next"'), "Must include #elem-nav-next");
    assert.ok(html.includes('id="ion-nav-prev"'), "Must include #ion-nav-prev");
    assert.ok(html.includes('id="ion-nav-next"'), "Must include #ion-nav-next");
    const uiCtrl = fs.readFileSync(path.join(rootDir, "js/modules/uiController.js"), "utf-8");
    assert.ok(uiCtrl.includes("ArrowLeft") && uiCtrl.includes("ArrowRight"), "Must handle keyboard ArrowLeft/ArrowRight navigation");
  });

  test("SPDF Orbital Atlas - tool card and content factory", async () => {
    const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
    assert.ok(html.includes('data-tool="orbital-gallery"'), "Must mount SPDF Orbital Atlas card in chem-tools-grid");
    const { getChemToolContent } = await import("../js/modules/toolContentFactories.js");
    const content = getChemToolContent("orbital-gallery");
    assert.ok(content && content.includes("orbital-tool-wrapper"), "Must generate orbital-gallery tool content");
  });

  test("Card Customizer - modal, trigger button, and live styles", () => {
    const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
    assert.ok(html.includes('id="card-customizer-modal"'), "Must include #card-customizer-modal");
    assert.ok(html.includes('id="open-card-customizer-btn"'), "Must include #open-card-customizer-btn");
    const gridCss = fs.readFileSync(path.join(rootDir, "css/grid.css"), "utf-8");
    assert.ok(gridCss.includes("--card-custom-opacity"), "Must support --card-custom-opacity in grid.css");
    assert.ok(gridCss.includes("--card-custom-saturation"), "Must support --card-custom-saturation in grid.css");
    assert.ok(gridCss.includes("--card-custom-font-weight"), "Must support --card-custom-font-weight in grid.css");
  });

  console.log(`\n========================================`);
  console.log(`✓ Passed: ${passedCount}, Failed: 0`);
  console.log(`========================================\n`);
}

run();
