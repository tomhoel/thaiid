import { describe, expect, it, vi, afterEach } from 'vitest';
import { reportError, setToastHandler } from '@/lib/reportError';

describe('reportError', () => {
  afterEach(() => {
    setToastHandler(null);
    vi.restoreAllMocks();
  });

  it('logs the scope and message for every reported error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    reportError('Scope.action', new Error('boom'));

    expect(consoleError).toHaveBeenCalledWith(
      '[Scope.action] boom',
      expect.any(Error)
    );
  });

  it('stringifies non-Error values', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    reportError('Scope.action', 'plain failure');

    expect(consoleError).toHaveBeenCalledWith('[Scope.action] plain failure', 'plain failure');
  });

  it('stays silent unless the caller opts in to a user-visible toast', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const toast = vi.fn();
    setToastHandler(toast);

    reportError('Scope.action', new Error('boom'));

    expect(toast).not.toHaveBeenCalled();
  });

  it('shows a generic toast when userVisible is set without custom text', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const toast = vi.fn();
    setToastHandler(toast);

    reportError('Scope.action', new Error('boom'), { userVisible: true });

    expect(toast).toHaveBeenCalledWith('Something went wrong. Please try again.');
  });

  it('prefers the caller-supplied toast text', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const toast = vi.fn();
    setToastHandler(toast);

    reportError('Scope.action', new Error('boom'), {
      userVisible: true,
      toast: 'Could not sync your profile.',
    });

    expect(toast).toHaveBeenCalledWith('Could not sync your profile.');
  });

  it('does not throw when no toast handler is registered', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => reportError('Scope.action', new Error('boom'), { userVisible: true })).not.toThrow();
  });
});
