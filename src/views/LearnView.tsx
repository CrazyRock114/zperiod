import React, { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore, useDueReviews } from '../state/store';
import { LESSONS, isLessonUnlocked, lessonIndex } from '../data/lessons';
import { useElements, categoryColor, defaultNeutrons } from '../data';
import { fmt } from '../lib/units';
import type { Route } from '../router';
import { Tour, useTour } from '../components/Tour';

export function LearnView({ navigate }: { navigate: (r: Route) => void }) {
  const { t, tf, elementName, num } = useI18n();
  const { lessonsDone, markLessonDone, toolToursSeen, markTourSeen, review, gradeReview, setLastElement } =
    useStore();
  const { due, learning } = useDueReviews();
  const tour = useTour('learn', toolToursSeen, markTourSeen);

  const [active, setActive] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [checked, setChecked] = useState(false);

  const idx = active ? lessonIndex(active) : -1;
  const lesson = idx >= 0 ? LESSONS[idx] : null;
  const elements = useElements();
  const dueCount = due.length + learning.length;

  const score = useMemo(() => {
    if (!lesson || !checked) return 0;
    return lesson.questions.reduce((acc, q, i) => acc + (answers[String(i)] === q.answerIndex ? 1 : 0), 0);
  }, [lesson, checked, answers]);

  const submit = () => {
    if (!lesson) return;
    setChecked(true);
    if (lesson.questions.every((q, i) => answers[String(i)] === q.answerIndex)) markLessonDone(lesson.id);
  };

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-5">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('learn.title')}</h1>
          <p className="muted mt-1 text-sm">{t('learn.subtitle')}</p>
        </div>
        {tour.show && (
          <button className="btn btn-subtle h-9 text-xs" onClick={tour.start}>
            ? {t('learn.tutorial')}
          </button>
        )}
      </header>

      <Tour open={tour.open} onClose={tour.close} id="worksheet" />

      {active && lesson ? (
        <LessonRunner
          lessonId={lesson.id}
          answers={answers}
          setAnswers={setAnswers}
          checked={checked}
          score={score}
          onSubmit={submit}
          onRetry={() => {
            setAnswers({});
            setChecked(false);
          }}
          onExit={() => {
            setActive(null);
            setAnswers({});
            setChecked(false);
          }}
          navigate={navigate}
        />
      ) : (
        <>
          {/* review queue */}
          {dueCount > 0 && (
            <section className="surface mb-5 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold">{t('learn.reviewTitle')}</h2>
                  <p className="muted mt-0.5 text-xs">{t('learn.reviewSubtitle')}</p>
                </div>
                <div className="flex gap-2">
                  <span className="tag">{t('learn.dueNow')} {num(due.length)}</span>
                  <span className="tag">{t('learn.newCards')} {num(learning.length)}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...due, ...learning].slice(0, 24).map((z) => {
                  const e = elements.data?.find((x) => x.atomicNumber === z);
                  return (
                    <button
                      key={z}
                      className="chip font-bold"
                      onClick={() => {
                        setLastElement(z);
                        navigate({ name: 'table', element: z });
                      }}
                    >
                      {e?.symbol ?? z}
                      <span className="faint">{z}</span>
                    </button>
                  );
                })}
              </div>
              {dueCount > 24 && (
                <p className="mt-2 text-[11.5px] faint">+ {num(dueCount - 24)}</p>
              )}
            </section>
          )}

          {/* path */}
          <section>
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide faint">{t('learn.path')}</h2>
            <ol className="relative flex flex-col gap-2.5 ps-6">
              {LESSONS.map((l, i) => {
                const unlocked = isLessonUnlocked(i, lessonsDone);
                const done = lessonsDone.includes(l.id);
                return (
                  <li key={l.id} className="relative">
                    <span
                      className="absolute -start-6 top-4 flex h-4 w-4 items-center justify-center rounded-full text-[12px] font-black"
                      style={{
                        background: done ? 'var(--c-metalloid)' : unlocked ? 'var(--accent)' : 'var(--surface-3)',
                        color: unlocked || done ? '#0b1020' : 'var(--text-3)',
                      }}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <button
                      disabled={!unlocked}
                      onClick={() => {
                        setActive(l.id);
                        setAnswers({});
                        setChecked(false);
                      }}
                      className="surface w-full p-4 text-start transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-45"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold">{tf(l.titleKey, l.titleText)}</h3>
                        {done && <span className="tag">✓ {t('learn.completed')}</span>}
                        {!unlocked && <span className="tag">🔒 {t('learn.locked')}</span>}
                      </div>
                      <p className="muted mt-1 text-xs leading-relaxed">{tf(l.summaryKey, l.summaryText)}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {l.unlocks.slice(0, 10).map((z) => {
                          const e = elements.data?.find((x) => x.atomicNumber === z);
                          return (
                            <span key={z} className="tag" style={{ color: e ? categoryColor(e.category) : undefined }}>
                              {e?.symbol ?? z}
                            </span>
                          );
                        })}
                        {l.unlocks.length > 10 && <span className="tag">+{l.unlocks.length - 10}</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* progress */}
          <div className="surface mt-5 p-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-bold">{t('learn.progress')}</span>
              <span className="tnum muted">
                {num(lessonsDone.length)} / {num(LESSONS.length)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-3)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(lessonsDone.length / LESSONS.length) * 100}%`,
                  background: 'linear-gradient(90deg, var(--accent), #1dd1a1)',
                }}
              />
            </div>
            <p className="mt-2 text-[11.5px] faint">
              {num(Object.keys(review).length)} {t('settings.favorites').toLowerCase()} · {num(dueCount)}{' '}
              {t('learn.dueNow').toLowerCase()}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lesson runner                                                       */
/* ------------------------------------------------------------------ */

function LessonRunner({
  lessonId,
  answers,
  setAnswers,
  checked,
  score,
  onSubmit,
  onRetry,
  onExit,
  navigate,
}: {
  lessonId: string;
  answers: Record<string, number | null>;
  setAnswers: (a: Record<string, number | null>) => void;
  checked: boolean;
  score: number;
  onSubmit: () => void;
  onRetry: () => void;
  onExit: () => void;
  navigate: (r: Route) => void;
}) {
  const { t, tf, elementName, num } = useI18n();
  const lesson = LESSONS.find((l) => l.id === lessonId)!;
  const elements = useElements();
  const total = lesson.questions.length;

  return (
    <div className="fade-up">
      <button className="btn btn-ghost mb-3 h-8 text-xs" onClick={onExit}>
        ← {t('app.back')}
      </button>

      <div className="surface mb-4 p-5">
        <h2 className="text-xl font-extrabold tracking-tight">{tf(lesson.titleKey, lesson.titleText)}</h2>
        <p className="muted mt-1 text-sm">{tf(lesson.summaryKey, lesson.summaryText)}</p>
      </div>

      <div className="flex flex-col gap-4">
        {lesson.questions.map((q, qi) => {
          const chosen = answers[String(qi)];
          const correct = chosen === q.answerIndex;
          return (
            <div key={q.key} className="surface p-4 sm:p-5">
              <div className="mb-2.5 flex items-start gap-2.5">
                <span
                  className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11.5px] font-black"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  {qi + 1}
                </span>
                <p className="text-sm font-semibold leading-relaxed">{tf(q.key, q.text)}</p>
              </div>

              <div className="grid gap-1.5">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const isAnswer = oi === q.answerIndex;
                  return (
                    <button
                      key={oi}
                      disabled={checked}
                      onClick={() => setAnswers({ ...answers, [String(qi)]: oi })}
                      className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start text-[13px] transition-colors disabled:cursor-default"
                      style={{
                        borderColor: checked && isAnswer
                          ? 'var(--c-metalloid)'
                          : checked && isChosen
                            ? 'var(--c-actinide)'
                            : 'var(--border)',
                        background: checked && isAnswer
                          ? 'color-mix(in srgb, var(--c-metalloid) 12%, transparent)'
                          : isChosen
                            ? 'var(--surface-2)'
                            : 'transparent',
                      }}
                    >
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[12px] font-bold"
                        style={{ borderColor: isChosen || (checked && isAnswer) ? 'currentColor' : 'var(--border-strong)' }}
                      >
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {checked && isAnswer && <span style={{ color: 'var(--c-metalloid)' }}>✓</span>}
                      {checked && isChosen && !isAnswer && (
                        <span style={{ color: 'var(--c-actinide)' }}>✕</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {checked && (
                <p
                  className="mt-2.5 rounded-lg p-2.5 text-[11.5px] leading-relaxed"
                  style={{
                    background: correct ? 'color-mix(in srgb, var(--c-metalloid) 10%, transparent)' : 'var(--surface-2)',
                    color: correct ? 'var(--c-metalloid)' : 'var(--text-2)',
                  }}
                >
                  <b>{correct ? t('learn.correct') : t('learn.incorrect')}</b> — {q.explainText}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!checked ? (
          <button
            className="btn btn-primary"
            disabled={Object.keys(answers).length < total}
            onClick={onSubmit}
          >
            {t('learn.check')}
          </button>
        ) : (
          <>
            <span
              className="rounded-lg px-3 py-2 text-sm font-extrabold"
              style={{
                background: score === total ? 'var(--c-metalloid)' : 'var(--surface-2)',
                color: score === total ? '#0b1020' : 'var(--text-1)',
              }}
            >
              {num(score)} / {num(total)}
            </span>
            {score < total && (
              <button className="btn btn-ghost" onClick={onRetry}>
                ↻ {t('learn.retry')}
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => {
                const z = lesson.unlocks[0];
                if (z) navigate({ name: 'table', element: z });
                else onExit();
              }}
            >
              {t('learn.review')} →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
