import { useEffect, useRef } from 'react';

export interface Option {
  key: string;
  label: string;
  disabled?: boolean;
}

interface OptionSheetProps {
  title: string;
  options: Option[];
  selected: string;
  onSelect: (key: string) => void;
  onDismiss: () => void;
}

/**
 * The bottom-sheet picker the native settings screen used for language,
 * country and theme.
 *
 * React Native's `Modal` traps focus and blocks the hardware back button for
 * free. `<dialog showModal>` is the DOM equivalent: it moves focus inside, puts
 * the sheet in the top layer so it escapes any ancestor stacking context, and
 * fires `cancel` on Escape.
 */
export function OptionSheet({ title, options, selected, onSelect, onDismiss }: OptionSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onClick={(event) => {
        // The backdrop is part of the dialog box, so a click that lands on the
        // element itself rather than its content is a click outside the sheet.
        if (event.target === ref.current) onDismiss();
      }}
      className="m-0 max-h-full min-h-full w-full max-w-full bg-transparent p-0 backdrop:bg-black/40"
      aria-label={title}
    >
      <div className="flex h-full flex-col justify-end">
        <div
          className="animate-[enter-sheet_220ms_ease-out_backwards] rounded-t-[20px] border-t border-b2 bg-bg-card px-5 pt-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.25rem)' }}
        >
          <h2 className="text-center text-sm font-extrabold tracking-[0.2px] text-t1">{title}</h2>
          <div className="mt-4 mb-2 h-px bg-b2" />

          {options.map((option, index) => {
            const active = option.key === selected;
            return (
              <button
                key={option.key}
                type="button"
                disabled={option.disabled}
                onClick={() => onSelect(option.key)}
                aria-current={active}
                className={`flex w-full items-center justify-between px-1 py-3.5 text-left disabled:opacity-50 ${
                  index === options.length - 1 ? '' : 'border-b border-b1'
                }`}
              >
                <span
                  className={`text-[15px] ${active ? 'font-bold text-t1' : 'font-medium text-t2'}`}
                >
                  {option.label}
                </span>
                {active && (
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gold-light">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3"
                      fill="none"
                      stroke="var(--color-navy)"
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 12.5 4.5 4.5L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}
