/**
 * VSEPR (Valence Shell Electron Pair Repulsion) Mathematics & Chemical Logic Engine
 * Accurately models electron-pair repulsion, steric numbers (SN 2-6),
 * ideal geometry vectors, hybridization, and repulsive distortion.
 * Zero-CJK compliant.
 */

export const ELECTRON_GEOMETRIES = {
  2: { id: "linear", name: "Linear", angle: 180, hybrid: "sp" },
  3: { id: "trigonal_planar", name: "Trigonal Planar", angle: 120, hybrid: "sp2" },
  4: { id: "tetrahedral", name: "Tetrahedral", angle: 109.5, hybrid: "sp3" },
  5: { id: "trigonal_bipyramidal", name: "Trigonal Bipyramidal", angle: 120, hybrid: "sp3d" },
  6: { id: "octahedral", name: "Octahedral", angle: 90, hybrid: "sp3d2" }
};

export const MOLECULAR_GEOMETRIES = {
  "2-0": { id: "linear", name: "Linear", angle: 180, formula: "AX2", symbol: "linear" },
  "3-0": { id: "trigonal_planar", name: "Trigonal Planar", angle: 120, formula: "AX3", symbol: "trig_plan" },
  "2-1": { id: "bent_120", name: "Bent", angle: 119, formula: "AX2E", symbol: "bent" },
  "4-0": { id: "tetrahedral", name: "Tetrahedral", angle: 109.5, formula: "AX4", symbol: "tetra" },
  "3-1": { id: "trigonal_pyramidal", name: "Trigonal Pyramidal", angle: 107.0, formula: "AX3E", symbol: "trig_pyr" },
  "2-2": { id: "bent_109", name: "Bent", angle: 104.5, formula: "AX2E2", symbol: "bent" },
  "5-0": { id: "trigonal_bipyramidal", name: "Trigonal Bipyramidal", angle: 120, formula: "AX5", symbol: "tbp" },
  "4-1": { id: "seesaw", name: "See-saw", angle: 102, formula: "AX4E", symbol: "seesaw" },
  "3-2": { id: "t_shaped", name: "T-shaped", angle: 88, formula: "AX3E2", symbol: "t_shape" },
  "2-3": { id: "linear_5", name: "Linear", angle: 180, formula: "AX2E3", symbol: "linear" },
  "6-0": { id: "octahedral", name: "Octahedral", angle: 90, formula: "AX6", symbol: "octa" },
  "5-1": { id: "square_pyramidal", name: "Square Pyramidal", angle: 85, formula: "AX5E", symbol: "sq_pyr" },
  "4-2": { id: "square_planar", name: "Square Planar", angle: 90, formula: "AX4E2", symbol: "sq_plan" },
  "3-3": { id: "t_shaped_6", name: "T-shaped", angle: 88, formula: "AX3E3", symbol: "t_shape" },
  "2-4": { id: "linear_6", name: "Linear", angle: 180, formula: "AX2E4", symbol: "linear" }
};

/**
 * Computes complete VSEPR properties from bonding and lone pair count
 */
export function calculateVSEPR(bondingCount, lonePairCount) {
  const b = Math.max(1, Math.min(6, Math.round(bondingCount)));
  const l = Math.max(0, Math.min(4, Math.round(lonePairCount)));
  const sn = b + l;

  if (sn < 2 || sn > 6) {
    return {
      stericNumber: sn,
      bondingPairs: b,
      lonePairs: l,
      isValid: false,
      error: "Steric number must be between 2 and 6"
    };
  }

  const eg = ELECTRON_GEOMETRIES[sn] || ELECTRON_GEOMETRIES[4];
  const mgKey = `${b}-${l}`;
  const mg = MOLECULAR_GEOMETRIES[mgKey] || {
    id: "unknown",
    name: "Unknown Geometry",
    angle: eg.angle,
    formula: `AX${b}E${l}`
  };

  return {
    stericNumber: sn,
    bondingPairs: b,
    lonePairs: l,
    isValid: true,
    electronGeometry: eg.name,
    electronGeometryId: eg.id,
    molecularGeometry: mg.name,
    molecularGeometryId: mg.id,
    idealAngle: mg.angle,
    hybridization: eg.hybrid,
    formulaAXE: mg.formula
  };
}

