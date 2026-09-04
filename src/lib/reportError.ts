export interface ReportOptions {
  /** Surface the failure to the user. Default: false. */
  userVisible?: boolean;
  /** Custom toast text. Falls back to a generic message. */
  toast?: string;
}

type ToastHandler = (text: string) => void;

let toastHandler: ToastHandler | null = null;

/** Registered once by the toast provider on mount. Last caller wins. */
export function setToastHandler(handler: ToastHandler | null) {
  toastHandler = handler;
}

/** Single sink for all caught errors in the app. */
export function reportError(scope: string, error: unknown, opts: ReportOptions = {}): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${scope}] ${message}`, error);

  if (opts.userVisible && toastHandler) {
    toastHandler(opts.toast ?? 'Something went wrong. Please try again.');
  }
}
