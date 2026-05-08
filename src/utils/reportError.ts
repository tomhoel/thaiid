export interface ReportOptions {
  /** Show a Snackbar to the user. Default: false. */
  userVisible?: boolean;
  /** Custom toast text. Falls back to a generic message. */
  toast?: string;
}

type SnackbarHandler = (text: string) => void;

let snackbarHandler: SnackbarHandler | null = null;

/** Called by SnackbarProvider on mount. */
export function setSnackbarHandler(handler: SnackbarHandler) {
  snackbarHandler = handler;
}

/** Single sink for all caught errors in the app. */
export function reportError(scope: string, error: unknown, opts: ReportOptions = {}): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${scope}] ${message}`, error);

  // Wave 4 hook: Sentry.captureException(error, { tags: { scope } });

  if (opts.userVisible && snackbarHandler) {
    snackbarHandler(opts.toast ?? 'Something went wrong. Please try again.');
  }
}

// Test-only helpers — kept minimal, prefixed with underscore.
export function _setSnackbarHandlerForTest(handler: SnackbarHandler | null) {
  snackbarHandler = handler;
}
export function _resetSnackbarHandlerForTest() {
  snackbarHandler = null;
}
