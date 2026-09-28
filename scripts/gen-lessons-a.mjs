#!/usr/bin/env node
/**
 * LEARNING-PATH lesson copy — slice A of the `lesson.*` namespace.
 *
 *   node scripts/gen-lessons-a.mjs
 *
 * Slice A owns six lessons (48 keys per locale):
 *   readTheTable, atomicStructure, electronConfig, trends, ions, bonding
 *
 * The English strings below are the copy the app itself ships in
 * `src/data/lessons.ts` (question `text` / `explainText`), lifted into the
 * dictionary so the i18n layer and the lesson data can never disagree.
 *
 * Rules honoured by this script:
 *   • MERGE ONLY. Each locale file is parsed, only `lesson.<slice>.…` keys are
 *     written, everything else keeps its value AND its position. The script
 *     asserts that no pre-existing key was dropped or altered.
 *   • Element symbols and formulas (Na⁺, Cl⁻, SO₄²⁻, [Ar] 3d⁶ 4s², 2(2ℓ+1))
 *     are never translated, re-spaced or re-digitised.
 *   • No placeholders in this namespace — plain sentences only.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TRANS = join(root, 'src/i18n/translations');

/** Lesson ids in the order they appear in the contract. */
const SLICE = ['readTheTable', 'atomicStructure', 'electronConfig', 'trends', 'ions', 'bonding'];
/** Keys per lesson, in contract order. */
const FIELDS = ['title', 'summary', 'q1', 'q2', 'q3', 'e1', 'e2', 'e3'];

