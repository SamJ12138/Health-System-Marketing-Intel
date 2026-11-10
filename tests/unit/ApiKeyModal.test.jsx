import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApiKeyModal from '../../src/components/ApiKeyModal';
import { DEFAULT_MODEL } from '../../src/lib/anthropicClient';

function setup(props = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<ApiKeyModal onSave={onSave} onClose={onClose} {...props} />);
  return { onSave, onClose, user };
}

describe('ApiKeyModal', () => {
  it('is a labelled modal dialog and says exactly where the key goes', () => {
    setup();
    const dialog = screen.getByRole('dialog', { name: 'Connect Claude API' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveTextContent('straight from this browser to api.anthropic.com and nowhere else');
    expect(dialog).toHaveTextContent('not written to browser storage, cookies or the address bar');
    expect(dialog).toHaveTextContent('Anyone with access to this browser tab while it is open could read it');
  });

  it('puts focus in the key field on open and gives it back on close', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<ApiKeyModal onSave={() => {}} onClose={() => {}} />);
    expect(screen.getByLabelText('Anthropic API key')).toHaveFocus();
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    const { user } = setup();
    const dialog = screen.getByRole('dialog');
    const close = screen.getByRole('button', { name: 'Close' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    // Save is disabled while the field is empty, so Cancel is the last stop.
    for (let i = 0; i < 12; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement);
    }
    cancel.focus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(cancel).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const { user, onClose, onSave } = setup();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the trimmed key with the default model', async () => {
    const { user, onSave } = setup();
    expect(screen.getByRole('button', { name: 'Save & Connect' })).toBeDisabled();
    await user.type(screen.getByLabelText('Anthropic API key'), '  sk-ant-fixture-key-000  ');
    await user.click(screen.getByRole('button', { name: 'Save & Connect' }));
    expect(onSave).toHaveBeenCalledWith({ apiKey: 'sk-ant-fixture-key-000', model: DEFAULT_MODEL });
  });

  it('lets the model be chosen from the list or typed', async () => {
    const { user, onSave } = setup();
    await user.type(screen.getByLabelText('Anthropic API key'), 'sk-ant-fixture-key-000');
    await user.selectOptions(screen.getByLabelText('Model'), 'claude-sonnet-5-5');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Save & Connect' }));
    expect(onSave).toHaveBeenLastCalledWith({ apiKey: 'sk-ant-fixture-key-000', model: 'claude-sonnet-5-5' });

    await user.selectOptions(screen.getByLabelText('Model'), 'Other model id...');
    expect(screen.getByRole('button', { name: 'Save & Connect' })).toBeDisabled();
    await user.type(screen.getByLabelText('Model id'), 'some-future-model');
    await user.click(screen.getByRole('button', { name: 'Save & Connect' }));
    expect(onSave).toHaveBeenLastCalledWith({ apiKey: 'sk-ant-fixture-key-000', model: 'some-future-model' });
  });

  it('never writes the key to storage, cookies or the console', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const consoleSpies = ['log', 'info', 'warn', 'error', 'debug'].map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const { user } = setup();
    await user.type(screen.getByLabelText('Anthropic API key'), 'sk-ant-fixture-key-000');
    await user.click(screen.getByRole('button', { name: 'Save & Connect' }));
    expect(setItem).not.toHaveBeenCalled();
    expect(document.cookie).toBe('');
    for (const spy of consoleSpies) expect(JSON.stringify(spy.mock.calls)).not.toContain('sk-ant-fixture-key-000');
    expect(screen.getByLabelText('Anthropic API key')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Anthropic API key')).toHaveAttribute('autocomplete', 'off');
    vi.restoreAllMocks();
  });

  it('offers to forget a connected key', async () => {
    const onDisconnect = vi.fn();
    const { user } = setup({ connected: true, onDisconnect });
    await user.click(screen.getByRole('button', { name: /Forget the key/ }));
    expect(onDisconnect).toHaveBeenCalled();
  });
});
