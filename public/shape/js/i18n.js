/**
 * Molecular Shapes - Internationalization (i18n) Module
 * Base English with dynamic Simplified/Traditional Chinese localization.
 * Centralized string dictionary.
 */

export const translations = {
  en: {
    nav: {
      back: "Zperiod",
      title: "Molecular Shapes",
      subtitle: "3D VSEPR Molecular Geometry Studio",
      resetView: "Reset View",
      autoRotate: "Auto Rotate",
      langToggle: "中文"
    },
    modes: {
      model: "Model",
      real: "Real Molecules",
      learn: "VSEPR Guide",
      practice: "Quiz Mode"
    },
    model: {
      title: "VSEPR Generic Model",
      subtitle: "Dynamically adjust bonding pairs and lone pairs to observe geometry relaxation.",
      bondingPairs: "Bonding Atoms (B)",
      lonePairs: "Lone Pairs (L)",
      stericNumber: "Steric Number (SN)",
      electronGeo: "Electron Geometry",
      molecularGeo: "Molecule Geometry",
      bondAngle: "Ideal Bond Angle",
      hybridization: "Hybridization",
      axeFormula: "AXE Formula",
      showLonePairs: "Lone Pairs",
      showAngles: "Bond Angles",
      reset: "Reset to AX2"
    },
    real: {
      title: "Real Molecules Library",
      subtitle: "Explore 44 real molecules with authentic experimental angles and dipoles.",
      searchPlaceholder: "Search molecule (e.g. H2O, SF4, CH4)...",
      filterAll: "All (44)",
      filterLinear: "Linear",
      filterPlanar: "Trigonal Planar",
      filterTetra: "Tetrahedral",
      filterBipyramid: "Trigonal Bipyramidal",
      filterOcta: "Octahedral",
      filterPolar: "Polar",
      filterNonpolar: "Non-polar",
      dipole: "Dipole Moment",
      polarity: "Polarity",
      bondLength: "Bond Length",
      expAngle: "Exp. Bond Angle",
      centralAtom: "Central Atom",
      showDipole: "Net Dipole Vector",
      showAngles: "Bond Angles"
    },
    learn: {
      title: "VSEPR Theory Foundations",
      subtitle: "Valence Shell Electron Pair Repulsion Rules & Molecular Symmetry",
      card1Title: "1. Electron Repulsion Hierarchy",
      card1Text: "Lone pairs possess greater spatial volume and spread, exerting stronger repulsion: Lone Pair - Lone Pair (LP-LP) > Lone Pair - Bond Pair (LP-BP) > Bond Pair - Bond Pair (BP-BP). This compresses adjacent bond angles.",
      card2Title: "2. Steric Number (SN) & Hybridization",
      card2Text: "Steric number determines the electron geometry: SN=2 (sp, 180°), SN=3 (sp², 120°), SN=4 (sp³, 109.5°), SN=5 (sp³d, 90°/120°), SN=6 (sp³d², 90°).",
      card3Title: "3. Expanded Octet Rules (SN = 5 & 6)",
      card3Text: "For SN=5 (Trigonal Bipyramidal), lone pairs always occupy EQUATORIAL positions (120° apart) to minimize 90° repulsions. For SN=6 (Octahedral), two lone pairs occupy TRANS positions (180° apart) to yield square planar geometry.",
      card4Title: "4. Molecular Polarity & Dipole Moments",
      card4Text: "A molecule is polar only if polar bonds do NOT vectorially cancel out through molecular symmetry. Highly symmetric geometries (AX2, AX3, AX4, AX5, AX6, AX2E3, AX4E2) are non-polar when terminal atoms are identical."
    },
    practice: {
      title: "VSEPR Geometry Quiz",
      subtitle: "Test your mastery of steric numbers, lone pairs, and 3D shapes.",
      score: "Score:",
      streak: "Streak:",
      question: "Question",
      identifyPrompt: "What is the molecular geometry of:",
      correct: "Correct! Outstanding chemical intuition.",
      incorrect: "Incorrect. Keep reviewing electron repulsion.",
      nextQuestion: "Next Question",
      submit: "Check Answer",
      explanation: "VSEPR Explanation:"
    },
    geometries: {
      linear: "Linear",
      trigonal_planar: "Trigonal Planar",
      bent: "Bent",
      tetrahedral: "Tetrahedral",
      trigonal_pyramidal: "Trigonal Pyramidal",
      trigonal_bipyramidal: "Trigonal Bipyramidal",
      seesaw: "See-saw",
      t_shaped: "T-shaped",
      octahedral: "Octahedral",
      square_pyramidal: "Square Pyramidal",
      square_planar: "Square Planar"
    }
  },

  zh: {
    nav: {
      back: "返回周期表",
      title: "分子空间构型",
      subtitle: "3D VSEPR 分子立体几何与价层互斥实验室",
      resetView: "重置视角",
      autoRotate: "自动旋转",
      langToggle: "English"
    },
    modes: {
      model: "理论自由拼装",
      real: "真实分子图鉴 (44)",
      learn: "VSEPR 理论精要",
      practice: "闯关测试题库"
    },
    model: {
      title: "VSEPR 理论通用构型",
      subtitle: "动态增减成键原子与孤电子对，观察物理排斥与空间构型弛豫。",
      bondingPairs: "成键原子数 (B)",
      lonePairs: "中心孤对电子数 (L)",
      stericNumber: "价层立体数 (SN)",
      electronGeo: "电子对空间构型",
      molecularGeo: "分子立体几何构型",
      bondAngle: "理论理想键角",
      hybridization: "中心原子杂化轨道",
      axeFormula: "AXE 通式",
      showLonePairs: "显示孤对电子泡",
      showAngles: "显示键角数值",
      reset: "重置为 AX2"
    },
    real: {
      title: "真实分子化学图鉴",
      subtitle: "涵盖 44 种考纲经典分子，实测键长、真实键角与偶极矩矢量。",
      searchPlaceholder: "搜索分子式或名称 (如 H2O, SF4, CH4)...",
      filterAll: "全部分子 (44)",
      filterLinear: "直线形",
      filterPlanar: "平面三角形",
      filterTetra: "四面体家族",
      filterBipyramid: "三角双锥家族",
      filterOcta: "八面体家族",
      filterPolar: "极性分子",
      filterNonpolar: "非极性分子",
      dipole: "分子偶极矩",
      polarity: "分子极性",
      bondLength: "化学键长",
      expAngle: "实测键角",
      centralAtom: "中心原子",
      showDipole: "显示合偶极矩矢量",
      showAngles: "显示键角"
    },
    learn: {
      title: "VSEPR 价层电子对互斥理论基石",
      subtitle: "Cambridge IGCSE & A-Level / AP 核心考点图解",
      card1Title: "1. 电子对空间排斥力层级",
      card1Text: "孤对电子受单核吸引，电子云较肥大开展，排斥力规律为：孤对-孤对 (LP-LP) > 孤对-成键对 (LP-BP) > 成键对-成键对 (BP-BP)。孤对电子会压迫邻近成键对，导致实际键角小于理论理想键角。",
      card2Title: "2. 立体数 (SN) 与杂化轨道类型",
      card2Text: "立体数决定电子对空间取向：SN=2 (sp 杂化，180°)、SN=3 (sp² 杂化，120°)、SN=4 (sp³ 杂化，109.5°)、SN=5 (sp³d 杂化，90°/120°)、SN=6 (sp³d² 杂化，90°)。",
      card3Title: "3. 八隅体扩展规则（立体数 5 与 6）",
      card3Text: "立体数 5（三角双锥）中，孤对电子必定优先占据【赤道平面】（互成 120° 互斥最小），产生跷跷板形、T形或直线形；立体数 6（八面体）中，两对孤电子对优先处于【反式轴向】（互成 180°），形成平面正方形。",
      card4Title: "4. 分子立体对称性与极性判别",
      card4Text: "只有当各个极性键的偶极矩矢量不能通过空间对称性完全抵消时，分子才具备宏观极性。高对称性分子（如 AX2, AX3, AX4, AX5, AX6 以及特殊的 AX2E3 直线、AX4E2 平面正方形）均为非极性分子。"
    },
    practice: {
      title: "VSEPR 分子构型通关挑战",
      subtitle: "测验你对分子立体数、孤对电子与 3D 几何构型的掌握度。",
      score: "总得分:",
      streak: "连胜:",
      question: "题目",
      identifyPrompt: "请判断该分子的真实立体几何构型：",
      correct: "回答完全正确！化学空间直觉非常敏锐。",
      incorrect: "回答错误。请注意孤对电子对构型定名的影响。",
      nextQuestion: "下一题",
      submit: "提交答案",
      explanation: "考点解析："
    },
    geometries: {
      linear: "直线形 (Linear)",
      trigonal_planar: "平面三角形 (Trigonal Planar)",
      bent: "V形 / 弯折形 (Bent)",
      tetrahedral: "正四面体形 (Tetrahedral)",
      trigonal_pyramidal: "三角锥形 (Trigonal Pyramidal)",
      trigonal_bipyramidal: "三角双锥形 (Trigonal Bipyramidal)",
      seesaw: "跷跷板形 (See-saw)",
      t_shaped: "T形 (T-shaped)",
      octahedral: "正八面体形 (Octahedral)",
      square_pyramidal: "四角锥形 (Square Pyramidal)",
      square_planar: "平面正方形 (Square Planar)"
    }
  },

  "zh-Hant": {
    nav: {
      back: "返回週期表",
      title: "分子空間構型",
      subtitle: "3D VSEPR 分子立體幾何與價層互斥實驗室",
      resetView: "重設視角",
      autoRotate: "自動旋轉",
      langToggle: "English"
    },
    modes: {
      model: "理論自由組裝",
      real: "真實分子圖鑑 (44)",
      learn: "VSEPR 理論精要",
      practice: "闖關測試題庫"
    },
    model: {
      title: "VSEPR 理論通用構型",
      subtitle: "動態增減成鍵原子與孤電子對，觀察物理排斥與空間構型弛豫。",
      bondingPairs: "成鍵原子數 (B)",
      lonePairs: "中心孤對電子數 (L)",
      stericNumber: "價層立體數 (SN)",
      electronGeo: "電子對空間構型",
      molecularGeo: "分子立體幾何構型",
      bondAngle: "理論理想鍵角",
      hybridization: "中心原子混成軌域",
      axeFormula: "AXE 通式",
      showLonePairs: "顯示孤對電子泡",
      showAngles: "顯示鍵角數值",
      reset: "重設為 AX2"
    },
    real: {
      title: "真實分子化學圖鑑",
      subtitle: "涵蓋 44 種考綱經典分子，實測鍵長、真實鍵角與偶極矩向量。",
      searchPlaceholder: "搜尋分子式或名稱 (如 H2O, SF4, CH4)...",
      filterAll: "全部分子 (44)",
      filterLinear: "直線形",
      filterPlanar: "平面三角形",
      filterTetra: "四面體家族",
      filterBipyramid: "三角雙錐家族",
      filterOcta: "八面體家族",
      filterPolar: "極性分子",
      filterNonpolar: "非極性分子",
      dipole: "分子偶極矩",
      polarity: "分子極性",
      bondLength: "化學鍵長",
      expAngle: "實測鍵角",
      centralAtom: "中心原子",
      showDipole: "顯示合偶極矩向量",
      showAngles: "顯示鍵角"
    },
    learn: {
      title: "VSEPR 價層電子對互斥理論基石",
      subtitle: "Cambridge IGCSE & A-Level / AP 核心考點圖解",
      card1Title: "1. 電子對空間排斥力層級",
      card1Text: "孤對電子受單核吸引，電子雲較肥大開展，排斥力規律為：孤對-孤對 (LP-LP) > 孤對-成鍵對 (LP-BP) > 成鍵對-成鍵對 (BP-BP)。孤對電子會壓迫鄰近成鍵對，導致實際鍵角小於理論理想鍵角。",
      card2Title: "2. 立體數 (SN) 與混成軌域類型",
      card2Text: "立體數決定電子對空間取向：SN=2 (sp 混成，180°)、SN=3 (sp² 混成，120°)、SN=4 (sp³ 混成，109.5°)、SN=5 (sp³d 混成，90°/120°)、SN=6 (sp³d² 混成，90°)。",
      card3Title: "3. 八隅體擴展規則（立體數 5 與 6）",
      card3Text: "立體數 5（三角雙錐）中，孤對電子必定優先佔據【赤道平面】（互成 120° 互斥最小），產生蹺蹺板形、T形或直線形；立體數 6（八面體）中，兩對孤電子對優先處於【反式軸向】（互成 180°），形成平面正方形。",
      card4Title: "4. 分子立體對稱性與極性判別",
      card4Text: "只有當各個極性鍵的偶極矩向量不能通過空間對稱性完全抵消時，分子才具備宏觀極性。高對稱性分子（如 AX2, AX3, AX4, AX5, AX6 以及特殊的 AX2E3 直線、AX4E2 平面正方形）均為非極性分子。"
    },
    practice: {
      title: "VSEPR 分子構型通關挑戰",
      subtitle: "測驗你對分子立體數、孤對電子與 3D 幾何構型的掌握度。",
      score: "總得分:",
      streak: "連勝:",
      question: "題目",
      identifyPrompt: "請判斷該分子的真實立體幾何構型：",
      correct: "回答完全正確！化學空間直覺非常敏銳。",
      incorrect: "回答錯誤。請注意孤對電子對構型定名的影響。",
      nextQuestion: "下一題",
      submit: "提交答案",
      explanation: "考點解析："
    },
    geometries: {
      linear: "直線形 (Linear)",
      trigonal_planar: "平面三角形 (Trigonal Planar)",
      bent: "V形 / 彎折形 (Bent)",
      tetrahedral: "正四面體形 (Tetrahedral)",
      trigonal_pyramidal: "三角錐形 (Trigonal Pyramidal)",
      trigonal_bipyramidal: "三角雙錐形 (Trigonal Bipyramidal)",
      seesaw: "蹺蹺板形 (See-saw)",
      t_shaped: "T形 (T-shaped)",
      octahedral: "正八面體形 (Octahedral)",
      square_pyramidal: "四角錐形 (Square Pyramidal)",
      square_planar: "平面正方形 (Square Planar)"
    }
  }
};

let currentLang = localStorage.getItem("molecular_shapes_lang") || "en";

export function getLocale() {
  return currentLang;
}

export function setLocale(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem("molecular_shapes_lang", lang);
    applyTranslations();
  }
}

export function t(path, fallback = "") {
  const keys = path.split(".");
  let val = translations[currentLang];
  for (const k of keys) {
    if (val && typeof val === "object" && k in val) {
      val = val[k];
    } else {
      return fallback || path;
    }
  }
  return typeof val === "string" ? val : fallback || path;
}

export function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const translated = t(key);
    if (translated) el.textContent = translated;
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    const translated = t(key);
    if (translated) el.setAttribute("title", translated);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const translated = t(key);
    if (translated) el.setAttribute("placeholder", translated);
  });
}