const T = {
  en: {
    readTheTable: {
      title: 'Reading the Periodic Table',
      summary:
        'Periods run across, groups run down. Learn what each axis controls before you memorise a single number.',
      q1: 'What increases as you move left to right across a period?',
      q2: 'Elements in the same group share what property?',
      q3: 'Where are the lanthanides and actinides normally drawn?',
      e1: 'Atomic number increases by one each step because you are adding one proton. Everything else (radius shrinks, electronegativity rises) follows from that.',
      e2: 'A group is defined by valence electron count, which is why the alkali metals (1) and the halogens (7) each behave alike.',
      e3: 'They are the f-block, pulled out below the table to keep columns 3–12 readable. They still belong to periods 6 and 7.',
    },
    atomicStructure: {
      title: 'Atomic Structure',
      summary:
        'Protons decide the element, neutrons make the isotope, electrons make the ion. Three particles, three jobs.',
      q1: 'Which particle determines the identity of an element?',
      q2: 'Two atoms of the same element with different neutron counts are called…',
      q3: 'A sodium atom that loses one electron becomes…',
      e1: 'Change the protons and you change the element entirely. Iron with 25 protons is manganese; with 27 it is cobalt.',
      e2: 'Isotopes share a proton count and differ in mass number. Carbon-12 and carbon-14 are both carbon; carbon-14 is radioactive.',
      e3: 'Losing an electron leaves one more proton than electron, so the charge is +1. The element is still sodium.',
    },
    electronConfig: {
      title: 'Electron Configuration',
      summary:
        'Fill sub-shells in energy order, then read the configuration back. Aufbau, Hund and the noble-gas shorthand.',
      q1: 'In which order does the Aufbau principle fill sub-shells?',
      q2: 'How many electrons fit in a single p sub-shell?',
      q3: 'What does the shorthand [Ar] mean?',
      e1: 'Sub-shells fill by increasing n + l, so 4s (n+l = 4) comes before 3d (n+l = 5). That is why potassium is [Ar] 4s¹, not [Ar] 3d¹.',
      e2: 'Each sub-shell holds 2(2ℓ+1) electrons: s holds 2, p holds 6, d holds 10, f holds 14.',
      e3: 'Noble-gas shorthand substitutes the full configuration of a noble gas. [Ar] 3d⁶ 4s² is iron: 18 + 6 + 2 = 26 electrons.',
    },
    trends: {
      title: 'Periodic Trends',
      summary:
        'Radius, electronegativity and ionisation energy all follow from one thing: how tightly the nucleus holds its electrons.',
      q1: 'Atomic radius generally…',
      q2: 'Which element has the highest electronegativity?',
      q3: 'Why is the first ionization energy of sodium much lower than that of neon?',
      e1: 'Down a group you add shells, so the atom is physically bigger. Across a period increasing nuclear charge pulls the same shell inward.',
      e2: 'Fluorine is 3.98 on the Pauling scale — the highest of any element, and it pulls hardest on bonding electrons.',
      e3: 'Sodium’s 3s¹ electron is shielded and far from the nucleus. Neon’s 2p⁶ are close in and tightly held, so removing one costs far more energy.',
    },
    ions: {
      title: 'Ions and Polyatomic Ions',
      summary:
        'Cations, anions and polyatomic ions — how charges arise and what each one does in solution.',
      q1: 'A monatomic ion with a 2− charge has how many more electrons than protons?',
      q2: 'Which of these is a polyatomic ion?',
      q3: 'What charge does an oxide ion carry?',
      e1: 'A negative charge means the ion has gained electrons — 2− means two extra electrons.',
      e2: 'Sulfate contains four atoms bonded together. Monatomic ions like Na⁺ and Cl⁻ are a single atom each.',
      e3: 'Oxygen is in group 16 with six valence electrons and gains two to reach an octet, giving O²⁻.',
    },
    bonding: {
      title: 'Chemical Bonding',
      summary: 'Ionic, covalent and metallic bonding, and the evidence that tells them apart.',
      q1: 'NaCl is best described as…',
      q2: 'A metal like iron is held together by…',
      q3: 'How many bonds can a single carbon atom form?',
      e1: 'Sodium transfers its outer electron to chlorine, producing Na⁺ and Cl⁻ held together by electrostatic attraction.',
      e2: 'Metallic bonding uses a sea of delocalised valence electrons shared by positive metal ions, which is why metals conduct.',
      e3: 'Carbon has four valence electrons and four vacancies in its second shell, so it forms four covalent bonds — the whole of organic chemistry depends on it.',
    },
  },

  'zh-Hans': {
    readTheTable: {
      title: '读懂元素周期表',
      summary: '周期横向排列，族纵向排列。在死记硬背任何数字之前，先弄清每条轴决定什么。',
      q1: '沿一个周期从左向右移动时，什么在增大？',
      q2: '同一族的元素有什么共同性质？',
      q3: '镧系和锕系元素通常画在哪里？',
      e1: '每一步原子序数增加 1，因为你多加了一个质子。其余一切（半径变小、电负性升高）都由这一点决定。',
      e2: '一个族由价电子数定义，这就是碱金属（1 个）和卤素（7 个）各自行为相似的原因。',
      e3: '它们属于 f 区，为了让第 3–12 列清晰易读，被抽出来放在表格下方。它们仍属于第 6、7 周期。',
    },
    atomicStructure: {
      title: '原子结构',
      summary: '质子决定元素，中子造就同位素，电子造就离子。三种粒子，三种职责。',
      q1: '决定元素身份的是哪一种粒子？',
      q2: '同一种元素中子数不同的两个原子叫作……',
      q3: '一个失去一个电子的钠原子会变成……',
      e1: '质子数一变，元素就完全变了。质子数为 25 的是锰，为 27 的是钴。',
      e2: '同位素的质子数相同，质量数不同。碳-12 和碳-14 都是碳；碳-14 具有放射性。',
      e3: '失去一个电子后，质子比电子多一个，电荷就是 +1。元素仍然是钠。',
    },
    electronConfig: {
      title: '电子排布式',
      summary: '按能量顺序填充副轨道，再把排布式读回来。构造原理、洪特规则和稀有气体简写。',
      q1: '构造原理按什么顺序填充副轨道？',
      q2: '一个 p 副轨道能容纳多少个电子？',
      q3: '简写 [Ar] 是什么意思？',
      e1: '副轨道按 n + l 递增的顺序填充，所以 4s (n+l = 4) 排在 3d (n+l = 5) 之前。这就是钾写作 [Ar] 4s¹ 而不是 [Ar] 3d¹ 的原因。',
      e2: '每个副轨道可容纳 2(2ℓ+1) 个电子：s 容纳 2 个，p 容纳 6 个，d 容纳 10 个，f 容纳 14 个。',
      e3: '稀有气体简写用一个稀有气体的完整排布代替前面的一段。[Ar] 3d⁶ 4s² 是铁：18 + 6 + 2 = 26 个电子。',
    },
    trends: {
      title: '周期性趋势',
      summary: '原子半径、电负性和电离能都源于同一件事：原子核把电子束缚得有多紧。',
      q1: '原子半径总体上……',
      q2: '哪种元素的电负性最高？',
      q3: '为什么钠的第一电离能远低于氖？',
      e1: '沿族向下会增加电子层，原子因此变得更大；沿周期向右，核电荷增大，把同一电子层向内拉。',
      e2: '氟在鲍林标度上的电负性为 3.98，是所有元素中最高的，对成键电子的吸引也最强。',
      e3: '钠的 3s¹ 电子受到屏蔽，离核很远；氖的 2p⁶ 电子靠近原子核且被束缚得牢，移走一个要消耗多得多的能量。',
    },
    ions: {
      title: '离子与多原子离子',
      summary: '阳离子、阴离子和多原子离子——电荷从何而来，它们在溶液中各做什么。',
      q1: '一个带 2− 电荷的单原子离子比质子多几个电子？',
      q2: '以下哪一个是多原子离子？',
      q3: '氧离子带什么电荷？',
      e1: '负电荷意味着该离子得到了电子——2− 表示多了两个电子。',
      e2: '硫酸根由四个成键结合在一起的原子组成。Na⁺ 和 Cl⁻ 这样的单原子离子各自只有一个原子。',
      e3: '氧位于第 16 族，有 6 个价电子，得到两个电子达到八隅体，形成 O²⁻。',
    },
    bonding: {
      title: '化学键',
      summary: '离子键、共价键和金属键，以及能把它们区分开的证据。',
      q1: 'NaCl 最恰当的描述是……',
      q2: '铁这样的金属靠什么维系在一起？',
      q3: '一个碳原子最多能形成几个键？',
      e1: '钠把最外层电子转移给氯，生成 Na⁺ 和 Cl⁻，二者靠静电吸引结合在一起。',
      e2: '金属键依靠被正金属离子共享的离域价电子“电子海”，这正是金属能导电的原因。',
      e3: '碳有 4 个价电子，第二层还有 4 个空位，因此能形成 4 个共价键——整个有机化学都建立在此之上。',
    },
  },

  'zh-Hant': {
    readTheTable: {
      title: '讀懂元素週期表',
      summary: '週期橫向排列，族縱向排列。在死記硬背任何數字之前，先弄清每一條軸決定什麼。',
      q1: '沿一個週期由左至右移動時，什麼在增加？',
      q2: '同一族元素共享什麼性質？',
      q3: '鑭系和錒系元素通常畫在哪裡？',
      e1: '每一步原子序增加 1，因為你多加了一個質子。其餘一切（半徑變小、電負性升高）都由這一點決定。',
      e2: '一族由價電子數定義，這就是鹼金屬（1 個）與鹵素（7 個）各自行為相似的原因。',
      e3: '它們屬於 f 區，為了讓第 3–12 欄清晰易讀，被抽出來放在表格下方。它們仍屬於第 6、7 週期。',
    },
    atomicStructure: {
      title: '原子結構',
      summary: '質子決定元素，中子造就同位素，電子造就離子。三種粒子，三種職責。',
      q1: '決定元素身分的是哪一種粒子？',
      q2: '同一元素中子數不同的兩個原子稱為……',
      q3: '一個失去一個電子的鈉原子會變成……',
      e1: '質子數一變，元素就完全不同了。質子數為 25 的是錳，為 27 的是鈷。',
      e2: '同位素的質子數相同，質量數不同。碳-12 與碳-14 都是碳；碳-14 具有放射性。',
      e3: '失去一個電子後，質子比電子多一個，電荷就是 +1。元素仍然是鈉。',
    },
    electronConfig: {
      title: '電子組態',
      summary: '依能量順序填入副殼層，再把組態讀回來。構築原理、洪德規則與稀有氣體簡寫。',
      q1: '構築原理依什麼順序填入副殼層？',
      q2: '一個 p 副殼層能容納多少個電子？',
      q3: '簡寫 [Ar] 是什麼意思？',
      e1: '副殼層依 n + l 遞增的順序填入，所以 4s (n+l = 4) 排在 3d (n+l = 5) 之前。這就是鉀寫成 [Ar] 4s¹ 而非 [Ar] 3d¹ 的原因。',
      e2: '每個副殼層可容納 2(2ℓ+1) 個電子：s 容納 2 個，p 容納 6 個，d 容納 10 個，f 容納 14 個。',
      e3: '稀有氣體簡寫以一個稀有氣體的完整組態取代前面的一段。[Ar] 3d⁶ 4s² 是鐵：18 + 6 + 2 = 26 個電子。',
    },
    trends: {
      title: '週期性趨勢',
      summary: '原子半徑、電負性與電離能都源自同一件事：原子核把電子束縛得多緊。',
      q1: '原子半徑大致上……',
      q2: '哪一種元素的電負性最高？',
      q3: '為什麼鈉的第一游離能遠低於氖？',
      e1: '沿族向下會增加電子殼層，原子因此變大；沿週期由左至右，核電荷增大，把同一殼層往內拉。',
      e2: '氟在鮑林尺度上的電負性為 3.98，是所有元素中最高的，對成鍵電子的吸引也最強。',
      e3: '鈉的 3s¹ 電子受到遮蔽，離核很遠；氖的 2p⁶ 電子靠近原子核且束縛得牢，移走一個要耗費多得多的能量。',
    },
    ions: {
      title: '離子與多原子離子',
      summary: '陽離子、陰離子與多原子離子——電荷從何而來，它們在溶液中各做什麼。',
      q1: '一個帶 2− 電荷的單原子離子比質子多幾個電子？',
      q2: '以下哪一個是多原子離子？',
      q3: '氧離子帶什麼電荷？',
      e1: '負電荷表示該離子得到了電子——2− 代表多了兩個電子。',
      e2: '硫酸根由四個以鍵相連的原子組成。Na⁺ 與 Cl⁻ 這類單原子離子各自只有一個原子。',
      e3: '氧位於第 16 族，有 6 個價電子，得到兩個電子達到八隅體，形成 O²⁻。',
    },
    bonding: {
      title: '化學鍵',
      summary: '離子鍵、共價鍵與金屬鍵，以及能將它們區分開來的證據。',
      q1: 'NaCl 最恰當的描述是……',
      q2: '鐵這樣的金屬靠什麼維繫在一起？',
      q3: '一個碳原子最多能形成幾個鍵？',
      e1: '鈉把最外層電子轉移給氯，生成 Na⁺ 與 Cl⁻，兩者靠靜電吸引結合在一起。',
      e2: '金屬鍵依靠由正金屬離子共享的離域價電子「電子海」，這正是金屬能導電的原因。',
      e3: '碳有 4 個價電子，第二殼層還有 4 個空位，因此能形成 4 個共價鍵——整個有機化學都建立在此之上。',
    },
  },

  fr: {
    readTheTable: {
      title: 'Lire le tableau périodique',
      summary:
        'Les périodes courent horizontalement, les groupes verticalement. Comprenez ce que commande chaque axe avant de mémoriser le moindre nombre.',
      q1: 'Qu’est-ce qui augmente quand on va de gauche à droite le long d’une période ?',
      q2: 'Les éléments d’un même groupe partagent quelle propriété ?',
      q3: 'Où place-t-on normalement les lanthanides et les actinides ?',
      e1: 'Le numéro atomique augmente de un à chaque pas, car vous ajoutez un proton. Tout le reste (rayon qui diminue, électronégativité qui augmente) en découle.',
      e2: 'Un groupe est défini par le nombre d’électrons de valence : les métaux alcalins (1) et les halogènes (7) se comportent donc chacun de façon analogue.',
      e3: 'Ce sont les éléments du bloc f, sortis et placés sous le tableau pour que les colonnes 3 à 12 restent lisibles. Ils appartiennent toujours aux périodes 6 et 7.',
    },
    atomicStructure: {
      title: 'Structure atomique',
      summary:
        'Les protons décident de l’élément, les neutrons font l’isotope, les électrons font l’ion. Trois particules, trois rôles.',
      q1: 'Quelle particule détermine l’identité d’un élément ?',
      q2: 'Deux atomes du même élément ayant des nombres de neutrons différents s’appellent…',
      q3: 'Un atome de sodium qui perd un électron devient…',
      e1: 'Changez les protons et vous changez complètement d’élément. À 25 protons, ce n’est plus du fer mais du manganèse ; à 27 protons, c’est du cobalt.',
      e2: 'Les isotopes ont le même nombre de protons et diffèrent par leur nombre de masse. Carbone 12 et carbone 14 sont tous deux du carbone ; le carbone 14 est radioactif.',
      e3: 'Perdre un électron laisse un proton de plus que d’électrons : la charge est donc +1. L’élément reste le sodium.',
    },
    electronConfig: {
      title: 'Configuration électronique',
      summary:
        'Remplissez les sous-couches par ordre d’énergie, puis relisez la configuration. Règle d’Aufbau, règle de Hund et notation abrégée des gaz nobles.',
      q1: 'Dans quel ordre le principe d’Aufbau remplit-il les sous-couches ?',
      q2: 'Combien d’électrons tiennent dans une seule sous-couche p ?',
      q3: 'Que signifie l’écriture abrégée [Ar] ?',
      e1: 'Les sous-couches se remplissent par n + l croissant, donc 4s (n+l = 4) avant 3d (n+l = 5). C’est pourquoi on écrit le potassium [Ar] 4s¹ et non [Ar] 3d¹.',
      e2: 'Chaque sous-couche contient 2(2ℓ+1) électrons : s en contient 2, p 6, d 10 et f 14.',
      e3: 'La notation abrégée remplace la configuration complète d’un gaz noble. [Ar] 3d⁶ 4s² est le fer : 18 + 6 + 2 = 26 électrons.',
    },
    trends: {
      title: 'Tendances périodiques',
      summary:
        'Rayon, électronégativité et énergie d’ionisation découlent tous d’une seule chose : la force avec laquelle le noyau retient ses électrons.',
      q1: 'Le rayon atomique, de façon générale…',
      q2: 'Quel élément a l’électronégativité la plus élevée ?',
      q3: 'Pourquoi l’énergie de première ionisation du sodium est-elle bien plus faible que celle du néon ?',
      e1: 'En descendant dans un groupe, on ajoute des couches : l’atome est physiquement plus gros. Le long d’une période, la charge nucléaire croissante attire la même couche vers l’intérieur.',
      e2: 'Le fluor vaut 3,98 sur l’échelle de Pauling, la valeur la plus élevée de tous les éléments : il attire le plus fortement les électrons liants.',
      e3: 'L’électron 3s¹ du sodium est écranisé et loin du noyau. Ceux du néon (2p⁶) sont proches et fortement tenus : en retirer un coûte bien plus d’énergie.',
    },
    ions: {
      title: 'Ions et ions polyatomiques',
      summary:
        'Cations, anions et ions polyatomiques : d’où viennent les charges et que fait chacun d’eux en solution.',
      q1: 'Un ion monoatomique de charge 2− possède combien d’électrons de plus que de protons ?',
      q2: 'Lequel de ces ions est polyatomique ?',
      q3: 'Quelle charge porte un ion oxyde ?',
      e1: 'Une charge négative signifie que l’ion a gagné des électrons : 2− veut dire deux électrons supplémentaires.',
      e2: 'Le sulfate réunit quatre atomes liés entre eux. Les ions monoatomiques comme Na⁺ et Cl⁻ ne contiennent qu’un seul atome.',
      e3: 'L’oxygène est dans le groupe 16 avec six électrons de valence ; il en gagne deux pour atteindre un octet, ce qui donne O²⁻.',
    },
    bonding: {
      title: 'Liaison chimique',
      summary:
        'Liaisons ionique, covalente et métallique, et les indices qui permettent de les distinguer.',
      q1: 'NaCl est le mieux décrit comme…',
      q2: 'Un métal comme le fer est maintenu ensemble par…',
      q3: 'Combien de liaisons un seul atome de carbone peut-il former ?',
      e1: 'Le sodium cède son électron externe au chlore, produisant Na⁺ et Cl⁻ maintenus ensemble par l’attraction électrostatique.',
      e2: 'La liaison métallique repose sur un nuage d’électrons de valence délocalisés partagé par les ions métalliques positifs : c’est pourquoi les métaux conduisent le courant.',
      e3: 'Le carbone a quatre électrons de valence et quatre places vacantes dans sa deuxième couche : il forme donc quatre liaisons covalentes, fondement de toute la chimie organique.',
    },
  },

  ru: {
    readTheTable: {
      title: 'Чтение периодической таблицы',
      summary:
        'Периоды идут по горизонтали, группы — по вертикали. Сначала разберитесь, что задаёт каждая ось, и только потом зубрите цифры.',
      q1: 'Что увеличивается при движении слева направо по периоду?',
      q2: 'Какое свойство общее у элементов одной группы?',
      q3: 'Где обычно изображают лантаноиды и актиноиды?',
      e1: 'Атомный номер на каждом шаге растёт на единицу, потому что вы добавляете один протон. Всё остальное (радиус уменьшается, электроотрицательность растёт) следует из этого.',
      e2: 'Группа определяется числом валентных электронов — поэтому щелочные металлы (1) и галогены (7) ведут себя сходным образом.',
      e3: 'Это элементы f-блока, вынесенные под таблицу, чтобы колонки 3–12 оставались читаемыми. Они по-прежнему относятся к 6-му и 7-му периодам.',
    },
    atomicStructure: {
      title: 'Строение атома',
      summary:
        'Протоны определяют элемент, нейтроны создают изотоп, электроны — ион. Три частицы, три задачи.',
      q1: 'Какая частица определяет химическую сущность элемента?',
      q2: 'Два атома одного элемента с разным числом нейтронов называются…',
      q3: 'Атом натрия, потерявший один электрон, становится…',
      e1: 'Измените протоны — и элемент станет совершенно другим. При 25 протонах это уже марганец, при 27 — кобальт.',
      e2: 'У изотопов одинаковое число протонов и разные массовые числа. Углерод-12 и углерод-14 — оба углерод; углерод-14 радиоактивен.',
      e3: 'Потеряв электрон, атом имеет на один протон больше, чем электронов, поэтому заряд равен +1. Элемент остаётся натрием.',
    },
    electronConfig: {
      title: 'Электронная конфигурация',
      summary:
        'Заполняйте подуровни в порядке возрастания энергии, а затем прочитайте конфигурацию. Принцип Aufbau, правило Хунда и сокращённая запись благородных газов.',
      q1: 'В каком порядке принцип Aufbau заполняет подуровни?',
      q2: 'Сколько электронов помещается в один p-подуровень?',
      q3: 'Что означает сокращённая запись [Ar]?',
      e1: 'Подуровни заполняются по возрастанию n + l, поэтому 4s (n+l = 4) идёт раньше 3d (n+l = 5). Именно поэтому калий записывают как [Ar] 4s¹, а не [Ar] 3d¹.',
      e2: 'Каждый подуровень вмещает 2(2ℓ+1) электронов: s — 2, p — 6, d — 10, f — 14.',
      e3: 'Сокращённая запись подставляет полную конфигурацию благородного газа. [Ar] 3d⁶ 4s² — это железо: 18 + 6 + 2 = 26 электронов.',
    },
    trends: {
      title: 'Периодические закономерности',
      summary:
        'Радиус, электроотрицательность и энергия ионизации вытекают из одного: насколько прочно ядро удерживает электроны.',
      q1: 'Атомный радиус в целом…',
      q2: 'У какого элемента самая высокая электроотрицательность?',
      q3: 'Почему первая энергия ионизации натрия намного ниже, чем у неона?',
      e1: 'Вниз по группе добавляются электронные слои, и атом физически становится больше. Вдоль периода возрастающий заряд ядра стягивает тот же слой внутрь.',
      e2: 'У фтора 3,98 по шкале Полинга — наибольшее значение среди всех элементов, и он сильнее всего притягивает связывающие электроны.',
      e3: 'Электрон 3s¹ натрия экранирован и находится далеко от ядра. Электроны 2p⁶ неона расположены ближе к ядру и удерживаются прочно, поэтому снять один из них требует намного больше энергии.',
    },
    ions: {
      title: 'Ионы и многоатомные ионы',
      summary:
        'Катионы, анионы и многоатомные ионы — как возникает заряд и что каждый из них делает в растворе.',
      q1: 'На сколько электронов у одноатомного иона с зарядом 2− больше, чем протонов?',
      q2: 'Какой из этих ионов является многоатомным?',
      q3: 'Какой заряд несёт оксид-ион?',
      e1: 'Отрицательный заряд означает, что ион принял электроны: 2− — это два лишних электрона.',
      e2: 'Сульфат-ион содержит четыре связанных между собой атома. Одноатомные ионы вроде Na⁺ и Cl⁻ состоят из одного атома.',
      e3: 'Кислород находится в группе 16, имеет шесть валентных электронов и принимает два, достигая октета, — образуется O²⁻.',
    },
    bonding: {
      title: 'Химическая связь',
      summary:
        'Ионная, ковалентная и металлическая связь и признаки, по которым их различают.',
      q1: 'NaCl лучше всего описать как…',
      q2: 'Металл вроде железа удерживается вместе за счёт…',
      q3: 'Сколько связей может образовать один атом углерода?',
      e1: 'Натрий отдаёт свой внешний электрон хлору, образуя Na⁺ и Cl⁻, которые удерживаются вместе электростатическим притяжением.',
      e2: 'Металлическая связь опирается на «море» делокализованных валентных электронов, общих для положительных ионов металла, — поэтому металлы проводят ток.',
      e3: 'У углерода четыре валентных электрона и четыре свободных места во втором слое, поэтому он образует четыре ковалентные связи — на этом стоит вся органическая химия.',
    },
  },

  fa: {
    readTheTable: {
      title: 'خواندن جدول تناوبی',
      summary:
        'دوره‌ها افقی و گروه‌ها عمودی پیش می‌روند. پیش از حفظ کردن حتی یک عدد، بفهمید هر محور چه چیزی را تعیین می‌کند.',
      q1: 'وقتی در یک دوره از چپ به راست حرکت می‌کنیم، چه چیزی افزایش می‌یابد؟',
      q2: 'عناصر یک گروه چه ویژگی مشترکی دارند؟',
      q3: 'لانتانیدها و اکتینیدها معمولاً در کجا رسم می‌شوند؟',
      e1: 'عدد اتمی در هر گام یک واحد زیاد می‌شود، چون یک پروتون اضافه می‌کنید. هر چیز دیگری (کوچک شدن شعاع و بالا رفتن الکترونگایی) از همین نتیجه می‌شود.',
      e2: 'یک گروه با شمار الکترون‌های ظرفیتی تعریف می‌شود؛ به همین دلیل فلزات قلیایی (1) و هالوژن‌ها (7) هر کدام رفتار مشابهی دارند.',
      e3: 'آن‌ها عناصر بلوک f هستند که برای خوانا ماندن ستون‌های 3 تا 12، به پایین جدول بیرون کشیده شده‌اند. آن‌ها همچنان به دوره‌های 6 و 7 تعلق دارند.',
    },
    atomicStructure: {
      title: 'ساختار اتم',
      summary: 'پروتون‌ها عنصر را تعیین می‌کنند، نوترون‌ها ایزوتوپ را می‌سازند و الکترون‌ها یون را. سه ذره، سه وظیفه.',
      q1: 'کدام ذره هویت عنصر را تعیین می‌کند؟',
      q2: 'دو اتم از یک عنصر با تعداد نوترون متفاوت چه نامیده می‌شوند…',
      q3: 'یک اتم سدیم که یک الکترون از دست بدهد چه می‌شود…',
      e1: 'با تغییر پروتون‌ها، عنصر کاملاً عوض می‌شود. با 25 پروتون، عنصر می‌شود منگنز و با 27 پروتون، کبالت.',
      e2: 'ایزوتوپ‌ها شمار پروتون یکسان دارند و در عدد جرمی تفاوت می‌کنند. کربن-12 و کربن-14 هر دو کربن‌اند؛ کربن-14 پرتو فعّ است.',
      e3: 'با از دست دادن یک الکترون، تعداد پروتون‌ها یکی بیشتر از الکترون‌ها می‌شود، پس بار +1 است. عنصر همچنان سدیم است.',
    },
    electronConfig: {
      title: 'آرایش الکترونی',
      summary:
        'زیرپوسته‌ها را به ترتیب انرژی پر کنید، سپس آرایش را دوباره بخوانید. اصل آوفباو، قاعده هوند و نگارش کوتاه گازهای نجیب.',
      q1: 'اصل آوفباو زیرپوسته‌ها را به چه ترتیبی پر می‌کند؟',
      q2: 'در یک زیرپوسته p چند الکترون جا می‌شود؟',
      q3: 'نگارش کوتاه [Ar] به چه معناست؟',
      e1: 'زیرپوسته‌ها با افزایش n + l پر می‌شوند، بنابراین 4s (n+l = 4) پیش از 3d (n+l = 5) می‌آید. به همین دلیل پتاسیم را [Ar] 4s¹ می‌نویسند، نه [Ar] 3d¹.',
      e2: 'هر زیرپوسته 2(2ℓ+1) الکترون جای می‌دهد: s دو الکترون، p شش، d ده و f چهارده.',
      e3: 'نگارش کوتاه، آرایش کامل یک گاز نجیب را جایگزین می‌کند. [Ar] 3d⁶ 4s² آهن است: 18 + 6 + 2 = 26 الکترون.',
    },
    trends: {
      title: 'روندهای تناوبی',
      summary:
        'شعاع، الکترونگایی و انرژی یونش همگی از یک چیز پیروی می‌کنند: اینکه هسته الکترون‌های خود را چقدر محکم نگه می‌دارد.',
      q1: 'شعاع اتمی به‌طور کلی…',
      q2: 'کدام عنصر بالاترین الکترونگایی را دارد؟',
      q3: 'چرا انرژی یونش نخست سدیم بسیار کمتر از نئون است؟',
      e1: 'در یک گروه به سمت پایین پوسته‌های بیشتری اضافه می‌شود و اتم از نظر فیزیکی بزرگ‌تر می‌شود. در طول یک دوره، افزایش بار هسته همان پوسته را به درون می‌کشد.',
      e2: 'فلور روی مقیاس پائولینگ 3.98 است — بالاترین مقدار در میان همه عناصر — و بیش از همه الکترون‌های پیوندی را جذب می‌کند.',
      e3: 'الکترون 3s¹ سدیم پاشیده و دور از هسته است. الکترون‌های 2p⁶ نئون نزدیک هسته و محکم نگه داشته شده‌اند، پس کندن یکی از آن‌ها انرژی بسیار بیشتری می‌طلبد.',
    },
    ions: {
      title: 'یون‌ها و یون‌های چنداتمی',
      summary:
        'کاتیون‌ها، آنیون‌ها و یون‌های چنداتمی — بار چگونه پدید می‌آید و هر یک در محلول چه می‌کند.',
      q1: 'یک یون تک‌اتمی با بار 2− چند الکترون بیشتر از پروتون دارد؟',
      q2: 'کدام‌یک از این‌ها یون چنداتمی است؟',
      q3: 'یون اکسید چه باری دارد؟',
      e1: 'بار منفی یعنی یون الکترون گرفته است — 2− یعنی دو الکترون اضافه.',
      e2: 'یون سولفات چهار اتم دارد که با هم پیوند خورده‌اند. یون‌های تک‌اتمی مانند Na⁺ و Cl⁻ هر کدام فقط یک اتم‌اند.',
      e3: 'اکسیژن در گروه 16 شش الکترون ظرفیتی دارد و با گرفتن دو الکترون به ساختار هشت‌تایی می‌رسد و O²⁻ می‌سازد.',
    },
    bonding: {
      title: 'پیوند شیمیایی',
      summary: 'پیوند یونی، کووالنتی و فلزی، و شواهدی که آن‌ها را از هم تشخیص می‌دهد.',
      q1: 'NaCl بهتر است چگونه توصیف شود…',
      q2: 'فلزی مانند آهن با چه چیزی کنار هم نگه داشته می‌شود…',
      q3: 'یک اتم کربن چند پیوند می‌تواند تشکیل دهد؟',
      e1: 'سدیم الکترون بیرونی خود را به کلر می‌دهد و Na⁺ و Cl⁻ به وجود می‌آیند که با جاذبه الکترواستاتیک کنار هم نگه داشته می‌شوند.',
      e2: 'پیوند فلزی از دریایی از الکترون‌های ظرفیتی نامتمرکز بهره می‌گیرد که میان یون‌های مثبت فلز مشترک‌اند؛ به همین دلیل فلزها رسانا هستند.',
      e3: 'کربن چهار الکترون ظرفیتی و چهار جای خالی در پوسته دوم دارد، پس چهار پیوند کووالنتی تشکیل می‌دهد — که کل شیمی آلی بر آن بنا شده است.',
    },
  },

  ur: {
    readTheTable: {
      title: 'دوری وار جدول پڑھنا',
      summary:
        'دور افقی میں بڑھتے ہیں اور گروپ عمودی میں۔ کوئی بھی عدد یاد کرنے سے پہلے جان لیں کہ ہر محور کیا کنٹرول کرتا ہے۔',
      q1: 'ایک دور میں بائیں سے دائیں جاتے ہوئے کیا بڑھتا ہے؟',
      q2: 'ایک ہی گروپ کے عناصر میں کون سی خصوصیت مشترک ہے؟',
      q3: 'لینتھانائیڈ اور ایکٹینائیڈ عام طور پر کہاں بنائے جاتے ہیں؟',
      e1: 'ہر قدم پر ایٹمی نمبر ایک بڑھتا ہے کیونکہ آپ ایک پروٹون شامل کر رہے ہیں۔ باقی سب کچھ (شعاع کا کم ہونا اور الیکٹرو نفیتیت کا بڑھنا) اسی سے نکلتا ہے۔',
      e2: 'گروپ کی تعریف ولنس الیکٹرانوں کی تعداد سے ہوتی ہے، اسی لیے الکالنی دھاتیں (1) اور ہیلوجن (7) دونوں اپنے اپنے گروپ میں ایک جیسی رفتار کرتے ہیں۔',
      e3: 'یہ f بلاک کے عناصر ہیں، جنہیں 3–12 کے کالمز پڑھنے میں آسانی کے لیے جدول کے نیچے نکال دیا جاتا ہے۔ یہ پھر بھی 6 اور 7 کے دوروں سے تعلق رکھتے ہیں۔',
    },
    atomicStructure: {
      title: 'ایٹمی ڈھانچہ',
      summary: 'پروٹون عنصر طے کرتے ہیں، نیوٹرون ایزوتوپ بناتے ہیں اور الیکٹران آئن۔ تین ذرات، تین کام۔',
      q1: 'کون سی ذرہ عنصر کی شناخت طے کرتی ہے؟',
      q2: 'ایک ہی عنصر کے وہ دو ایٹم جن میں نیوٹران کی تعداد مختلف ہو، کیا کہلاتے ہیں…',
      q3: 'ایک الیکٹران کھو دینے والا سوڈیم کا ایٹم کیا بن جاتا ہے…',
      e1: 'پروٹون بدل دیں تو عنصر بالکل بدل جاتا ہے۔ 25 پروٹون والا مادہ منگنیز ہے، اور 27 پروٹون والا کوبولٹ۔',
      e2: 'ایزوتوپس کے پروٹون برابر ہوتے ہیں اور ماس نمبر متفاوت۔ کاربون-12 اور کاربون-14 دونوں کاربون ہیں؛ کاربون-14 ریڈیو ایکٹو ہے۔',
      e3: 'الیکٹران کھوئیں تو پروٹون الیکٹران سے ایک زیادہ رہ جاتا ہے، اس لیے بار +1 ہو جاتا ہے۔ عنصر پھر بھی سوڈیم ہی رہتا ہے۔',
    },
    electronConfig: {
      title: 'الیکٹران ترتیب',
      summary:
        'سب شیلز کو انرجی کے ترتیب سے بھریں، پھر ترتیب کو واپس پڑھ لیں۔ آوفباؤ کا اصول، ہنڈ کا اصول اور نوبیل گیس کا مختصر طریقہ۔',
      q1: 'آوفباؤ کا اصول سب شیلز کو کس ترتیب سے بھرتا ہے؟',
      q2: 'ایک p سب شیل میں کتنے الیکٹران آ جاتے ہیں؟',
      q3: 'مختصر لکھت [Ar] کا کیا مطلب ہے؟',
      e1: 'سب شیلز بڑھتے n + l کے ترتیب سے بھرتے ہیں، اس لیے 4s (n+l = 4) 3d (n+l = 5) سے پہلے آتا ہے۔ اسی وجہ سے پوٹاشیم کو [Ar] 4s¹ لکھا جاتا ہے، [Ar] 3d¹ نہیں۔',
      e2: 'ہر سب شیل میں 2(2ℓ+1) الیکٹران آ سکتے ہیں: s میں 2، p میں 6، d میں 10 اور f میں 14۔',
      e3: 'نوبیل گیس کا مختصر طریقہ کسی نوبیل گیس کی مکمل ترتیب کی جگہ لیتا ہے۔ [Ar] 3d⁶ 4s² لوہا ہے: 18 + 6 + 2 = 26 الیکٹران۔',
    },
    trends: {
      title: 'دوری وار رجحانات',
      summary:
        'شعاع، الیکٹرو نفیتیت اور آئنائزیشن انرجی سب ایک ہی چیز سے نکلتے ہیں: مرکزہ اپنے الیکٹرانوں کو کتنی سختی سے پکڑے رکھتا ہے۔',
      q1: 'ایٹمی شعاع عموم طور پر…',
      q2: 'کس عنصر کی الیکٹرو نفیتیت سب سے زیادہ ہے؟',
      q3: 'سوڈیم کی پہلی آئنائزیشن انرجی نیون کی نسبت کیوں بہت کم ہے؟',
      e1: 'گروپ میں نیچے جاتے ہوئے شیل شامل ہوتی جاتی ہیں، اس لیے ایٹم واقعی بڑھ جاتا ہے۔ ایک دور میں بائیں سے دائیں بڑھتا ہوا بستہ کا بوجھ اُسی شیل کو اندر کی طرف کھینچتا ہے۔',
      e2: 'فلورین پولنگ پیمانے پر 3.98 ہے — تمام عناصر میں سب سے بلند — اور یہ پیوندی الیکٹرانوں کو سب سے زیادہ کھینچتا ہے۔',
      e3: 'سوڈیم کا 3s¹ الیکٹران اسکرین شدہ اور مرکزہ سے دور ہے۔ نیون کے 2p⁶ قریب اور مضبوطی سے جمے ہوئے ہیں، اس لیے ایک نکالنے میں کہیں زیادہ انرجی لگتی ہے۔',
    },
    ions: {
      title: 'آئن اور کئی ذرّوں والے آئن',
      summary:
        'کیٹیون، این آئن اور کئی ذرّوں والے آئن — بار کیسے پیدا ہوتا ہے اور ہر ایک محلول میں کیا کرتا ہے۔',
      q1: '2− بار والے ایک ذرّہ والے آئن میں پروٹانوں سے کتنے زیادہ الیکٹران ہوتے ہیں؟',
      q2: 'ان میں سے کون سا آئن کئی ذرّوں والا ہے؟',
      q3: 'آکسائیڈ آئن پر کیا بار ہوتا ہے؟',
      e1: 'منفی بار کا مطلب ہے کہ آئن نے الیکٹران حاصل کر لیے ہیں — 2− کا مطلب دو اضافی الیکٹران۔',
      e2: 'سلیٹ آئن میں پیوندہ چار ایٹم ہوتے ہیں۔ Na⁺ اور Cl⁻ جیسے ایک ذرّہ والے آئن ہر ایک صرف ایک ایٹم کے برابر ہوتے ہیں۔',
      e3: 'آکسیجن گروپ 16 میں ہے جس میں چھ ولنس الیکٹران ہیں اور آکتیلاٹر بنانے کے لیے دو حاصل کرتا ہے، جس سے O²⁻ بنتا ہے۔',
    },
    bonding: {
      title: 'کیمیائی پیوند',
      summary: 'آئنی، کوولینٹ اور دھاتی پیوند، اور اُنہیں الگ کرنے والے شواهد۔',
      q1: 'NaCl کو بہترین کیسے بیان کیا جا سکتا ہے…',
      q2: 'لوہا جیسی دھات کو کیا ساتھ رکھے ہوئے ہے…',
      q3: 'ایک کاربان ایٹم کتنے پیوند بنا سکتا ہے؟',
      e1: 'سوڈیم اپنا بیرونی الیکٹران کلورین کو دے دیتا ہے، جس سے Na⁺ اور Cl⁻ بنتے ہیں جو الیکٹروسٹیٹک کشش سے ساتھ رہتے ہیں۔',
      e2: 'دھاتی پیوند میں مثبت دھاتی آئنز مل کر غیر مقید الیکٹرانوں کا سمندر استعمال کرتے ہیں، اسی لیے دھاتیں بجلی چلاتی ہیں۔',
      e3: 'کاربان کے چار ولنس الیکٹران ہیں اور دوسری شیل میں چار خالی جگہیں، اس لیے وہ چار کوولینٹ پیوند بناتا ہے — پوری کاربنکیمی اسی پر کھڑی ہے۔',
    },
  },

  tl: {
    readTheTable: {
      title: 'Pagbasa ng Periodic Table',
      summary:
        'Horizontally tumatakbo ang mga panahon, patay naman ang mga pangkat. Alamin muna kung ano ang hinahawakan ng bawat axis bago mag-memorize ng kahit isang numero.',
      q1: 'Ano ang lumalaki habang kumakaliwa sa kanan sa loob ng isang panahon?',
      q2: 'Anong katangian ang katulduan ng mga elemento sa iisang pangkat?',
      q3: 'Saan karaniwang iginuguhit ang mga lantanide at aktinide?',
      e1: 'Umaabot sa isang baitang ang atomic number dahil nagdaragdag ka ng isang proton. Ang lahat ng iba ay nagmumula dito (lumiliit ang radius, tumataas ang elektronegatibidad).',
      e2: 'Ang pangkat ay tinutukoy ng bilang ng elektrong walor, kaya pareho ang pag-uugali ng mga alkali metal (1) at ng mga halogen (7).',
      e3: 'Bahagi sila ng f-block, inilabas sa ibaba ng talahanayan para manatiling madaling basahin ang 3–12 na hanay. Nananatili pa rin sa ika-6 at ika-7 na panahon.',
    },
    atomicStructure: {
      title: 'Estruktura ng Atom',
      summary:
        'Ang proton ang nagpapasiya kung aling elemento ito, ang neutron ang gumagawa ng isotopo, ang elektron ang gumagawa ng ion. Tatlong partikulo, tatlong gawain.',
      q1: 'Aling partikulo ang nagpapasiya sa pagkakakilanlan ng isang elemento?',
      q2: 'Paano tawag sa dalawang atom ng iisang elemento na magkaiba ang bilang ng neutron?',
      q3: 'Ano ang nagiging isang atom ng sodium kapag nawalan ito ng isang elektron?',
      e1: 'Kapag binago mo ang proton, binabago mo ang elemento nang buo. Ang may 25 proton ay manganese; ang may 27 proton ay cobalt.',
      e2: 'Pareho ang bilang ng proton ng mga isotopo at magkaiba ang mass number. Carbon-12 at carbon-14, parehong carbon; radioactive ang carbon-14.',
      e3: 'Kapag nawalan ng elektron, may isang proton na sobra sa elektron kaya +1 ang charge. Elemento pa rin ang sodium.',
    },
    electronConfig: {
      title: 'Kasaayos ng Elektron',
      summary:
        'Punan ang mga sub-shell ayon sa pagkakasunod ng enerhiya, pagkatapos basahin muli ang kasaayos. Ang Aufbau, ang Hund at ang shorthand ng noble gas.',
      q1: 'Anong pagkakasunod ang ginagamit ng prinsipyo ng Aufbau sa pagpupunan ng sub-shell?',
      q2: 'Ilang elektron ang kasya sa isang p sub-shell?',
      q3: 'Ano ang ibig sabihin ng shorthand na [Ar]?',
      e1: 'Sumusunod ang pagpupunan ng sub-shell sa pagtaas ng n + l, kaya 4s (n+l = 4) ang nauuna sa 3d (n+l = 5). Iyan ang dahilan kung bakit [Ar] 4s¹ ang potassium, hindi [Ar] 3d¹.',
      e2: 'Ang bawat sub-shell ay may 2(2ℓ+1) elektron: ang s ay may 2, ang p ay 6, ang d ay 10, at ang f ay 14.',
      e3: 'Ang shorthand ng noble gas ay pinapalitan ang buong kasaayos ng isang noble gas. Ang [Ar] 3d⁶ 4s² ay iron: 18 + 6 + 2 = 26 elektron.',
    },
    trends: {
      title: 'Mga Kalakaran ng Tabla Periodiko',
      summary:
        'Ang radius, elektronegatibidad at enerhiya ng ionisasyon ay lahat nagmumula sa iisang bagay: gaano kagalit hawak ng nucleus ang kanyang elektron.',
      q1: 'Ang atomic radius ay sa pangkalahatang…',
      q2: 'Aling elemento ang may pinakamataas na elektronegatibidad?',
      q3: 'Bakit napakalow ng unang enerhiya ng ionisasyon ng sodium kaysa ng neon?',
      e1: 'Papunta sa ibaba ng isang pangkat, dumadagdag ang mga shell kaya mas malaki mismo ang atom. Papunta sa isang panahon, ang lumalaking positibong singkek ng nukleo ay humihila ng parehong shell sa loob.',
      e2: 'Ang fluorine ay 3.98 sa Pauling scale — ang pinakamataas sa lahat ng elemento — at ito ang pinakamahina sa paghila ng bonding elektron.',
      e3: 'Ang 3s¹ elektron ng sodium ay screened at malayo sa nucleus. Ang 2p⁶ ng neon ay malapit at mahigpit na hawak, kaya ang pag-aalis ng isa ay humihingi ng malaking enerhiya.',
    },
    ions: {
      title: 'Mga Ion at Polyatomikong Ion',
      summary:
        'Kation, anion at polyatomikong ion — kung paano nagkakaroon ng charge at kung ano ang ginagawa ng bawat isa sa solusyon.',
      q1: 'Ilang elektron ang labis sa proton ang isang monoatomikong ion na may 2− na charge?',
      q2: 'Alin sa mga ito ang polyatomikong ion?',
      q3: 'Anong charge ang dala ng isang oxide ion?',
      e1: 'Ang negatibong charge ay nangangahulugang nakakuha ng elektron ang ion — ang 2− ay dalawang dagdag na elektron.',
      e2: 'Apat na atom ang nakatali sa sulfate. Ang mga monoatomikong ion tulad ng Na⁺ at Cl⁻ ay iisang atom lang bawat isa.',
      e3: 'Nasa 16 na pangkat ang oxygen, may anim na elektrong walor, at kinakakuha nito ang dalawa para makamit ng octet, kaya nagiging O²⁻.',
    },
    bonding: {
      title: 'Kemikal na Bond',
      summary:
        'Ang ionic, covalent at metallic na bond, at ang ebidensiya na nagtatala sa kanilang pagkakaiba.',
      q1: 'Ang NaCl ay pinakamahusay na inilalarawan bilang…',
      q2: 'Ang metal na gaya ng iron ay pinagsasama ng…',
      q3: 'Ilang bond ang magagawa ng iisang atom ng carbon?',
      e1: 'Inililipat ng sodium ang pinakalabaw nitong elektron sa chlorine, na nagbubuo ng Na⁺ at Cl⁻ na magkatabi dahil sa electrostatic attraction.',
      e2: 'Ang metallic bond ay gumagamit ng dagat ng mga delokalisdong elektrong walor na ibinabahagi ng mga positibong ion ng metal, kaya nakakapagdala ng kuryente ang mga metal.',
      e3:
        'May apat na elektrong walor ang carbon at apat na bakante sa ikalawang shell, kaya gumagawa ito ng apat na covalent bond — dito nakasalalay ang buong organong kemistri.',
    },
  },

  es: {
    readTheTable: {
      title: 'Leer la tabla periódica',
      summary:
        'Los periodos se extienden en horizontal y los grupos en vertical. Aprende qué controla cada eje antes de memorizar un solo número.',
      q1: '¿Qué aumenta al desplazarnos de izquierda a derecha a lo largo de un periodo?',
      q2: '¿Qué propiedad comparten los elementos de un mismo grupo?',
      q3: '¿Dónde se suelen dibujar los lantánidos y los actínidos?',
      e1: 'El número atómico aumenta en uno en cada paso porque añades un protón. Todo lo demás (el radio disminuye, la electronegatividad aumenta) se deduce de ahí.',
      e2: 'Un grupo se define por el número de electrones de valencia, por eso los metales alcalinos (1) y los halógenos (7) se comportan de forma parecida.',
      e3: 'Son los elementos del bloque f, que se sacan debajo de la tabla para que las columnas 3–12 sigan siendo legibles. Siguen perteneciendo a los periodos 6 y 7.',
    },
    atomicStructure: {
      title: 'Estructura atómica',
      summary:
        'Los protones deciden el elemento, los neutrones hacen el isótopo y los electrones hacen el ion. Tres partículas, tres funciones.',
      q1: '¿Qué partícula determina la identidad de un elemento?',
      q2: '¿Cómo se llaman dos átomos del mismo elemento con distinto número de neutrones?',
      q3: 'Un átomo de sodio que pierde un electrón se convierte en…',
      e1: 'Si cambias los protones, cambias el elemento por completo. Con 25 protones es manganeso; con 27, cobalto.',
      e2: 'Los isótopos comparten el número de protones y se diferencian en el número másico. El carbono-12 y el carbono-14 son ambos carbono; el carbono-14 es radiactivo.',
      e3: 'Al perder un electrón queda un protón más que electrones, así que la carga es +1. El elemento sigue siendo sodio.',
    },
    electronConfig: {
      title: 'Configuración electrónica',
      summary:
        'Llena las subniveles en orden de energía y después vuelve a leer la configuración. Aufbau, Hund y la forma abreviada de los gases nobles.',
      q1: '¿En qué orden el principio de Aufbau llena las subniveles?',
      q2: '¿Cuántos electrones caben en una sola subnivel p?',
      q3: '¿Qué significa la forma abreviada [Ar]?',
      e1: 'Las subniveles se llenan según aumenta n + l, así que 4s (n+l = 4) va antes que 3d (n+l = 5). Por eso el potasio se escribe [Ar] 4s¹ y no [Ar] 3d¹.',
      e2: 'Cada subnivel aloja 2(2ℓ+1) electrones: s aloja 2, p 6, d 10 y f 14.',
      e3: 'La forma abreviada sustituye la configuración completa de un gas noble. [Ar] 3d⁶ 4s² es el hierro: 18 + 6 + 2 = 26 electrones.',
    },
    trends: {
      title: 'Tendencias periódicas',
      summary:
        'El radio, la electronegatividad y la energía de ionización dependen de una sola cosa: cómo de fuerte sujeta el núcleo a sus electrones.',
      q1: 'El radio atómico, en general…',
      q2: '¿Qué elemento tiene la electronegatividad más alta?',
      q3: '¿Por qué la primera energía de ionización del sodio es mucho menor que la del neón?',
      e1: 'Al bajar por un grupo se añaden capas, así que el átomo es físicamente mayor. A lo largo de un periodo, la carga nuclear creciente tira de la misma capa hacia dentro.',
      e2: 'El flúor vale 3,98 en la escala de Pauling, el valor más alto de todos los elementos, y atrae con más fuerza a los electrones de enlace.',
      e3: 'El electrón 3s¹ del sodio está apantallado y lejos del núcleo. Los 2p⁶ del neón están cerca y muy retenidos, así que arrancar uno cuesta mucha más energía.',
    },
    ions: {
      title: 'Iones y iones poliatómicos',
      summary:
        'Cationes, aniones e iones poliatómicos: de dónde vienen las cargas y qué hace cada uno en disolución.',
      q1: 'Un ion monoatómico con carga 2−, ¿cuántos electrones tiene más que protones?',
      q2: '¿Cuál de estos es un ion poliatómico?',
      q3: '¿Qué carga lleva un ion óxido?',
      e1: 'Una carga negativa significa que el ion ha ganado electrones: 2− son dos electrones de más.',
      e2: 'El sulfato reúne cuatro átomos unidos entre sí. Iones monoatómicos como Na⁺ y Cl⁻ son un solo átomo cada uno.',
      e3: 'El oxígeno está en el grupo 16 con seis electrones de valencia y gana dos para llegar al octeto, dando O²⁻.',
    },
    bonding: {
      title: 'Enlace químico',
      summary: 'Enlace iónico, covalente y metálico, y la evidencia que permite distinguirlos.',
      q1: 'El NaCl se describe mejor como…',
      q2: 'Un metal como el hierro se mantiene unido por…',
      q3: '¿Cuántos enlaces puede formar un solo átomo de carbono?',
      e1: 'El sodio cede su electrón externo al cloro y produce Na⁺ y Cl⁻, que se mantienen unidos por la atracción electrostática.',
      e2: 'El enlace metálico usa un mar de electrones de valencia deslocalizados compartidos por los iones metálicos positivos, y por eso los metales conducen la corriente.',
      e3: 'El carbono tiene cuatro electrones de valencia y cuatro huecos en su segunda capa, así que forma cuatro enlaces covalentes: de eso depende toda la química orgánica.',
    },
  },

  vi: {
    readTheTable: {
      title: 'Đọc bảng tuần hoàn',
      summary:
        'Chu kỳ chạy ngang, nhóm chạy dọc. Hãy hiểu mỗi trục điều khiển cái gì trước khi học thuộc bất kỳ con số nào.',
      q1: 'Khi đi từ trái sang phải trong một chu kỳ, cái gì tăng lên?',
      q2: 'Các nguyên tố cùng nhóm chia sẻ đặc tính nào?',
      q3: 'Lanthanide và actinide thường được vẽ ở đâu?',
      e1: 'Số hiệu nguyên tử tăng mỗi bước một đơn vị vì bạn thêm một proton. Mọi thứ khác (bán kính nhỏ lại, độ âm điện tăng lên) đều suy ra từ đó.',
      e2: 'Một nhóm được định nghĩa bởi số electron hóa trị, vì vậy kim loại kiềm (1) và halogen (7) có hành vi tương tự nhau.',
      e3: 'Chúng là các nguyên tố khối f, được kéo ra dưới bảng để các cột 3–12 còn dễ đọc. Chúng vẫn thuộc về chu kỳ 6 và 7.',
    },
    atomicStructure: {
      title: 'Cấu tạo nguyên tử',
      summary:
        'Proton quyết định nguyên tố, neutron tạo thành đồng vị, electron tạo thành ion. Ba hạt tiểu phân tử, ba nhiệm vụ.',
      q1: 'Hạt nào quyết định bản chất của một nguyên tố?',
      q2: 'Hai nguyên tử cùng một nguyên tố nhưng khác số neutron được gọi là…',
      q3: 'Một nguyên tử natri mất đi một electron sẽ trở thành…',
      e1: 'Đổi proton là đổi hoàn toàn nguyên tố. Nguyên tố có 25 proton là mangan, có 27 proton là cobalt.',
      e2: 'Các đồng vị có cùng số proton và khác số khối. Carbon-12 và carbon-14 đều là cacbon; carbon-14 phóng xạ.',
      e3: 'Mất một electron thì số proton nhiều hơn số electron một, nên điện tích là +1. Nguyên tố vẫn là natri.',
    },
    electronConfig: {
      title: 'Cấu hình electron',
      summary:
        'Điền các phân lớp con theo thứ tự năng lượng, rồi đọc lại cấu hình. Nguyên lý Aufbau, quy tắc Hund và cách viết tắt bằng khí hiếm.',
      q1: 'Nguyên lý Aufbau điền các phân lớp con theo thứ tự nào?',
      q2: 'Một phân lớp con p chứa được bao nhiêu electron?',
      q3: 'Ký hiệu [Ar] có nghĩa là gì?',
      e1: 'Các phân lớp con được điền theo n + l tăng dần, nên 4s (n+l = 4) đến trước 3d (n+l = 5). Đó là lý do kali được viết là [Ar] 4s¹ chứ không phải [Ar] 3d¹.',
      e2: 'Mỗi phân lớp con chứa 2(2ℓ+1) electron: s chứa 2, p chứa 6, d chứa 10, f chứa 14.',
      e3: 'Cách viết tắt bằng khí hiếm thay thế toàn bộ cấu hình của một khí hiếm. [Ar] 3d⁶ 4s² là sắt: 18 + 6 + 2 = 26 electron.',
    },
    trends: {
      title: 'Xu hướng tuần hoàn',
      summary:
        'Bán kính, độ âm điện và năng lượng ion hóa đều bắt nguồn từ một điều: hạt nhân giữ electron chặt đến nhường nào.',
      q1: 'Bán kính nguyên tử, nói chung…',
      q2: 'Nguyên tố nào có độ âm điện cao nhất?',
      q3: 'Vì sao năng lượng ion hóa thứ nhất của natri thấp hơn nhiều so với neon?',
      e1: 'Đi xuống một nhóm là thêm vỏ, nên nguyên tử lớn hơn về mặt vật lý. Đi dọc một chu kỳ, điện tích hạt nhân tăng kéo cùng vỏ đó vào trong.',
      e2: 'Flo có 3,98 trên thang Pauling — cao nhất trong mọi nguyên tố — và nó hút các electron tạo liên kết mạnh nhất.',
      e3: 'Electron 3s¹ của natri bị che chắn và nằm xa hạt nhân. Các 2p⁶ của neon nằm gần hạt nhân và bị giữ chặt, nên gỡ bỏ một cái tốn nhiều năng lượng hơn.',
    },
    ions: {
      title: 'Ion và ion đa nguyên tử',
      summary:
        'Cation, anion và ion đa nguyên tử — điện tích sinh ra thế nào và mỗi loại làm gì trong dung dịch.',
      q1: 'Một ion đơn nguyên tử mang điện tích 2− có nhiều hơn proton bao nhiêu electron?',
      q2: 'Trong số này, cái nào là ion đa nguyên tử?',
      q3: 'Ion oxit mang điện tích gì?',
      e1: 'Điện tích âm nghĩa là ion đã nhận thêm electron — 2− là hai electron dư.',
      e2: 'Ion sulfat gồm bốn nguyên tử liên kết với nhau. Các ion đơn nguyên tử như Na⁺ và Cl⁻ chỉ có một nguyên tử mỗi cái.',
      e3: 'Oxi nằm ở nhóm 16 với sáu electron hóa trị và nhận thêm hai để đạt octet, tạo ra O²⁻.',
    },
    bonding: {
      title: 'Liên kết hóa học',
      summary:
        'Liên kết ion, liên kết cộng hóa trị và liên kết kim loại, cùng những bằng chứng để phân biệt chúng.',
      q1: 'NaCl được mô tả tốt nhất là…',
      q2: 'Một kim loại như sắt được giữ lại với nhau bởi…',
      q3: 'Một nguyên tử carbon có thể tạo bao nhiêu liên kết?',
      e1: 'Natri chuyển electron ngoài cùng của nó cho clo, tạo ra Na⁺ và Cl⁻ được giữ với nhau bởi lực hút tĩnh điện.',
      e2: 'Liên kết kim loại dùng biển electron hóa trị phi cục bộ được các ion kim loại dương chia sẻ, nhờ đó kim loại dẫn điện.',
      e3: 'Carbon có bốn electron hóa trị và bốn chỗ trống ở vỏ thứ hai, nên tạo bốn liên kết cộng hóa trị — toàn bộ hóa học hữu cơ dựa vào điều đó.',
    },
  },

  ja: {
    readTheTable: {
      title: '周期表の読み方',
      summary: '周期は横に、族は縦に並ぶ。どの数が何を制御しているかを理解してから、数字を覚えよう。',
      q1: '1つの周期を左から右へ進むとき、何が増えるか？',
      q2: '同じ族の元素はどの性質を共有するか？',
      q3: 'ランタノイドとアクチノイドはふつうどこに描かれるか？',
      e1: 'プロトンを1つ加えるたびに原子番号が1だけ増える。半径が小さくなる、電気陰性度が上がる、そのほかのすべてがここから導かれる。',
      e2: '族は価電子の数で定義されるので、アルカリ金属（1価）とハロゲン（7価）はそれぞれ似た性質を示す。',
      e3: 'これらはfブロックの元素で、第3〜12列を読みやすく保つために表の下に取り出してある。依然として第6周期と第7周期に属する。',
    },
    atomicStructure: {
      title: '原子の構造',
      summary: '元素を決めるのは陽子、同位素をつくるのは中性子、イオンをつくるのは電子。3つの粒子に3つの役割。',
      q1: '元素の種類を決める粒子はどれか？',
      q2: '同じ元素で中性子数が異なる2つの原子は何と呼ばれるか…',
      q3: '電子を1つ失ったナトリウム原子はどうなるか…',
      e1: '陽子を変えれば元素そのものが変わる。陽子が25個ならマンガン、27個ならコバルトである。',
      e2: '同位素は陽子数が同じで質量数が異なる。炭素-12と炭素-14はいずれも炭素で、炭素-14は放射性である。',
      e3: '電子を1つ失うと陽子が電子より1個多くなるので電荷は+1になる。元素は依然としてナトリウムである。',
    },
    electronConfig: {
      title: '電子配置',
      summary:
        '副殻をエネルギーの低い順に埋めてから配置を読み返す。構成原理、ハントの規則、希ガス元素の省略記法。',
      q1: '構成原理は副殻をどの順序で埋めるか？',
      q2: 'p副殻には何個の電子が入るか？',
      q3: '省略記法 [Ar] は何を意味するか？',
      e1: '副殻はn + lが小さい順に埋まるので、4s (n+l = 4) は 3d (n+l = 5) より先に埋まる。だからカリウムは [Ar] 3d¹ ではなく [Ar] 4s¹ と書く。',
      e2: '各副殻に入る電子数は2(2ℓ+1)で、sは2個、pは6個、dは10個、fは14個である。',
      e3: '希ガス元素の省略記法は、希ガス元素の完全な配置を置き換える。[Ar] 3d⁶ 4s² は鉄で、18 + 6 + 2 = 26個の電子になる。',
    },
    trends: {
      title: '周期性の傾向',
      summary:
        '原子半径、電気陰性度、イオン化エネルギーはすべて同一のことに由来する。原子核が電子をどれだけ強く引き寄せているかである。',
      q1: '原子半径は一般に…',
      q2: '電気陰性度が最も高い元素はどれか？',
      q3: 'なぜナトリウムの第一イオン化エネルギーはネオンのそれよりずっと低いのか？',
      e1: '族を下へ移ると電子殻が増えるので原子は物理的に大きくなる。周期を横に進むと核電荷が増し、同じ電子殻を内側へ引き寄せる。',
      e2: 'フッ素のPaulingスケール値は3.98で、すべての元素中で最大であり、成鍵電子を最も強く引き寄せる。',
      e3: 'ナトリウムの 3s¹ 電子は遮蔽されており原子核から遠い。ネオンの 2p⁶ 電子は原子核に近くしっかり保持されているため、1個取り除くにははるかに多くのエネルギーが必要になる。',
    },
    ions: {
      title: 'イオンと多原子イオン',
      summary: '陽イオン、陰イオン、多原子イオン——電荷はどこから生じ、各々は溶液中で何をするのか。',
      q1: '2−の電荷をもつ単原子イオンは、陽子より何個多くの電子をもつか？',
      q2: '次のうち多原子イオンはどれか？',
      q3: '酸化物イオンはどのような電荷をもつか？',
      e1: '負の電荷はイオンが電子を得たことを意味する。2−は余分な電子が2個あるということである。',
      e2: '硫酸イオンは結合した4個の原子からなる。Na⁺ や Cl⁻ のような単原子イオンはそれぞれ原子1個である。',
      e3: '酸素は第16族にあり価電子を6個もち、2個を得て八隅体になるのでO²⁻ となる。',
    },
    bonding: {
      title: '化学結合',
      summary: 'イオン結合、共有結合、金属結合、そしてそれらを見分ける手がかり。',
      q1: 'NaClは、次のように表すのがもっとも適切である——',
      q2: '鉄のような金属は、何によってまとめられているか——',
      q3: '炭素原子1個はいくつの結合をつくることができるか？',
      e1: 'ナトリウムは最外殻の電子を塩素に渡し、Na⁺ と Cl⁻ が生じるが、この二者は静電引力で結ばれている。',
      e2: '金属結合は、正の金属イオンが共有する非局在化した価電子の海を用いている。だから金属は電気を通す。',
      e3: '炭素は価電子を4個もち、第2殻に4個の空き席があるため4個の共有結合をつくる。有機化学のすべてがこれに基づいている。',
    },
  },

  ko: {
    readTheTable: {
      title: '주기율표 읽기',
      summary: '주기는 가로로, 족은 세로로 늘어납니다. 숫자를 외우기 전에 각 축이 무엇을 정하는지부터 아세요.',
      q1: '한 주기에서 왼쪽에서 오른쪽으로 이동할 때 무엇이 증가합니까?',
      q2: '같은 족의 원소들은 어떤 성질을 공유합니까?',
      q3: '란타나이드와 악티나이드는 보통 어디에 그립니까?',
      e1: '양성자를 하나 더할 때마다 원자번호가 1씩 증가합니다. 그 밖의 모든 것(원자 반지름이 작아지고 전기 음성도가 높아짐)은 여기서 따라옵니다.',
      e2: '족은 가전자 수로 정해지므로 알칼리 금속(1개)과 할로젠(7개)은 각각 비슷하게 행동합니다.',
      e3: '이들은 f 블록 원소로, 3~12족이 잘 읽히도록 표 아래로 따로 빼놓은 것입니다. 그래도 6주기와 7주기에 속합니다.',
    },
    atomicStructure: {
      title: '원자 구조',
      summary: '양성자가 원소를 정하고, 중성자가 동위원소를 만들며, 전자들이 이온을 만듭니다. 세 입자, 세 역할.',
      q1: '원소의 정체를 결정하는 입자는 무엇입니까?',
      q2: '중성자 수가 서로 다른 같은 원소의 두 원자를 무엇이라고 부릅니까?',
      q3: '전자 하나를 잃은 나트륨 원자는 어떻게 됩니까?',
      e1: '양성자를 바꾸면 원소가 통째로 달라집니다. 양성자가 25개면 망간, 27개면 코발트입니다.',
      e2: '동위원소는 양성자 수가 같고 질량수가 다릅니다. 탄소-12와 탄소-14는 모두 탄소이며, 탄소-14는 방사성입니다.',
      e3: '전자 하나를 잃으면 양성자가 전자보다 하나 많아지므로 전하는 +1이 됩니다. 원소는 여전히 나트륨입니다.',
    },
    electronConfig: {
      title: '전자 배치',
      summary:
        '부껍질을 에너지가 낮은 순서로 채운 다음 배치를 거꾸로 읽어 봅니다. 오프바우 원리, 훈트 규칙, 비활성 기체 축약 표기.',
      q1: '오프바우 원리는 부껍질을 어떤 순서로 채웁니까?',
      q2: 'p 부껍질 하나에는 몇 개의 전자가 들어갑니까?',
      q3: '축약 표기 [Ar]은 무엇을 뜻합니까?',
      e1: '부껍질은 n + l이 작은 순서로 채워지므로 4s (n+l = 4)가 3d (n+l = 5)보다 먼저 채워집니다. 그래서 칼륨은 [Ar] 3d¹이 아니라 [Ar] 4s¹로 씁니다.',
      e2: '각 부껍질에는 2(2ℓ+1)개의 전자가 들어갑니다. s는 2개, p는 6개, d는 10개, f는 14개입니다.',
      e3: '비활성 기체 축약 표기는 비활성 기체 한 원자의 완전한 배치를 대신합니다. [Ar] 3d⁶ 4s²는 철로, 18 + 6 + 2 = 26개의 전자입니다.',
    },
    trends: {
      title: '주기적 경향',
      summary:
        '원자 반지름, 전기 음성도, 이온화 에너지는 모두 같은 것에서 나옵니다. 원핵이 전자를 얼마나 세게 붙잡고 있느냐입니다.',
      q1: '원자 반지름은 일반적으로…',
      q2: '전기 음성도가 가장 높은 원소는 무엇입니까?',
      q3: '왜 나트륨의 제1 이온화 에너지는 네온의 것보다 훨씬 낮은 겁니까?',
      e1: '족을 따라 내려가면 껍질이 늘어나 원자가 실제로 커집니다. 주기를 따라 가로로 가면 핵전하가 커지면서 같은 껍질이 안쪽으로 끌려갑니다.',
      e2: '플루오린의 폴링 척도 값은 3.98로 모든 원소 중 가장 높고, 결합 전자를 가장 강하게 끌어당깁니다.',
      e3: '나트륨의 3s¹ 전자는 차폐되어 핵에서 멉니다. 네온의 2p⁶ 전자는 핵 가까이에서 단단히 붙잡혀 있어, 하나 떼어 내려면 훨씬 더 많은 에너지가 듭니다.',
    },
    ions: {
      title: '이온과 다가원자 이온',
      summary: '양이온, 음이온, 다가원자 이온 — 전하는 어떻게 생기고 각각 용액에서 무엇을 하는가.',
      q1: '2− 전하를 가진 단원자 이온은 양성자보다 전자가 몇 개 더 있습니까?',
      q2: '다음 가운데 다가원자 이온은 무엇입니까?',
      q3: '산화 이온은 어떤 전하를 갖습니까?',
      e1: '음의 전하는 이온이 전자를 얻었다는 뜻입니다. 2−는 전자가 두 개 더 있다는 뜻입니다.',
      e2: '황산 이온은 서로 결합한 네 원자로 이루어집니다. Na⁺나 Cl⁻ 같은 단원자 이온은 각각 한 원자뿐입니다.',
      e3: '산소는 16족에 속하며 가전자가 여섯 개이고, 두 개를 얻어 옥텟을 이루므로 O²⁻이 됩니다.',
    },
    bonding: {
      title: '화학 결합',
      summary: '이온 결합, 공유 결합, 금속 결합, 그리고 이들을 구별해 주는 증거.',
      q1: 'NaCl은 다음 중 어느 것으로 설명하는 것이 가장 좋습니까?',
      q2: '철 같은 금속은 무엇으로 서로 묶여 있습니까?',
      q3: '탄소 원자 하나는 몇 개의 결합을 만들 수 있습니까?',
      e1: '나트륨이 최외각 전자를 염소에 넘겨 Na⁺와 Cl⁻이 생기며, 이 둘은 정전기적 인력으로 함께 묶여 있습니다.',
      e2: '금속 결합은 양의 금속 이온들이 공유하는 비편재화된 가전자 바다를 쓰기 때문에 금속이 전기를 통합니다.',
      e3: '탄소는 가전자 네 개와 제2껍질의 빈자리 네 개를 가지고 있어 공유 결합 네 개를 만듭니다. 유기 화학 전체가 여기에 얹혀 있습니다.',
    },
  },

  ar: {
    readTheTable: {
      title: 'قراءة الجدول الدوري',
      summary: 'تمتد الدورات أفقيًا والمجموعات عموديًا. افهم ما الذي يتحكم فيه كل محور قبل أن تحفظ رقمًا واحدًا.',
      q1: 'ما الذي يزداد كلما انتقلت من اليسار إلى اليمين عبر دورة؟',
      q2: 'ما الخاصية التي تشترك فيها العناصر في المجموعة نفسها؟',
      q3: 'أين تُرسم عادةً اللانثانيدات والأكتينيدات؟',
      e1: 'يرتفع العدد الذري بمقدار واحد في كل خطوة لأنك تضيف بروتونًا واحدًا. وكل ما عدا ذلك (تصغر نصف القطر الذري، وترتفع السالبية الكهربية) ينبع من ذلك.',
      e2: 'تُعرَّف المجموعة بعدد إلكترونات التكافؤ، ولهذا يتشابه سلوك الفلزات القلوية (1) والهالوجينات (7) كلٌّ في صفه.',
      e3: 'هذه عناصر الكتلة f، وقد أُخرجت أسفل الجدول حتى تظل الأعمدة 3–12 مقروءة. وما زالت تنتمي إلى الدورتين 6 و7.',
    },
    atomicStructure: {
      title: 'تركيب الذرة',
      summary: 'البروتونات تحدد العنصر، والنيوترونات تصنع النظير، والإلكترونات تصنع الأيون. ثلاثة جسيمات، ثلاث مهمات.',
      q1: 'أي جسيم يحدّد هوية العنصر؟',
      q2: 'ذرّتان من العنصر نفسه تختلفان في عدد النيوترونات تُسمّيان…',
      q3: 'ذرة صوديوم تفقد إلكترونًا واحدًا تصبح…',
      e1: 'غيّر البروتونات تتغير العنصر تمامًا. العنصر بـ25 بروتونًا هو المنغنيز، وبـ27 بروتونًا هو الكوبالت.',
      e2: 'تتشارك النظائر في عدد البروتونات وتختلف في العدد الكتلي. الكربون-12 والكربون-14 كلاهما كربون، والكربون-14 مُشعّ.',
      e3: 'بفقدان إلكترون واحد يبقى عدد البروتونات أكبر من الإلكترونات بواحد، فتصبح الشحنة +1. والعنصر يبقى صوديوم.',
    },
    electronConfig: {
      title: 'التوزيع الإلكتروني',
      summary:
        'املأ الأفراغات الفرعية بترتيب الطاقة، ثم اقرأ التوزيع من جديد. مبدأ أوفباو، وقاعدة هوند، والاختصار بالغازات النبيلة.',
      q1: 'بترتيب أي يملأ مبدأ أوفباو الأفراغات الفرعية؟',
      q2: 'كم إلكترونًا يتسع في الفراغ الفرعي p الواحد؟',
      q3: 'ماذا يعني الاختصار [Ar]؟',
      e1: 'تُملأ الأفراغات الفرعية بزيادة n + l، لذلك يأتي 4s (n+l = 4) قبل 3d (n+l = 5). ولهذا تُكتب البوتاسيوم [Ar] 4s¹ لا [Ar] 3d¹.',
      e2: 'يتسع في كل فراغ فرعي عدد من الإلكترونات يساوي 2(2ℓ+1): يسع s عدد 2، وp عدد 6، وd عدد 10، وf عدد 14.',
      e3: 'اختصار الغاز النبيل يحل محل التوزيع الكامل لغاز نبيل. و[Ar] 3d⁶ 4s² هو الحديد: 18 + 6 + 2 = 26 إلكترونًا.',
    },
    trends: {
      title: 'الاتجاهات الدورية',
      summary:
        'نصف القطر الذري والسالبية الكهربية وطاقة التأين، جميعها تنبع من أمر واحد: مدى قوة النواة في حبس إلكتروناتها.',
      q1: 'نصف القطر الذري، على وجه العموم…',
      q2: 'أي عنصر أعظمه في السالبية الكهربية؟',
      q3: 'لماذا طاقة التأين الأولى للصوديوم أقل بكثير من تلك للنيون؟',
      e1: 'النزول في المجموعة يعني إضافة طبقات، فيصبح الذر فيزيائيًا أكبر. أما عبر الدورة فإن زيادة الشحنة النووية تشد الطبقة نفسها إلى الداخل.',
      e2: 'الفلور يساوي 3.98 على مقياس باولنغ، وهي أعلى قيمة بين كل العناصر، وهو أقواها في جذب إلكترونات الرابطة.',
      e3: 'إلكترون 3s¹ في الصوديوم محجوب وبعيد عن النواة. أما إلكترونات 2p⁶ في النيون فقريبة ومحتجزة بقوة، لذا إزالة واحدة منها تكلّف طاقة أكبر بكثير.',
    },
    ions: {
      title: 'الأيونات والأيونات متعددة الذرات',
      summary: 'الكاتيونات والأنيونات والأيونات متعددة الذرات — من أين يأتي الشحنة وماذا يفعل كل منها في المحلول.',
      q1: 'أيون أحادي الذرة شحنتُه 2−، كم إلكترونًا يزيد على البروتونات؟',
      q2: 'أي واحد من هذه أيون متعدد الذرات؟',
      q3: 'ما شحنة أيون الأكسيد؟',
      e1: 'الشحنة السالبة تعني أن الأيون اكتسب إلكترونات، و2− تعني إلكترونين إضافيين.',
      e2: 'يتكوّن أيون الكبريتات من أربع ذرات مرتبطة ببعضها. أما الأيونات أحادية الذرة مثل Na⁺ وCl⁻ فكل منها ذرة واحدة.',
      e3: 'الأكسجين في المجموعة 16 وله ستة إلكترونات تكافؤ، فيكتسب اثنين ليبلغ بنية الثمانية، فيعطي O²⁻.',
    },
    bonding: {
      title: 'الرابطة الكيميائية',
      summary: 'الرابطة الأيونية والتساهمية والمعدنية، والأدلة التي تميّز بينها.',
      q1: 'يُوصف NaCl على أفضل وجه بأنه…',
      q2: 'معدن مثل الحديد يتجمع معًا بواسطة…',
      q3: 'كم رابطة يستطيع ذرة كربون واحدة أن تشكّلها؟',
      e1: 'ينقل الصوديوم إلكترونه الخارجي إلى الكلور، فينتج Na⁺ وCl⁻ اللذان يجمعهما تجاذب كهربي ساكن.',
      e2: 'تعتمد الرابطة المعدنية على بحر من إلكترونات التكافؤ الموزَّعة التي تتشاركها أيونات المعدن الموجبة، ولهذا توصل المعادن التيار.',
      e3: 'للكربون أربعة إلكترونات تكافؤ وأربعة مواقع فارغة في طبقته الثانية، فيكوّن أربع روابط تساهمية، وكل الكيمياء العضوية تقوم عليها.',
    },
  },

  de: {
    readTheTable: {
      title: 'Das Periodensystem lesen',
      summary:
        'Perioden verlaufen quer, Gruppen laufen nach unten. Lerne zuerst, was jede Achse bestimmt, bevor du dir eine einzige Zahl einprägst.',
      q1: 'Was nimmt zu, wenn du innerhalb einer Periode von links nach rechts gehst?',
      q2: 'Welche Eigenschaft teilen sich Elemente derselben Gruppe?',
      q3: 'Wo werden Lanthanide und Actinide normalerweise gezeichnet?',
      e1: 'Die Ordnungszahl steigt mit jedem Schritt um eins, weil du ein Proton dazufügst. Alles Weitere (der Radius schrumpft, die Elektronegativität steigt) folgt daraus.',
      e2: 'Eine Gruppe ist über die Zahl der Valenzelektronen definiert, deshalb verhalten sich die Alkalimetalle (1) und die Halogene (7) jeweils ähnlich.',
      e3: 'Es sind die Elemente des f-Blocks, die man unter die Tabelle herauszieht, damit die Spalten 3–12 lesbar bleiben. Sie gehören weiterhin zu den Perioden 6 und 7.',
    },
    atomicStructure: {
      title: 'Aufbau der Atome',
      summary:
        'Protonen bestimmen das Element, Neutronen machen das Isotop, Elektronen machen das Ion. Drei Teilchen, drei Aufgaben.',
      q1: 'Welches Teilchen bestimmt die Identität eines Elements?',
      q2: 'Zwei Atome desselben Elements mit unterschiedlicher Neutronenzahl nennt man…',
      q3: 'Ein Natriumatom, das ein Elektron abgibt, wird zu…',
      e1: 'Änderst du die Protonen, änderst du das Element völlig. Mit 25 Protonen ist es Mangan, mit 27 Kobalt.',
      e2: 'Isotope haben dieselbe Protonenzahl und unterscheiden sich in der Massenzahl. Kohlenstoff-12 und Kohlenstoff-14 sind beide Kohlenstoff; Kohlenstoff-14 ist radioaktiv.',
      e3: 'Geht ein Elektron verloren, bleibt ein Proton mehr als Elektronen übrig, die Ladung ist also +1. Das Element bleibt Natrium.',
    },
    electronConfig: {
      title: 'Elektronenkonfiguration',
      summary:
        'Fülle die Unterschalen nach ihrer Energie, und lies die Konfiguration dann zurück. Aufbauprinzip, Hundsche Regel und Edelgasabkürzung.',
      q1: 'In welcher Reihenfolge füllt das Aufbauprinzip die Unterschalen?',
      q2: 'Wie viele Elektronen passen in eine einzelne p-Unterschale?',
      q3: 'Was bedeutet die Abkürzung [Ar]?',
      e1: 'Die Unterschalen füllen sich nach steigendem n + l, also kommt 4s (n+l = 4) vor 3d (n+l = 5). Deshalb schreibt man Kalium als [Ar] 4s¹ und nicht [Ar] 3d¹.',
      e2: 'Jede Unterschale fasst 2(2ℓ+1) Elektronen: s fasst 2, p 6, d 10 und f 14.',
      e3: 'Die Edelgasabkürzung ersetzt die vollständige Konfiguration eines Edelgases. [Ar] 3d⁶ 4s² ist Eisen: 18 + 6 + 2 = 26 Elektronen.',
    },
    trends: {
      title: 'Periodizität',
      summary:
        'Radius, Elektronegativität und Ionisierungsenergie folgen alle aus einem einzigen: wie fest der Kern seine Elektronen hält.',
      q1: 'Der Atomradius, im Allgemeinen…',
      q2: 'Welches Element hat die höchste Elektronegativität?',
      q3: 'Warum ist die erste Ionisierungsenergie von Natrium viel niedriger als die von Neon?',
      e1: 'Geht man eine Gruppe hinunter, kommen Schalen dazu, das Atom ist also räumlich größer. Geht man quer durch eine Periode, zieht die wachsende Kernladung dieselbe Schale nach innen.',
      e2: 'Fluor liegt auf der Pauling-Skala bei 3,98 — der höchste Wert aller Elemente — und zieht am stärksten an die Bindungselektronen.',
      e3: 'Das 3s¹-Elektron des Natriums ist abgeschirmt und weit vom Kern entfernt. Die 2p⁶ des Neons liegen dicht am Kern und sind fest gebunden, sodass die Entfernung eines viel mehr Energie kostet.',
    },
    ions: {
      title: 'Ionen und polyatomare Ionen',
      summary:
        'Kationen, Anionen und polyatomare Ionen — wie Ladungen entstehen und was jede davon in Lösung tut.',
      q1: 'Ein monoatomares Ion mit der Ladung 2− besitzt wie viele Elektronen mehr als Protonen?',
      q2: 'Welches dieser Ionen ist polyatomar?',
      q3: 'Welche Ladung trägt ein Oxidion?',
      e1: 'Eine negative Ladung heißt, dass das Ion Elektronen aufgenommen hat — 2− bedeutet zwei zusätzliche Elektronen.',
      e2: 'Das Sulfat-Ion enthält vier miteinander verbundene Atome. Monoatomare Ionen wie Na⁺ und Cl⁻ bestehen jeweils aus einem einzigen Atom.',
      e3: 'Sauerstoff steht in Gruppe 16, hat sechs Valenzelektronen und nimmt zwei auf, um ein Oktett zu erreichen; so entsteht O²⁻.',
    },
    bonding: {
      title: 'Chemische Bindung',
      summary:
        'Ionenbindung, Atombindung und Metallbindung — und die Befunde, die sie voneinander unterscheiden.',
      q1: 'NaCl lässt sich am besten beschreiben als…',
      q2: 'Ein Metall wie Eisen wird zusammengehalten durch…',
      q3: 'Wie viele Bindungen kann ein einzelnes Kohlenstoffatom bilden?',
      e1: 'Natrium gibt sein Außenelektron an Chlor ab und erzeugt Na⁺ und Cl⁻, die durch elektrostatische Anziehung zusammengehalten werden.',
      e2: 'Die Metallbindung beruht auf einem Meer delokalisierter Valenzelektronen, die von den positiven Metallionen geteilt werden — deshalb leiten Metalle.',
      e3: 'Kohlenstoff hat vier Valenzelektronen und vier Lücken in seiner zweiten Schale, bildet also vier Atombindungen — die gesamte organische Chemie hängt daran.',
    },
  },

  tr: {
    readTheTable: {
      title: 'Periyodik Tablo Nasıl Okunur',
      summary:
        'Periyotlar yatay, gruplar dikey ilerler. Tek bir sayıyı ezberlemeden önce her eksenin neyi belirlediğini öğren.',
      q1: 'Bir periyot boyunca soldan sağa giderken ne artar?',
      q2: 'Aynı gruptaki elementler hangi özelliği paylaşır?',
      q3: 'Lantanitler ve aktinitler genellikle nerede çizilir?',
      e1: 'Her adımda bir proton eklediğin için atom numarası birer artar. Geri kalan her şey (yarıçapın küçülmesi, elektronegatifliğin yükselmesi) bundan çıkar.',
      e2: 'Bir grup değerlik elektronu sayısıyla tanımlanır; bu yüzden alkali metaller (1) ve halojenler (7) birbirlerine benzer davranır.',
      e3: 'Bunlar f blok elementleridir; 3–12 sütunların okunabilir kalması için tablonun altına çekilirler. Yine de 6. ve 7. periyotlara aittirler.',
    },
    atomicStructure: {
      title: 'Atom Yapısı',
      summary: 'Protonlar elementi belirler, nötronlar izotopu oluşturur, elektronlar iyonu. Üç parçacık, üç görev.',
      q1: 'Bir elementin kimliğini hangi parçacık belirler?',
      q2: 'Aynı elementin farklı nötron sayılı iki atomuna ne denir?',
      q3: 'Bir elektron kaybeden sodyum atomu neye dönüşür?',
      e1: 'Protonları değiştirirsen element de tamamen değişir. 25 protonlu olan mangan, 27 protonlu olan kobalttır.',
      e2: 'İzotoplar proton sayısını paylaşır, kütle sayısında farklıdır. Karbon-12 ve karbon-14 ikisi de karbondur; karbon-14 radyoaktiftir.',
      e3: 'Bir elektron kaybedildiğinde elektronlardan bir fazla proton kalır, yük +1 olur. Element hâlâ sodyumdur.',
    },
    electronConfig: {
      title: 'Elektron Dizilimi',
      summary:
        'Alt kabukları enerji sırasına göre doldur, sonra dizilimi geri oku. Aufbau ilkesi, Hund kuralı ve asal gaz kısaltması.',
      q1: 'Aufbau ilkesi alt kabukları hangi sırayla doldurur?',
      q2: 'Tek bir p alt kabuğu kaç elektron alır?',
      q3: '[Ar] kısaltması ne anlama gelir?',
      e1: 'Alt kabuklar n + l arttıkça dolduğu için 4s (n+l = 4), 3d (n+l = 5) önce gelir. Bu yüzden potasyum [Ar] 3d¹ değil, [Ar] 4s¹ olarak yazılır.',
      e2: 'Her alt kabuk 2(2ℓ+1) elektron alır: s 2, p 6, d 10, f 14 elektron tutar.',
      e3: 'Asal gaz kısaltması, bir asal gazın tam diziliminin yerini alır. [Ar] 3d⁶ 4s² demir olur: 18 + 6 + 2 = 26 elektron.',
    },
    trends: {
      title: 'Periyodik Eğilimler',
      summary:
        'Yarıçap, elektronegatiflik ve iyonlaşma enerjisi tek bir şeyden doğar: çekirdeğin elektronlarını ne kadar sıkı tuttuğu.',
      q1: 'Atom yarıçapı genel olarak…',
      q2: 'Elektronegatifliği en yüksek element hangisidir?',
      q3: 'Sodyumun birinci iyonlaşma enerjisi neden neonunkinden çok daha düşüktür?',
      e1: 'Bir grupta aşağı indikçe kabuklar eklenir, yani atom fiziksel olarak büyür. Bir periyot boyunca artan çekirdek yükü aynı kabuğu içeri doğru çeker.',
      e2: 'Flor, Pauling ölçeğinde 3,98 ile tüm elementler arasında en yüksek değere sahiptir ve bağ elektronlarını en güçlü şekilde çeker.',
      e3: 'Sodyumun 3s¹ elektronu perdelidir ve çekirdekten uzaktır. Neonun 2p⁶ elektronları çekirdeğe yakın ve sıkı tutulur; birini koparmak çok daha fazla enerji harcar.',
    },
    ions: {
      title: 'İyonlar ve Çok Atomlu İyonlar',
      summary: 'Katyonlar, anyonlar ve çok atomlu iyonlar — yükler nasıl oluşur ve her biri çözeltide ne yapar.',
      q1: '2− yüklü tek atomlu bir iyon protonlarından kaç elektron fazladır?',
      q2: 'Bunlardan hangisi çok atomlu bir iyondur?',
      q3: 'Bir oksit iyonu hangi yükü taşır?',
      e1: 'Negatif yük, iyonun elektron kazandığı anlamına gelir; 2− iki fazla elektron demektir.',
      e2: 'Sülfat iyonu, birbirine bağlı dört atom içerir. Na⁺ ve Cl⁻ gibi tek atomlu iyonlar ise birer atomdan oluşur.',
      e3: 'Oksijen 16. gruptadır, altı değerlik elektronu vardır ve sekiz elektronlu düzene ulaşmak için ikisini alır; böylece O²⁻ oluşur.',
    },
    bonding: {
      title: 'Kimyasal Bağ',
      summary: 'İyonik, kovalent ve metalik bağlar ve onları birbirinden ayıran kanıtlar.',
      q1: 'NaCl en iyi şöyle tanımlanır…',
      q2: 'Fe gibi bir metali bir arada tutan şey…',
      q3: 'Tek bir karbon atomu kaç bağ kurabilir?',
      e1: 'Sodyum en dıştaki elektronunu klora verir ve elektrostatik çekimle bir arada duran Na⁺ ve Cl⁻ oluşur.',
      e2: 'Metalik bağ, pozitif metal iyonlarının paylaştığı delokalize değerlik elektronları denizine dayanır; bu yüzden metaller akım iletir.',
      e3: 'Karbonun dört değerlik elektronu ve ikinci kabuğunda dört boş yeri vardır, bu yüzden dört kovalent bağ kurar — organik kimyanın tamamı buna dayanır.',
    },
  },

  'pt-BR': {
    readTheTable: {
      title: 'Como ler a tabela periódica',
      summary:
        'Os períodos correm na horizontal, os grupos correm na vertical. Entenda o que cada eixo controla antes de decorar um único número.',
      q1: 'O que aumenta ao andar da esquerda para a direita ao longo de um período?',
      q2: 'Que propriedade os elementos de um mesmo grupo compartilham?',
      q3: 'Onde os lantanídeos e actinídeos costumam ser desenhados?',
      e1: 'O número atômico aumenta a cada passo porque você acrescenta um próton. Tudo o mais (o raio diminui, a eletronegatividade aumenta) decorre daí.',
      e2: 'Um grupo é definido pelo número de elétrons de valência, e é por isso que os metais alcalinos (1) e os halógenos (7) se comportam de forma semelhante.',
      e3: 'São os elementos do bloco f, puxados para baixo da tabela para que as colunas 3–12 continuem legíveis. Eles ainda pertencem aos períodos 6 e 7.',
    },
    atomicStructure: {
      title: 'Estrutura atômica',
      summary:
        'Os prótons decidem o elemento, os nêutrons formam o isótopo, os elétrons formam o íon. Três partículas, três funções.',
      q1: 'Qual partícula determina a identidade de um elemento?',
      q2: 'Dois átomos do mesmo elemento com números de nêutrons diferentes são chamados de…',
      q3: 'Um átomo de sódio que perde um elétron se torna…',
      e1: 'Mude os prótons e você muda o elemento por completo. Com 25 prótons ele é manganês; com 27, cobalto.',
      e2: 'Os isótopos compartilham o número de prótons e diferem no número de massa. Carbono-12 e carbono-14 são ambos carbono; carbono-14 é radioativo.',
      e3: 'Perdendo um elétron sobra um próton a mais que elétrons, então a carga é +1. O elemento continua sendo sódio.',
    },
    electronConfig: {
      title: 'Configuração eletrônica',
      summary:
        'Preencha os subníveis por ordem de energia e depois leia a configuração de volta. Aufbau, Hund e a forma abreviada dos gases nobres.',
      q1: 'Em que ordem o princípio de Aufbau preenche os subníveis?',
      q2: 'Quantos elétrons cabem em um único subnível p?',
      q3: 'O que significa a forma abreviada [Ar]?',
      e1: 'Os subníveis se preenchem na ordem crescente de n + l, então 4s (n+l = 4) vem antes de 3d (n+l = 5). Por isso o potássio se escreve [Ar] 4s¹ e não [Ar] 3d¹.',
      e2: 'Cada subnível comporta 2(2ℓ+1) elétrons: s comporta 2, p 6, d 10 e f 14.',
      e3: 'A forma abreviada substitui a configuração completa de um gás nobre. [Ar] 3d⁶ 4s² é o ferro: 18 + 6 + 2 = 26 elétrons.',
    },
    trends: {
      title: 'Tendências periódicas',
      summary:
        'Raio, eletronegatividade e energia de ionização decorrem de uma só coisa: o quanto o núcleo segura seus elétrons.',
      q1: 'O raio atômico, de modo geral…',
      q2: 'Qual elemento tem a maior eletronegatividade?',
      q3: 'Por que a energia de primeira ionização do sódio é bem menor que a do neônio?',
      e1: 'Ao descer em um grupo, somam-se camadas, então o átomo é fisicamente maior. Ao longo de um período, a carga nuclear crescente puxa a mesma camada para dentro.',
      e2: 'O flúor vale 3,98 na escala de Pauling, o maior valor entre todos os elementos, e é o que mais atrai os elétrons de ligação.',
      e3: 'O elétron 3s¹ do sódio é blindado e está longe do núcleo. Os 2p⁶ do neônio ficam perto do núcleo e bem retidos, então remover um custa muito mais energia.',
    },
    ions: {
      title: 'Íons e íons poliatômicos',
      summary: 'Cátions, ânions e íons poliatômicos — de onde vêm as cargas e o que cada um faz em solução.',
      q1: 'Um íon monoatômico com carga 2− tem quantos elétrons a mais que prótons?',
      q2: 'Qual destes é um íon poliatômico?',
      q3: 'Qual carga um íon óxido carrega?',
      e1: 'Carga negativa significa que o íon ganhou elétrons — 2− quer dizer dois elétrons extras.',
      e2: 'O íon sulfato reúne quatro átomos ligados entre si. Íons monoatômicos como Na⁺ e Cl⁻ são um único átomo cada.',
      e3: 'O oxigênio está no grupo 16, com seis elétrons de valência, e ganha dois para completar o octeto, dando O²⁻.',
    },
    bonding: {
      title: 'Ligação química',
      summary: 'Ligação iônica, covalente e metálica, e as evidências que as distinguem.',
      q1: 'O NaCl é melhor descrito como…',
      q2: 'Um metal como o ferro é mantido junto por…',
      q3: 'Quantas ligações um único átomo de carbono pode formar?',
      e1: 'O sódio transfere seu elétron externo para o cloro, produzindo Na⁺ e Cl⁻ mantidos juntos pela atração eletrostática.',
      e2: 'A ligação metálica usa um mar de elétrons de valência deslocalizados compartilhados pelos íons metálicos positivos, e é por isso que os metais conduzem.',
      e3: 'O carbono tem quatro elétrons de valência e quatro lacunas na sua segunda camada, então forma quatro ligações covalentes — toda a química orgânica depende disso.',
    },
  },

  hi: {
    readTheTable: {
      title: 'आवर्त सारणी पढ़ना',
      summary:
        'आवर्त आड़े-आरे चलते हैं और समूह खड़े-खड़े। किसी भी संख्या को याद करने से पहले यह जानिए कि हर अक्ष क्या नियंत्रित करता है।',
      q1: 'किसी आवर्त में बाएँ से दाएँ बढ़ने पर क्या बढ़ता है?',
      q2: 'एक ही समूह के तत्व किन बात पर एक-दूसरे से मेल खाते हैं?',
      q3: 'लैंथेनॉइड और एक्टिनॉइड सामान्यतः कहाँ बनाए जाते हैं?',
      e1: 'हर कदम पर परमाणु संख्या एक बढ़ती है, क्योंकि आप एक प्रोटॉन जोड़ रहे हैं। बाकी सब कुछ (त्रिज्या घटती है, विद्युतऋणात्मकता बढ़ती है) इसी से निकलता है।',
      e2: 'समूह संयोजी इलेक्ट्रॉनों की संख्या से परिभाषित होता है, इसीलिए क्षार धातुएँ (1) और हैलोजन (7) अपने-अपने समूह में एक जैसा व्यवहार करती हैं।',
      e3: 'ये f ब्लॉक के तत्व हैं, जिन्हें 3–12 वाले स्तंभ पढ़ने में सहज रहें इसके लिए तालिका के नीचे निकाल दिया जाता है। ये फिर भी 6वें और 7वें आवर्त के अंतर्गत आते हैं।',
    },
    atomicStructure: {
      title: 'परमाणु संरचना',
      summary: 'प्रोटॉन तत्व तय करते हैं, न्यूट्रॉन समस्थानिक बनाते हैं, इलेक्ट्रॉन आयन बनाते हैं। तीन कण, तीन काम।',
      q1: 'कौन-सा कण तत्व की पहचान तय करता है?',
      q2: 'एक ही तत्व के उन दो परमाणुओं को क्या कहते हैं जिनकी न्यूट्रॉन संख्या अलग हो?',
      q3: 'एक इलेक्ट्रॉन खो देने वाला सोडियम परमाणु बन जाता है…',
      e1: 'प्रोटॉन बदल दीजिए तो तत्व ही पूरा बदल जाता है। 25 प्रोटॉन हों तो वह मैंगनीज़ है और 27 हों तो कोबाल्ट।',
      e2: 'समस्थानिकों की प्रोटॉन संख्या समान होती है और द्रव्यमान संख्या अलग होती है। कार्बन-12 और कार्बन-14 दोनों कार्बन हैं; कार्बन-14 रेडियोधर्मी है।',
      e3: 'एक इलेक्ट्रॉन खोने पर प्रोटॉन इलेक्ट्रॉन से एक अधिक रह जाता है, इसलिए आवेश +1 हो जाता है। तत्व फिर भी सोडियम ही है।',
    },
    electronConfig: {
      title: 'इलेक्ट्रॉन विन्यास',
      summary:
        'उपखोलों को ऊर्जा के क्रम में भरिए, फिर विन्यास पढ़कर देखिए। ऑफबाउ सिद्धांत, हुंड का नियम और उत्कृष्ट गैस संकेतन।',
      q1: 'ऑफबाउ सिद्धांत उपखोलों को किस क्रम में भरता है?',
      q2: 'एक p उपखोल में कितने इलेक्ट्रॉन आ जाते हैं?',
      q3: '[Ar] संकेतन का क्या अर्थ है?',
      e1: 'उपखोल n + l के बढ़ने के क्रम में भरते हैं, इसलिए 4s (n+l = 4) 3d (n+l = 5) से पहले आता है। इसीलिए पोटैशियम को [Ar] 3d¹ नहीं, [Ar] 4s¹ लिखा जाता है।',
      e2: 'हर उपखोल में 2(2ℓ+1) इलेक्ट्रॉन आ जाते हैं: s में 2, p में 6, d में 10 और f में 14।',
      e3: 'उत्कृष्ट गैस संकेतन किसी उत्कृष्ट गैस के पूरे विन्यास की जगह लेता है। [Ar] 3d⁶ 4s² लोहा है: 18 + 6 + 2 = 26 इलेक्ट्रॉन।',
    },
    trends: {
      title: 'आवर्ती प्रवृत्तियाँ',
      summary:
        'त्रिज्या, विद्युतऋणात्मकता और आयनीकरण ऊर्जा — तीनों एक ही बात से निकलती हैं: नाभिक अपने इलेक्ट्रॉनों को कितनी कसकर पकड़े है।',
      q1: 'परमाणु त्रिज्या सामान्यतः…',
      q2: 'किस तत्व की विद्युतऋणात्मकता सबसे अधिक है?',
      q3: 'सोडियम की प्रथम आयनीकरण ऊर्जा नियोन की अपेक्षा बहुत कम क्यों है?',
      e1: 'समूह में नीचे जाने पर खोलें जुड़ती हैं, इसलिए परमाणु आकार में बड़ा हो जाता है। आवर्त में बाएँ से दाएँ जाने पर बढ़ता नाभिकीय आवेश उसी खोल को भीतर खींचता है।',
      e2: 'फ्लोरीन पॉलिंग पैमाने पर 3.98 है — सभी तत्वों में सबसे अधिक — और यह बंधनकारी इलेक्ट्रॉनों को सबसे ज़्यादा खींचता है।',
      e3: 'सोडियम का 3s¹ इलेक्ट्रॉन परछायित रहता है और नाभिक से दूर है। नियोन के 2p⁶ नाभिक के पास और कसकर बँधे होते हैं, इसलिए एक को हटाने में कहीं अधिक ऊर्जा लगती है।',
    },
    ions: {
      title: 'आयन और बहुपरमाणुक आयन',
      summary: 'कैटायन, ऋणायन और बहुपरमाणुक आयन — आवेश कैसे बनते हैं और विलयन में हर एक क्या करता है।',
      q1: '2− आवेश वाले एकपरमाणुक आयन में प्रोटॉन से कितने अधिक इलेक्ट्रॉन होते हैं?',
      q2: 'इनमें से कौन बहुपरमाणुक आयन है?',
      q3: 'ऑक्साइड आयन पर क्या आवेश होता है?',
      e1: 'ऋणात्मक आवेश का अर्थ है कि आयन ने इलेक्ट्रॉन ग्रहण किए हैं — 2− का मतलब दो अतिरिक्त इलेक्ट्रॉन।',
      e2: 'सल्फेट आयन में परस्पर बंधे चार परमाणु होते हैं। Na⁺ और Cl⁻ जैसे एकपरमाणुक आयन प्रत्येक केवल एक परमाणु होते हैं।',
      e3: 'ऑक्सीजन 16वें समूह में है जिसमें छह संयोजी इलेक्ट्रॉन होते हैं और यह अष्टक बनाने के लिए दो ग्रहण कर लेता है, जिससे O²⁻ बनता है।',
    },
    bonding: {
      title: 'रासायनिक बंधन',
      summary: 'आयनिक, सहसंयोजी और धात्विक बंधन, तथा वे प्रमाण जो इन्हें अलग-अलग पहचानाते हैं।',
      q1: 'NaCl का सर्वोत्तम वर्णन है…',
      q2: 'लोहे जैसी धातु को क्या साथ बाँधे रहता है…',
      q3: 'एक कार्बन परमाणु कितने बंध बना सकता है?',
      e1: 'सोडियम अपना सबसे बाहरी इलेक्ट्रॉन क्लोरीन को दे देता है, जिससे Na⁺ और Cl⁻ बनते हैं, जो स्थिरवैद्युत आकर्षण से साथ बँधे रहते हैं।',
      e2: 'धात्विक बंधन में धात्विक धनावेशक आयनों द्वारा साझा की गई विस्थानीकृत संयोजी इलेक्ट्रॉनों का समुद्र होता है, इसीलिए धातुएँ विद्युत चालन करती हैं।',
      e3: 'कार्बन के पास चार संयोजी इलेक्ट्रॉन और दूसरी खोल में चार रिक्त स्थान होते हैं, इसलिए वह चार सहसंयोजी बंध बनाता है — पूरी कार्बनिक रसायन-विज्ञान इसी पर टिकी है।',
    },
  },

  id: {
    readTheTable: {
      title: 'Membaca Tabel Periodik',
      summary:
        'Periode membentang mendatar, grup membentang vertikal. Pahami dulu apa yang dikendalikan setiap sumbu sebelum menghafal satu angka pun.',
      q1: 'Apa yang meningkat saat bergerak dari kiri ke kanan sepanjang satu periode?',
      q2: 'Properti apa yang sama dimiliki unsur-unsur dalam satu grup?',
      q3: 'Di mana lantanida dan aktinida biasanya digambar?',
      e1: 'Nomor atom naik satu pada setiap langkah karena Anda menambahkan satu proton. Semua yang lain (jari-jari menyusut, keelektronegativan naik) mengikuti dari situ.',
      e2: 'Sebuah grup ditentukan oleh jumlah elektron valensi, sehingga logam alkali (1) dan halogen (7) masing-masing berperilaku mirip.',
      e3: 'Mereka adalah unsur blok f, yang ditarik ke bawah tabel agar kolom 3–12 tetap terbaca. Mereka tetap termasuk periode 6 dan 7.',
    },
    atomicStructure: {
      title: 'Struktur Atom',
      summary: 'Proton menentukan unsurnya, neutron membuat isotopnya, elektron membuat ionnya. Tiga partikel, tiga tugas.',
      q1: 'Partikel mana yang menentukan identitas suatu unsur?',
      q2: 'Dua atom unsur yang sama dengan jumlah neutron berbeda disebut…',
      q3: 'Atom natrium yang kehilangan satu elektron menjadi…',
      e1: 'Ubah protonnya, dan unsurnya berubah total. Yang punya 25 proton adalah mangan; yang punya 27 proton adalah kobalt.',
      e2: 'Isotop memiliki jumlah proton yang sama dan berbeda pada nomor massa. Karbon-12 dan karbon-14 keduanya karbon; karbon-14 bersifat radioaktif.',
      e3: 'Setelah kehilangan satu elektron, protonnya satu lebih banyak dari elektronnya, sehingga muatannya +1. Unsur ini tetap natrium.',
    },
    electronConfig: {
      title: 'Konfigurasi Elektron',
      summary:
        'Isi subkulit menurut urutan energi, lalu bacalah konfigurasinya kembali. Aufbau, Hund, dan bentuk singkat gas mulia.',
      q1: 'Urutan apakah yang dipakai prinsip Aufbau untuk mengisi subkulit?',
      q2: 'Berapa elektron yang muat dalam satu subkulit p?',
      q3: 'Apa arti bentuk singkat [Ar]?',
      e1: 'Subkulit terisi menurut urutan n + l yang meningkat, sehingga 4s (n+l = 4) lebih dulu daripada 3d (n+l = 5). Itulah sebabnya kalium ditulis [Ar] 4s¹, bukan [Ar] 3d¹.',
      e2: 'Setiap subkulit menampung 2(2ℓ+1) elektron: s menampung 2, p 6, d 10, dan f 14.',
      e3: 'Bentuk singkat gas mulia menggantikan konfigurasi lengkap sebuah gas mulia. [Ar] 3d⁶ 4s² adalah besi: 18 + 6 + 2 = 26 elektron.',
    },
    trends: {
      title: 'Kecenderungan Periodik',
      summary:
        'Jari-jari, keelektronegativan, dan energi ionisasi semuanya berasal dari satu hal: seberapa kuat inti mengikat elektronnya.',
      q1: 'Jari-jari atom secara umum…',
      q2: 'Unsur mana yang memiliki keelektronegativan tertinggi?',
      q3: 'Mengapa energi ionisasi pertama natrium jauh lebih rendah daripada neon?',
      e1: 'Menurun dalam satu grup menambah lapisan elektron, jadi atomnya memang lebih besar. Sepanjang satu periode, muatan inti yang bertambah menarik lapisan yang sama ke dalam.',
      e2: 'Fluor bernilai 3,98 pada skala Pauling — nilai tertinggi di antara semua unsur — dan ia paling kuat menarik elektron ikatan.',
      e3: 'Elektron 3s¹ natrium terhalang dan jauh dari inti. Elektron 2p⁶ neon berada dekat inti dan terikat rapat, sehingga melepaskannya jauh lebih mahal energi.',
    },
    ions: {
      title: 'Ion dan Ion Poliatomik',
      summary: 'Kation, anion, dan ion poliatomik — bagaimana muatan terbentuk dan apa yang dilakukan masing-masing dalam larutan.',
      q1: 'Ion monoatomik bermuatan 2− punya berapa elektron lebih banyak daripada proton?',
      q2: 'Mana di antaranya yang merupakan ion poliatomik?',
      q3: 'Muatan apa yang dibawa ion oksida?',
      e1: 'Muatan negatif berarti ion telah memperoleh elektron — 2− berarti dua elektron tambahan.',
      e2: 'Ion sulfat terdiri dari empat atom yang terikat satu sama lain. Ion monoatomik seperti Na⁺ dan Cl⁻ masing-masing hanya satu atom.',
      e3: 'Oksigen berada pada kelompok 16 dengan enam elektron valensi dan memperoleh dua hingga mencapai oktet, menghasilkan O²⁻.',
    },
    bonding: {
      title: 'Ikatan Kimia',
      summary: 'Ikatan ionik, kovalen, dan logam, serta bukti yang membedakan ketiganya.',
      q1: 'NaCl paling tepat digambarkan sebagai…',
      q2: 'Logam seperti besi diikat bersama oleh…',
      q3: 'Berapa banyak ikatan yang dapat dibentuk satu atom karbon?',
      e1: 'Natrium memindahkan elektron terluarnya ke klor, menghasilkan Na⁺ dan Cl⁻ yang terikat oleh gaya tarik elektrostatik.',
      e2: 'Ikatan logam memakai lautan elektron valensi yang delokalisasi dan dibagi bersama oleh ion logam positif, itulah sebabnya logam menghantarkan listrik.',
      e3: 'Karbon memiliki empat elektron valensi dan empat tempat kosong pada kulit kedua, sehingga membentuk empat ikatan kovalen — seluruh kimia organik bergantung padanya.',
    },
  },

  th: {
    readTheTable: {
      title: 'วิธีอ่านตารางธาตุ',
      summary: 'คาบเรียงในแนวนอน หมู่เรียงในแนวตั้ง ควรเข้าใจว่าแต่ละแกนควบคุมอะไรก่อนจะท่องจำตัวเลขใด ๆ',
      q1: 'เมื่อเคลื่อนที่จากซ้ายไปขวาตามคาบ สิ่งใดเพิ่มขึ้น',
      q2: 'ธาตุในหมู่เดียวกันมีสมบัติใดร่วมกัน',
      q3: 'แลนทาไนด์และแอกทิไนด์มักวางไว้ที่ใด',
      e1: 'เลขอะตอมเพิ่มขึ้นทีละ 1 ในแต่ละขั้น เพราะคุณเพิ่มโปรตอนหนึ่งตัว ทุกอย่างอื่น (รัศมีเล็กลง เอเล็กโทรเนกาติวิตีสูงขึ้น) จึงตามมาจากข้อนี้',
      e2: 'หมู่ถูกกำหนดด้วยจำนวนอิเล็กตรอนเวเลนซ์ ดังนั้นโลหะอัลคาลี (1) และฮาลโอเจน (7) จึงมีพฤติกรรมคล้ายกันในแต่ละกลุ่ม',
      e3: 'ทั้งสองเป็นธาตุบล็อก f ซึ่งถูกดึงออกมาไว้ใต้ตารางเพื่อให้คอลัมน์ที่ 3–12 ยังอ่านออก แต่พวกเขายังอยู่ในคาบที่ 6 และ 7',
    },
    atomicStructure: {
      title: 'โครงสร้างอะตอม',
      summary: 'โปรตอนกำหนดธาตุ นิวตรอนสร้างไอโซโทป อิเล็กตรอนสร้างไอออน สามอนุภาค สามหน้าที่',
      q1: 'อนุภาคใดกำหนดความเป็นตัวตนของธาตุ',
      q2: 'อะตอมของธาตุเดียวกันที่มีจำนวนนิวตรอนต่างกันเรียกว่าอะไร',
      q3: 'อะตอมโซเดียมที่สูญเสียอิเล็กตรอนหนึ่งตัวจะกลายเป็นอะไร',
      e1: 'เปลี่ยนโปรตอน แปลว่าเปลี่ยนธาตุทั้งตัว ถ้ามีโปรตอน 25 ตัวจะเป็นแมงกานีส ถ้ามี 27 ตัวจะเป็นโคบอลต์',
      e2: 'ไอโซโทปมีจำนวนโปรตอนเท่ากันแต่เลขมวลต่างกัน คาร์บอน-12 กับคาร์บอน-14 ต่างก็เป็นคาร์บอนทั้งคู่ โดยคาร์บอน-14 เป็นกัมมันตรังสี',
      e3: 'เมื่อสูญเสียอิเล็กตรอนหนึ่งตัว โปรตอนจะมีมากกว่าอิเล็กตรอนหนึ่งตัว ประจุจึงเป็น +1 และยังคงเป็นธาตุโซเดียม',
    },
    electronConfig: {
      title: 'การจัดเรียงอิเล็กตรอน',
      summary: 'เติมอิเล็กตรอนในชั้นย่อยตามลำดับพลังงาน แล้วอ่านการจัดเรียงกลับ หลักการออฟบาว กฎของฮันด์ และการเขียนย่อด้วยแก๊สเฉื่อย',
      q1: 'หลักการออฟบาวเติมชั้นย่อยตามลำดับใด',
      q2: 'ชั้นย่อย p หนึ่งชั้นย่อยจุดอิเล็กตรอนได้กี่ตัว',
      q3: 'การเขียนย่อ [Ar] หมายถึงอะไร',
      e1: 'ชั้นย่อยเติมตามค่า n + l ที่เพิ่มขึ้น ดังนั้น 4s (n+l = 4) จึงมาก่อน 3d (n+l = 5) นี่คือเหตุผลที่โพแทสเซียมเขียนเป็น [Ar] 4s¹ ไม่ใช่ [Ar] 3d¹',
      e2: 'แต่ละชั้นย่อยจุดอิเล็กตรอนได้ 2(2ℓ+1) ตัว: s จุดได้ 2, p จุดได้ 6, d จุดได้ 10 และ f จุดได้ 14',
      e3: 'การเขียนย่อด้วยแก๊สเฉื่อยแทนที่การจัดเรียงอิเล็กตรอนทั้งหมดของแก๊สเฉื่อย [Ar] 3d⁶ 4s² คือเหล็ก: 18 + 6 + 2 = 26 อิเล็กตรอน',
    },
    trends: {
      title: 'แนวโน้มตามคาบ',
      summary: 'รัศมี เอเล็กโทรเนกาติวิตี และพลังงานไอออนไซเซชัน ล้วนเกิดจากสิ่งเดียวกัน คือนิวเคลียสยึดอิเล็กตรอนไว้แน่นแค่ไหน',
      q1: 'รัศมีอะตอมโดยทั่วไป',
      q2: 'ธาตุใดมีเอเล็กโทรเนกาติวิตีสูงที่สุด',
      q3: 'เพราะเหตุใดพลังงานไอออนไซเซชันที่หนึ่งของโซเดียมจึงต่ำกว่าของนีออนมาก',
      e1: 'เมื่อลงตามหมู่ จะมีชั้นอิเล็กตรอนเพิ่มขึ้น อะตอมจึงใหญ่ขึ้นจริง ๆ ส่วนเมื่อไปตามคาบ ประจุนิวเคลียสที่เพิ่มขึ้นจะดึงชั้นเดิมเข้าหาตัวเอง',
      e2: 'ฟลูออรีนมีค่า 3.98 บนสเกลของพอลิง ซึ่งสูงที่สุดในบรรดาธาตุทั้งหมด และยังดึงอิเล็กตรอนในพันธะได้แรงที่สุด',
      e3: 'อิเล็กตรอน 3s¹ ของโซเดียมถูกบังและอยู่ไกลจากนิวเคลียส ส่วน 2p⁶ ของนีออนอยู่ใกล้นิวเคลียสและถูกยึดแน่น การดึงออกหนึ่งตัวจึงต้องใช้พลังงานมากกว่ามาก',
    },
    ions: {
      title: 'ไอออนและไอออนหลายอะตอม',
      summary: 'แคทไอออน แอนไอออน และไอออนหลายอะตอม ประจุเกิดขึ้นได้อย่างไร และแต่ละชนิดทำอะไรในสารละลาย',
      q1: 'ไอออนอะตอมเดี่ยวที่มีประจุ 2− มีอิเล็กตรอนมากกว่าโปรตอนกี่ตัว',
      q2: 'ตัวใดเป็นไอออนหลายอะตอม',
      q3: 'ไอออนออกไซด์มีประจุเท่าใด',
      e1: 'ประจุลบหมายความว่าไอออนได้รับอิเล็กตรอนเพิ่ม 2− จึงหมายถึงมีอิเล็กตรอนเกินมาสองตัว',
      e2: 'ไอออนซัลเฟตประกอบด้วยอะตอมสี่อะตอมที่ยึดเชื่อมกัน ส่วนไอออนอะตอมเดี่ยวอย่าง Na⁺ และ Cl⁻ มีเพียงอะตอมเดียวต่อหนึ่งไอออน',
      e3: 'ออกซิเจนอยู่หมู่ 16 มีอิเล็กตรอนเวเลนซ์หกตัว และรับเข้ามาสองตัวเพื่อให้ได้ออกเต็ด จึงเป็น O²⁻',
    },
    bonding: {
      title: 'พันธะเคมี',
      summary: 'พันธะไอออน พันธะโควาเลนต์ และพันธะโลหะ พร้อมหลักฐานที่ใช้แยกแยะออกจากกัน',
      q1: 'NaCl อธิบายได้ดีที่สุดว่าเป็น…',
      q2: 'โลหะอย่างเหล็กยึดติดกันด้วย…',
      q3: 'อะตอมคาร์บอนหนึ่งอะตอมสร้างพันธะได้กี่พันธะ',
      e1: 'โซเดียมส่งอิเล็กตรอนชั้นนอกสุดให้คลอรีน เกิด Na⁺ และ Cl⁻ ที่ยึดกันด้วยแรงดึงดูดไฟฟ้าสถิต',
      e2: 'พันธะโลหะอาศัยทะเลอิเล็กตรอนเวเลนซ์ที่ไม่อยู่กับที่ใด ซึ่งอิเล็กตรอนเหล่านี้ถูกใช้ร่วมกันโดยไอออนโลหะที่มีประจุบวก นั่นจึงทำให้โลหะนำไฟฟ้าได้',
      e3: 'คาร์บอนมีอิเล็กตรอนเวเลนซ์สี่ตัวและช่องว่างอีกสี่ช่องในชั้นที่สอง จึงสร้างพันธะโควาเลนต์ได้สี่พันธะ ซึ่งเคมีอินทรีย์ทั้งหมดพึ่งพามัน',
    },
  },

  it: {
    readTheTable: {
      title: 'Leggere la tavola periodica',
      summary:
        'I periodi scorrono in orizzontale, i gruppi in verticale. Impara che cosa controlla ogni asse prima di memorizzare un solo numero.',
      q1: 'Cosa aumenta spostandosi da sinistra a destra lungo un periodo?',
      q2: 'Quale proprietà condividono gli elementi dello stesso gruppo?',
      q3: 'Dove vengono solitamente disegnati lantanidi e attinidi?',
      e1: 'Il numero atomico aumenta di uno a ogni passo perché aggiungi un protone. Tutto il resto (il raggio si riduce, l’elettronegatività sale) discende da questo.',
      e2: 'Un gruppo è definito dal numero di elettroni di valenza, ed è per questo che i metalli alcalini (1) e gli alogeni (7) si comportano in modo simile.',
      e3: 'Sono gli elementi del blocco f, estratti sotto la tabella per mantenere leggibili le colonne da 3 a 12. Appartengono comunque ai periodi 6 e 7.',
    },
    atomicStructure: {
      title: 'Struttura dell’atomo',
      summary: 'I protoni decidono l’elemento, i neutroni fanno l’isotopo, gli elettroni fanno lo ione. Tre particelle, tre compiti.',
      q1: 'Quale particella determina l’identità di un elemento?',
      q2: 'Due atomi dello stesso elemento con un numero diverso di neutroni si chiamano…',
      q3: 'Un atomo di sodio che perde un elettrone diventa…',
      e1: 'Cambi i protoni e cambi l’elemento completamente. Con 25 protoni è manganese; con 27 è cobalto.',
      e2: 'Gli isotopi hanno lo stesso numero di protoni e differiscono per il numero di massa. Carbonio-12 e carbonio-14 sono entrambi carbonio; il carbonio-14 è radioattivo.',
      e3: 'Perdendo un elettrone restano un protone in più degli elettroni, quindi la carica è +1. L’elemento resta sodio.',
    },
    electronConfig: {
      title: 'Configurazione elettronica',
      summary:
        'Riempi i sottolivelli in ordine di energia, poi rileggi la configurazione. Aufbau, Hund e la notazione abbreviata dei gas nobili.',
      q1: 'In che ordine il principio di Aufbau riempie i sottolivelli?',
      q2: 'Quanti elettroni entrano in un solo sottolivello p?',
      q3: 'Cosa significa la notazione abbreviata [Ar]?',
      e1: 'I sottolivelli si riempiono per n + l crescente, quindi 4s (n+l = 4) viene prima di 3d (n+l = 5). Per questo il potassio si scrive [Ar] 4s¹ e non [Ar] 3d¹.',
      e2: 'Ogni sottolivello contiene 2(2ℓ+1) elettroni: s ne contiene 2, p 6, d 10 e f 14.',
      e3: 'La notazione abbreviata sostituisce la configurazione completa di un gas nobile. [Ar] 3d⁶ 4s² è il ferro: 18 + 6 + 2 = 26 elettroni.',
    },
    trends: {
      title: 'Andamenti periodici',
      summary:
        'Raggio, elettronegatività ed energia di ionizzazione derivano tutti da una cosa sola: quanto strettamente il nucleo trattiene i suoi elettroni.',
      q1: 'Il raggio atomico, in generale…',
      q2: 'Quale elemento ha l’elettronegatività più alta?',
      q3: 'Perché l’energia di prima ionizzazione del sodio è molto più bassa di quella del neon?',
      e1: 'Scendendo in un gruppo si aggiungono gusci, quindi l’atomo è fisicamente più grande. Lungo un periodo, la carica nucleare crescente attira verso l’interno lo stesso guscio.',
      e2: 'Il fluoro vale 3,98 sulla scala di Pauling, il valore più alto tra tutti gli elementi, ed è quello che attira più fortemente gli elettroni di legame.',
      e3: 'L’elettrone 3s¹ del sodio è schermato e lontano dal nucleo. I 2p⁶ del neon sono vicini e tenuti stret saldamente, quindi toglierne uno costa molta più energia.',
    },
    ions: {
      title: 'Ioni e ioni poliatomici',
      summary: 'Cationi, anioni e ioni poliatomici — da dove nasce la carica e cosa fa ciascuno in soluzione.',
      q1: 'Uno ione monoatomico con carica 2− ha quanti elettroni in più dei protoni?',
      q2: 'Quale di questi è uno ione poliatomico?',
      q3: 'Quale carica porta uno ione ossido?',
      e1: 'Una carica negativa significa che lo ione ha guadagnato elettroni: 2− vuol dire due elettroni in più.',
      e2: 'Lo ione solfato riunisce quattro atomi legati tra loro. Ioni monoatomici come Na⁺ e Cl⁻ sono un solo atomo ciascuno.',
      e3: 'L’ossigeno è nel gruppo 16 con sei elettroni di valenza e ne acquista due per raggiungere l’ottetto, dando O²⁻.',
    },
    bonding: {
      title: 'Legame chimico',
      summary: 'Legame ionico, covalente e metallico, e le prove che li distinguono.',
      q1: 'NaCl è meglio descritto come…',
      q2: 'Un metallo come il ferro è tenuto insieme da…',
      q3: 'Quanti legami può formare un solo atomo di carbonio?',
      e1: 'Il sodio cede il suo elettrone esterno al cloro, producendo Na⁺ e Cl⁻ tenuti insieme dall’attrazione elettrostatica.',
      e2: 'Il legame metallico usa un mare di elettroni di valenza delocalizzati, condivisi dagli ioni metallici positivi: è per questo che i metalli conducono.',
      e3: 'Il carbono ha quattro elettroni di valenza e quattro posti vuoti nel secondo guscio, quindi forma quattro legami covalenti — da qui dipende tutta la chimica organica.',
    },
  },

  nl: {
    readTheTable: {
      title: 'Het periodiek systeem lezen',
      summary:
        'Perioden lopen horizontaal, groepen verticaal. Leer eerst wat elke as bepaalt voordat je één getal uit je hoofd leert.',
      q1: 'Wat neemt toe als je van links naar rechts door een periode gaat?',
      q2: 'Welke eigenschap delen elementen uit dezelfde groep?',
      q3: 'Waar worden de lanthaniden en actiniden normaal getekend?',
      e1: 'Het atoomnummer stijgt per stap met één, omdat je één proton toevoegt. Al het andere (de straal wordt kleiner, de elektronegativiteit stijgt) volgt daaruit.',
      e2: 'Een groep is gedefinieerd door het aantal valentie-elektronen, daarom gedragen de alkalimetalen (1) en de halogenen (7) zich elk alike.',
      e3: 'Het zijn de elementen van het f-blok, die onder de tabel worden gehaald zodat de kolommen 3–12 leesbaar blijven. Ze behoren nog steeds tot periode 6 en 7.',
    },
    atomicStructure: {
      title: 'Atoomstructuur',
      summary: 'Protonen bepalen het element, neutronen maken het isotoop, elektronen maken het ion. Drie deeltjes, drie taken.',
      q1: 'Welk deeltje bepaalt de identiteit van een element?',
      q2: 'Hoe noemen we twee atomen van hetzelfde element met een verschillend aantal neutronen?',
      q3: 'Wat wordt een natriumatoom dat één elektron kwijtraakt?',
      e1: 'Verander je de protonen, dan verander je het element volledig. Met 25 protonen is het mangaan; met 27 kobalt.',
      e2: 'Isotopen hebben hetzelfde aantal protonen en verschillen in massagetal. Koolstof-12 en koolstof-14 zijn beide koolstof; koolstof-14 is radioactief.',
      e3: 'Na het verlies van één elektron is er één proton meer dan elektronen, dus de lading is +1. Het element blijft natrium.',
    },
    electronConfig: {
      title: 'Elektronenconfiguratie',
      summary:
        'Vul de subschillen in volgorde van energie en lees daarna de configuratie terug. Aufbauprincipe, regel van Hund en de edelgasnotatie.',
      q1: 'In welke volgorde vult het Aufbauprincipe de subschillen?',
      q2: 'Hoeveel elektronen passen er in één p-subschil?',
      q3: 'Wat betekent de afkorting [Ar]?',
      e1: 'De subschillen vullen zich met stijgende n + l, dus 4s (n+l = 4) komt vóór 3d (n+l = 5). Daarom schrijf je kalium als [Ar] 4s¹ en niet als [Ar] 3d¹.',
      e2: 'Elke subschil bevat 2(2ℓ+1) elektronen: s bevat er 2, p 6, d 10 en f 14.',
      e3: 'De edelgasnotatie vervangt de volledige configuratie van een edelgas. [Ar] 3d⁶ 4s² is ijzer: 18 + 6 + 2 = 26 elektronen.',
    },
    trends: {
      title: 'Periodieke trends',
      summary:
        'Straal, elektronegativiteit en ionisatie-energie vullen allemaal voort uit één ding: hoe stevig de kern zijn elektronen vasthoudt.',
      q1: 'De atoomstraal, in het algemeen…',
      q2: 'Welk element heeft de hoogste elektronegativiteit?',
      q3: 'Waarom is de eerste ionisatie-energie van natrium veel lager dan die van neon?',
      e1: 'Ga je een groep naar beneden, dan komen er schillen bij, dus het atoom is fysiek groter. Ga je door een periode, dan trekt de groeiende kernlading dezelfde schil naar binnen.',
      e2: 'Fluor is 3,98 op de Pauling-schaal, de hoogste waarde van alle elementen, en het trekt het hardst aan de bindingselektronen.',
      e3: 'Het 3s¹-elektron van natrium is afgeschermd en ver van de kern. De 2p⁶ van neon zitten dicht bij de kern en zijn stevig vastgehouden, dus er een afscheuren kost veel meer energie.',
    },
    ions: {
      title: 'Ionen en meeratomige ionen',
      summary: 'Kationen, anionen en meeratomige ionen — waar ladingen vandaan komen en wat elk ervan doet in oplossing.',
      q1: 'Een eenatomig ion met lading 2− heeft hoeveel elektronen meer dan protonen?',
      q2: 'Welk van deze is een meeratomig ion?',
      q3: 'Welke lading heeft een oxide-ion?',
      e1: 'Een negatieve lading betekent dat het ion elektronen heeft opgenomen — 2− betekent twee elektronen extra.',
      e2: 'Het sulfaation bevat vier met elkaar verbonden atomen. Eenatomige ionen als Na⁺ en Cl⁻ bestaan elk uit één enkel atoom.',
      e3: 'Zuurstof staat in groep 16 met zes valentie-elektronen en neemt er twee op om een octet te bereiken; zo ontstaat O²⁻.',
    },
    bonding: {
      title: 'Chemische binding',
      summary: 'Ionbinding, atoombinding en metaalbinding, en het bewijs dat ze uit elkaar haalt.',
      q1: 'NaCl wordt het beste omschreven als…',
      q2: 'Een metaal als ijzer wordt bijeengehouden door…',
      q3: 'Hoeveel bindingen kan één koolstofatoom vormen?',
      e1: 'Natrium staat zijn buitenste elektron af aan chloor, waardoor Na⁺ en Cl⁻ ontstaan die door elektrostatische aantrekking bijeengehouden worden.',
      e2: 'De metaalbinding gebruikt een zee van gedelokaliseerde valentie-elektronen die door positieve metaalionen gedeeld worden — daarom geleiden metalen.',
      e3: 'Koolstof heeft vier valentie-elektronen en vier gaten in zijn tweede schil, en vormt dus vier atoombindingen — de hele organische scheikunde steunt daarop.',
    },
  },

  pl: {
    readTheTable: {
      title: 'Czytanie układu okresowego',
      summary:
        'Okresy biegną w poziomie, grupy w pionie. Najpierw zrozum, co kontroluje każda oś, zanim zapamiętasz choćby jedną liczbę.',
      q1: 'Co rośnie, gdy przesuwamy się od lewej do prawej w obrębie okresu?',
      q2: 'Jaką własność mają wspólną pierwiastki z tej samej grupy?',
      q3: 'Gdzie zwykle rysuje się lantanowce i aktynowce?',
      e1: 'Liczba atomowa rośnie o jeden na każdym kroku, bo dodajesz proton. Wszystko inne (promień maleje, elektronegatywność rośnie) wynika z tego.',
      e2: 'Grupę definiuje liczba elektronów walencyjnych, dlatego metale alkaliczne (1) i halogeny (7) zachowują się podobnie.',
      e3: 'To pierwiastki bloku f, wyciągnięte pod tabelę, aby kolumny 3–12 pozostały czytelne. Nadal należą do okresów 6 i 7.',
    },
    atomicStructure: {
      title: 'Budowa atomu',
      summary: 'Protony decydują o pierwiastku, neutrony tworzą izotop, elektrony tworzą jon. Trzy cząstki, trzy zadania.',
      q1: 'Która cząstka określa tożsamość pierwiastka?',
      q2: 'Jak nazywają się dwa atomy tego samego pierwiastka o różnej liczbie neutronów?',
      q3: 'Atom sodu, który traci jeden elektron, staje się…',
      e1: 'Zmienisz protony — zmienisz całkiem pierwiastek. Przy 25 protonach to mangan, przy 27 to kobalt.',
      e2: 'Izotopy mają tyle samo protonów, a różnią się liczbą masową. Węgiel-12 i węgiel-14 to oba węgiel; węgiel-14 jest promieniotwórczy.',
      e3: 'Po utracie elektronu protonów jest o jeden więcej niż elektronów, więc ładunek wynosi +1. Pierwiastek nadal jest sodem.',
    },
    electronConfig: {
      title: 'Konfiguracja elektronowa',
      summary:
        'Wypełniaj podpowłoki w kolejności energii, a potem odczytaj konfigurację. Zasada Aufbau, reguła Hunda i skrót gazów szlachetnych.',
      q1: 'W jakiej kolejności zasada Aufbau wypełnia podpowłoki?',
      q2: 'Ile elektronów mieści się w jednym podpowłocie p?',
      q3: 'Co oznacza skrót [Ar]?',
      e1: 'Podpowłoki wypełniają się w kolejności rosnącego n + l, więc 4s (n+l = 4) przed 3d (n+l = 5). Dlatego potas zapisuje się jako [Ar] 4s¹, a nie [Ar] 3d¹.',
      e2: 'Każdy podpowłok mieści 2(2ℓ+1) elektronów: s mieści 2, p 6, d 10, f 14.',
      e3: 'Skrót gazu szlachetnego zastępuje pełną konfigurację gazu szlachetnego. [Ar] 3d⁶ 4s² to żelazo: 18 + 6 + 2 = 26 elektronów.',
    },
    trends: {
      title: 'Tendencje okresowe',
      summary:
        'Promień, elektronegatywność i energia jonizacji wynikają z jednej rzeczy: jak mocno jądro trzyma swoje elektrony.',
      q1: 'Promień atomowy, co do zasady…',
      q2: 'Który pierwiastek ma największą elektronegatywność?',
      q3: 'Dlaczego pierwsza energia jonizacji sodu jest znacznie niższa niż neonu?',
      e1: 'W dół grupy dochodzą kolejne powłoki, więc atom jest fizycznie większy. Wzdłuż okresu rosnący ładunek jądra wciąga tę samą powłokę do środka.',
      e2: 'Fluor ma 3,98 w skali Paulinga — najwyższą wartość wśród wszystkich pierwiastków — i najmocniej przyciąga elektrony wiązania.',
      e3: 'Elektron 3s¹ sodu jest osłonięty i daleko od jądra. Elektrony 2p⁶ neonu leżą blisko jądra i są mocno trzymane, więc oderwanie jednego kosztuje dużo więcej energii.',
    },
    ions: {
      title: 'Jony i jony wielowatomowe',
      summary: 'Kationy, aniony i jony wielowatomowe — skąd bierze się ładunek i co każdy robi w roztworze.',
      q1: 'Jednoatomowy jon o ładunku 2− ma o ile elektronów więcej niż protonów?',
      q2: 'Który z nich jest jonem wielowatomowym?',
      q3: 'Jaki ładunek nosi jon tlenkowy?',
      e1: 'Ujemny ładunek oznacza, że jon przyjął elektrony — 2− to dwa elektrony więcej.',
      e2: 'Jon siarczanowy składa się z czterech połączonych ze sobą atomów. Jony jednoatomowe, takie jak Na⁺ i Cl⁻, to pojedyncze atomy.',
      e3: 'Tlen jest w grupie 16, ma sześć elektronów walencyjnych i przyjmuje dwa, aby osiągnąć oktet, dając O²⁻.',
    },
    bonding: {
      title: 'Wiązanie chemiczne',
      summary: 'Wiązanie jonowe, kowalencyjne i metaliczne oraz dowody, które je od siebie odróżniają.',
      q1: 'NaCl najlepiej opisać jako…',
      q2: 'Metal taki jak żelazo jest spójony przez…',
      q3: 'Ile wiązań może utworzyć pojedynczy atom węgla?',
      e1: 'Sód oddaje swój elektron zewnętrzny chlorowi, tworząc Na⁺ i Cl⁻, które trzyma razem przyciąganie elektrostatyczne.',
      e2: 'Wiązanie metaliczne opiera się na morzu zdelokalizowanych elektronów walencyjnych współdzielonych przez dodatnie jony metalu — dlatego metale przewodzą prąd.',
      e3: 'Węgiel ma cztery elektrony walencyjne i cztery puste miejsca w drugiej powłoce, więc tworzy cztery wiązania kowalencyjne — na tym stoi cała chemia organiczna.',
    },
  },

  cs: {
    readTheTable: {
      title: 'Čtení periodické tabulky',
      summary:
        'Periody běží vodorovně, skupiny svisle. Nejdřív pochopte, co řídí každá osa, než si začnete memorovat jediné číslo.',
      q1: 'Co roste, když postupujeme v periodě zleva doprava?',
      q2: 'Jakou vlastnost mají společnou prvky téže skupiny?',
      q3: 'Kde se běžně kreslí lanthanoidy a aktinoidy?',
      e1: 'Protonové číslo při každém kroku vzroste o jednu, protože přidáte jeden proton. Vše ostatní (poloměr se zmenšuje, elektronegativita roste) z toho plyne.',
      e2: 'Skupina je určena počtem valenčních elektronů, proto se alkalické kovy (1) a halogeny (7) chovají podobně.',
      e3: 'Jsou to prvky f-bloku, vytáhnuté pod tabulku, aby sloupce 3–12 zůstaly čitelné. Stále patří do 6. a 7. periody.',
    },
    atomicStructure: {
      title: 'Struktura atomu',
      summary: 'Protony určují prvek, neutrony dělají izotop, elektrony dělají ion. Tři částice, tři úkoly.',
      q1: 'Která částice určuje totožnost prvku?',
      q2: 'Jak se nazývají dva atomy téhož prvku s různým počtem neutronů?',
      q3: 'Atom sodíku, který ztratí jeden elektron, se stane…',
      e1: 'Změníte protony a změníte celý prvek. Při 25 protonech je to mangan, při 27 kobalt.',
      e2: 'Izotopy mají stejný počet protonů a liší se nukleonovým číslem. Uhlík-12 i uhlík-14 jsou oba uhlík; uhlík-14 je radioaktivní.',
      e3: 'Ztratí-li se elektron, zůstane o jeden proton víc než elektronů, takže náboj je +1. Prvkem je dál sodík.',
    },
    electronConfig: {
      title: 'Elektronová konfigurace',
      summary:
        'Vyplňte podslupky v pořadí energií a konfiguraci si přečtěte zpět. Aufbauův princip, Hundovo pravidlo a zkratka vzdušných plynů.',
      q1: 'V jakém pořadí vyplňuje podslupky Aufbauův princip?',
      q2: 'Kolik elektronů se vejde do jedné podslupky p?',
      q3: 'Co znamená zkratka [Ar]?',
      e1: 'Podslupky se vyplňují podle rostoucího n + l, takže 4s (n+l = 4) dřív než 3d (n+l = 5). Proto se draslík píše [Ar] 4s¹ a ne [Ar] 3d¹.',
      e2: 'Každá podslupka pojme 2(2ℓ+1) elektronů: s pojme 2, p 6, d 10, f 14.',
      e3: 'Zkratka vzdušného plynu nahrazuje úplnou konfiguraci vzdušného plynu. [Ar] 3d⁶ 4s² je železo: 18 + 6 + 2 = 26 elektronů.',
    },
    trends: {
      title: 'Periodické trendy',
      summary:
        'Poloměr, elektronegativita a ionizační energie vycházejí všechny z jediného: jak pevně jádro drží své elektrony.',
      q1: 'Atomový poloměr obecně…',
      q2: 'Který prvek má nejvyšší elektronegativitu?',
      q3: 'Proč je první ionizační energie sodíku mnohem nižší než neonu?',
      e1: 'Při sestupu ve skupině přibývají slupky, takže atom je fyzicky větší. Podél periody rostoucí náboj jádra táhne tutéž slupku dovnitř.',
      e2: 'Fluor má na Paulingově stupnici 3,98 — nejvyšší hodnotu ze všech prvků — a nejvíce přitahuje vazebné elektrony.',
      e3: 'Elektron 3s¹ sodíku je odstíněný a daleko od jádra. Elektrony 2p⁶ neony jsou blízko jádra a pevně držené, takže vytržení jednoho stojí mnohem více energie.',
    },
    ions: {
      title: 'Ionty a polyatomové ionty',
      summary: 'Kationty, anionty a polyatomové ionty — odkud se bere náboj a co každý z nich dělá v roztoku.',
      q1: 'Jednoatomový ion s nábojem 2− má o kolik elektronů víc než protonů?',
      q2: 'Který z nich je polyatomovým iontem?',
      q3: 'Jaký náboj má oxidový ion?',
      e1: 'Záporný náboj znamená, že ion přijal elektrony — 2− znamená dva elektrony navíc.',
      e2: 'Síranový ion obsahuje čtyři navzájem spojené atomy. Jednoatomové ionty jako Na⁺ a Cl⁻ jsou vždy jediný atom.',
      e3: 'Kyslík je ve skupině 16 se šesti valenčními elektrony a přijme dva, aby dosáhl oktetu; vzniká O²⁻.',
    },
    bonding: {
      title: 'Chemická vazba',
      summary: 'Iontová, kovalentní a kovová vazba a důkazy, které je od sebe odlišují.',
      q1: 'NaCl se nejlépe popisuje jako…',
      q2: 'Kov jako železo drží pohromadě díky…',
      q3: 'Kolik vazeb může vytvořit jediný atom uhlíku?',
      e1: 'Sodík předá svůj valenční elektron chloru, čímž vznikne Na⁺ a Cl⁻, které drží pohromadě elektrostatická přitažlivost.',
      e2: 'Kovová vazba využívá moře delokalizovaných valenčních elektronů sdílených kladnými kationty kovu — proto kovy vedou proud.',
      e3: 'Uhlík má čtyři valenční elektrony a čtyři prázdná místa ve druhé slupce, takže tvoří čtyři kovalentní vazby — na tom stojí celá organická chemie.',
    },
  },

  no: {
    readTheTable: {
      title: 'Å lese det periodiske system',
      summary:
        'Periodene går tvers over, gruppene nedover. Lær hva hver akse styrer, før du pugger ett eneste tall.',
      q1: 'Hva øker når du beveger deg fra venstre til høyre langs en periode?',
      q2: 'Hvilken egenskap har elementer i samme gruppe til felles?',
      q3: 'Hvor tegnes lantanider og aktinider vanligvis?',
      e1: 'Atomnummeret øker med én for hvert steg, fordi du legger til ett proton. Alt annet (radiusen minker, elektronegativiteten øker) følger av dette.',
      e2: 'En gruppe er definert av antall valenselektroner, derfor oppfører alkalimetallene (1) og halogenene (7) seg lignende.',
      e3: 'Det er elementene i f-blokken, trukket ut under tabellen for at kolonnene 3–12 skal forbli lesbare. De hører fortsatt til periode 6 og 7.',
    },
    atomicStructure: {
      title: 'Atomstruktur',
      summary: 'Protonene bestemmer elementet, nøytronene lager isotopen, elektronene lager ionet. Tre partikler, tre oppgaver.',
      q1: 'Hvilken partikkel bestemmer identiteten til et element?',
      q2: 'Hva kalles to atomer av samme element med ulikt antall nøytroner?',
      q3: 'Hva blir et natriumatom som mister ett elektron?',
      e1: 'Endrer du protonene, endrer du hele elementet. Med 25 protoner er det mangan; med 27 er det kobolt.',
      e2: 'Isotoper har samme antall protoner og skiller seg i massetallet. Karbon-12 og karbon-14 er begge karbon; karbon-14 er radioaktivt.',
      e3: 'Når et elektron går tapt, blir det én proton mer enn elektroner, så ladningen blir +1. Elementet er fortsatt natrium.',
    },
    electronConfig: {
      title: 'Elektronkonfigurasjon',
      summary:
        'Fyll underskallene i energirekkefølge, og les så konfigurasjonen tilbake. Aufbau-prinsippet, Hunds regel og edelgassforkortelsen.',
      q1: 'I hvilken rekkefølge fyller Aufbau-prinsippet underskallene?',
      q2: 'Hvor mange elektroner får plass i ett p-underskall?',
      q3: 'Hva betyr forkortelsen [Ar]?',
      e1: 'Underskallene fylles etter økende n + l, så 4s (n+l = 4) kommer før 3d (n+l = 5). Derfor skrives kalium [Ar] 4s¹ og ikke [Ar] 3d¹.',
      e2: 'Hvert underskall holder 2(2ℓ+1) elektroner: s holder 2, p 6, d 10 og f 14.',
      e3: 'Edelgassforkortelsen erstatter hele konfigurasjonen til en edelgass. [Ar] 3d⁶ 4s² er jern: 18 + 6 + 2 = 26 elektroner.',
    },
    trends: {
      title: 'Periodiske trender',
      summary:
        'Radius, elektronegativitet og ioniseringsenergi følger alle av én ting: hvor hardt kjernen holder elektronene sine.',
      q1: 'Atomradiusen, generelt…',
      q2: 'Hvilket element har høyest elektronegativitet?',
      q3: 'Hvorfor er første ioniseringsenergi for natrium langt lavere enn for neon?',
      e1: 'Går du ned en gruppe, legges det til skall, så atomen er fysisk større. Går du langs en periode, trekker økende kjerneladning det samme skallet innover.',
      e2: 'Fluor er 3,98 på Pauling-skalaen — høyest av alle elementer — og trekker hardest på bindingselektronene.',
      e3: '3s¹-elektronen i natrium er skjermet og langt fra kjernen. 2p⁶ i neon ligger nær kjernen og holdes stramt, så det koster langt mer energi å fjerne én.',
    },
    ions: {
      title: 'Ioner og fleratomige ioner',
      summary: 'Kationer, anioner og fleratomige ioner — hvordan ladninger oppstår, og hva hver av dem gjør i løsning.',
      q1: 'Et monoatomisk ion med ladning 2− har hvor mange flere elektroner enn protoner?',
      q2: 'Hvilket av disse er et fleratomisk ion?',
      q3: 'Hvilken ladning har et oksidion?',
      e1: 'En negativ ladning betyr at ionet har vunnet elektroner — 2− betyr to ekstra elektroner.',
      e2: 'Sulfat-ionet består av fire atomer bundet sammen. Monoatomiske ioner som Na⁺ og Cl⁻ er hvert sitt ene atom.',
      e3: 'Oksygen er i gruppe 16 med seks valenselektroner og tar opp to for å nå oktet, og gir O²⁻.',
    },
    bonding: {
      title: 'Kjemisk binding',
      summary: 'Ionisk, kovalent og metallisk binding, og bevisene som skiller dem fra hverandre.',
      q1: 'NaCl beskrives best som…',
      q2: 'Et metall som jern holdes sammen av…',
      q3: 'Hvor mange bindinger kan ett karbonatom danne?',
      e1: 'Natrium avgir sitt ytterste elektron til klor, og det dannes Na⁺ og Cl⁻ som holdes sammen av elektrostatisk tiltrekning.',
      e2: 'Metallbinding bruker et hav av delokaliserte valenselektroner som deles av positive metallioner — derfor leder metaller strøm.',
      e3: 'Karbon har fire valenselektroner og fire ledige plasser i det andre skallet, så det danner fire kovalente bindinger — all organisk kjemi bygger på dette.',
    },
  },

  uk: {
    readTheTable: {
      title: 'Читання періодичної таблиці',
      summary:
        'Періоди йдуть по горизонталі, групи — по вертикалі. Спершу зрозумійте, що задає кожна вісь, і лише потім запам’ятовуйте числа.',
      q1: 'Що збільшується, коли рухатися зліва направо вздовж періоду?',
      q2: 'Яку властивість мають спільну елементи тієї самої групи?',
      q3: 'Де зазвичай зображують лантаноїди та актиноїди?',
      e1: 'Атомний номер зростає на одиницю на кожному кроці, бо ви додаєте один протон. Усе інше (радіус зменшується, електронегативність зростає) випливає звідси.',
      e2: 'Групу визначає кількість валентних електронів — тому лужні метали (1) і галогени (7) поводяться схоже.',
      e3: 'Це елементи f-блоку, винесені під таблицю, щоб колонки 3–12 залишалися читабельними. Вони й далі належать до 6-го та 7-го періодів.',
    },
    atomicStructure: {
      title: 'Будова атома',
      summary: 'Протони визначають елемент, нейтрони створюють ізотоп, електрони створюють йон. Три частинки, три завдання.',
      q1: 'Яка частинка визначає хімічну природу елемента?',
      q2: 'Два атоми одного елемента з різною кількістю нейтронів називаються…',
      q3: 'Атом натрію, який втратив один електрон, стає…',
      e1: 'Змініть протони — і елемент стане зовсім іншим. За 25 протонів це марганець, за 27 — кобальт.',
      e2: 'Ізотопи мають однакову кількість протонів і різняться масовим числом. Вуглець-12 і вуглець-14 — обидва вуглець; вуглець-14 радіоактивний.',
      e3: 'Втративши електрон, атом має на один протон більше, ніж електронів, тому заряд дорівнює +1. Елемент залишається натрієм.',
    },
    electronConfig: {
      title: 'Електронна конфігурація',
      summary:
        'Заповнюйте підрівні в порядку зростання енергії, а потім прочитайте конфігурацію. Принцип Aufbau, правило Хунда та скорочений запис інертних газів.',
      q1: 'У якому порядку принцип Aufbau заповнює підрівні?',
      q2: 'Скільки електронів вміщується в одному p-підрівні?',
      q3: 'Що означає скорочений запис [Ar]?',
      e1: 'Підрівні заповнюються за зростанням n + l, тому 4s (n+l = 4) іде раніше за 3d (n+l = 5). Саме тому калі записують як [Ar] 4s¹, а не [Ar] 3d¹.',
      e2: 'Кожен підрівень вміщує 2(2ℓ+1) електронів: s — 2, p — 6, d — 10, f — 14.',
      e3: 'Скорочений запис підставляє повну конфігурацію інертного газу. [Ar] 3d⁶ 4s² — це залізо: 18 + 6 + 2 = 26 електронів.',
    },
    trends: {
      title: 'Періодичні закономірності',
      summary:
        'Радіус, електронегативність та енергія йонізації випливають з одного: наскільки міцно ядро утримує електрони.',
      q1: 'Атомний радіус загалом…',
      q2: 'У якого елемента найвища електронегативність?',
      q3: 'Чому перша енергія йонізації натрію значно нижча, ніж у неону?',
      e1: 'Униз групою додаються електронні шари, тож атом фізично більший. Уздовж періоду зростаючий заряд ядра стягує той самий шар усередину.',
      e2: 'У фтору 3,98 за шкалою Полінга — найбільше значення серед усіх елементів, і він найсильніше притягує валентні електрони.',
      e3: 'Електрон 3s¹ натрію екранізований і далеко від ядра. Електрони 2p⁶ неону розташовані ближче до ядра й міцно утримуються, тому зняти один із них коштує значно більше енергії.',
    },
    ions: {
      title: 'Йони та багатоатомні йони',
      summary: 'Катіони, аніони та багатоатомні йони — звідки береться заряд і що кожен із них робить у розчині.',
      q1: 'На скільки електронів у одноатомного йона із зарядом 2− більше, ніж протонів?',
      q2: 'Який із цих йонів є багатоатомним?',
      q3: 'Який заряд має оксид-йон?',
      e1: 'Від’ємний заряд означає, що йон прийняв електрони: 2− — це два зайві електрони.',
      e2: 'Сульфат-йон містить чотири сполучені між собою атоми. Одноатомні йони, як Na⁺ і Cl⁻, складаються з одного атома.',
      e3: 'Кисень є в групі 16, має шість валентних електронів і приймає два, досягаючи октету, — утворюється O²⁻.',
    },
    bonding: {
      title: 'Хімічний зв’язок',
      summary: 'Іонний, ковалентний і металевий зв’язок та ознаки, за якими їх розрізняють.',
      q1: 'NaCl найкраще описати як…',
      q2: 'Метал, подібний до заліза, утримується разом за рахунок…',
      q3: 'Скільки зв’язків може утворити один атом вуглецю?',
      e1: 'Натрій віддає свій зовнішній електрон хлору, утворюючи Na⁺ і Cl⁻, які утримуються разом електростатичним притяганням.',
      e2: 'Металевий зв’язок спирається на море делокалізованих валентних електронів, спільних для додатних йонів металу, — тому метали проводять струм.',
      e3: 'Вуглець має чотири валентні електрони й чотири вакансії у другому шарі, тому утворює чотири ковалентні зв’язки — на цьому тримається вся органічна хімія.',
    },
  },

  hu: {
    readTheTable: {
      title: 'A periódusos rendszer olvasása',
      summary:
        'A periódusok vízszintesen, a csoportok függőlegesen futnak. Mielőtt egyetlen számot is megtanulnál, értsd meg, mit szabályoz az egyes tengely.',
      q1: 'Mi nő, ha egy perióduson balról jobbra haladunk?',
      q2: 'Milyen tulajdonságuk közös az azonos csoportba tartozó elemeknek?',
      q3: 'Hol szokás felrajzolni a lantanoidákat és az aktinoidákat?',
      e1: 'A rendszám minden lépésben eggyel nő, mert egy protont adunk hozzá. Minden más ebből következik (a sugár csökken, az elektronegativitás nő).',
      e2: 'Egy csoportot a vegyértékelektronok száma határoz meg, ezért az alkálifémek (1) és a halogének (7) egyaránt hasonlóan viselkednek.',
      e3: 'Ezek az f-blokk elemei, amelyeket kihúznak a táblázat alá, hogy a 3–12. oszlopok olvashatók maradjanak. Továbbra is a 6. és 7. periódushoz tartoznak.',
    },
    atomicStructure: {
      title: 'Az atom szerkezete',
      summary: 'A protonok határozzák meg az elemet, a neutronok hozzák létre az izotópot, az elektronok az iont. Három részecske, három feladat.',
      q1: 'Melyik részecske határozza meg, milyen elemről van szó?',
      q2: 'Hogy nevezzük azonos elem két olyan atomját, amelyek neutronszáma eltér?',
      q3: 'Egy elektronjától megszabaduló nátriumatom mire változik?',
      e1: 'Ha megváltoztatjuk a protonokat, az elem teljesen más lesz. 25 protonnal mangán, 27 protonnal kobalt.',
      e2: 'Az izotópok protonszáma azonos, tömegszámuk eltér. A szén-12 és a szén-14 is szén; a szén-14 radioaktív.',
      e3: 'Egy elektron elvesztésekor egy protonnal több proton lesz, mint elektron, így a töltés +1. Az elem továbbra is nátrium.',
    },
    electronConfig: {
      title: 'Elektronkonfiguráció',
      summary:
        'Töltsd fel az alhéjakat energia szerint, majd olvasd vissza a konfigurációt. Az Aufbau-elv, a Hund-szabály és a nemesgáz-rövidítés.',
      q1: 'Milyen sorrendben tölti fel az Aufbau-elv az alhéjakat?',
      q2: 'Hány elektron fér egyetlen p alhéjba?',
      q3: 'Mit jelent az [Ar] rövidítés?',
      e1: 'Az alhéjak n + l növekedése szerint töltődnek, ezért a 4s (n+l = 4) megelőzi a 3d-t (n+l = 5). Ezért a káliumot [Ar] 3d¹ helyett [Ar] 4s¹ alakban írjuk.',
      e2: 'Minden alhéj 2(2ℓ+1) elektront tart: az s 2-t, a p 6-ot, a d 10-et, az f 14-et.',
      e3: 'A nemesgáz-rövidítés egy nemesgáz teljes konfigurációját helyettesíti. Az [Ar] 3d⁶ 4s² a vas: 18 + 6 + 2 = 26 elektron.',
    },
    trends: {
      title: 'Periódusos trendek',
      summary:
        'A sugár, az elektronegativitás és az ionizációs energia ugyanabból ered: abból, mennyire szorosan tartja az atommag az elektronjait.',
      q1: 'Az atomsugár általában…',
      q2: 'Melyik elem elektronegativitása a legnagyobb?',
      q3: 'Miért sokkal alacsonyabb a nátrium első ionizációs energiája, mint a neoné?',
      e1: 'A csoportban lefelé haladva új héjak épülnek, így az atom fizikailag nagyobb. A perióduson végighaladva a növekvő magtöltés ugyanazt a héjat húzza befelé.',
      e2: 'A fluor 3,98 a Pauling-skálán — ez a legmagasabb érték minden elem között —, és a kötéselektronokat a legerősebben vonzza.',
      e3: 'A nátrium 3s¹ elektronja árnyékolt, és távol van a magtól. A neon 2p⁶ elektronjai közel vannak a maghoz és erősen kötve, ezért egy eltávolítása sokkal több energiát igényel.',
    },
    ions: {
      title: 'Ionek és többatomos ionok',
      summary: 'Kationok, anionok és többatomos ionok — honnan ered a töltés, és mit tesz mindegyik oldatban.',
      q1: 'Hány elektronnal több az egy 2− töltésű egyatomos ion a protonjainál?',
      q2: 'Melyik ezek közül többatomos ion?',
      q3: 'Milyen töltésű az oxidion?',
      e1: 'A negatív töltés azt jelenti, hogy az ion elektronokat vett fel — a 2− két többletelektront jelent.',
      e2: 'A szulfátion négy, egymáshoz kapcsolódó atomot tartalmaz. Az egyatomos ionok, mint a Na⁺ és a Cl⁻, egy-egy atomból állnak.',
      e3: 'Az oxigén a 16. csoportban van, hat vegyértékelektronnal, és kettőt felvesz, hogy elérje az oktetetet, így O²⁻ keletkezik.',
    },
    bonding: {
      title: 'Kémiai kötés',
      summary: 'Ionkötés, kovalens kötés és fémkötés, valamint az ezeket megkülönböztető bizonyítékok.',
      q1: 'A NaCl legpontosabban így írható le:…',
      q2: 'Az olyan fém, mint a vas, az alábbiak tartják össze:…',
      q3: 'Hány kötést tud egyetlen szénatom kialakítani?',
      e1: 'A nátrium átadja külső elektronját a klórnak, így Na⁺ és Cl⁻ keletkezik, amelyeket az elektrosztatikus vonzás tart össze.',
      e2: 'A fémkötés a pozitív fémionok által közösen megosztott, delokalizált vegyértékelektronok tengerét használja, ezért vezetnek a fémek.',
      e3: 'A szénnek négy vegyértékelektronja van, és a második héján négy üres helye, ezért négy kovalens kötést alakít ki — az egész szerves kémia ezen áll.',
    },
  },

  sv: {
    readTheTable: {
      title: 'Läsa det periodiska systemet',
      summary:
        'Perioderna löper horisontellt, grupperna vertikalt. Lär dig vad varje axel styrer innan du memorerar ett enda tal.',
      q1: 'Vad ökar när du förflyttar dig från vänster till höger längs en period?',
      q2: 'Vilken egenskap har element i samma grupp gemensam?',
      q3: 'Var ritas lantanider och aktinider normalt?',
      e1: 'Atomnumret stiger med ett i varje steg, eftersom du lägger till en proton. Allt annat (radien minskar, elektronegativiteten stiger) följer av det.',
      e2: 'En grupp definieras av antalet valenselektroner, därför beter sig alkalimetallerna (1) och halogenerna (7) på liknande sätt.',
      e3: 'De är elementen i f-blocket, som dragits ut under tabellen så att kolumnerna 3–12 förblir läsbara. De hör fortfarande till period 6 och 7.',
    },
    atomicStructure: {
      title: 'Atomens uppbyggnad',
      summary:
        'Protonerna avgör vilket grundämne det är, neutronerna skapar isotopen, elektronerna skapar jonen. Tre partiklar, tre uppgifter.',
      q1: 'Vilken partikel bestämmer grundämnets identitet?',
      q2: 'Vad heter två atomer av samma grundämne med olika antal neutroner?',
      q3: 'Vad blir en natriumatom som tappar en elektron?',
      e1: 'Ändrar du protonerna, ändrar du grundämnet fullständigt. Med 25 protoner är det mangan, med 27 kobolt.',
      e2: 'Isotoper har samma antal protoner men skiljer sig i masstalet. Kol-12 och kol-14 är båda kol; kol-14 är radioaktivt.',
      e3: 'När en elektron förloras finns en proton mer än elektroner, så laddningen blir +1. Grundämnet är fortfarande natrium.',
    },
    electronConfig: {
      title: 'Elektronkonfiguration',
      summary:
        'Fyll subskalen i energiordning och läs sedan tillbaka konfigurationen. Aufbauprincipen, Hunds regel och ädelgasförkortningen.',
      q1: 'I vilken ordning fyller Aufbauprincipen subskalen?',
      q2: 'Hur många elektroner ryms i ett p-subskal?',
      q3: 'Vad betyder förkortningen [Ar]?',
      e1: 'Subskalen fylls med stigande n + l, så 4s (n+l = 4) kommer före 3d (n+l = 5). Därför skrivs kalium [Ar] 4s¹ och inte [Ar] 3d¹.',
      e2: 'Varje subskal rymmer 2(2ℓ+1) elektroner: s rymmer 2, p 6, d 10 och f 14.',
      e3: 'Ädelgasförkortningen ersätter hela konfigurationen för ett ädelgas. [Ar] 3d⁶ 4s² är järn: 18 + 6 + 2 = 26 elektroner.',
    },
    trends: {
      title: 'Periodiska trender',
      summary:
        'Radie, elektronegativitet och joniseringsenergi följer alla av en sak: hur hårt kärnan håller sina elektroner.',
      q1: 'Atomradien, generellt…',
      q2: 'Vilket grundämne har högst elektronegativitet?',
      q3: 'Varför är natriums första joniseringsenergi mycket lägre än neons?',
      e1: 'Nedåt i en grupp läggs skal på, så atomen blir fysiskt större. Längs en period drar den växande kärnladdningen samma skal inåt.',
      e2: 'Fluor ligger på 3,98 i Paulinskalan — högst av alla grundämnen — och drar hårdast i bindningselektronerna.',
      e3: 'Natriums 3s¹-elektron är skärmad och långt från kärnan. Nevons 2p⁶ sitter nära kärnan och hålls hårt, så det kostar mycket mer energi att dra bort en.',
    },
    ions: {
      title: 'Joner och fleratomiga joner',
      summary: 'Katjoner, anjoner och fleratomiga joner — varifrån laddningarna kommer och vad var och en gör i lösning.',
      q1: 'Hur många fler elektroner än protoner har en enatomig jon med laddningen 2−?',
      q2: 'Vilken av dessa är en fleratomig jon?',
      q3: 'Vilken laddning har en oxidjon?',
      e1: 'En negativ laddning betyder att jonen har tagit upp elektroner — 2− betyder två extra elektroner.',
      e2: 'Sulfatjonen innehåller fyra atomer som är bundna till varandra. Enatomiga joner som Na⁺ och Cl⁻ är vardera en enda atom.',
      e3: 'Syre finns i grupp 16 med sex valenselektroner och tar upp två för att nå oktett, vilket ger O²⁻.',
    },
    bonding: {
      title: 'Kemisk bindning',
      summary: 'Jonbindning, kovalent bindning och metallbindning, och bevisen som skiljer dem åt.',
      q1: 'NaCl beskrivs bäst som…',
      q2: 'En metall som järn hålls ihop av…',
      q3: 'Hur många bindningar kan en enda kolatom bilda?',
      e1: 'Natrium avger sin yttersta elektron till klor, vilket ger Na⁺ och Cl⁻ som hålls ihop av elektrostatisk attraxning.',
      e2: 'Metallbindningen använder ett hav av delokaliserade valenselektroner som delas av positiva metalljoner — därför leder metaller ström.',
      e3: 'Kol har fyra valenselektroner och fyra vakanta platser i det andra skalet, så det bildar fyra kovalenta bindningar — all organisk kemi vilar på det.',
    },
  },

  ro: {
    readTheTable: {
      title: 'Cum citești tabelul periodic',
      summary:
        'Perioadele se întind orizontal, grupurile vertical. Învață mai întâi ce controlează fiecare axă, înainte de a memora un singur număr.',
      q1: 'Ce crește când te deplasezi de la stânga la dreapta de-a lungul unei perioade?',
      q2: 'Ce proprietate au în comun elementele aceluiași grup?',
      q3: 'Unde se desenează de obicei lantanidele și actinidele?',
      e1: 'Numărul atomic crește cu unu la fiecare pas, pentru că adaugi un proton. Tot ce urmează (raza scade, electronegativitatea crește) decurge din asta.',
      e2: 'Un grup este definit de numărul electronilor de valență, de aceea metalele alcaline (1) și halogenii (7) se comportă asemănător.',
      e3: 'Sunt elementele blocului f, scoase sub tabel ca coloanele 3–12 să rămână lizibile. Aparțin în continuare perioadelor 6 și 7.',
    },
    atomicStructure: {
      title: 'Structura atomului',
      summary: 'Protonii decid elementul, neutronii fac izotopul, electronii fac ionul. Trei particule, trei roluri.',
      q1: 'Ce particulă determină identitatea unui element?',
      q2: 'Cum se numesc doi atomi ai aceluiași element cu numere diferite de neutroni?',
      q3: 'Ce devine un atom de sodiu care pierde un electron?',
      e1: 'Schimbi protonii și schimbi complet elementul. Cu 25 de protoni este manganul; cu 27 este cobaltul.',
      e2: 'Izotopii au același număr de protoni și diferă prin numărul de masă. Carbonul-12 și carbonul-14 sunt ambele carbon; carbonul-14 este radioactiv.',
      e3: 'Pierzând un electron rămâne un proton în plus față de electroni, deci sarcina este +1. Elementul rămâne sodiu.',
    },
    electronConfig: {
      title: 'Configurație electronică',
      summary:
        'Umple subnivelurile în ordinea energiei, apoi recitește configurația. Principiul Aufbau, regula lui Hund și notația gazelor rare.',
      q1: 'În ce ordine completează principiul Aufbau subnivelurile?',
      q2: 'Câți electroni încap într-un singur subnivel p?',
      q3: 'Ce înseamnă notația [Ar]?',
      e1: 'Subnivelurile se umplu în ordinea crescătoare a lui n + l, deci 4s (n+l = 4) vine înainte de 3d (n+l = 5). De aceea potasiul se scrie [Ar] 4s¹ și nu [Ar] 3d¹.',
      e2: 'Fiecare subnivel adăpostește 2(2ℓ+1) electroni: s adăpostește 2, p 6, d 10 și f 14.',
      e3: 'Notația gazului rar înlocuiește configurația completă a unui gaz rar. [Ar] 3d⁶ 4s² este fierul: 18 + 6 + 2 = 26 electroni.',
    },
    trends: {
      title: 'Tendințe periodice',
      summary:
        'Raza, electronegativitatea și energia de ionizare provin toate din același lucru: cât de strâns nucleul își ține electronii.',
      q1: 'Raza atomică, în general…',
      q2: 'Care element are cea mai mare electronegativitate?',
      q3: 'De ce energia de primă ionizare a sodiului este mult mai mică decât cea a neonului?',
      e1: 'Coborând într-un grup se adaugă straturi, deci atomul este mai mare ca dimensiuni. De-a lungul unei perioade, sarcina nucleară crescătoare trage același strat spre interior.',
      e2: 'Fluorul are 3,98 pe scara Pauling — cea mai mare valoare dintre toate elementele — și atrage cel mai puternic electronii de legătură.',
      e3: 'Electronul 3s¹ al sodiului este ecranat și departe de nucleu. Electronii 2p⁶ ai neonului sunt apropiați de nucleu și ținuți strâns, deci scoaterea unuia costă mult mai multă energie.',
    },
    ions: {
      title: 'Ioni și ioni poliatomici',
      summary: 'Cationi, anioni și ioni poliatomici — de unde apare sarcina și ce face fiecare în soluție.',
      q1: 'Un ion monoatomic cu sarcina 2− are câți electroni în plus față de protoni?',
      q2: 'Care dintre aceștia este un ion poliatomic?',
      q3: 'Ce sarcină are un ion oxid?',
      e1: 'Sarcina negativă înseamnă că ionul a câștigat electroni — 2− înseamnă doi electroni în plus.',
      e2: 'Ionul sulfat cuprinde patru atomi legate între ele. Ionii monoatomici precum Na⁺ și Cl⁻ sunt fiecare un singur atom.',
      e3: 'Oxigenul este în grupa 16, cu șase electroni de valență, și ia doi pentru a atinge octetul, dând O²⁻.',
    },
    bonding: {
      title: 'Legătură chimică',
      summary: 'Legătură ionică, covalentă și metalică, plus dovezile care le deosebesc.',
      q1: 'NaCl este cel mai bine descris ca…',
      q2: 'Un metal precum fierul este ținut laolaltă de…',
      q3: 'Câte legături poate forma un singur atom de carbon?',
      e1: 'Sodiul cedează electronul său exterior clorului, producând Na⁺ și Cl⁻ ținute împreună de atracția electrostatică.',
      e2: 'Legătura metalică folosește o mare de electroni de valență delocalizați, comuni ionilor metalici pozitivi — de aceea metalele conduc.',
      e3: 'Carbonul are patru electroni de valență și patru locuri vacante în al doilea strat, deci formează patru legături covalente — de asta depinde toată chimia organică.',
    },
  },

  el: {
    readTheTable: {
      title: 'Πώς διαβάζουμε τον περιοδικό πίνακα',
      summary:
        'Οι περίοδοι τρέχουν οριζόντια, οι ομάδες κάθετα. Μάθε τι ελέγχει κάθε άξονας πριν αποθησεύσεις έναν αριθμό.',
      q1: 'Τι αυξάνεται όταν κινούμαστε από αριστερά προς τα δεξιά κατά μήκος μιας περιόδου;',
      q2: 'Ποια ιδιότητα μοιράζονται τα στοιχεία της ίδιας ομάδας;',
      q3: 'Πού συνηθίζεται να σχεδιάζονται τα λανθανίδια και τα ακτινίδια;',
      e1: 'Ο ατομικός αριθμός αυξάνεται κατά ένα σε κάθε βήμα, γιατί προσθέτετε ένα πρωτόνιο. Όλα τα υπόλοιπα (ο ατομικός ακτίνιος μικρώνει, η ηλεκτροαρνητικότητα αυξάνεται) ακολουθούν από αυτό.',
      e2: 'Μια ομάδα ορίζεται από τον αριθμό των ηλεκτρονίων σθένους, γι’ αυτό τα αλκαλιμέταλλα (1) και τα αλογόνα (7) συμπεριφέρονται με παρόμοιο τρόπο.',
      e3: 'Είναι τα στοιχεία του μπλοκ f, που τραβούνται κάτω από τον πίνακα ώστε οι στήλες 3–12 να μένουν ευανάγνωστες. Ανήκουν και πάλι στις περιόδους 6 και 7.',
    },
    atomicStructure: {
      title: 'Δομή του ατόμου',
      summary:
        'Τα πρωτόνια καθορίζουν το στοιχείο, τα νετρόνια φτιάχνουν το ισότοπο, τα ηλεκτρόνια φτιάχνουν το ιόν. Τρία σωματίδια, τρεις δουλειές.',
      q1: 'Ποιο σωματίδιο καθορίζει την ταυτότητα ενός στοιχείου;',
      q2: 'Πώς ονομάζονται δύο άτομα του ίδιου στοιχείου με διαφορετικό αριθμό νετρονίων;',
      q3: 'Ένα άτομο νατρίου που χάνει ένα ηλεκτρόνιο γίνεται…',
      e1: 'Αλλάζετε τα πρωτόνια και αλλάζει εντελώς το στοιχείο. Με 25 πρωτόνια είναι μαγγανήσιο· με 27 είναι κοβάλτιο.',
      e2: 'Τα ισότοπα έχουν τον ίδιο αριθμό πρωτονίων και διαφέρουν στον αριθμό μάζας. Ο άνθρακας-12 και ο άνθρακας-14 είναι και οι δύο άνθρακας· ο άνθρακας-14 είναι ραδιενεργής.',
      e3: 'Όταν χάνεται ένα ηλεκτρόνιο μένει ένα πρωτόνιο παραπάνω από τα ηλεκτρόνια, οπότε το φορτίο είναι +1. Το στοιχείο παραμένει νάτριο.',
    },
    electronConfig: {
      title: 'Ηλεκτρονική διάταξη',
      summary:
        'Γεμίστε τις υποστιβάδες κατά σειρά ενέργειας και μετά διαβάστε ξανά τη διάταξη. Η αρχή του Aufbau, ο κανόνας του Hund και η συντομογραφία των αδρανών αερίων.',
      q1: 'Με ποια σειρά γεμίζει τις υποστιβάδες η αρχή του Aufbau;',
      q2: 'Πόσα ηλεκτρόνια χωρούν σε μία υποστιβάδα p;',
      q3: 'Τι σημαίνει η συντομογραφία [Ar];',
      e1: 'Οι υποστιβάδες γεμίζουν κατά αύξον n + l, άρα η 4s (n+l = 4) προηγείται της 3d (n+l = 5). Γι’ αυτό το κάλι γράφεται [Ar] 4s¹ και όχι [Ar] 3d¹.',
      e2: 'Κάθε υποστιβάδα χωράει 2(2ℓ+1) ηλεκτρόνια: η s χωράει 2, η p 6, η d 10 και η f 14.',
      e3: 'Η συντομογραφία αδρανούς αερίου αντικαθιστά την πλήρη διάταξη ενός αδρανούς αερίου. Το [Ar] 3d⁶ 4s² είναι το σίδηρος: 18 + 6 + 2 = 26 ηλεκτρόνια.',
    },
    trends: {
      title: 'Περιοδικές τάσεις',
      summary:
        'Η ακτίνα, η ηλεκτροαρνητικότητα και η ενέργεια ιονισμού προκύπτουν όλα από ένα πράγμα: πόσο σφιχτά ο πυρήνας κρατά τους ηλεκτρόνιά του.',
      q1: 'Η ατομική ακτίνα, γενικά…',
      q2: 'Ποιο στοιχείο έχει τη μεγαλύτερη ηλεκτροαρνητικότητα;',
      q3: 'Γιατί η πρώτη ενέργεια ιονισμού του νατρίου είναι πολύ μικρότερη από αυτή του νεονίου;',
      e1: 'Κατεβαίνοντας σε μια ομάδα προστίθενται στιβάδες, άρα το άτομο είναι φυσικά μεγαλύτερο. Κατά μήκος μιας περιόδου, το αυξανόμενο πυρηνικό φορτίο τραβά την ίδια στιβάδα προς τα μέσα.',
      e2: 'Το φθόριο έχει 3,98 στην κλίμακα του Pauling — την υψηλότερη τιμή ανάμεσα σε όλα τα στοιχεία — και τραβάει ισχυρότερα τα ηλεκτρόνια δεσμού.',
      e3: 'Το ηλεκτρόνιο 3s¹ του νατρίου είναι θωρακισμένο και μακριά από τον πυρήνα. Τα 2p⁶ του νεονίου βρίσκονται κοντά στον πυρήνα και κρατούνται σφιχτά, οπότε το να βγάλεις ένα κοστίζει πολύ περισσότερη ενέργεια.',
    },
    ions: {
      title: 'Ιόντα και πολυατομικά ιόντα',
      summary: 'Κατιόντα, ανιόντα και πολυατομικά ιόντα — από πού προκύπτει το φορτίο και τι κάνει το καθένα σε διάλυμα.',
      q1: 'Ένα μονοατομικό ιόν με φορτίο 2− έχει πόσα ηλεκτρόνια περισσότερα από τα πρωτόνια;',
      q2: 'Ποιο από αυτά είναι πολυατομικό ιόν;',
      q3: 'Τι φορτίο έχει ένα οξειδικό ιόν;',
      e1: 'Αρνητικό φορτίο σημαίνει ότι το ιόν κέρδισε ηλεκτρόνια — το 2− σημαίνει δύο ηλεκτρόνια παραπάνω.',
      e2: 'Το θειικό ιόν περιέχει τέσσερα άτομα συνδεμένα μεταξύ τους. Τα μονοατομικά ιόντα όπως το Na⁺ και το Cl⁻ είναι ένα μόνο άτομο το καθένα.',
      e3: 'Το οξυγόνο είναι στην ομάδα 16 με έξι ηλεκτρόνια σθένους και παίρνει δύο για να σχηματίσει οκτέτο, δίνοντας O²⁻.',
    },
    bonding: {
      title: 'Χημικός δεσμός',
      summary: 'Ιοντικός, ομοιοπολικός και μεταλλικός δεσμός, και τα στοιχεία που τους ξεχωρίζουν.',
      q1: 'Το NaCl περιγράφεται καλύτερα ως…',
      q2: 'Ένα μέταλλο όπως ο σίδηρος κρατιέται μαζί από…',
      q3: 'Πόσους δεσμούς μπορεί να σχηματίσει ένα μόνο άτομο άνθρακα;',
      e1: 'Το νάτριο παραδίδει το εξωτερικό του ηλεκτρόνιο στο χλώριο, δημιουργώντας Na⁺ και Cl⁻ που κρατούνται μαζί με ηλεκτροστατική έλξη.',
      e2: 'Ο μεταλλικός δεσμός χρησιμοποιεί μια θάλασσα από αποτοπισμένα ηλεκτρόνια σθένους που μοιράζονται τα θετικά ιόντα του μετάλλου — γι’ αυτό τα μέταλλα άγουν.',
      e3: 'Ο άνθρακας έχει τέσσερα ηλεκτρόνια σθένους και τέσσερις κενές θέσεις στο δεύτερο κέλυφος, οπότε σχηματίζει τέσσερις ομοιοπολικούς δεσμούς — όλη η οργανική χημεία στηρίζεται σε αυτό.',
    },
  },

  da: {
    readTheTable: {
      title: 'Sådan læser du det periodiske system',
      summary:
        'Perioderne løber vandret, grupperne lodret. Lær, hvad hver akse styrer, før du gem et eneste tal.',
      q1: 'Hvad stiger, når du bevæger dig fra venstre mod højre hen ad en periode?',
      q2: 'Hvilken egenskab har elementer i samme gruppe til fælles?',
      q3: 'Hvor tegnes lantanider og actinider normalt?',
      e1: 'Atomnummeret stiger med én for hvert skridt, fordi du tilføjer en proton. Alt andet (radiusen falder, elektronegativiteten stiger) følger heraf.',
      e2: 'En gruppe er defineret af antallet af valenselektroner, derfor opfører alkalimetallerne (1) og halogenerne (7) sig ens.',
      e3: 'Det er elementerne i f-blokken, der er trukket ud under tabellen, så spalterne 3–12 bliver læselige. De hører stadig til periode 6 og 7.',
    },
    atomicStructure: {
      title: 'Atomets opbygning',
      summary: 'Protonerne bestemmer elementet, neutronerne danner isotopen, elektronerne danner ionen. Tre partikler, tre opgaver.',
      q1: 'Hvilken partikel bestemmer elementets identitet?',
      q2: 'Hvad kaldes to atomer af samme element med forskelligt antal neutroner?',
      q3: 'Hvad bliver et natriumatom, der mister én elektron?',
      e1: 'Ændrer du protonerne, ændrer du elementet fuldstændig. Med 25 protoner er det mangan; med 27 er det kobolt.',
      e2: 'Isotoper har samme antal protoner og afviger i massetallet. Carbon-12 og carbon-14 er begge carbon; carbon-14 er radioaktiv.',
      e3: 'Når der tabes én elektron, er der én proton mere end elektroner, så ladningen bliver +1. Elementet er stadig natrium.',
    },
    electronConfig: {
      title: 'Elektronkonfiguration',
      summary:
        'Fyld underskallerne i energirækkefølge, og læs så konfigurationen tilbage. Aufbau-princippet, Hunds regel og ædelgasforkortelsen.',
      q1: 'I hvilken rækkefølge fylder Aufbau-princippet underskallerne?',
      q2: 'Hvor mange elektroner passer der i ét p-underskal?',
      q3: 'Hvad betyder forkortelsen [Ar]?',
      e1: 'Underskallerne fyldes med stigende n + l, så 4s (n+l = 4) kommer før 3d (n+l = 5). Derfor skrives kalium [Ar] 4s¹ og ikke [Ar] 3d¹.',
      e2: 'Hvert underskal rummer 2(2ℓ+1) elektroner: s rummer 2, p 6, d 10 og f 14.',
      e3: 'Ædelgasforkortelsen erstatter den fulde konfiguration for en ædelgas. [Ar] 3d⁶ 4s² er jern: 18 + 6 + 2 = 26 elektroner.',
    },
    trends: {
      title: 'Periodiske trends',
      summary: 'Radius, elektronegativitet og ioniseringsenergi følger alle af én ting: hvor hårdt kernen holder på sine elektroner.',
      q1: 'Atomradius, generelt…',
      q2: 'Hvilket element har den højeste elektronegativitet?',
      q3: 'Hvorfor er natriums første ioniseringsenergi meget lavere end neons?',
      e1: 'Går du ned gennem en gruppe, lægges der skaller til, så atomet er fysisk større. Går du tværs gennem en periode, trækker den voksende kerneladning den samme skal indad.',
      e2: 'Fluor ligger på 3,98 i Paulingskalaen — højst af alle elementer — og trækker hårdest i bindingelektronerne.',
      e3: 'Natriums 3s¹-elektron er skærmet og langt fra kernen. Neons 2p⁶ sidder tæt på kernen og holdes fast, så det koster langt mere energi at fjerne én.',
    },
    ions: {
      title: 'Ioner og fleratomige ioner',
      summary: 'Kationer, anioner og fleratomige ioner — hvor ladingerne kommer fra, og hvad hver af dem gør i opløsning.',
      q1: 'Et monoatomisk ion med ladningen 2− har hvor mange flere elektroner end protoner?',
      q2: 'Hvilket af disse er et fleratomisk ion?',
      q3: 'Hvilken ladning har en oxidion?',
      e1: 'En negativ ladning betyder, at ionet har vunnet elektroner — 2− betyder to ekstra elektroner.',
      e2: 'Sulfat-ionet består af fire atomer, der er bundet sammen. Monoatomiske ioner som Na⁺ og Cl⁻ er hvert især ét enkelt atom.',
      e3: 'Ilt er i gruppe 16 med seks valenselektroner og tager to for at nå oktetten, hvilket giver O²⁻.',
    },
    bonding: {
      title: 'Kemisk binding',
      summary: 'Ionisk, kovalent og metallisk binding, og de beviser, der adskiller dem.',
      q1: 'NaCl beskrives bedst som…',
      q2: 'Et metal som jern holdes sammen af…',
      q3: 'Hvor mange bindinger kan ét kulstofatom danne?',
      e1: 'Natrium afgiver sin yderste elektron til klor, hvilket giver Na⁺ og Cl⁻, der holdes sammen af elektrostatisk tiltrækning.',
      e2: 'Metalbinding bruger et hav af delokaliserede valenselektroner, der deles af positive metalioner — derfor leder metaller strøm.',
      e3: 'Kulstof har fire valenselektroner og fire ledige pladser i sit andet skal, så det danner fire kovalente bindinger — hele den organiske kemi bygger på det.',
    },
  },

  fi: {
    readTheTable: {
      title: 'Jaksollisen järjestelmän lukeminen',
      summary:
        'Jaksot kulkevat vaakasuunnassa, ryhmät pystysuunnassa. Oppi, mitä kukin akseli määrää, ennen kuin opitelet yhdenkään luvun.',
      q1: 'Mitä kasvaa, kun siirrytään vasemmalta oikealle jakson yli?',
      q2: 'Mitä ominaisuutta saman ryhmän alkiinit jakavat?',
      q3: 'Missä lantaanit ja aktiinit yleensä piirretään?',
      e1: 'Järjestysluku kasvaa joka askeleella yhdellä, koska lisäät yhden protonin. Kaikki muu (säde pienenee, elektronegatiivisuus kasvaa) seuraa tästä.',
      e2: 'Ryhmän määrittää valenssielektronien määrä, minkä vuoksi alkalimetallit (1) ja halogeenit (7) käyttäytyvät kukin omalla tavallaan samankaltaisesti.',
      e3: 'Ne ovat f-lohkon alkiinit, jotka on nostettu taulukon alle, jotta sarakkeet 3–12 pysyisivät luettavina. Ne kuuluvat silti 6. ja 7. jaksoon.',
    },
    atomicStructure: {
      title: 'Atomin rakenne',
      summary:
        'Protonit määräävät alkiinnon, neutronit tekevät isotoopin, elektronit tekevät ionin. Kolme hiukkasta, kolme tehtävää.',
      q1: 'Mikä hiukkas määrää, mikä alkiinto on kyseessä?',
      q2: 'Mitä kutsutaan kahdeksi atomiiksi, joilla on sama alkiinto ja eri neutronimäärä?',
      q3: 'Mitä yhdestä elektronista luopunut natriumatomi on…?',
      e1: 'Muutat protonien määrää, muutat alkiinnon kokonaan. 25 protonin lukumäärällä se on mangaani ja 27 protonin lukumäärällä kobolttia.',
      e2: 'Isotoopeilla on sama protonimäärä ja eri massiluku. Hiili-12 ja hiili-14 ovat molemmat hiiltä; hiili-14 on radioaktiivinen.',
      e3: 'Yhden elektronin menetettyään atomiilla on yksi protoni enemmän kuin elektroneja, joten varaus on +1. Alkiinto on yhä natrium.',
    },
    electronConfig: {
      title: 'Elektronikonfiguraatio',
      summary:
        'Täytä al-kuoret energian mukaan luettuna ja lue sitten konfiguraatio takaisin. Aufbaun periaate, Hundin sääntö ja jalokaasun lyhenne.',
      q1: 'Missä järjestyksessä Aufbaun periaate täyttää al-kuoret?',
      q2: 'Kuinka monta elektronia mahtuu yhteen p-al-kuoreen?',
      q3: 'Mitä lyhenne [Ar] tarkoittaa?',
      e1: 'Al-kuoret täyttyvät kasvavan n + l mukaan, joten 4s (n+l = 4) täyttyy ennen 3d (n+l = 5). Siksi kalium kirjoitetaan [Ar] 4s¹ eikä [Ar] 3d¹.',
      e2: 'Jokaiseen al-kuoreen mahtuu 2(2ℓ+1) elektronia: s-kuoreen 2, p-kuoreen 6, d-kuoreen 10 ja f-kuoreen 14.',
      e3: 'Jalokaasun lyhenne korvaa jalokaasun koko konfiguraation. [Ar] 3d⁶ 4s² on rauta: 18 + 6 + 2 = 26 elektronia.',
    },
    trends: {
      title: 'Jaksolliset trendit',
      summary:
        'Säde, elektronegatiivisuus ja ionisoitumisenergia johtuvat kaikki samasta: siitä, kuinka tiukasti ydin pitää elektroneistaan kiinni.',
      q1: 'Atomisäde yleensä…',
      q2: 'Millä alkiinteella on suurin elektronegatiivisuus?',
      q3: 'Miksi natriumin ensimmäinen ionisoitumisenergia on paljon pienempi kuin neoonin?',
      e1: 'Ryhmässä alaspurin mentäessä kuoria lisääntyy, joten atomi on fyysisesti suurempi. Jakson läpi kulkiessa kasvava ydinvaraus vetää samaa kuorta sisäänpäin.',
      e2: 'Fluori on 3,98 Paulingin asteikolla — kaikkien alkiintojen korkein arvo — ja se vetää sitoutumiselektroneja kaikkein voimakkaimmin.',
      e3: 'Natriumin 3s¹-elektroni on varjostettu ja kaukana ytimestä. Neonin 2p⁶ ovat lähellä ydintä ja pidetään tiukasti kiinni, joten yhden poistaminen maksaa paljon enemmän energiaa.',
    },
    ions: {
      title: 'Ionit ja moniosakkoiset ionit',
      summary: 'Kationit, anjonit ja moniosakkoiset ionit — mistä varaukset syntyvät ja mitä kukin tekee liuoksessa.',
      q1: 'Kuinka monta elektronia yksiatomisella 2−-varauksisella ionilla on enemmän kuin protoneita?',
      q2: 'Mikä näistä on moniosakkoinen ioni?',
      q3: 'Minkä varauksen oksidi-ioni kantaa?',
      e1: 'Negatiivinen varaus tarkoittaa, että ioni on vastaanottanut elektroneja — 2− tarkoittaa kahta ylimääräistä elektronia.',
      e2: 'Sulfaatti-ioni koostuu neljästä toisiinsa sidotusta atomista. Yksiatomiset ionit kuten Na⁺ ja Cl⁻ ovat kukin yksi atomi.',
      e3: 'Happi on ryhmässä 16 ja siinä on kuusi valenssielektronia; se ottaa kaksi saavuttaakseen oktetin, jolloin syntyy O²⁻.',
    },
    bonding: {
      title: 'Kemiallinen sidos',
      summary: 'Ioninen, kovalenttinen ja metallinen sidos sekä niiden erottavat todisteet.',
      q1: 'NaCl parhaiten kuvataan seuraavasti…',
      q2: 'Metalli kuten rauta pidetään yhdessä…',
      q3: 'Kuinka monta sidetta yksi hiiliatom voi muodostaa?',
      e1: 'Natrium luovuttaa ulkoaisan elektroninsa kloorille, jolloin syntyvät Na⁺ ja Cl⁻, joita pitää yhdessä sähköstaattinen vetovoima.',
      e2: 'Metallisidos perustuu delokalisoituneiden valenssielektronien mereen, jonka positiiviset metalli-ionit jakavat — siksi metallit johtavat sähköä.',
      e3: 'Hiilellä on neljä valenssielektronia ja neljä tyhjää paikkaa toisessa kuoressa, joten se muodostaa neljä kovalenttista sidosta — koko orgaaninen kemia perustuu tähän.',
    },
  },

  he: {
    readTheTable: {
      title: 'קריאת הטבלה המחזורית',
      summary:
        'התקופות נמתכות לאורך, הקבוצות לאורך האנך. למדו מה כל ציר שולט בו לפני שאתם שומרים על זיכרון מספר אחד.',
      q1: 'מה עולה כשזזים משמאל לימין לאורך תקופה?',
      q2: 'איזה מאפיין משותף ליש לאותה קבוצה?',
      q3: 'היכן מציירים בדרך כלל את הלנטנידים והאקטינידים?',
      e1: 'מספר האטומי עולה באחד בכל צעד, משום שאתם מוסיפים פרוטון אחד. כל השאר (הרדיוס מתכווץ, האלקטרושליליות עולה) נובע מכך.',
      e2: 'קבוצה מוגדרת לפי מספר אלקטרוני הערך, ולכן מתכות אלקליות (1) והלוגנים (7) מתנהגים כל אחד באופן דומה.',
      e3: 'אלה הם היסודות של בלוק f, שהוצאו מתחת לטבלה כדי שעמודות 3–12 יישארו קריאות. הם עדיין שייכים לתקופות 6 ו-7.',
    },
    atomicStructure: {
      title: 'מבנה האטום',
      summary: 'הפרוטונים קובעים את היסוד, הניטרונים יוצרים את האיזוטופ והאלקטרונים יוצרים את היון. שלושה חלקיקים, שלוש משימות.',
      q1: 'איזה חלקיק קובע את זהות היסוד?',
      q2: 'כיצד נקראים שני אטומים של אותו יסוד בעלי מספרי ניטרונים שונים?',
      q3: 'אטום נתריום שאיבד אלקטרון אחד הופך ל…?',
      e1: 'משנים את הפרוטונים ומשנים את היסוד כולו. עם 25 פרוטונים זהו מנגנז; עם 27 זהו קובלט.',
      e2: 'לאיזוטופים אותו מספר פרוטונים ומספר מסה שונה. פחמן-12 ופחמן-14 הם שניהם פחמן; פחמן-14 רדיואקטיבי.',
      e3: 'כשאלקטרון חסר, נותר פרוטון אחד יותר ממספר האלקטרונים, ולכן המטען הוא +1. היסוד עדיין נתריום.',
    },
    electronConfig: {
      title: 'קונפיגורציה אלקטרונית',
      summary:
        'ממלאים תת־קרוסות לפי סדר האנרגיה ואז קוראים חזרה את הקונפיגורציה. עקרון אופבאו, כלל הונד והכתיב המקוצר של גזי האציל.',
      q1: 'באיזה סדר עקרון אופבאו ממלא את התת־קרוסות?',
      q2: 'כמה אלקטרונים נכנסים לתת־קרוסה p אחת?',
      q3: 'מה משמעות הכתיב המקוצר [Ar]?',
      e1: 'תת־קרוסות מתמלאות לפי n + l עולה, ולכן 4s (n+l = 4) מגיעה לפני 3d (n+l = 5). לכן אשלגן נכתב [Ar] 4s¹ ולא [Ar] 3d¹.',
      e2: 'בכל תת־קרוסה נכנסים 2(2ℓ+1) אלקטרונים: s מכילה 2, p מכילה 6, d מכילה 10 ו-f מכילה 14.',
      e3: 'הכתיב המקוצר של גז אציל מחליף את הקונפיגורציה המלאה של גז אציל. [Ar] 3d⁶ 4s² הוא ברזל: 18 + 6 + 2 = 26 אלקטרונים.',
    },
    trends: {
      title: 'מגמות מחזוריות',
      summary:
        'הרדיוס, האלקטרושליליות ואנרגיית היוניזציה נובעים כולם מדבר אחד: כמה חזק הגרעין מחזיק באלקטרונים שלו.',
      q1: 'הרדיוס האטומי, באופן כללי…',
      q2: 'איזה יסוד בעל האלקטרושליליות הגבוהה ביותר?',
      q3: 'מדוע אנרגיית היוניזציה הראשונה של נתריום נמוכה בהרבה מזו של ניאון?',
      e1: 'בירידה בקבוצה מתווספות קרוסות, ולכן האטום גדול יותר מבחינה פיזית. לאורך תקופה, מטען גרעין העולה מושך את אותה קרוסה פנימה.',
      e2: 'הפלואורין הוא 3.98 בסולם פאולינג — הערך הגבוה ביותר מבין כל היסודות — והוא מושך את אלקטרוני הקשר בחוזקה הרבה ביותר.',
      e3: 'אלקטרון 3s¹ של נתריום מוסתר ורחוק מן הגרעין. אלקטרוני 2p⁶ של ניאון קרובים לגרעין ומוחזקים בחוזקה, ולכן הסרת אחד מהם עולה הרבה יותר אנרגיה.',
    },
    ions: {
      title: 'יונים ויונים רב־אטומיים',
      summary: 'קטיונים, אניונים ויונים רב־אטומיים — מאילה נוצר המטען ומה כל אחד מהם עושה בתמיסה.',
      q1: 'יון חד־אטומי במטען 2− כמה אלקטרונים יותר מפרוטונים?',
      q2: 'איזה מאלה הוא יון רב־אטומי?',
      q3: 'באיזה מטען נושא היון החמצני?',
      e1: 'מטען שלילי משמעו שהיון קיבל אלקטרונים — 2− פירושו שני אלקטרונים נוספים.',
      e2: 'יון הסולפט מורכב מארבעה אטומים הקשורים זה לזה. יונים חד־אטומיים כמו Na⁺ ו-Cl⁻ הם אטום יחיד כל אחד.',
      e3: 'החמצן נמצא בקבוצה 16 עם שישה אלקטרוני ערך, והוא צורך שניים כדי להגיע לאוקטט, וכך נוצר O²⁻.',
    },
    bonding: {
      title: 'קשר כימי',
      summary: 'קשר יוני, קשר קוולנטי וקשר מתכתי, והראיות שמבדילות ביניהם.',
      q1: 'איך מתארים NaCl בצורה המדויקת ביותר…',
      q2: 'מתכת כמו ברזל מוחזקת יחד באמצעות…',
      q3: 'כמה קשרים יכול אטום פחמן אחד ליצור?',
      e1: 'הנתריום מוסר את האלקטרון החיצוני שלו לכלור, ונוצרים Na⁺ ו-Cl⁻ המוחזקים יחד במשיכה אלקטרוסטטית.',
      e2: 'הקשר המתכתי משתמש בים של אלקטרוני ערך לא ממוקדים, המשותפים ליוני המתכת החיוביים — לכן מתכות מוליכות.',
      e3: 'לפחמן ארבעה אלקטרוני ערך וארבעה מקומות פנויים בקרוסה השנייה, ולכן הוא יוצר ארבעה קשרים קוולנטיים — כל הכימיה האורגנית נשענת על כך.',
    },
  },

  sk: {
    readTheTable: {
      title: 'Čítanie periodickej tabuľky',
      summary:
        'Periody bežia vodorovne, skupiny zvislo. Najprv pochopte, čo riadi každá os, kým si začnete memorovať jediné číslo.',
      q1: 'Čo rastie, keď postupujeme v perióde zľava doprava?',
      q2: 'Akú vlastnosť majú spoločnú prvky tej istej skupiny?',
      q3: 'Kde sa bežne kreslia lantanoidy a aktinoidy?',
      e1: 'Protónové číslo pri každom kroku vzrastie o jednu, pretože pridáte jeden protón. Všetko ostatné (polomer sa zmenšuje, elektronegativita rastie) z toho vyplýva.',
      e2: 'Skupina je určená počtom valenčných elektrónov, preto sa alkalické kovy (1) a halogény (7) správajú podobne.',
      e3: 'Sú to prvky f-bloku, vytiahnuté pod tabuľku, aby stĺpce 3–12 zostali čitateľné. Stále patria do 6. a 7. periódy.',
    },
    atomicStructure: {
      title: 'Štruktúra atómu',
      summary: 'Protóny určujú prvok, neutróny tvoria izotóp, elektróny tvoria ión. Tri častice, tri úlohy.',
      q1: 'Ktorá častica určuje identitu prvku?',
      q2: 'Ako sa volajú dva atómy toho istého prvku s rôznym počtom neutrónov?',
      q3: 'Atóm sodíka, ktorý stratí jeden elektrón, sa stane…',
      e1: 'Zmeníte protóny a zmeníte celý prvok. Pri 25 protónoch je to mangán, pri 27 kobalt.',
      e2: 'Izotópy majú rovnaký počet protónov a líšia sa nukleónovým číslom. Uhlík-12 aj uhlík-14 sú uhlík; uhlík-14 je rádioaktívny.',
      e3: 'Ak sa stratí elektrón, zostane o jeden protón viac než elektrónov, takže náboj je +1. Prvkom je naďalej sodík.',
    },
    electronConfig: {
      title: 'Elektrónová konfigurácia',
      summary:
        'Vyplňte podvrstvy v poradí energií a konfiguráciu si prečítajte späť. Aufbauov princíp, Hundovo pravidlo a skratka vzácnych plynov.',
      q1: 'V akom poradí vyplňa podvrstvy Aufbauov princíp?',
      q2: 'Koľko elektrónov sa zmestí do jednej podvrstvy p?',
      q3: 'Čo znamená skratka [Ar]?',
      e1: 'Podvrstvy sa vypĺňajú podľa rastúceho n + l, takže 4s (n+l = 4) skôr než 3d (n+l = 5). Preto sa draslík píše [Ar] 4s¹ a nie [Ar] 3d¹.',
      e2: 'Každá podvrstva pojme 2(2ℓ+1) elektrónov: s pojme 2, p 6, d 10, f 14.',
      e3: 'Skratka vzácneho plynu nahrádza úplnú konfiguráciu vzácneho plynu. [Ar] 3d⁶ 4s² je železo: 18 + 6 + 2 = 26 elektrónov.',
    },
    trends: {
      title: 'Periodické trendy',
      summary: 'Polomer, elektronegativita a ionizačná energia vyplývajú všetky z jedného: ako pevne jadro drží svoje elektróny.',
      q1: 'Atómový polomer všeobecne…',
      q2: 'Ktorý prvok má najvyššiu elektronegativitu?',
      q3: 'Prečo je prvá ionizačná energia sodíka oveľa nižšia než neónu?',
      e1: 'Pri zostupovaní v skupine pribudnú vrstvy, takže atóm je fyzicky väčší. Pozdĺž periódy rastúci náboj jadra ťahu tú istú vrstvu dovnútra.',
      e2: 'Fluór má na Paulingovej stupnici 3,98 — najvyššiu hodnotu zo všetkých prvkov — a najviac priťahuje väzbové elektróny.',
      e3: 'Elektrón 3s¹ sodíka je odtienený a ďaleko od jadra. Elektróny 2p⁶ neónu sú blízko jadra a pevne držané, takže vytrhnutie jedného stojí oveľa viac energie.',
    },
    ions: {
      title: 'Ióny a polyatómové ióny',
      summary: 'Katióny, anióny a polyatómové ióny — odkiaľ pochádza náboj a čo každý z nich robí v roztoku.',
      q1: 'Jednoatómový ión s nábojom 2− má o koľko elektrónov viac než protónov?',
      q2: 'Ktorý z nich je polyatómovým iónom?',
      q3: 'Aký náboj má oxidový ión?',
      e1: 'Záporný náboj znamená, že ión prijal elektróny — 2− znamená dva elektróny navyše.',
      e2: 'Síranový ión obsahuje štyri navzájom spojené atómy. Jednoatómové ióny ako Na⁺ a Cl⁻ sú vždy jediný atóm.',
      e3: 'Kyslík je v skupine 16 so šiestimi valenčnými elektrónmi a prijme dva, aby dosiahol oktet; vznikne O²⁻.',
    },
    bonding: {
      title: 'Chemická väzba',
      summary: 'Iónová, kovalenčná a kovová väzba a dôkazy, ktoré ich od seba odlišujú.',
      q1: 'NaCl sa najlepšie opisuje ako…',
      q2: 'Kov ako železo drží pohromade vďaka…',
      q3: 'Koľko väzieb môže vytvoriť jediný atóm uhlíka?',
      e1: 'Sodík odovzdá svoj valenčný elektrón chlóru, čím vznikne Na⁺ a Cl⁻, ktoré drží pohromade elektrostatická príťažlivosť.',
      e2: 'Kovová väzba využíva more delokalizovaných valenčných elektrónov zdieľaných kladnými katiónmi kovu — preto kovy vedia vodiť prúd.',
      e3: 'Uhlík má štyri valenčné elektróny a štyri prázdne miesta v druhej vrstve, takže vytvorí štyri kovalenčné väzby — na tom stojí celá organická chémia.',
    },
  },

  bg: {
    readTheTable: {
      title: 'Четене на периодичната таблица',
      summary:
        'Периодите текат хоризонтално, групите — вертикално. Първо разберете какво определя всяка ос, преди да запомните дори едно число.',
      q1: 'Какво се увеличава, когато се движим отляво надясно по един период?',
      q2: 'Какво свойство споделят елементите от една и съща група?',
      q3: 'Къде обикновено се изобразяват лантаноидите и актиноидите?',
      e1: 'Атомният номер нараства с единица на всяка стъпка, защото добавяте един протон. Всичко останало (радиусът намалява, електроотрицателността нараства) следва от това.',
      e2: 'Групата се определя от броя на валентните електрони, затова алкалните метали (1) и халогените (7) се държат сходно.',
      e3: 'Това са елементите на f-блока, изнесени под таблицата, за колоните 3–12 да останат четими. Те все така принадлежат на 6-тия и 7-мия период.',
    },
    atomicStructure: {
      title: 'Строеж на атома',
      summary: 'Протоните определят елемента, неутроните създават изотопа, електроните създават йона. Три частици, три задачи.',
      q1: 'Коя частица определя елемента?',
      q2: 'Как се наричат два атома на един и същ елемент с различен брой неутрони?',
      q3: 'Атом на натрий, който губи един електрон, става…',
      e1: 'Промените протоните и променяте самия елемент. С 25 протона е манган, а с 27 е кобалт.',
      e2: 'Изотопите имат еднакъв брой протони и се различават по масово число. Въглерод-12 и въглерод-14 са и двата въглерод; въглерод-14 е радиоактивен.',
      e3: 'При загуба на електрон остава един протон повече от електроните, затова зарядът е +1. Елементът остава натрий.',
    },
    electronConfig: {
      title: 'Електронна конфигурация',
      summary:
        'Запълвайте подслоевете по енергия и след това прочетете конфигурацията обратно. Принцип на Ауфбау, правило на Хунд и съкратеното записване с благородни газове.',
      q1: 'В какъв ред принципът на Ауфбау запълва подслоевете?',
      q2: 'Колко електрона се побират в един p подслой?',
      q3: 'Какво означава съкратеното записване [Ar]?',
      e1: 'Подслоевете се запълват по нарастване на n + l, затова 4s (n+l = 4) идва преди 3d (n+l = 5). Затова калият се записва като [Ar] 4s¹, а не [Ar] 3d¹.',
      e2: 'Всеки подслой побира 2(2ℓ+1) електрона: s побира 2, p — 6, d — 10, f — 14.',
      e3: 'Съкратеното записване с благороден газ замества пълната конфигурация на благороден газ. [Ar] 3d⁶ 4s² е желязото: 18 + 6 + 2 = 26 електрона.',
    },
    trends: {
      title: 'Периодични закономерности',
      summary:
        'Радиусът, електроотрицателността и енергията на йонизация произлизат от едно и също: колко здраво ядрото държи електроните си.',
      q1: 'Атомният радиус, общо…',
      q2: 'Кой елемент има най-висока електроотрицателност?',
      q3: 'Защо първата енергия на йонизация на натрия е много по-ниска от тази на неона?',
      e1: 'Надолу по група се добавят слоеве, затова атомът е физически по-голям. По една линия наглед нарастването на ядрения заряд притегля същия слой навътре.',
      e2: 'Флуорът е 3,98 по скалата на Полинг — най-високата стойност сред всички елементи — и той привлича най-силно свързващите електрони.',
      e3: 'Електронът 3s¹ на натрия е екраниран и далеч от ядрото. Електроните 2p⁶ на неона са близо до ядрото и са здраво задържани, така че отстраняването на един струва много повече енергия.',
    },
    ions: {
      title: 'Йони и многоатомни йони',
      summary: 'Катиони, аниони и многоатомни йони — откъде идва зарядът и какво прави всеки от тях в разтвор.',
      q1: 'Едноатомен йон със заряд 2− има колко повече електрони от протоните?',
      q2: 'Кой от тях е многоатомен йон?',
      q3: 'Какъв заряд носи оксидният йон?',
      e1: 'Отрицателният заряд означава, че йонът е приел електрони — 2− означава два излишни електрона.',
      e2: 'Сулфатният йон съдържа четири свързани помежду си атома. Едноатомните йони като Na⁺ и Cl⁻ са всеки един-един атом.',
      e3: 'Кислородът е в 16-а група с шест валентни електрона и приема два, за да достигне октет, като дава O²⁻.',
    },
    bonding: {
      title: 'Химична връзка',
      summary: 'Йонна, ковалентна и метална връзка и доказателствата, които ги различават.',
      q1: 'NaCl най-точно се описва като…',
      q2: 'Метал като желязо се държи заедно чрез…',
      q3: 'Колко връзки може да образува един атом въглерод?',
      e1: 'Натрият отдава своя външен електрон на хлора, като се получават Na⁺ и Cl⁻, задържани заедно от електростатично притегляне.',
      e2: 'Металната връзка използва море от делокализирани валентни електрони, споделяни от положителните метални йони — затова металите провеждат ток.',
      e3: 'Въглеродът има четири валентни електрона и четири празни места във втория слой, така че образува четири ковалентни връзки — върху тях стои цялата органична химия.',
    },
  },

  hr: {
    readTheTable: {
      title: 'Čitanje periodnog sustava',
      summary:
        'Periodi teku vodoravno, skupine okomito. Prije nego što zapamtiš i jedan broj, razumij što svaka os određuje.',
      q1: 'Što raste kako se krećemo slijeva nadesno unutar jednog perioda?',
      q2: 'Koje svojstvo dijele elementi iste skupine?',
      q3: 'Gdje se obično crtaju lantanoidi i aktinoidi?',
      e1: 'Atomski broj raste za jedan u svakom koraku jer dodaješ proton. Sve ostalo (polumjer se smanjuje, elektronegativnost raste) slijedi od toga.',
      e2: 'Skupina je određena brojem valentnih elektrona, zato se alkalijski metali (1) i halogeni (7) ponašaju slično.',
      e3: 'To su elementi f-bloka, izvučeni ispod tablice kako bi stupci 3–12 ostali čitljivi. I dalje pripadaju 6. i 7. periodu.',
    },
    atomicStructure: {
      title: 'Struktura atoma',
      summary: 'Protoni određuju element, neutroni tvore izotop, elektroni tvore ion. Tri čestice, tri zadaće.',
      q1: 'Koja čestica određuje identitet elementa?',
      q2: 'Kako se zovu dva atoma istog elementa s različitim brojem neutrona?',
      q3: 'Atom natrija koji izgubi jedan elektron postaje…',
      e1: 'Promijeniš protone i promijeniš cijeli element. S 25 protona to je mangan, a s 27 kobalt.',
      e2: 'Izotopi imaju jednak broj protona i razlikuju se brojem mase. Ugljik-12 i ugljik-14 oba su ugljik; ugljik-14 je radioaktivan.',
      e3: 'Kad se izgubi elektron, ostane jedan proton više od elektrona, pa je naboj +1. Element je i dalje natrij.',
    },
    electronConfig: {
      title: 'Elektronska konfiguracija',
      summary:
        'Ispuni podlijeve po redu energije, a zatim pročitaj konfiguraciju unatrag. Aufbauovo načelo, Hundovo pravilo i kratica plemenitih plinova.',
      q1: 'Kojim redoslijedom Aufbauovo načelo puni podlijeve?',
      q2: 'Koliko elektrona stane u jedan p podlijev?',
      q3: 'Što znači kratica [Ar]?',
      e1: 'Podlijevi se pune rastućim n + l, pa 4s (n+l = 4) dolazi prije 3d (n+l = 5). Zato se kalij piše [Ar] 4s¹, a ne [Ar] 3d¹.',
      e2: 'Svaki podlijev prima 2(2ℓ+1) elektrona: s prima 2, p 6, d 10, f 14.',
      e3: 'Kratica plemenitog plina zamjenjuje potpunu konfiguraciju plemenitog plina. [Ar] 3d⁶ 4s² je željezo: 18 + 6 + 2 = 26 elektrona.',
    },
    trends: {
      title: 'Periodični trendovi',
      summary: 'Polumjer, elektronegativnost i energija ionizacije sve proizlaze iz jednog: koliko čvrsto jezgra drži svoje elektrone.',
      q1: 'Atomski polumjer, općenito…',
      q2: 'Koji element ima najveću elektronegativnost?',
      q3: 'Zašto je prva energija ionizacije natrija mnogo niža od neonove?',
      e1: 'Silazak skupinom dodaju se ljuske, pa je atom fizički veći. Duž perioda rastući nuklearni naboj vuče istu ljusku prema unutrašnjosti.',
      e2: 'Fluor je 3,98 na Paulingovoj skali — najviša vrijednost među svim elementima — i najjače privlači vezne elektrone.',
      e3: 'Elektron 3s¹ natrija je zaštićen i daleko od jezgre. Elektroni 2p⁶ neona blizu su jezgre i čvrsto se drže, pa izvajanje jednog stoji mnogo više energije.',
    },
    ions: {
      title: 'Ioni i poliatomski ioni',
      summary: 'Kationi, anioni i poliatomski ioni — odakle potječe naboj i što svaki od njih radi u otopini.',
      q1: 'Monoatomski ion s nabojem 2− ima koliko više elektrona od protona?',
      q2: 'Koji je od njih poliatomski ion?',
      q3: 'Koji naboj nosi oksidni ion?',
      e1: 'Negativan naboj znači da je ion dobio elektrone — 2− znači dva dodatna elektrona.',
      e2: 'Sulfatni ion sadrži četiri atoma povezana međusobno. Monoatomski ioni poput Na⁺ i Cl⁻ svaki su jedan atom.',
      e3: 'Kisik je u 16. skupini sa šest valentnih elektrona i prima dva da dosegne oktet, dajući O²⁻.',
    },
    bonding: {
      title: 'Kemijska veza',
      summary: 'Ionska, kovalentna i metalna veza te dokazi koji ih razlikuju.',
      q1: 'NaCl se najbolje opisuje kao…',
      q2: 'Metal poput željeza drži se zajedno zahvaljujući…',
      q3: 'Koliko veza može stvoriti jedan atom ugljika?',
      e1: 'Natrij predaje svoj vanjski elektron kloru, čime nastaju Na⁺ i Cl⁻ koje drži zajedno elektrostatsko privlačenje.',
      e2: 'Metalna veza koristi more delokaliziranih valentnih elektrona koje dijele pozitivni metalni ioni — zato metali vode struju.',
      e3: 'Ugljik ima četiri valentna elektrona i četiri prazna mjesta u drugoj ljusci, pa stvara četiri kovalentne veze — na tome stoji cijela organska kemija.',
    },
  },

  sr: {
    readTheTable: {
      title: 'Читање периодног система',
      summary:
        'Периоди теку хоризонтално, групе вертикално. Пре него што запамтиш и један број, разуми шта свака оса одређује.',
      q1: 'Шта расте како се крећемо слева надесно унутар једног периода?',
      q2: 'Које својство деле елементи исте групе?',
      q3: 'Где се обично цртају лантаноиди и актиноиди?',
      e1: 'Атомски број расте за један у сваком кораку јер додајеш протон. Све остало (полупречник се смањује, електронегативност расте) следи из тога.',
      e2: 'Група је одређена бројем валентних електрона, зато се алкалски метали (1) и халогени (7) понашају слично.',
      e3: 'То су елементи f-блока, извучени испод табеле како би колоне 3–12 остале читљиве. И даље припадају 6. и 7. периоду.',
    },
    atomicStructure: {
      title: 'Структура атома',
      summary: 'Протони одређују елемент, неутрони праве изотоп, електрони праве јон. Три честице, три задатка.',
      q1: 'Која честица одређује идентитет елемента?',
      q2: 'Како се зову два атома истог елемента са различитим бројем неутрона?',
      q3: 'Атом натријума који изгуби један електрон постаје…',
      e1: 'Ако промениш протоне, промениш цео елемент. Са 25 протона то је манган, а са 27 кобалт.',
      e2: 'Изотопи имају исти број протона и разликују се по броју масе. Угљеник-12 и угљеник-14 оба су угљеник; угљеник-14 је радиоактиван.',
      e3: 'Када се електрон изгуби, остане један протон више од електрона, па је набој +1. Елемент је и даље натријум.',
    },
    electronConfig: {
      title: 'Електронска конфигурација',
      summary:
        'Испуни подљуске по реду енергије, а затим прочитај конфигурацију назад. Ауфбауов принцип, Хундово правило и скраћеница племенитих гасова.',
      q1: 'Којим редом Ауфбауов принцип пуни подљуске?',
      q2: 'Колико електрона стаје у једној p подљуски?',
      q3: 'Шта значи скраћеница [Ar]?',
      e1: 'Подљуске се пуне растућим n + l, па 4s (n+l = 4) долази пре 3d (n+l = 5). Зато се калијум пише [Ar] 4s¹, а не [Ar] 3d¹.',
      e2: 'Свака подљуска прима 2(2ℓ+1) електрона: s прима 2, p 6, d 10, f 14.',
      e3: 'Скраћеница племенитог гаса замењује потпуну конфигурацију племенитог гаса. [Ar] 3d⁶ 4s² је гвожђе: 18 + 6 + 2 = 26 електрона.',
    },
    trends: {
      title: 'Периодични трендови',
      summary:
        'Полупречник, електронегативност и енергија јонизације све проистичу из једног: колико чврсто језгро држи своје електроне.',
      q1: 'Атомски полупречник, уопште…',
      q2: 'Који елемент има највећу електронегативност?',
      q3: 'Зашто је прва енергија јонизације натријума много нижа од неонске?',
      e1: 'Спуштање низ групу додаје љуске, па је атом физички већи. Дуж периода растуће нуклеарно оптерећење вуче исту љуску ка унутрашњости.',
      e2: 'Флуор је 3,98 на Паулинговој скали — највиша вредност међу свим елементима — и најјаче привлачи везне електроне.',
      e3: 'Електрон 3s¹ натријума је заштићен и далеко од језгра. Електрони 2p⁶ неона су близу језгра и чврсто се држе, па извазивање једног кошта много више енергије.',
    },
    ions: {
      title: 'Јони и полиатомски јони',
      summary: 'Катјони, анјони и полиатомски јони — одакле потиче набој и шта сваки од њих ради у раствору.',
      q1: 'Моноатомски јон са набојем 2− има колико више електрона од протона?',
      q2: 'Који је од њих полиатомски јон?',
      q3: 'Који набој носи оксидни јон?',
      e1: 'Негативан набој значи да је јон добио електроне — 2− значи два додатна електрона.',
      e2: 'Сулфатни јон садржи четири атома повезана међусобно. Моноатомски јони попут Na⁺ и Cl⁻ сваки су један атом.',
      e3: 'Кисеоник је у 16. групи са шест валентних електрона и прима два да достигне октет, дајући O²⁻.',
    },
    bonding: {
      title: 'Хемијска веза',
      summary: 'Јонска, ковалентна и метална веза, и докази који их разликују.',
      q1: 'NaCl се најбоље описује као…',
      q2: 'Метал као гвожђе држи се заједно захваљујући…',
      q3: 'Колико веза може створити један атом угљеника?',
      e1: 'Натријум предаје свој спољашњи електрон хлору, чиме настају Na⁺ и Cl⁻ које држи заједно електростатичко привлачење.',
      e2: 'Метална веза користи море делокализованих валентних електрона које деле позитивни метални јони — зато метали проводе струју.',
      e3: 'Угљеник има четири валентна електрона и четири празна места у другој љуски, па ствара четири ковалентне везе — на томе стоји цела органска хемија.',
    },
  },

  lt: {
    readTheTable: {
      title: 'Periodiškumo lentelės skaitymas',
      summary:
        'Periodai eina skersai, grupės — žemyn. Prieš įsimant kurį skaičių, supraskite, ką kiekviena ašis valdo.',
      q1: 'Kas didėja, kai einama per periodą iš kairės į dešinę?',
      q2: 'Kokį bendrą požymį turi vienos grupės elementai?',
      q3: 'Kur įprastai piešiamos lantanoidai ir aktinoidai?',
      e1: 'Atominis numeris kiekviename žingsnyje padidėja vienu, nes pridedate protoną. Visa kita (radijus mažėja, elektronegatyvumas kyla) iš to seka.',
      e2: 'Grupę apibrėžia valentinių elektronų skaičius, todėl šarminiai metalai (1) ir halogenai (7) elgiasi panašiai.',
      e3: 'Tai f bloko elementai, ištraukti po lentele, kad 3–12 stulpeliai liktų įskaitomi. Jie vis dar priklauso 6 ir 7 periodams.',
    },
    atomicStructure: {
      title: 'Atomo sandara',
      summary: 'Protonai apibrėžia elementą, neutronai sudaro izotopą, elektronai sudaro joną. Trys dalelės, trys uždaviniai.',
      q1: 'Kuri dalelė nustato cheminio elemento tapatybę?',
      q2: 'Kaip vadinami du to paties elemento atomai su skirtingu neutronų skaičiumi?',
      q3: 'Kuo tampa natrio atomas, praradęs vieną elektroną?',
      e1: 'Pakeitę protonus, pakeičiate elementą. Su 25 protonais tai būtų manganas, su 27 — kobaltas.',
      e2: 'Izotopai turi vienodą protonų skaičių ir skiriasi masės skaičiumi. Anglis-12 ir anglis-14 — abi anglis; anglis-14 yra radioaktyvi.',
      e3: 'Praradus elektroną, protonų yra vienu daugiau nei elektronų, todėl krūvis yra +1. Elementas lieka natris.',
    },
    electronConfig: {
      title: 'Elektronų konfigūracija',
      summary:
        'Užpildykite punderius energijos tvarkingu ir perskaitykite konfigūraciją atgal. Aufbau principas, Hundo taisyklė ir kilmingųjų dujų sutrumpinimas.',
      q1: 'Kokia tvarka Aufbau principas užpildo punderius?',
      q2: 'Kiek elektronų telpa viename p pundyre?',
      q3: 'Ką reiškia sutrumpinimas [Ar]?',
      e1: 'Punderiai užpildomi didėjant n + l, todėl 4s (n+l = 4) užpildomas anksčiau nei 3d (n+l = 5). Todėl kalis rašomas [Ar] 4s¹, o ne [Ar] 3d¹.',
      e2: 'Kiekviename pundyre telpa 2(2ℓ+1) elektronai: s telpa 2, p — 6, d — 10, f — 14.',
      e3: 'Kilmingojo dujo sutrumpinimas pakeičia visą dujos konfigūraciją. [Ar] 3d⁶ 4s² yra geležis: 18 + 6 + 2 = 26 elektronai.',
    },
    trends: {
      title: 'Periodiniai trendai',
      summary:
        'Radijus, elektronegatyvumas ir jonizacijos energija visos kyla iš vieno dalyko: kaip stipriai branduolys laiko savo elektronus.',
      q1: 'Atominis radijus apytiksliai…',
      q2: 'Kuris elementas turi didžiausią elektronegatyvumą?',
      q3: 'Kodėl natrio pirmoji jonizacijos energija yra daug mažesnė nei neono?',
      e1: 'Leidžiantis grupėje žemyn, prisideda sluoksniai, todėl atomas yra fiziškai didesnis. Eidamas per periodą, didėjantis branduolio krūvis traukia tą patį sluoksnį į vidų.',
      e2: 'Fluoras yra 3,98 Pagalingo skaleje — didžiausia reikšmė iš visų elementų — ir jis stipriausiai traukia ryšio elektronus.',
      e3: 'Natrio 3s¹ elektronas yra ekranuotas ir toli nuo branduolio. Neono 2p⁶ yra arti branduolio ir tvirtai laikomi, todėl vieno pašalinimas kainuoja daug daugiau energijos.',
    },
    ions: {
      title: 'Jonai ir poliatominiai jonai',
      summary: 'Kationai, anijonai ir poliatominiai jonai — iš kur atsiranda krūvis ir ką kiekvienas daro tirpale.',
      q1: 'Monoatominis jonas su 2− krūviu turi keliais daugiau elektronų nei protonų?',
      q2: 'Kuris iš jų yra poliatominis jonas?',
      q3: 'Kokį krūvį turi oksido jonas?',
      e1: 'Neigiamas krūvis reiškia, kad jonas gavo elektronus — 2− reiškia du papildomus elektronus.',
      e2: 'Sulfato jonas susideda iš keturių tarpusavyje susijungusių atomų. Monoatominiai jonai, tokie kaip Na⁺ ir Cl⁻, kiekvienas yra vienas atomas.',
      e3: 'Deguonis yra 16 grupėje su šešiais valentiniais elektronais ir gauna du, kad pasiektų oktetą, duodamas O²⁻.',
    },
    bonding: {
      title: 'Cheminis ryšys',
      summary: 'Joninis, kovalentinis ir metalinis ryšys bei įrodymai, kuriuos jie skiriasi.',
      q1: 'NaCl geriausiai apibūdinamas kaip…',
      q2: 'Metalas, pavyzdžiui, geležis, yra laikomas kartu dėl…',
      q3: 'Kiek ryšių gali sudaryti vienas anglies atomas?',
      e1: 'Natriumas perduoda savo išorinį elektroną chlorui, susidaro Na⁺ ir Cl⁻, kuriuos laiko kartu elektrostatinė trauka.',
      e2: 'Metalinis ryšys naudoja jūrą delokalizuotų valentinių elektronų, kuriuos dalijasi teigiami metalų jonai — todėl metalai laidina srovę.',
      e3: 'Anglis turi keturis valentinius elektronus ir keturias laisvas vietas antrame sluoksnyje, todėl sudaro keturis kovalentinius ryšius — ant jų stovi visa organinė chemija.',
    },
  },

  bn: {
    readTheTable: {
      title: 'পর্যায় সারণি পড়া',
      summary:
        'পর্যায় আড়াআড়ি চলে, দল লম্বালম্বি। একটি সংখ্যাও মুখস্থ না করার আগে জেনে নিন প্রতিটি অক্ষ কী নিয়ন্ত্রণ করে।',
      q1: 'একটি পর্যায়ে বাম থেকে ডানে গেলে কী বাড়ে?',
      q2: 'একই দলের মৌলগুলোর মধ্যে কোন গুণাগুণ সাধারণ?',
      q3: 'ল্যান্থানাইড ও অ্যাকটিনাইড সাধারণত কোথায় আঁকা হয়?',
      e1: 'প্রতিটি ধাপে পরমাণু সংখ্যা এক বাড়ে, কারণ আপনি একটি প্রোটন যোগ করেন। বাকি সবই (ব্যাসার্ধ কমে, তড়িৎঋণাত্মকতা বাড়ে) এখান থেকেই আসে।',
      e2: 'দল নির্ধারিত হয় শুঙ্ক ইলেকট্রনের সংখ্যা দিয়ে, তাই ক্ষারীয় ধাতু (1) ও হ্যালোজেন (7) নিজ নিজ দলে একই রকম আচরণ করে।',
      e3: 'এরা f-ব্লকের মৌল, যাদের 3–12 নম্বর কলাম পড়ার উপযোগী রাখতে সারণির নিচে বের করে রাখা হয়; তবু এরা 6 ও 7 পর্যায়ের অন্তর্ভুক্ত।',
    },
    atomicStructure: {
      title: 'পরমাণুর গঠন',
      summary: 'প্রোটন মৌল নির্ধারণ করে, নিউট্রন সমস্থানী গড়ে, ইলেকট্রন আয়ন তৈরি করে। তিনটি কণিকা, তিনটি কাজ।',
      q1: 'কোন কণিকাটি মৌলের পরিচয় নির্ধারণ করে?',
      q2: 'একই মৌলের নিউট্রন সংখ্যা ভিন্ন দুটি পরমাণুকে কী বলে?',
      q3: 'একটি ইলেকট্রন হারানো সোডিয়াম পরমাণু কী হয়ে ওঠে?',
      e1: 'প্রোটন বদলালেই মৌলটাই বদলে যায়। 25টি প্রোটন থাকলে সেটি ম্যাঙ্গানিজ, 27টি থাকলে কোবাল্ট।',
      e2: 'সমস্থানীগুলোর প্রোটন সংখ্যা একই থাকে আর ভর সংখ্যা আলাদা। কার্বন-12 ও কার্বন-14 দুটোই কার্বন; কার্বন-14 তেজস্ক্রিয়।',
      e3: 'একটি ইলেকট্রন চলে গেলে প্রোটন ইলেকট্রনের চেয়ে এক বেশি থাকে, তাই চার্জ +1 হয়। মৌল তবুও সোডিয়ামই থাকে।',
    },
    electronConfig: {
      title: 'ইলেকট্রন বিন্যাস',
      summary:
        'উপককোষ তথ্য বিন্যাস অনুযায়ী পূরণ করে তারপর বিন্যাসটি পড়ে নিন। অফবাউ নীতি, হুন্ডের নিয়ম ও মহৎ গ্যাসের সংক্ষিপ্ত রীতি।',
      q1: 'অফবাউ নীতি উপককোষগুলো কী ক্রমে পূরণ করে?',
      q2: 'একটি p উপককোষে কতটি ইলেকট্রন ধরে?',
      q3: '[Ar] সংক্ষিপ্ত রীতির অর্থ কী?',
      e1: 'উপককোষ n + l বাড়ার ক্রমে পূরিত হয়, তাই 4s (n+l = 4) আসে 3d (n+l = 5)-এর আগে। তাই পটাশিয়াম লেখা হয় [Ar] 4s¹, [Ar] 3d¹ নয়।',
      e2: 'প্রতিটি উপককোষে 2(2ℓ+1)টি ইলেকট্রন ধরে: s-এ 2, p-তে 6, d-তে 10, f-তে 14।',
      e3: 'মহৎ গ্যাসের সংক্ষেপ বিন্যাস, সেই গ্যাসের সম্পূর্ণ বিন্যাসের বদলে বসে। [Ar] 3d⁶ 4s² হলো লোহা: 18 + 6 + 2 = 26 ইলেকট্রন।',
    },
    trends: {
      title: 'পর্যায়বর্তী প্রবণতা',
      summary:
        'ব্যাসার্ধ, তড়িৎঋণাত্মকতা ও আয়নীকরণ শক্তি — সবই একটিই বিষয় থেকে উঠে আসে: নিউক্লিয়াস ইলেকট্রনগুলোকে কতটা শক্ত করে ধরে রাখে।',
      q1: 'পরমাণু ব্যাসার্ধ সাধারণভাবে…',
      q2: 'কোন মৌলের তড়িৎঋণাত্মকতা সর্বাধিক?',
      q3: 'কেন সোডিয়ামের প্রথম আয়নীকরণ শক্তি নিয়নের চেয়ে অনেক কম?',
      e1: 'দলের নিচে নামলে কক্ষস্তর যোগ হয়, তাই পরমাণু আকারে বড় হয়। পর্যায় বরাবর গেলে ক্রমবর্ধমান কেন্দ্রীয় আধান একই কক্ষস্তরকে ভেতরে টানে।',
      e2: 'ফ্লোরিনের পলিং স্কেলে মান 3.98 — সব মৌলের মধ্যে সর্বোচ্চ — এবং এটি বন্ধন ইলেকট্রনকে সবচেয়ে জোরে টানে।',
      e3: 'সোডিয়ামের 3s¹ ইলেকট্রন আড়ালে থাকে এবং নিউক্লিয়াস থেকে দূরে। নিয়নের 2p⁶ ইলেকট্রনগুলো নিউক্লিয়াসের কাছে শক্ত করে আবদ্ধ থাকে, তাই একটি তুলতে অনেক বেশি শক্তি লাগে।',
    },
    ions: {
      title: 'আয়ন ও বহুপরমাণু আয়ন',
      summary: 'ক্যাটায়ন, অ্যানায়ন ও বহুপরমাণু আয়ন — চার্জ কীভাবে তৈরি হয় এবং দ্রবণে প্রতিটি কী করে।',
      q1: '2− চার্জযুক্ত একপরমাণু আয়নে প্রোটনের চেয়ে কতটি বেশি ইলেকট্রন থাকে?',
      q2: 'এগুলির মধ্যে কোনটি বহুপরমাণু আয়ন?',
      q3: 'অক্সাইড আয়নের চার্জ কী?',
      e1: 'ঋণাত্মক চার্জ মানে আয়ন ইলেকট্রন গ্রহণ করেছে — 2− মানে দুটি অতিরিক্ত ইলেকট্রন।',
      e2: 'সালফেট আয়নে চারটি পরমাণু পরস্পরের সঙ্গে যুক্ত থাকে। Na⁺ ও Cl⁻-এর মতো একপরমাণু আয়ন প্রতিটিই একটিমাত্র পরমাণু।',
      e3: 'অক্সিজেন 16 নম্বর দলে থাকে ছয়টি শুঙ্ক ইলেকট্রনসহ এবং অষ্টকে পৌঁছাতে দুটি গ্রহণ করে, ফলে O²⁻ তৈরি হয়।',
    },
    bonding: {
      title: 'রাসায়নিক বন্ধন',
      summary: 'আয়নিক, সমবর্তী ও ধাতবিক বন্ধন, এবং সেগুলোকে আলাদা করার প্রমাণ।',
      q1: 'NaCl-কে সবচেয়ে ভালোভাবে বর্ণনা করা যায়…',
      q2: 'লোহার মতো ধাতুকে কী একত্রে ধরে রাখে…',
      q3: 'একটি কার্বন পরমাণু কতটি বন্ধন গড়তে পারে?',
      e1: 'সোডিয়াম তার সবচেয়ে বাইরের ইলেকট্রনটি ক্লোরকে দিয়ে দেয়, ফলে Na⁺ ও Cl⁻ তৈরি হয় যেগুলোকে স্থিৎবিদ্যুৎ আকর্ষণ একসঙ্গে ধরে রাখে।',
      e2: 'ধাতবিক বন্ধনে ধাতবিক ধনাত্মক আয়নগুলোর ভাগ করে নেওয়া অবস্থানচ্যুত শুঙ্ক ইলেকট্রনের সমুদ্র ব্যবহৃত হয়, তাই ধাতু বিদ্যুৎ চালায়।',
      e3: 'কার্বনের চারটি শুঙ্ক ইলেকট্রন এবং দ্বিতীয় কক্ষস্তরে চারটি ফাঁকা জায়গা আছে, তাই এটি চারটি সমবর্তী বন্ধন গড়ে — সমগ্র জৈবরসায়ন এর উপর দাঁড়ানো।',
    },
  },

  ms: {
    readTheTable: {
      title: 'Membaca Jadual Berkala',
      summary:
        'Petala merentas mendatar, kumpulan merentas menegak. Fahami dahulu apa yang dikawal setiap paksi sebelum menghafal satu nombor sahaja.',
      q1: 'Apa yang bertambah semasa bergerak dari kiri ke kanan sepanjang satu petala?',
      q2: 'Sifat apa yang dikongsi oleh unsur-unsur dalam kumpulan yang sama?',
      q3: 'Di mana lantanida dan aktinida biasanya dilukis?',
      e1: 'Nombor atom bertambah satu pada setiap langkah kerana anda menambah satu proton. Semua yang lain (jejari mengecil, keelektronegatifan meningkat) berasal daripada itu.',
      e2: 'Satu kumpulan ditakrifkan oleh bilangan elektron valens, jadi logam alkali (1) dan halogen (7) masing-masing mempunyai kelakuan yang serupa.',
      e3: 'Mereka ialah unsur blok f, yang dikeluarkan di bawah jadual supaya lajur 3–12 kekal boleh dibaca. Mereka masih milik petala 6 dan 7.',
    },
    atomicStructure: {
      title: 'Struktur Atom',
      summary: 'Proton menentukan unsurnya, neutron membentuk isotopnya, elektron membentuk ionnya. Tiga zarah, tiga tugas.',
      q1: 'Zarah manakah yang menentukan identiti sesuatu unsur?',
      q2: 'Apakah nama dua atom unsur yang sama dengan bilangan neutron berbeza?',
      q3: 'Apakah yang menjadi atom natrium yang kehilangan satu elektron?',
      e1: 'Tukar proton dan anda menukar unsur itu sepenuhnya. Yang mempunyai 25 proton ialah mangan; yang mempunyai 27 ialah kobalt.',
      e2: 'Isotop mempunyai bilangan proton yang sama tetapi berbeza nombor jis. Karbon-12 dan karbon-14 kedua-duanya karbon; karbon-14 bersifat radioaktif.',
      e3: 'Apabila satu elektron hilang, terdapat satu proton lebih daripada elektron, jadi casnya +1. Unsur itu masih natrium.',
    },
    electronConfig: {
      title: 'Konfigurasi Elektron',
      summary:
        'Isi subkerang mengikut tertib tenaga, kemudian baca semula konfigurasinya. Aufbau, Hund dan bentuk ringkas gas adi.',
      q1: 'Dalam tertib mana prinsip Aufbau mengisi subkerang?',
      q2: 'Berapa elektron yang muat dalam satu subkerang p?',
      q3: 'Apakah maksud bentuk ringkas [Ar]?',
      e1: 'Subkerang diisi mengikut n + l yang meningkat, jadi 4s (n+l = 4) mendahului 3d (n+l = 5). Itulah sebabnya kalium ditulis [Ar] 4s¹, bukan [Ar] 3d¹.',
      e2: 'Setiap subkerang memuatkan 2(2ℓ+1) elektron: s memuatkan 2, p 6, d 10 dan f 14.',
      e3: 'Bentuk ringkas gas adi menggantikan konfigurasi penuh sesebuah gas adi. [Ar] 3d⁶ 4s² ialah besi: 18 + 6 + 2 = 26 elektron.',
    },
    trends: {
      title: 'Trend Berkala',
      summary:
        'Jejari, keelektronegatifan dan tenaga pengionan kesemuanya berbuncul daripada satu perkara: seberapa erat nukleus menggenggam elektronnya.',
      q1: 'Jejari atom, umumnya…',
      q2: 'Unsur manakah mempunyai keelektronegatifan tertinggi?',
      q3: 'Mengapa tenaga pengionan pertama natrium jauh lebih rendah daripada neon?',
      e1: 'Menuruni satu kumpulan menambah lapisan, jadi atomnya memang lebih besar. Sepanjang satu petala, cas nukleus yang meningkat menarik lapisan yang sama ke dalam.',
      e2: 'Fluor bernilai 3,98 pada skala Pauling — nilai tertinggi antara semua unsur — dan ia paling kuat menarik elektron ikatan.',
      e3: 'Elektron 3s¹ natrium terlindung dan jauh dari nukleus. Elektron 2p⁶ neon berada dekat nukleus dan diikat erat, jadi mencabut satu memerlukan tenaga yang jauh lebih besar.',
    },
    ions: {
      title: 'Ion dan Ion Poliatom',
      summary: 'Kation, anion dan ion poliatom — bagaimana cas terbentuk dan apa yang masing-masing lakukan dalam larutan.',
      q1: 'Ion monoatom bermuatan 2− mempunyai berapa elektron lebih daripada proton?',
      q2: 'Yang mana di antaranya ialah ion poliatom?',
      q3: 'Apakah cas yang dibawa oleh ion oksida?',
      e1: 'Cas negatif bermakna ion itu telah memperoleh elektron — 2− bermakna dua elektron tambahan.',
      e2: 'Ion sulfat mengandungi empat atom yang terikat bersama. Ion monoatom seperti Na⁺ dan Cl⁻ ialah satu atom sahaja setiap satu.',
      e3: 'Oksigen berada dalam kumpulan 16 dengan enam elektron valens dan mengambil dua untuk mencapai oktet, menghasilkan O²⁻.',
    },
    bonding: {
      title: 'Ikatan Kimia',
      summary: 'Ikatan ion, kovalen dan logam, serta bukti yang membezakannya.',
      q1: 'NaCl paling tepat digambarkan sebagai…',
      q2: 'Logam seperti besi dipegang bersama oleh…',
      q3: 'Berapa banyak ikatan yang boleh dibentuk oleh satu atom karbon?',
      e1: 'Natrium memindahkan elektron terluarnya kepada klor, menghasilkan Na⁺ dan Cl⁻ yang dipegang bersama oleh daya tarikan elektrostatik.',
      e2: 'Ikatan logam menggunakan lautan elektron valens yang delokalisasi dan dikongsi bersama oleh ion logam bercas positif, sebab itulah logam menjadi pengkonduktor.',
      e3: 'Karbon mempunyai empat elektron valens dan empat tempat kosong dalam shell kedua, jadi ia membentuk empat ikatan kovalen — keseluruhan kimia organik bergantung padanya.',
    },
  },

  ta: {
    readTheTable: {
      title: 'மூலக்கூறு அட்டவணையைப் படித்தல்',
      summary:
        'ஆவர்த்தங்கள் கிடையாகவும், குழுக்கள் செங்குத்தாகவும் அமைந்துள்ளன. ஒரு எண்ணையும் மனனில் பதிவுறுவதற்கு முன் ஒவ்வொரு அச்சும் என்னைக் கட்டுப்படுத்துகிறது என்பதை அறியுங்கள்.',
      q1: 'ஒரு ஆவர்த்தத்தில் இடமிருந்து வலமாக நகரும்போது எது அதிகரிக்கும்?',
      q2: 'ஒரே குழுவைச் சேர்ந்த மூலக்கூறுகள் எந்தப் பண்பைப் பகிர்கின்றன?',
      q3: 'லாந்தனைடுகளும் ஆக்டினைடுகளும் பொதுவாக எங்கே வரையப்படுகின்றன?',
      e1: 'ஒவ்வொரு படிக்கும் புரோட்டன் எண்ணை ஒன்று சேர்ப்பதால் ஒவ்வொரு படியிலும் அணு எண் ஒன்று அதிகரிக்கும். ஆரம் குறைவதும் மின்எதிர்ப்பு அதிகரிப்பதும் உள்ளிட்ட மற்ற அனைத்தும் இதிலிருந்தே வழிகிடுகின்றன.',
      e2: 'ஒரு குழு வேதி மின்எலக்டிரன் எண்ணால் வரையறுக்கப்படுகிறது; எனவே அல்கலி உலோகங்களும் (1) ஹேலோஜன்களும் (7) தமது தனித்தனி குழுக்களில் ஒன்றைப் போன்று செயற்படுகின்றன.',
      e3: 'இவை f தொகுதி மூலக்கூறுகள்; 3–12 நிரல்கள் படிக்குமாறு இருக்க வேண்டியதால் அட்டவணையின் கீழே எடுத்து வைக்கப்பட்டுள்ளன. இவை 6, 7 ஆவர்த்தங்களைச் சேர்ந்தவையாகவே உள்ளன.',
    },
    atomicStructure: {
      title: 'அணு அமைப்பு',
      summary:
        'மூலக்கூறைத் தீர்மானிக்கும் புரோட்டான்கள், ஐசோடோப்பை உருவாக்கும் நியூட்ரான்கள், அயனை உருவாக்கும் மின்எலக்டிரன்கள். மூன்று துகள்கள், மூன்று பணிகள்.',
      q1: 'மூலக்கூறின் அடையாளத்தைத் தீர்மானிக்கும் துகள் எது?',
      q2: 'நியூட்ரன் எண் வேறுபட்ட அதே மூலக்கூறின் இரு அணுக்கள் என்ன எனப்படும்…',
      q3: 'ஒரு மின்எலக்டிரனை இழக்கும் சோடியம் அணு என்னாகிறது…',
      e1: 'புரோட்டான்களை மாற்றினால் மூலக்கூறே முற்றிலும் மாறும். 25 புரோட்டான்கள் இருந்தால் அது மாங்கனீசு; 27 இருந்தால் கோபால்ட்.',
      e2: 'ஐசோடோப்களில் புரோட்டன் எண் ஒரேவாடு, திணிவு எண் வேறுபடும். கார்பன்-12, கார்பன்-14 இரண்டும் கார்பன்; கார்பன்-14 கதிர்வீச்சுடையது.',
      e3: 'ஒரு மின்எலக்டிரன் இழக்கப்படும்போது புரோட்டான்கள் மின்எலக்டிரன்களைவிட ஒன்று அதிகமாக இருப்பதால் மின்வசை +1 ஆகும். மூலக்கூறு இன்னும் சோடியம்.',
    },
    electronConfig: {
      title: 'மின்எலக்டிரன் அமைப்பு',
      summary:
        'அயன்களை ஆற்று வரிசைப்படி நிரப்பி, பின்னர் அமைப்பை மீண்டும் படித்துக்கொள்ளுங்கள். ஆவ்பாவு கொள்கை, ஹுன்ட் விதி, அருமைவாயு சுருக்கம்.',
      q1: 'ஆவ்பாவு கொள்கை அயன்களை எந்த வரிசையில் நிரப்புகிறது?',
      q2: 'ஒரு p துணைப்படைக்கு எத்தனை மின்எலக்டிரன்கள் பொருந்தும்?',
      q3: '[Ar] சுருக்கம் எதைக் குறிக்கிறது?',
      e1: 'n + l அதிகரிக்கும் வரிசையில் துணைப்படைகள் நிரப்பப்படுகின்றன; எனவே 4s (n+l = 4) வேண்ட 3d (n+l = 5)-க்கு முன்னே வரும். ஆகவே பொட்டாசியம் [Ar] 3d¹ அல்ல, [Ar] 4s¹ என எழுதப்படுகிறது.',
      e2: 'ஒவ்வொரு துணைப்படையிலும் 2(2ℓ+1) மின்எலக்டிரன்கள் பொருந்தும்: s இல் 2, p இல் 6, d இல் 10, f இல் 14.',
      e3: 'அருமைவாயுச் சுருக்கம் ஒரு அருமைவாயுவின் முழு அமைப்பிற்குப் பதிலாக வருகிறது. [Ar] 3d⁶ 4s² என்பது இரும்பு: 18 + 6 + 2 = 26 மின்எலக்டிரன்கள்.',
    },
    trends: {
      title: 'ஆவர்த்தப் போக்குகள்',
      summary:
        'ஆரம், மின்எதிர்ப்பு, அயனாக்க ஆற்றல் ஆகிய மூன்றும் ஒரே காரணத்திலிருந்து தோன்றுகின்றன: கரு தன் மின்எலக்டிரன்களை எவ்வளவு இறுக்கப் பிடித்திருக்கிறது.',
      q1: 'அணு ஆரம் பொதுவாக…',
      q2: 'மின்எதிர்ப்பு மிக அதிகமான மூலக்கூறு எது?',
      q3: 'சோடியத்தின் முதல் அயனாக்க ஆற்றல் நியானின் அயனாக்க ஆற்றலைவிட ஏன் மிகக் குறைவு?',
      e1: 'ஒரு குழுவில் கீழிறங்கும்போது மின்னோடிகள் சேர்வதால் அணு உண்மையில் பெரிதாகிறது. ஒரு ஆவர்த்தத்தில் செல்லும்போது அதிகரிக்கும் கருமின்வசை அதே மின்னோடியை உள்ளே இழுக்கிறது.',
      e2: 'பாலிங் அளவுகோட்டில் ஃபுளோரின் 3.98 உள்ளது — எல்லா மூலக்கூறுகளிலும் மிக உயர்ந்தது — மேலும் இது பிணைப்பு மின்எலக்டிரன்களை மிகவும் உறுதியாக இழுக்கிறது.',
      e3: 'சோடியத்தின் 3s¹ மின்எலக்டிரன் திரைக்கப்பட்டு கருவிலிருந்து தள்ளி உள்ளது. நியானின் 2p⁶ மின்எலக்டிரன்கள் கருவுக்கு அருகில் இறுக்கப் பிடித்திருப்பதால், ஒன்றை நீக்க பலமான ஆற்றல் தேவை.',
    },
    ions: {
      title: 'அயன்களும் பல அணு அயன்களும்',
      summary:
        'நேர்மின்மயன்கள், எதிர்மின்மயன்கள், பல அணு அயன்கள் — மின்வசை எங்கிருந்து உருவாகிறது, கரைவிலும் ஒவ்வொன்றும் என்ன செய்கிறது.',
      q1: '2− மின்வசையுடைய ஒற்றை அணு அயனில் புரோட்டான்களைவிட எத்தனை மின்எலக்டிரன்கள் அதிகம்?',
      q2: 'இவற்றுள் எது பல அணு அயன்?',
      q3: 'ஒட்சைடு அயன் என்ன மின்வசையைக் கொண்டுள்ளது?',
      e1: 'எதிர்மின்வசை என்பது அயன் மின்எலக்டிரன்களைப் பெற்றிருப்பதைக் குறிக்கும்; 2− என்பது இரண்டு கூடுதல் மின்எலக்டிரன்கள் என்பதாகும்.',
      e2: 'சல்பேற்று அயன் பிணைந்த நான்கு அணுக்களைக் கொண்டுள்ளது. Na⁺, Cl⁻ போன்ற ஒற்றை அணு அயன்கள் ஒவ்வொன்றும் ஒரே அணு மட்டுமே.',
      e3: 'ஒட்சிசன் 16ஆம் குழுவில் ஆறு வேதி மின்எலக்டிரன்களுடன் உள்ளது; எட்டு மின்எலக்டிரன் அமைப்பை அடைய இரண்டைப் பெற்று O²⁻ உருவாக்குகிறது.',
    },
    bonding: {
      title: 'இரசாயனப் பிணைப்பு',
      summary: 'அயனிப் பிணைப்பு, கோவலன்ட் பிணைப்பு, உலோகப் பிணைப்பு, மேலும் அவற்றை வேறுபடுத்தும் சான்றுகள்.',
      q1: 'NaCl என்பது சிறந்தது என்று விவரிக்கப்படுவது…',
      q2: 'இரும்பு போன்ற உலோகத்தை ஒன்றுடன் ஒன்று பிணைத்திருப்பது…',
      q3: 'ஒரு கார்பன் அணு எத்தனை பிணைப்புகளை உருவாக்க முடியும்?',
      e1: 'சோடியம் தனது வெளிப்புற மின்எலக்டிரனைக் குளோரினிடம் கொடுத்து Na⁺, Cl⁻ ஆகியவற்றை உருவாக்குகிறது; இவை மின்வின்புற ஈர்ப்பால் ஒன்றுடன் ஒன்று பிணைந்திருக்கும்.',
      e2: 'உலோகப் பிணைப்பு, நேர்மின்மயன் உலோக அயன்கள் பகிர்ந்துகொள்ளும் பரவலடைந்த வேதி மின்எலக்டிரன்களின் கடலைப் பயன்படுத்துகிறது; எனவே உலோகங்கள் மின்னைக் கடத்துகின்றன.',
      e3: 'கார்பனுக்கு நான்கு வேதி மின்எலக்டிரன்களும் இரண்டாவது மின்னோட்டில் நான்கு காலி இடங்களும் உள்ளன; எனவே அது நான்கு கோவலன்ட் பிணைப்புகளை உருவாக்குகிறது — முழு கரிம இரசாயனமும் இதை ஆதரிக்கிறது.',
    },
  },

};

