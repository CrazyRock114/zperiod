/**
 * Flame Studio - Internationalization (i18n) Module
 * Base English with dynamic Simplified/Traditional Chinese localization.
 * Zero-CJK in HTML/core logic, centralized localization here.
 */

export const translations = {
  en: {
    nav: {
      back: "Zperiod",
      title: "Flame Studio",
      subtitle: "Spectroscopic Flame Test Simulator",
      cobaltGlass: "Cobalt Blue Glass",
      spectroscope: "Spectroscope",
      audio: "Burner Sound",
      reset: "Clean Wire Loop",
      langToggle: "中文"
    },
    burner: {
      title: "Bunsen Burner Control",
      airCollar: "Air Collar (Vent)",
      gasValve: "Gas Flow",
      flameType: "Flame Type",
      tempEst: "Est. Temp",
      safety: "Safety (Yellow)",
      gentle: "Medium (Blue)",
      roaring: "Roaring (Hot Blue)"
    },
    bench: {
      title: "Reagents & Watch Glasses",
      subtitle: "Dip platinum/nichrome loop into salt sample and test in flame",
      hclDip: "Conc. HCl (Clean Loop)",
      dipAction: "Dip Loop in Sample",
      burnAction: "Hold in Flame",
      quickTest: "Auto Sequence",
      loopStatus: "Loop State:",
      loopClean: "Clean (No residue)",
      loopLoaded: "Loaded with",
      loopBurning: "In Flame"
    },
    spectroscope: {
      title: "Optical Spectrometer",
      subtitle: "Atomic Emission Spectral Lines (Wavelength in nm)",
      continuous: "Continuous Solar Background",
      discrete: "Discrete Metal Emission Lines",
      wavelength: "Wavelength",
      intensity: "Rel. Intensity",
      transition: "Electronic Transition"
    },
    igcse: {
      title: "Cambridge IGCSE 0620 Flame Test Guide",
      colIon: "Cation",
      colCompound: "Sample",
      colColor: "Flame Colour",
      colNote: "Examiner Note",
      tip: "Tip: Always dip the wire in concentrated hydrochloric acid and heat in a roaring non-luminous flame before testing each sample."
    },
    ions: {
      li: "Lithium (Li+)",
      na: "Sodium (Na+)",
      k: "Potassium (K+)",
      ca: "Calcium (Ca2+)",
      ba: "Barium (Ba2+)",
      cu: "Copper(II) (Cu2+)",
      sr: "Strontium (Sr2+)"
    },
    flameColors: {
      crimson: "Crimson",
      yellow: "Yellow",
      lilac: "Lilac",
      brickRed: "Brick red",
      appleGreen: "Apple green",
      blueGreen: "Blue-green",
      scarlet: "Scarlet red"
    }
  },

  zh: {
    nav: {
      back: "返回周期表",
      title: "焰色反应实验室",
      subtitle: "光谱级金属阳离子焰色模拟器",
      cobaltGlass: "钴玻璃片滤光",
      spectroscope: "分光镜图谱",
      audio: "本生灯声音",
      reset: "盐酸洗涤铂丝",
      langToggle: "English"
    },
    burner: {
      title: "本生灯调节台",
      airCollar: "空气进气调节阀",
      gasValve: "燃气流速",
      flameType: "火焰形态",
      tempEst: "预估温度",
      safety: "安全焰 (亮黄)",
      gentle: "常规焰 (微蓝)",
      roaring: "咆哮无光焰 (高热蓝)"
    },
    bench: {
      title: "试剂表面皿与取样台",
      subtitle: "将铂丝/镍铬丝环蘸取待测盐粉末置入火焰",
      hclDip: "浓盐酸 (洗涤铂丝)",
      dipAction: "蘸取待测样品",
      burnAction: "置入火焰灼烧",
      quickTest: "一键全流程",
      loopStatus: "铂丝状态:",
      loopClean: "已清洁 (无残留)",
      loopLoaded: "已蘸取",
      loopBurning: "火焰灼烧中"
    },
    spectroscope: {
      title: "高精度光学分光镜",
      subtitle: "原子特征发射光谱线（波长 λ 单位：nm）",
      continuous: "连续背景光",
      discrete: "金属特征线谱",
      wavelength: "发射波长",
      intensity: "相对强度",
      transition: "电子跃迁能级"
    },
    igcse: {
      title: "剑桥 IGCSE 0620 官方考纲焰色对照表",
      colIon: "阳离子",
      colCompound: "测试样品",
      colColor: "考纲标准焰色",
      colNote: "考官重点提醒",
      tip: "实验要领：先用浓盐酸彻底清洗铂丝并在咆哮火焰中灼烧，确认无色后再蘸取样品测试。"
    },
    ions: {
      li: "锂离子 (Li+)",
      na: "钠离子 (Na+)",
      k: "钾离子 (K+)",
      ca: "钙离子 (Ca2+)",
      ba: "钡离子 (Ba2+)",
      cu: "铜离子 (Cu2+)",
      sr: "锶离子 (Sr2+)"
    },
    flameColors: {
      crimson: "深红 / 鲜红",
      yellow: "黄色 (强而持久)",
      lilac: "淡紫 (用钴玻璃观察)",
      brickRed: "砖红 / 橙红",
      appleGreen: "苹果绿 / 黄绿",
      blueGreen: "蓝绿 (带青碧闪光)",
      scarlet: "洋红 / 猩红"
    }
  },

  "zh-Hant": {
    nav: {
      back: "返回週期表",
      title: "焰色反應實驗室",
      subtitle: "光譜級金屬陽離子焰色模擬器",
      cobaltGlass: "鈷玻璃片濾光",
      spectroscope: "分光鏡圖譜",
      audio: "本生燈聲音",
      reset: "鹽酸洗滌鉑絲",
      langToggle: "English"
    },
    burner: {
      title: "本生燈調節台",
      airCollar: "空氣進氣調節閥",
      gasValve: "燃氣流速",
      flameType: "火焰形態",
      tempEst: "預估溫度",
      safety: "安全焰 (亮黃)",
      gentle: "常規焰 (微藍)",
      roaring: "咆哮無光焰 (高熱藍)"
    },
    bench: {
      title: "試劑表面皿與取樣台",
      subtitle: "將鉑絲/鎳鉻絲環蘸取待測鹽粉末置入火焰",
      hclDip: "濃鹽酸 (洗滌鉑絲)",
      dipAction: "蘸取待測樣品",
      burnAction: "置入火焰灼燒",
      quickTest: "一鍵全流程",
      loopStatus: "鉑絲狀態:",
      loopClean: "已清潔 (無殘留)",
      loopLoaded: "已蘸取",
      loopBurning: "火焰灼燒中"
    },
    spectroscope: {
      title: "高精度光學分光鏡",
      subtitle: "原子特徵發射光譜線（波長 λ 單位：nm）",
      continuous: "連續背景光",
      discrete: "金屬特徵線譜",
      wavelength: "發射波長",
      intensity: "相對強度",
      transition: "電子躍遷能階"
    },
    igcse: {
      title: "劍橋 IGCSE 0620 官方考綱焰色對照表",
      colIon: "陽離子",
      colCompound: "測試樣品",
      colColor: "考綱標準焰色",
      colNote: "考官重點提醒",
      tip: "實驗要領：先用濃鹽酸徹底清洗鉑絲並在咆哮火焰中灼燒，確認無色後再蘸取樣品測試。"
    },
    ions: {
      li: "鋰離子 (Li+)",
      na: "鈉離子 (Na+)",
      k: "鉀離子 (K+)",
      ca: "鈣離子 (Ca2+)",
      ba: "鋇離子 (Ba2+)",
      cu: "銅離子 (Cu2+)",
      sr: "鍶離子 (Sr2+)"
    },
    flameColors: {
      crimson: "深紅 / 鮮紅",
      yellow: "黃色 (強而持久)",
      lilac: "淡紫 (用鈷玻璃觀察)",
      brickRed: "磚紅 / 橙紅",
      appleGreen: "蘋果綠 / 黃綠",
      blueGreen: "藍綠 (帶青碧閃光)",
      scarlet: "洋紅 / 猩紅"
    }
  }
};

let currentLang = localStorage.getItem("flame_studio_lang") || "en";

export function getLocale() {
  return currentLang;
}

export function setLocale(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem("flame_studio_lang", lang);
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
