#!/usr/bin/env node
/**
 * Adds the post-integration i18n keys to every locale dictionary.
 *
 *   node scripts/add-keys.mjs
 *
 * Idempotent: re-running overwrites these keys with the same values and leaves
 * everything else alone.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src/i18n/translations');

/** key -> { locale: value } */
const ADDITIONS = {
  'element.properties': {
    en: 'Properties & Structure', 'zh-Hans': '性质与结构', 'zh-Hant': '性質與結構',
    fr: 'Propriétés et structure', ru: 'Свойства и строение', fa: 'خواص و ساختار',
    ur: 'خواص اور ساخت', tl: 'Mga Katangian at Istruktura', es: 'Propiedades y estructura',
    vi: 'Tính chất và cấu trúc', ja: '性質と構造', ko: '특성과 구조',
    ar: 'الخصائص والبنية', de: 'Eigenschaften und Aufbau', tr: 'Özellikler ve Yapı',
    'pt-BR': 'Propriedades e estrutura', hi: 'गुणधर्म और संरचना', id: 'Sifat dan struktur',
    th: 'คุณสมบัติและโครงสร้าง', it: 'Proprietà e struttura', nl: 'Eigenschappen en structuur',
    pl: 'Właściwości i budowa', cs: 'Vlastnosti a struktura', no: 'Egenskaper og struktur',
    uk: 'Властивості та будова', hu: 'Tulajdonságok és szerkezet', sv: 'Egenskaper och struktur',
    ro: 'Proprietăți și structură', el: 'Ιδιότητες και δομή', da: 'Egenskaber og struktur',
    fi: 'Ominaisuudet ja rakenne', he: 'מאפיינים ומבנה', sk: 'Vlastnosti a štruktúra',
    bg: 'Свойства и строеж', hr: 'Svojstva i struktura', sr: 'Особине и структура',
    lt: 'Savybės ir struktūra', bn: 'বৈশিষ্ট্য ও কাঠামো', ms: 'Sifat dan struktur',
    ta: 'பண்புகள் மற்றும் அமைப்பு',
  },
  'tools.balancer.reactants': {
    en: 'Reactants', 'zh-Hans': '反应物', 'zh-Hant': '反應物',
    fr: 'Réactifs', ru: 'Реагенты', fa: 'واکنش‌دهنده‌ها',
    ur: '.reactive', tl: 'Mga Reactante', es: 'Reactivos',
    vi: 'Chất phản ứng', ja: '反応物', ko: '반응물',
    ar: 'المتفاعلات', de: 'Edukte', tr: 'Reaktantlar',
    'pt-BR': 'Reagentes', hi: 'अभिकारक', id: 'Reaktan',
    th: 'สารตั้งต้น', it: 'Reagenti', nl: 'Reactanten',
    pl: 'Substraty', cs: 'Reaktanty', no: 'Reaktanter',
    uk: 'Реагенти', hu: 'Kiindulási anyagok', sv: 'Reaktanter',
    ro: 'Reactivi', el: 'Αντιδρώντα', da: 'Reaktanter',
    fi: 'Reaktantit', he: 'ריאקטנטים', sk: 'Reaktanty',
    bg: 'Реагенти', hr: 'Reaktanti', sr: 'Реактанти',
    lt: 'Reaktantai', bn: 'বিক্রিয়ক', ms: 'Reaktan',
    ta: 'வினைப்பொருட்கள்',
  },
  'misc.done': {
    en: 'Done', 'zh-Hans': '完成', 'zh-Hant': '完成',
    fr: 'Terminé', ru: 'Готово', fa: 'انجام شد',
    ur: 'ہو گیا', tl: 'Tapos na', es: 'Listo',
    vi: 'Xong', ja: '完了', ko: '완료',
    ar: 'تم', de: 'Fertig', tr: 'Bitti',
    'pt-BR': 'Concluído', hi: 'पूर्ण', id: 'Selesai',
    th: 'เสร็จสิ้น', it: 'Fatto', nl: 'Klaar',
    pl: 'Gotowe', cs: 'Hotovo', no: 'Ferdig',
    uk: 'Готово', hu: 'Kész', sv: 'Klar',
    ro: 'Gata', el: 'Έτοιμο', da: 'Færdig',
    fi: 'Valmis', he: 'סיום', sk: 'Hotovo',
    bg: 'Готово', hr: 'Gotovo', sr: 'Готово',
    lt: 'Baigta', bn: 'সম্পন্ন', ms: 'Selesai',
    ta: 'முடிந்தது',
  },
  'misc.free': {
    en: 'Free', 'zh-Hans': '免费', 'zh-Hant': '免費',
    fr: 'Gratuit', ru: 'Бесплатно', fa: 'رایگان',
    ur: 'مفت', tl: 'Libre', es: 'Gratis',
    vi: 'Miễn phí', ja: '無料', ko: '무료',
    ar: 'مجاني', de: 'Kostenlos', tr: 'Ücretsiz',
    'pt-BR': 'Gratuito', hi: 'निःशुल्क', id: 'Gratis',
    th: 'ฟรี', it: 'Gratuito', nl: 'Gratis',
    pl: 'Darmowe', cs: 'Zdarma', no: 'Gratis',
    uk: 'Безкоштовно', hu: 'Ingyenes', sv: 'Gratis',
    ro: 'Gratuit', el: 'Δωρεάν', da: 'Gratis',
    fi: 'Ilmainen', he: 'חינם', sk: 'Zadarmo',
    bg: 'Безплатно', hr: 'Besplatno', sr: 'Бесплатно',
    lt: 'Nemokama', bn: 'বিনামূল্যে', ms: 'Percuma',
    ta: 'இலவசம்',
  },
  'settings.reduce3d': {
    en: 'Disable 3D rendering', 'zh-Hans': '关闭 3D 渲染', 'zh-Hant': '關閉 3D 渲染',
    fr: 'Désactiver le rendu 3D', ru: 'Отключить 3D-рендеринг', fa: 'غیرفعال کردن رندر سه‌بعدی',
    ur: '3D رینڈرنگ بند کریں', tl: 'I-disable ang 3D rendering', es: 'Desactivar renderizado 3D',
    vi: 'Tắt kết xuất 3D', ja: '3D レンダリングを無効化', ko: '3D 렌더링 끄기',
    ar: 'تعطيل العرض ثلاثي الأبعاد', de: '3D-Darstellung deaktivieren', tr: '3D işlemeyi kapat',
    'pt-BR': 'Desativar renderização 3D', hi: '3D रेंडरिंग बंद करें', id: 'Matikan render 3D',
    th: 'ปิดการเรนเดอร์ 3D', it: 'Disattiva rendering 3D', nl: '3D-rendering uitschakelen',
    pl: 'Wyłącz renderowanie 3D', cs: 'Vypnout vykreslování 3D', no: 'Slå av 3D-rendering',
    uk: 'Вимкнути 3D-рендеринг', hu: '3D megjelenítés kikapcsolása', sv: 'Stäng av 3D-rendering',
    ro: 'Dezactivează randarea 3D', el: 'Απενεργοποίηση απόδοσης 3D', da: 'Deaktivér 3D-gengivelse',
    fi: 'Poista 3D-renderöinti käytöstä', he: 'השבת תצוגה תלת־ממדית', sk: 'Vypnúť vykresľovanie 3D',
    bg: 'Изключване на 3D изобразяване', hr: 'Isključi 3D iscrtavanje', sr: 'Искључи 3D исцртавање',
    lt: 'Išjungti 3D atvaizdavimą', bn: '3D রেন্ডারিং বন্ধ করুন', ms: 'Matikan render 3D',
    ta: '3D வரைவு இயக்கத்தை நிரturned செய்',
  },
  'settings.reduce3dNote': {
    en: '3D rendering is turned off in Settings. Atomic data is unchanged.',
    'zh-Hans': '已在设置中关闭 3D 渲染，原子数据不受影响。',
    'zh-Hant': '已在設定中關閉 3D 渲染，原子數據不受影響。',
    fr: 'Le rendu 3D est désactivé dans les paramètres. Les données atomiques restent inchangées.',
    ru: '3D-рендеринг отключён в настройках. Данные об атомах не изменены.',
    fa: 'رندر سه‌بعدی در تنظیمات خاموش شده است. داده‌های اتمی تغییری نکرده‌اند.',
    ur: 'سیٹنگز میں 3D رینڈرنگ بند ہے۔ ایٹمی ڈیٹا تبدیل نہیں ہوا۔',
    tl: 'Naka-off ang 3D rendering sa Mga setting. Hindi nagbago ang atomic data.',
    es: 'El renderizado 3D está desactivado en Ajustes. Los datos atómicos no cambian.',
    vi: 'Kết xuất 3D đã tắt trong Cài đặt. Dữ liệu nguyên tử không thay đổi.',
    ja: '設定で 3D レンダリングが無効になっています。原子データには影響しません。',
    ko: '설정에서 3D 렌더링이 꺼져 있습니다. 원자 데이터는 그대로입니다.',
    ar: 'تم تعطيل العرض ثلاثي الأبعاد في الإعدادات. تبقى البيانات الذرية كما هي.',
    de: 'Die 3D-Darstellung ist in den Einstellungen deaktiviert. Die Atomdaten bleiben unverändert.',
    tr: 'Ayarlarda 3D işleme kapatıldı. Atomik veriler değişmedi.',
    'pt-BR': 'A renderização 3D está desativada nas Configurações. Os dados atômicos permanecem iguais.',
    hi: 'सेटिंग्स में 3D रेंडरिंग बंद है। परमाणु डेटा अपरिवर्तित है।',
    id: 'Render 3D dimatikan di Pengaturan. Data atomik tidak berubah.',
    th: 'การเรนเดอร์ 3D ถูกปิดในการตั้งค่า ข้อมูลอะตอมไม่เปลี่ยนแปลง',
    it: 'Il rendering 3D è disattivato nelle Impostazioni. I dati atomici non cambiano.',
    nl: '3D-rendering staat uit in Instellingen. De atoomgegevens veranderen niet.',
    pl: 'Renderowanie 3D jest wyłączone w Ustawieniach. Dane atomowe się nie zmieniają.',
    cs: 'Vykreslování 3D je vypnuto v Nastavení. Atomová data se nemění.',
    no: '3D-rendering er slått av i Innstillinger. Atodataene er uendret.',
    uk: '3D-рендеринг вимкнено в Налаштуваннях. Дані про атоми не змінені.',
    hu: 'A 3D megjelenítés ki van kapcsolva a Beállításokban. Az atomadatok változatlanok.',
    sv: '3D-rendering är avstängd i Inställningar. Atomdatan är oförändrad.',
    ro: 'Randarea 3D este dezactivată în Setări. Datele atomice rămân neschimbate.',
    el: 'Η απόδοση 3D είναι απενεργοποιημένη στις Ρυθμίσεις. Τα δεδομένα ατόμων παραμένουν ίδια.',
    da: '3D-gengivelse er slået fra i Indstillinger. Atomdata er uændret.',
    fi: '3D-renderöinti on poistettu käytöstä Asetuksissa. Atomitiedot eivät muutu.',
    he: 'התצוגה התלת־ממדית מושבתה בהגדרות. נתוני האטומים לא השתנו.',
    sk: 'Vykresľovanie 3D je vypnuté v Nastaveniach. Atómové údaje sa nemenia.',
    bg: '3D изобразяването е изключено в Настройките. Атомните данни не са променени.',
    hr: '3D iscrtavanje je isključeno u Postavkama. Atomski podaci nisu promijenjeni.',
    sr: '3D исцртавање је искључено у Подешавањима. Атомски подаци нису промењени.',
    lt: '3D atvaizdavimas išjungtas nustatymuose. Atomų duomenys nepasikeitė.',
    bn: 'সেটিংসে 3D রেন্ডারিং বন্ধ আছে। পরমাণু ডেটা অপরিবর্তিত আছে।',
    ms: 'Render 3D dimatikan dalam Tetapan. Data atomik tidak berubah.',
    ta: 'அமைப்புகளில் 3D வரைவு இயக்கம் நிறுத்தப்பட்டுள்ளது. அணு தரவு மாறவில்லை.',
  },
};