/* ────────────────────────────────────────────────────────────────────────── */

const codes = [...readFileSync(join(root, 'src/i18n/languages.ts'), 'utf8').matchAll(/code: '([^']+)'/g)].map(
  (m) => m[1],
);

const problems = [];

// every declared locale must carry a full slice
for (const c of codes) {
  if (!T[c]) {
    problems.push(`${c}: no translation data`);
    continue;
  }
  for (const l of SLICE) {
    if (!T[c][l]) {
      problems.push(`${c}: missing lesson ${l}`);
      continue;
    }
    for (const f of FIELDS) {
      const v = T[c][l][f];
      if (typeof v !== 'string' || !v.trim()) problems.push(`${c}: empty lesson.${l}.${f}`);
    }
  }
}
const extraLocales = Object.keys(T).filter((c) => !codes.includes(c));
if (extraLocales.length) problems.push(`data for undeclared locale(s): ${extraLocales.join(', ')}`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

let written = 0;
for (const code of codes) {
  const path = join(TRANS, `${code}.json`);
  const before = readFileSync(path, 'utf8');
  const d = JSON.parse(before);
  const beforeKeys = Object.keys(d);

  // Re-order so the six lessons of this slice sit together, immediately before
  // any other lesson.* keys the file may already carry. Every other key keeps
  // its original relative position; nothing is dropped.
  const mine = new Set(SLICE.flatMap((l) => FIELDS.map((f) => `lesson.${l}.${f}`)));
  const out = {};
  let emitted = false;
  for (const k of beforeKeys) {
    if (k.startsWith('lesson.')) {
      if (!emitted) {
        emitted = true;
        for (const l of SLICE) for (const f of FIELDS) out[`lesson.${l}.${f}`] = T[code][l][f];
      }
      if (mine.has(k)) continue; // re-emitted above, in slice order
    }
    out[k] = d[k];
  }
  if (!emitted) for (const l of SLICE) for (const f of FIELDS) out[`lesson.${l}.${f}`] = T[code][l][f];

  // ── invariants ───────────────────────────────────────────────────────────
  for (const k of beforeKeys) {
    if (k.startsWith('lesson.')) continue; // this slice is allowed to change these
    if (!(k in out)) throw new Error(`${code}: dropped key ${k}`);
    if (out[k] !== d[k]) throw new Error(`${code}: clobbered ${k}`);
  }
  for (const k of Object.keys(out)) {
    if (beforeKeys.includes(k) && !mine.has(k) && k.startsWith('lesson.') && out[k] !== d[k]) {
      throw new Error(`${code}: touched another worker's key ${k}`);
    }
  }
  const expected = new Set([...beforeKeys, ...SLICE.flatMap((l) => FIELDS.map((f) => `lesson.${l}.${f}`))]);
  if (Object.keys(out).length !== expected.size) throw new Error(`${code}: key count drift`);

  const next = JSON.stringify(out, null, 2) + '\n';
  if (next !== before) {
    writeFileSync(path, next);
    written++;
  }
}

console.log(`lesson slice A: ${SLICE.length} lessons x ${FIELDS.length} keys x ${codes.length} locales`);
console.log(`${written} locale file(s) updated (${codes.length - written} already up to date)`);
