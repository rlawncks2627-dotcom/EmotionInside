import { useCallback, useEffect, useRef, useState } from 'react';

export type Tone = 'ok' | 'bad';
export type Notify = (text: string, tone?: Tone) => void;

interface ToastState {
  text: string;
  tone: Tone;
}

/** 화면 아래에서 잠깐 올라왔다 사라지는 알림. */
export function useToast(): { notify: Notify; toast: ToastState | null } {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback<Notify>((text, tone = 'ok') => {
    setToast({ text, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { notify, toast };
}

export function Toast({ toast }: { toast: ToastState | null }) {
  return (
    <div
      className="toast"
      role="status"
      aria-live="polite"
      data-show={toast ? '1' : '0'}
      data-tone={toast?.tone ?? 'ok'}
    >
      {toast?.text ?? ''}
    </div>
  );
}
