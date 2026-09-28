#!/usr/bin/env node
/**
 * Explicit values for the caption-style keys.
 *
 * A previous pass stripped the dead {slot} out of these strings with a regex,
 * which worked for English and mangled the rest: Japanese got "温度:" with a
 * dangling colon, Chinese got "种离子" with a leftover quantifier, and
 * learn.progress became "complete" instead of "Progress".
 *
 * These are captions whose value is rendered as a sibling element, so each is
 * just a noun. Setting them per locale is the only reliable way.
 */
import fs from 'node:fs';

const KEYS = {
  'tools.lab.temperature': { en:'Temperature', 'zh-Hans':'温度', 'zh-Hant':'溫度', fr:'Température', ru:'Температура', fa:'دما', ur:'درجہ حرارت', tl:'Temperatura', es:'Temperatura', vi:'Nhiệt độ', ja:'温度', ko:'온도', ar:'درجة الحرارة', de:'Temperatur', tr:'Sıcaklık', 'pt-BR':'Temperatura', hi:'तापमान', id:'Suhu', th:'อุณหภูมิ', it:'Temperatura', nl:'Temperatuur', pl:'Temperatura', cs:'Teplota', no:'Temperatur', uk:'Температура', hu:'Hőmérséklet', sv:'Temperatur', ro:'Temperatură', el:'Θερμοκρασία', da:'Temperatur', fi:'Lämpötila', he:'טמפרטורה', sk:'Teplota', bg:'Температура', hr:'Temperatura', sr:'Температура', lt:'Temperatūra', bn:'তাপমাত্রা', ms:'Suhu', ta:'வெப்பநிலை' },
  'tools.lab.volume': { en:'Volume', 'zh-Hans':'体积', 'zh-Hant':'體積', fr:'Volume', ru:'Объём', fa:'حجم', ur:'حجم', tl:'Sukat', es:'Volumen', vi:'Thể tích', ja:'体積', ko:'부피', ar:'الحجم', de:'Volumen', tr:'Hacim', 'pt-BR':'Volume', hi:'आयतन', id:'Volume', th:'ปริมาตร', it:'Volume', nl:'Volume', pl:'Objętość', cs:'Objem', no:'Volum', uk:'Об’єм', hu:'Térfogat', sv:'Volym', ro:'Volum', el:'Όγκος', da:'Volumen', fi:'Tilavuus', he:'נפח', sk:'Objem', bg:'Обем', hr:'Zapremina', sr:'Zapremina', lt:'Tūris', bn:'আয়তন', ms:'IsiPADU', ta:'கொள்ளளவு' },
  'tools.lab.molecules': { en:'Molecules', 'zh-Hans':'分子数', 'zh-Hant':'分子數', fr:'Molécules', ru:'Молекулы', fa:'مولکول‌ها', ur:'لائیکول', tl:'Molekula', es:'Moléculas', vi:'Phân tử', ja:'分子', ko:'분자 수', ar:'الجزيئات', de:'Moleküle', tr:'Moleküller', 'pt-BR':'Moléculas', hi:'अणु', id:'Molekul', th:'โมเลกุล', it:'Molecole', nl:'Moleculen', pl:'Cząsteczki', cs:'Molekuly', no:'Molekyler', uk:'Молекули', hu:'Molekulák', sv:'Molekyler', ro:'Molecule', el:'Μόρια', da:'Molekyler', fi:'Molekylit', he:'מולקולות', sk:'Molekuly', bg:'Молекули', hr:'Molekule', sr:'Молекули', lt:'Molekulės', bn:'অণু', ms:'Molekul', ta:'அணுக்கள்' },
  'tools.lab.density': { en:'Density', 'zh-Hans':'密度', 'zh-Hant':'密度', fr:'Densité', ru:'Плотность', fa:'چگالی', ur:'کثافت', tl:'Densidad', es:'Densidad', vi:'Khối lượng riêng', ja:'密度', ko:'밀도', ar:'الكثافة', de:'Dichte', tr:'Yoğunluk', 'pt-BR':'Densidade', hi:'घनत्व', id:'Densitas', th:'ความหนาแน่น', it:'Densità', nl:'Dichtheid', pl:'Gęstość', cs:'Hustota', no:'Tetthet', uk:'Густина', hu:'Sűrűség', sv:'Densitet', ro:'Densitate', el:'Πυκνότητα', da:'Densitet', fi:'Tiheys', he:'צפיפות', sk:'Hustota', bg:'Плътност', hr:'Gustoća', sr:'Густина', lt:'Tūris', bn:'ঘনত্ব', ms:'Ketumpatan', ta:'அடர்த்தி' },
  'ions.count': { en:'ions', 'zh-Hans':'个离子', 'zh-Hant':'個離子', fr:'ions', ru:'ионов', fa:'یون', ur:'آئن', tl:'ion', es:'iones', vi:'ion', ja:'個のイオン', ko:'개의 이온', ar:'أيون', de:'Ionen', tr:'iyon', 'pt-BR':'íons', hi:'आयन', id:'ion', th:'ไอออน', it:'ioni', nl:'ionen', pl:'jonów', cs:'iontů', no:'ioner', uk:'йонів', hu:'ion', sv:'joner', ro:'ioni', el:'ιόντων', da:'ioner', fi:'ionia', he:'יונים', sk:'iónov', bg:'йона', hr:'iona', sr:'јона', lt:'jonų', bn:'আয়ন', ms:'ion', ta:'அயன்கள்' },
  'learn.progress': { en:'Progress', 'zh-Hans':'进度', 'zh-Hant':'進度', fr:'Progression', ru:'Прогресс', fa:'پیشرفت', ur:'پیش رفت', tl:'Usad', es:'Progreso', vi:'Tiến độ', ja:'進捗', ko:'진행률', ar:'التقدّم', de:'Fortschritt', tr:'İlerleme', 'pt-BR':'Progresso', hi:'प्रगति', id:'Kemajuan', th:'ความคืบหน้า', it:'Avanzamento', nl:'Voortgang', pl:'Postęp', cs:'Postup', no:'Framdrift', uk:'Прогрес', hu:'Haladás', sv:'Förlopp', ro:'Progres', el:'Πρόοδος', da:'Fremdrift', fi:'Edistyminen', he:'התקדמות', sk:'Postup', bg:'Напредък', hr:'Napredak', sr:'Напредак', lt:'Eiga', bn:'অগ্রগতি', ms:'Kemajuan', ta:'முன்னேற்றம்' },
  'tools.molar.massOf': { en:'Mass of', 'zh-Hans':'质量为', 'zh-Hant':'質量為', fr:'Masse de', ru:'Масса', fa:'جرم', ur:'ماس', tl:'Masa ng', es:'Masa de', vi:'Khối lượng của', ja:'質量', ko:'질량', ar:'كتلة', de:'Masse von', tr:'Kütlesi', 'pt-BR':'Massa de', hi:'द्रव्यमान', id:'Massa', th:'มวลของ', it:'Massa di', nl:'Massa van', pl:'Masa', cs:'Hmotnost', no:'Masse av', uk:'Маса', hu:'Tömege', sv:'Massa av', ro:'Masa', el:'Μάζα', da:'Masse af', fi:'Massa', he:'מסת', sk:'Hmotnosť', bg:'Маса', hr:'Masa', sr:'Маса', lt:'Masė', bn:'ভর', ms:'Jisim', ta:'நிறை' },
  'tools.molar.numberOf': { en:'Number of molecules', 'zh-Hans':'分子数', 'zh-Hant':'分子數', fr:'Nombre de molécules', ru:'Число молекул', fa:'تعداد مولکول‌ها', ur:'لائیکولوں کی تعداد', tl:'Bilang ng molekula', es:'Número de moléculas', vi:'Số phân tử', ja:'分子数', ko:'분자 수', ar:'عدد الجزيئات', de:'Anzahl der Moleküle', tr:'Molekül sayısı', 'pt-BR':'Número de moléculas', hi:'अणुओं की संख्या', id:'Jumlah molekul', th:'จำนวนโมเลกุล', it:'Numero di molecole', nl:'Aantal moleculen', pl:'Liczba cząsteczek', cs:'Počet molekul', no:'Antall molekyler', uk:'Кількість молекул', hu:'Molekulák száma', sv:'Antal molekyler', ro:'Număr de molecule', el:'Αριθμός μορίων', da:'Antal molekyler', fi:'Molekulien määrä', he:'מספר מולקולות', sk:'Počet molekúl', bg:'Брой молекули', hr:'Broj molekula', sr:'Број молекула', lt:'Molekulių skaičius', bn:'অণুর সংখ্যা', ms:'Bilangan molekul', ta:'அணு எண்ணிக்கை' },
  'worksheet.numberOfQuestions': { en:'Number of questions', 'zh-Hans':'题目数量', 'zh-Hant':'題目數量', fr:'Nombre de questions', ru:'Количество вопросов', fa:'تعداد پرسش‌ها', ur:'سوالات کی تعداد', tl:'Bilang ng tanong', es:'Número de preguntas', vi:'Số câu hỏi', ja:'問題数', ko:'문제 수', ar:'عدد الأسئلة', de:'Anzahl der Fragen', tr:'Soru sayısı', 'pt-BR':'Número de questões', hi:'प्रश्नों की संख्या', id:'Jumlah soal', th:'จำนวนข้อ', it:'Numero di domande', nl:'Aantal vragen', pl:'Liczba pytań', cs:'Počet otázek', no:'Antall spørsmål', uk:'Кількість питань', hu:'Kérdések száma', sv:'Antal frågor', ro:'Număr de întrebări', el:'Αριθμός ερωτήσεων', da:'Antal spørgsmål', fi:'Kysymysten määrä', he:'מספר השאלות', sk:'Počet otázok', bg:'Брой въпроси', hr:'Broj pitanja', sr:'Број питања', lt:'Klausimų skaičius', bn:'প্রশ্নের সংখ্যা', ms:'Bilangan soalan', ta:'கேள்விகளின் எண்ணிக்கை' },
  'tools.solubility.inputPlaceholder': { en:'e.g. NaCl', 'zh-Hans':'例如 NaCl', 'zh-Hant':'例如 NaCl', fr:'ex. NaCl', ru:'напр. NaCl', fa:'مثالاً NaCl', ur:'مثلاً NaCl', tl:'hal. NaCl', es:'p. ej. NaCl', vi:'ví dụ NaCl', ja:'例: NaCl', ko:'예: NaCl', ar:'مثالاً NaCl', de:'z. B. NaCl', tr:'örn. NaCl', 'pt-BR':'ex. NaCl', hi:'जैसे NaCl', id:'mis. NaCl', th:'เช่น NaCl', it:'es. NaCl', nl:'bijv. NaCl', pl:'np. NaCl', cs:'např. NaCl', no:'f.eks. NaCl', uk:'напр. NaCl', hu:'pl. NaCl', sv:'t.ex. NaCl', ro:'de ex. NaCl', el:'π.χ. NaCl', da:'f.eks. NaCl', fi:'esim. NaCl', he:'למשל NaCl', sk:'napr. NaCl', bg:'напр. NaCl', hr:'npr. NaCl', sr:'нпр. NaCl', lt:'pvz. NaCl', bn:'যেমন NaCl', ms:'cth. NaCl', ta:'எ.கா. NaCl' },
};

const langs = [...fs.readFileSync('src/i18n/languages.ts', 'utf8').matchAll(/code: '([^']+)'/g)].map((m) => m[1]);
let n = 0;
const missing = [];

for (const c of langs) {
  const p = 'src/i18n/translations/' + c + '.json';
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  let ch = false;
  for (const [key, byLocale] of Object.entries(KEYS)) {
    const v = byLocale[c];
    if (v === undefined) { missing.push(c + ':' + key); continue; }
    if (d[key] !== v) { d[key] = v; ch = true; }
  }
  if (ch) { fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n'); n++; }
}
console.log(`set ${Object.keys(KEYS).length} caption keys across ${n} locale files`);
if (missing.length) {
  console.log(`missing ${missing.length}: ${[...new Set(missing)].join(', ')}`);
  process.exitCode = 1;
}
