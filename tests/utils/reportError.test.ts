import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reportError, _setSnackbarHandlerForTest, _resetSnackbarHandlerForTest } from '../../src/utils/reportError';

describe('reportError', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    _resetSnackbarHandlerForTest();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs to console.error with [scope] prefix and the error message', () => {
    reportError('test-scope', new Error('boom'));
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const [first] = consoleSpy.mock.calls[0];
    expect(first).toMatch(/^\[test-scope\]/);
    expect(first).toContain('boom');
  });

  it('handles non-Error values', () => {
    reportError('test-scope', 'a string error');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain('a string error');
  });

  it('does not call snackbar handler when userVisible is omitted', () => {
    const handler = vi.fn();
    _setSnackbarHandlerForTest(handler);
    reportError('test-scope', new Error('quiet'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls snackbar handler with provided toast text when userVisible is true', () => {
    const handler = vi.fn();
    _setSnackbarHandlerForTest(handler);
    reportError('test-scope', new Error('boom'), { userVisible: true, toast: 'Save failed.' });
    expect(handler).toHaveBeenCalledWith('Save failed.');
  });

  it('uses a generic toast when userVisible is true and no toast provided', () => {
    const handler = vi.fn();
    _setSnackbarHandlerForTest(handler);
    reportError('test-scope', new Error('boom'), { userVisible: true });
    expect(handler).toHaveBeenCalledWith('Something went wrong. Please try again.');
  });
});
