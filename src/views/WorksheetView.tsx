import React, { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../state/store';
import type { ExerciseType, ReactionType, Worksheet, WorksheetConfig } from '../types/chem';
import { buildPrintableHtml, exportWorksheetToPdf, generateWorksheet } from '../lib/chem/worksheet';
import { Tour, useTour } from '../components/Tour';

const TYPES: ReactionType[] = [
  'synthesis',
  'decomposition',
  'single-replacement',
  'double-replacement',
  'combustion',
];

const TYPE_LABEL: Record<ReactionType, string> = {
  synthesis: 'worksheet.reactionSynthesis',
  decomposition: 'worksheet.reactionDecomposition',
  'single-replacement': 'worksheet.reactionSingleReplacement',
  'double-replacement': 'worksheet.reactionDoubleReplacement',
  combustion: 'worksheet.reactionCombustion',
};

const COUNTS: Array<5 | 10 | 20 | 30 | 50> = [5, 10, 20, 30, 50];
const DIFFS = ['easy', 'medium', 'hard'] as const;

export function WorksheetView() {
  const { t, lang, num, elementName } = useI18n();
  const { markTourSeen, toolToursSeen } = useStore();
  const tour = useTour('worksheet', toolToursSeen, markTourSeen);

  const [config, setConfig] = useState<WorksheetConfig>({
    exerciseType: 'balance',
    count: 10,
    reactionTypes: [...TYPES],
    difficulty: 'medium',
    includeAnswerKey: true,
    includeSolutions: false,
    title: 'Chemical Equation Balancing',
    locale: 'en',
  });
  const [sheet, setSheet] = useState<Worksheet | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);

  const generate = useCallback(() => {
    setBusy(true);
    // Yield a frame so the button can show its pending state.
    setTimeout(() => {
      try {
        const next: WorksheetConfig = {
          ...config,
          title: t('worksheet.title'),
          locale: lang,
          reactionTypes: config.reactionTypes.length ? config.reactionTypes : [...TYPES],
        };
        setSheet(generateWorksheet(next, Math.floor(Math.random() * 2 ** 31)));
        setShowKey(false);
      } catch (err) {
        console.error('[worksheet] generation failed', err);
        setSheet(null);
      } finally {
        setBusy(false);
      }
    }, 16);
  }, [config, t, lang]);

  const toggleType = (rt: ReactionType) => {
    setConfig((c) => ({
      ...c,
      reactionTypes: c.reactionTypes.includes(rt)
        ? c.reactionTypes.filter((x) => x !== rt)
        : [...c.reactionTypes, rt],
    }));
  };

  const downloadPdf = useCallback(async () => {
    if (!sheet) return;
    setBusy(true);
    try {
      const blob = await exportWorksheetToPdf(
        { ...sheet, config: { ...sheet.config, includeAnswerKey: showKey } },
        t,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `worksheet-${sheet.config.exerciseType}-${sheet.questions.length}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      console.error('[worksheet] pdf failed', err);
    } finally {
      setBusy(false);
    }
  }, [sheet, showKey, t]);

  const print = useCallback(() => {
    if (!sheet) return;
    const html = buildPrintableHtml(
      { ...sheet, config: { ...sheet.config, includeAnswerKey: showKey } },
      t,
    );
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 350);
  }, [sheet, showKey, t]);

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-5">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('worksheet.title')}</h1>
        <p className="muted mt-1 text-sm">{t('worksheet.subtitle')}</p>
      </header>

      {/* configurator */}
      <div className="surface mb-5 p-4 sm:p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Group label={t('worksheet.exerciseType')}>
            <div className="flex flex-wrap gap-1.5">
              {(['balance', 'identify', 'combined'] as ExerciseType[]).map((k) => (
                <button
                  key={k}
                  className={`chip ${config.exerciseType === k ? 'chip-on' : ''}`}
                  onClick={() => setConfig((c) => ({ ...c, exerciseType: k }))}
                >
                  {t(`worksheet.${k}`)}
                </button>
              ))}
            </div>
          </Group>

          <Group label={t('worksheet.numberOfQuestions')}>
            <div className="flex flex-wrap gap-1.5">
              {COUNTS.map((n) => (
                <button
                  key={n}
                  data-testid={`count-${n}`}
                  className={`chip tnum ${config.count === n ? 'chip-on' : ''}`}
                  onClick={() => setConfig((c) => ({ ...c, count: n }))}
                >
                  {num(n)}
                </button>
              ))}
            </div>
          </Group>

          <Group label={t('worksheet.reactionTypes')}>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((rt) => (
                <button
                  key={rt}
                  data-testid={`rtype-${rt}`}
                  className={`chip ${config.reactionTypes.includes(rt) ? 'chip-on' : ''}`}
                  onClick={() => toggleType(rt)}
                >
                  {t(TYPE_LABEL[rt])}
                </button>
              ))}
            </div>
            <button
              className="mt-1.5 text-[11.5px] faint hover:underline"
              onClick={() =>
                setConfig((c) => ({
                  ...c,
                  reactionTypes: c.reactionTypes.length === TYPES.length ? [] : [...TYPES],
                }))
              }
            >
              {config.reactionTypes.length === TYPES.length ? t('misc.none') : t('misc.all')}
            </button>
          </Group>

          <Group label={t('worksheet.difficulty')}>
            <div className="flex flex-wrap gap-1.5">
              {DIFFS.map((d) => (
                <button
                  key={d}
                  className={`chip ${config.difficulty === d ? 'chip-on' : ''}`}
                  onClick={() => setConfig((c) => ({ ...c, difficulty: d }))}
                >
                  {t(`worksheet.${d}`)}
                </button>
              ))}
            </div>
          </Group>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <button className="btn btn-primary" onClick={generate} disabled={busy}>
            {busy ? t('app.loading') : sheet ? t('worksheet.regenerate') : t('worksheet.generate')}
          </button>
          {tour.show && (
            <button className="btn btn-subtle" onClick={tour.start}>
              ? {t('worksheet.tutorial')}
            </button>
          )}
          {sheet && (
            <>
              {sheet.questions.length < config.count && (
                <p
                  data-testid="underfill-note"
                  className="w-full rounded-lg p-2 text-[12px] font-semibold"
                  style={{ background: 'color-mix(in srgb, var(--c-transition) 16%, transparent)' }}
                  role="note"
                >
                  ⚠ {t('worksheet.underfilled', { n: String(sheet.questions.length), want: String(config.count) })}
                </p>
              )}
              <div className="ms-auto flex flex-wrap gap-1.5">
                <button className={`btn h-9 text-xs ${showKey ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowKey((v) => !v)}>
                  {showKey ? t('worksheet.answerKey') : t('worksheet.practice')}
                </button>
                <button className="btn btn-ghost h-9 text-xs" onClick={print}>
                  {showKey ? t('worksheet.printAnswerKey') : t('worksheet.printPractice')}
                </button>
                <button className="btn btn-ghost h-9 text-xs" onClick={downloadPdf} disabled={busy}>
                  {showKey ? t('worksheet.downloadPdfAnswerKey') : t('worksheet.downloadPdfPractice')}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-2 text-[11.5px] faint">{t('worksheet.empty')}</p>
      </div>

      <Tour open={tour.open} onClose={tour.close} id="worksheet" />

      {/* preview */}
      {!sheet && (
        <div className="surface grid min-h-[280px] place-items-center p-10 text-center">
          <div>
            <p className="text-4xl">📝</p>
            <p className="muted mt-3 text-sm">{t('worksheet.empty')}</p>
          </div>
        </div>
      )}

      {sheet && (
        <div className="fade-up">
          <div className="worksheet-doc mx-auto max-w-[820px] rounded-lg p-6 shadow-xl sm:p-9">
            <header className="mb-5 border-b-2 pb-4" style={{ borderColor: '#111' }}>
              <h2 className="text-xl font-extrabold" style={{ color: '#111' }}>
                {sheet.config.title}
              </h2>
              <p className="mt-1 text-xs" style={{ color: '#555' }}>
                {t(`worksheet.instructions${sheet.config.exerciseType === 'balance' ? 'Balance' : sheet.config.exerciseType === 'identify' ? 'Identify' : 'Combined'}`)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px]" style={{ color: '#333' }}>
                <span>
                  {t('worksheet.name')}: <span className="inline-block w-32 border-b" style={{ borderColor: '#999' }} />
                </span>
                <span>
                  {t('worksheet.date')}: <span className="inline-block w-24 border-b" style={{ borderColor: '#999' }} />
                </span>
                <span className="ms-auto tnum">
                  {num(sheet.questions.length)} {t('worksheet.numberOfQuestions').toLowerCase()}
                </span>
              </div>
            </header>

            <ol className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
              {sheet.questions.map((q) => (
                <li key={q.index} className="flex items-baseline gap-2.5" style={{ color: '#111' }}>
                  <span className="tnum w-5 shrink-0 text-right text-[12px] font-bold">{q.index}.</span>
                  <span className="flex-1">
                    <span className="font-mono text-[12.5px] leading-relaxed">{q.prompt}</span>
                    {showKey ? (
                      <span className="ms-2 text-[12px] font-bold" style={{ color: '#0a7a3d' }}>
                        → {q.answer}
                      </span>
                    ) : (
                      <span
                        className="mt-1.5 block border-b border-dashed"
                        style={{ borderColor: '#ccc' }}
                      />
                    )}
                    {showKey && q.explanation && (
                      <span className="mt-0.5 block text-[12px]" style={{ color: '#777' }}>
                        {q.explanation}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>

            {showKey && (
              <footer className="mt-8 border-t pt-3 text-center text-[12px]" style={{ borderColor: '#ddd', color: '#999' }}>
                {t('app.name')} · {new Date(sheet.createdAt).toLocaleDateString()}
              </footer>
            )}
          </div>

          {/* stats */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label={t('worksheet.exerciseType')} value={t(`worksheet.${sheet.config.exerciseType}`)} />
            <MiniStat label={t('worksheet.difficulty')} value={t(`worksheet.${sheet.config.difficulty}`)} />
            <MiniStat
              label={t('worksheet.reactionTypes')}
              value={String(sheet.config.reactionTypes.length)}
            />
            <MiniStat label={t('worksheet.numberOfQuestions')} value={num(sheet.questions.length)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide faint">{label}</p>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface px-3 py-2.5">
      <div className="truncate text-sm font-extrabold">{value}</div>
      <div className="mt-0.5 truncate text-[11.5px] uppercase tracking-wide faint">{label}</div>
    </div>
  );
}