/**
 * Returns 3D coordinate vectors for each domain (bonding atoms and lone pairs).
 * For SN=5, lone pairs occupy equatorial positions (120-deg separation) first.
 * For SN=6, lone pairs occupy trans axial positions (180-deg separation) first.
 */
export function getDomainCoordinates(bondingCount, lonePairCount) {
  const sn = bondingCount + lonePairCount;
  const domains = [];

  switch (sn) {
    case 2: {
      // Linear (Z-axis)
      domains.push({ type: "bond", x: 0, y: 0, z: 1.0 });
      domains.push({ type: "bond", x: 0, y: 0, z: -1.0 });
      break;
    }

    case 3: {
      // Trigonal planar (XY plane)
      const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
      for (let i = 0; i < 3; i++) {
        domains.push({
          type: "bond",
          x: Math.cos(angles[i]),
          y: Math.sin(angles[i]),
          z: 0
        });
      }
      break;
    }

    case 4: {
      // Regular Tetrahedron
      const a = 1 / Math.sqrt(3);
      domains.push({ type: "bond", x: a, y: a, z: a });
      domains.push({ type: "bond", x: a, y: -a, z: -a });
      domains.push({ type: "bond", x: -a, y: a, z: -a });
      domains.push({ type: "bond", x: -a, y: -a, z: a });
      break;
    }

    case 5: {
      // Trigonal Bipyramidal:
      // index 0, 1: axial (z = +1, -1)
      // index 2, 3, 4: equatorial (xy plane at 0, 120, 240 deg)
      domains.push({ type: "bond", role: "axial", x: 0, y: 0, z: 1.0 });
      domains.push({ type: "bond", role: "axial", x: 0, y: 0, z: -1.0 });
      const eqAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
      for (let i = 0; i < 3; i++) {
        domains.push({
          type: "bond",
          role: "equatorial",
          x: Math.cos(eqAngles[i]),
          y: Math.sin(eqAngles[i]),
          z: 0
        });
      }
      break;
    }

    case 6: {
      // Octahedral (+x, -x, +y, -y, +z, -z)
      domains.push({ type: "bond", x: 1, y: 0, z: 0 });
      domains.push({ type: "bond", x: -1, y: 0, z: 0 });
      domains.push({ type: "bond", x: 0, y: 1, z: 0 });
      domains.push({ type: "bond", x: 0, y: -1, z: 0 });
      domains.push({ type: "bond", x: 0, y: 0, z: 1 });
      domains.push({ type: "bond", x: 0, y: 0, z: -1 });
      break;
    }

    default:
      return [];
  }

  // Allocate lone pairs according to chemical stability rules
  if (lonePairCount > 0) {
    if (sn === 5) {
      // In SN=5, lone pairs prefer equatorial positions (indices 2, 3, 4)
      const equatorialIndices = [2, 3, 4];
      for (let i = 0; i < lonePairCount && i < equatorialIndices.length; i++) {
        domains[equatorialIndices[i]].type = "lone_pair";
      }
    } else if (sn === 6) {
      // In SN=6, 1st lone pair at +z (index 4), 2nd at -z (index 5) (trans), then +x, -x
      const lpOrder = [4, 5, 0, 1];
      for (let i = 0; i < lonePairCount && i < lpOrder.length; i++) {
        domains[lpOrder[i]].type = "lone_pair";
      }
    } else {
      // For SN=2, 3, 4, assign lone pairs from the end
      for (let i = 0; i < lonePairCount; i++) {
        const idx = domains.length - 1 - i;
        if (idx >= 0) domains[idx].type = "lone_pair";
      }
    }
  }

  return domains;
}
