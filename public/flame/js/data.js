/**
 * Flame Studio - Metal Ion & Flame Test Physics Dataset
 * Strictly complies with Cambridge IGCSE Chemistry (0620) Syllabus
 * Contains spectroscopic emission lines, wavelengths (nm), RGB gradients, and lab rules.
 * Zero-CJK compliant (all UI labels localized in i18n.js).
 */

export const METAL_DATA = {
  li: {
    id: "li",
    symbol: "Li+",
    element: "Lithium",
    atomicNumber: 3,
    compound: "LiCl",
    compoundName: "Lithium chloride",
    flameColor: "Crimson",
    colorCategory: "red",
    hexPrimary: "#ff1744",
    hexSecondary: "#ff5252",
    hexGlow: "rgba(255, 23, 68, 0.45)",
    rgb: [255, 23, 68],
    rgbSecondary: [255, 82, 82],
    durationMs: 4500,
    temperatureK: 1550,
    cobaltVisible: true,
    spectralLines: [
      { wavelength: 670.8, intensity: 1.0, label: "670.8 nm (2p -> 2s)", color: "#ff1827" },
      { wavelength: 610.4, intensity: 0.18, label: "610.4 nm (3d -> 2p)", color: "#ff8200" },
      { wavelength: 460.3, intensity: 0.06, label: "460.3 nm (4d -> 2p)", color: "#00b2ff" }
    ],
    igcseNote: "Crimson / deep red flame. Caused by strong atomic emission at 670.8 nm."
  },

  na: {
    id: "na",
    symbol: "Na+",
    element: "Sodium",
    atomicNumber: 11,
    compound: "NaCl",
    compoundName: "Sodium chloride",
    flameColor: "Yellow",
    colorCategory: "yellow",
    hexPrimary: "#ffb703",
    hexSecondary: "#fb8500",
    hexGlow: "rgba(255, 183, 3, 0.55)",
    rgb: [255, 183, 3],
    rgbSecondary: [251, 133, 0],
    durationMs: 6500,
    temperatureK: 1600,
    cobaltVisible: false, // Blocked by cobalt blue glass
    spectralLines: [
      { wavelength: 589.0, intensity: 1.0, label: "589.0 nm (D2 line)", color: "#ffdb00" },
      { wavelength: 589.6, intensity: 0.85, label: "589.6 nm (D1 line)", color: "#ffdb00" }
    ],
    igcseNote: "Intense, persistent yellow flame. The D-line doublet easily overwhelms other ions."
  },

  k: {
    id: "k",
    symbol: "K+",
    element: "Potassium",
    atomicNumber: 19,
    compound: "KCl",
    compoundName: "Potassium chloride",
    flameColor: "Lilac",
    colorCategory: "violet",
    hexPrimary: "#c084fc",
    hexSecondary: "#e879f9",
    hexGlow: "rgba(192, 132, 252, 0.45)",
    rgb: [192, 132, 252],
    rgbSecondary: [232, 121, 249],
    durationMs: 3800,
    temperatureK: 1500,
    cobaltVisible: true, // Clearly visible through cobalt blue glass
    spectralLines: [
      { wavelength: 404.4, intensity: 0.9, label: "404.4 nm (5p -> 4s)", color: "#6900ff" },
      { wavelength: 404.7, intensity: 0.6, label: "404.7 nm (5p -> 4s)", color: "#6e00ff" },
      { wavelength: 766.5, intensity: 0.95, label: "766.5 nm (4p -> 4s)", color: "#b30000" },
      { wavelength: 769.9, intensity: 0.7, label: "769.9 nm (4p -> 4s)", color: "#a50000" }
    ],
    igcseNote: "Lilac flame. Often masked by traces of sodium; view through cobalt blue glass to observe."
  },

  ca: {
    id: "ca",
    symbol: "Ca2+",
    element: "Calcium",
    atomicNumber: 20,
    compound: "CaCl2",
    compoundName: "Calcium chloride",
    flameColor: "Brick red",
    colorCategory: "orange-red",
    hexPrimary: "#ff5400",
    hexSecondary: "#ff7b00",
    hexGlow: "rgba(255, 84, 0, 0.48)",
    rgb: [255, 84, 0],
    rgbSecondary: [255, 123, 0],
    durationMs: 4800,
    temperatureK: 1550,
    cobaltVisible: true,
    spectralLines: [
      { wavelength: 622.0, intensity: 0.88, label: "622.0 nm (CaOH molecular band)", color: "#ff6c00" },
      { wavelength: 553.0, intensity: 0.35, label: "553.0 nm (CaOH green band)", color: "#8aff00" },
      { wavelength: 422.7, intensity: 0.75, label: "422.7 nm (4p -> 4s atomic)", color: "#2200ff" }
    ],
    igcseNote: "Brick red / orange-red flame. Caused by combination of CaOH band emission and 422.7 nm line."
  },

  ba: {
    id: "ba",
    symbol: "Ba2+",
    element: "Barium",
    atomicNumber: 56,
    compound: "BaCl2",
    compoundName: "Barium chloride",
    flameColor: "Apple green",
    colorCategory: "green",
    hexPrimary: "#84cc16",
    hexSecondary: "#a3e635",
    hexGlow: "rgba(132, 204, 22, 0.45)",
    rgb: [132, 204, 22],
    rgbSecondary: [163, 230, 53],
    durationMs: 4200,
    temperatureK: 1520,
    cobaltVisible: false,
    spectralLines: [
      { wavelength: 553.6, intensity: 1.0, label: "553.6 nm (6p -> 6s)", color: "#92ff00" },
      { wavelength: 524.2, intensity: 0.65, label: "524.2 nm (BaOH band)", color: "#00ff38" },
      { wavelength: 513.7, intensity: 0.55, label: "513.7 nm (BaOH band)", color: "#00ff73" },
      { wavelength: 455.4, intensity: 0.4, label: "455.4 nm (Ba+ resonance)", color: "#0099ff" }
    ],
    igcseNote: "Pale green / apple green flame. Formed by barium monoxide and hydroxide radicals."
  },

  cu: {
    id: "cu",
    symbol: "Cu2+",
    element: "Copper(II)",
    atomicNumber: 29,
    compound: "CuCl2",
    compoundName: "Copper(II) chloride",
    flameColor: "Blue-green",
    colorCategory: "cyan",
    hexPrimary: "#06b6d4",
    hexSecondary: "#10b981",
    hexGlow: "rgba(6, 182, 212, 0.5)",
    rgb: [6, 182, 212],
    rgbSecondary: [16, 185, 129],
    durationMs: 5200,
    temperatureK: 1580,
    cobaltVisible: true,
    spectralLines: [
      { wavelength: 510.6, intensity: 0.85, label: "510.6 nm (Cu atomic line)", color: "#00ff85" },
      { wavelength: 521.8, intensity: 0.8, label: "521.8 nm (Cu atomic line)", color: "#00ff47" },
      { wavelength: 437.8, intensity: 0.6, label: "437.8 nm (CuCl molecular band)", color: "#0047ff" },
      { wavelength: 488.2, intensity: 0.5, label: "488.2 nm (CuCl molecular band)", color: "#00e1ff" }
    ],
    igcseNote: "Blue-green flame with flashes of turquoise. Chlorides produce brighter emissions than oxides."
  },

  sr: {
    id: "sr",
    symbol: "Sr2+",
    element: "Strontium",
    atomicNumber: 38,
    compound: "SrCl2",
    compoundName: "Strontium chloride",
    flameColor: "Scarlet red",
    colorCategory: "red",
    hexPrimary: "#e11d48",
    hexSecondary: "#f43f5e",
    hexGlow: "rgba(225, 29, 72, 0.5)",
    rgb: [225, 29, 72],
    rgbSecondary: [244, 63, 94],
    durationMs: 4600,
    temperatureK: 1560,
    cobaltVisible: true,
    spectralLines: [
      { wavelength: 660.0, intensity: 0.95, label: "660.0 nm (SrOH band)", color: "#ff2e00" },
      { wavelength: 605.0, intensity: 0.75, label: "605.0 nm (SrOH band)", color: "#ff8f00" },
      { wavelength: 460.7, intensity: 0.7, label: "460.7 nm (5p -> 5s atomic)", color: "#00b1ff" }
    ],
    igcseNote: "Scarlet / crimson red flame. Frequently used in flares and pyrotechnics."
  }
};

export const BURNER_STATES = {
  safety: {
    id: "safety",
    airHole: 0.0, // closed
    name: "Safety Flame",
    tempC: 300,
    primaryColor: [255, 170, 0],
    secondaryColor: [255, 100, 0],
    description: "Yellow luminous flame. Low heat, produces soot, safe when not heating."
  },
  gentle: {
    id: "gentle",
    airHole: 0.45, // half open
    name: "Medium Blue Flame",
    tempC: 700,
    primaryColor: [96, 165, 250],
    secondaryColor: [37, 99, 235],
    description: "Medium blue flame with faint inner cone. Good for moderate warming."
  },
  roaring: {
    id: "roaring",
    airHole: 1.0, // fully open
    name: "Roaring Non-luminous Flame",
    tempC: 1350,
    primaryColor: [56, 189, 248],
    secondaryColor: [30, 64, 175],
    description: "Roaring blue flame with intense inner cone. Optimal for flame tests (IGCSE standard)."
  }
};