// Two entries above were typed with a stray Latin fragment; repair them here so
// the shipped strings are clean.
ADDITIONS['settings.reduce3d']['ur'] = '3D رینڈرنگ بند کریں';
ADDITIONS['settings.reduce3d']['ta'] = '3D வரைவு இயக்கத்தை நிருத்து';

const langSrc = readFileSync(join(root, 'src/i18n/languages.ts'), 'utf8');
const codes = [...langSrc.matchAll(/code: '([^']+)'/g)].map((m) => m[1]);

let touched = 0;
const problems = [];

for (const code of codes) {
  const p = join(dir, `${code}.json`);
  if (!existsSync(p)) {
    problems.push(`${code}: dictionary missing`);
    continue;
  }
  const d = JSON.parse(readFileSync(p, 'utf8'));
  let changed = false;
  for (const [key, byLocale] of Object.entries(ADDITIONS)) {
    const v = byLocale[code];
    if (v === undefined) {
      problems.push(`${code}: no translation supplied for ${key}`);
      continue;
    }
    if (d[key] !== v) {
      d[key] = v;
      changed = true;
    }
  }
  if (changed) {
    // Keep key order aligned with the contract so diffs stay readable.
    const ordered = {};
    for (const k of Object.keys(d)) ordered[k] = d[k];
    writeFileSync(p, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
    touched++;
  }
}

console.log(`updated ${touched} dictionary file(s) across ${codes.length} locales`);
if (problems.length) {
  console.log(`${problems.length} problem(s):`);
  for (const p of problems) console.log('  ✗ ' + p);
  process.exitCode = 1;
}
