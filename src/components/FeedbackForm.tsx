import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../state/store';
import type { FeedbackTopic } from '../types/chem';

const TOPICS: Array<[FeedbackTopic, string]> = [
  ['more-data', 'feedback.moreData'],
  ['bug', 'feedback.bug'],
  ['new-tool', 'feedback.newTool'],
  ['ui', 'feedback.interface'],
  ['other', 'feedback.other'],
];

/**
 * Feedback goes into the local inbox first — there is no backend, and pretending
 * otherwise would lose the user's words on refresh. The inbox is exportable so
 * a real deployment can forward it.
 */
export function FeedbackForm() {
  const { t } = useI18n();
  const { addFeedback, feedback } = useStore();
  const [topic, setTopic] = useState<FeedbackTopic>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = message.trim();
    if (msg.length < 4) {
      setState('failed');
      return;
    }
    setState('sending');
    setTimeout(() => {
      addFeedback({
        topic,
        message: msg,
        email: email.trim() || null,
        context: location.hash || '#/',
      });
      setMessage('');
      setEmail('');
      setState('sent');
      setTimeout(() => setState('idle'), 3200);
    }, 320);
  };

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TOPICS.map(([k, key]) => (
            <button
              key={k}
              type="button"
              className={`chip ${topic === k ? 'chip-on' : ''}`}
              onClick={() => setTopic(k)}
            >
              {t(key)}
            </button>
          ))}
        </div>

        <textarea
          className="input min-h-[90px] resize-y text-[13px]"
          placeholder={t('feedback.messagePlaceholder')}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (state === 'failed') setState('idle');
          }}
          aria-label={t('feedback.message')}
          maxLength={2000}
        />

        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input flex-1 text-[13px]"
            type="email"
            placeholder={`${t('feedback.email')} (${t('misc.optional')})`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label={t('feedback.email')}
          />
          <button className="btn btn-primary" type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? t('feedback.sending') : t('feedback.send')}
          </button>
        </div>

        {state === 'sent' && (
          <p className="text-[11.5px] font-semibold" style={{ color: 'var(--c-metalloid)' }}>
            ✓ {t('feedback.sent')}
          </p>
        )}
        {state === 'failed' && (
          <p className="text-[11.5px] font-semibold" style={{ color: 'var(--c-actinide)' }}>
            {t('feedback.failed')}
          </p>
        )}
        <p className="text-[11.5px] faint">
          {t('feedback.storedLocally')} · {t('feedback.message').slice(0, 0)}
          {message.length}/2000
        </p>
      </form>

      {feedback.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] font-bold faint">
            {t('feedback.inbox')} ({feedback.length})
          </summary>
          <ul className="mt-2 max-h-52 space-y-1.5 overflow-y-auto">
            {feedback.map((f) => (
              <li key={f.id} className="rounded-lg p-2 text-[12px]" style={{ background: 'var(--surface-2)' }}>
                <span className="tag me-1.5">{t(`feedback.${f.topic}`)}</span>
                <span className="faint">{f.createdAt.slice(0, 10)}</span>
                <p className="mt-1 leading-relaxed">{f.message}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
