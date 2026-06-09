/* eslint-disable @typescript-eslint/no-empty-function -- Test mocks require empty constructors and flexible patterns. */
import type { PluginSettingsTabBaseConstructorParams } from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-tab';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettings } from './plugin-settings.ts';

import { PluginSettingsTab } from './plugin-settings-tab.ts';

interface BindOptions {
  readonly componentToPluginSettingsValueConverter?: ValueConverter;
  readonly pluginSettingsToComponentValueConverter?: ValueConverter;
}

interface CapturedBind {
  component: MockTextComponentInTab;
  key: string;
  options?: BindOptions;
}

type ValueConverter = (value: string) => string;

const capturedBinds: CapturedBind[] = [];
let mockContainerEl: HTMLElement;

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin-settings-tab', () => ({
  PluginSettingsTabBase: class {
    public containerEl: HTMLElement = activeDocument.createElement('div');

    public constructor(_params: unknown) {
      mockContainerEl = this.containerEl;
    }

    public bind(component: MockTextComponentInTab, key: string, options?: BindOptions): unknown {
      const entry: CapturedBind = { component, key };
      if (options !== undefined) {
        entry.options = options;
      }
      capturedBinds.push(entry);
      return component;
    }

    public display(): void {}
  }
}));

vi.mock('obsidian-dev-utils/string', () => ({
  replace: vi.fn((str: string, replacements: Record<string, string>) => {
    let result = str;
    for (const [from, to] of Object.entries(replacements)) {
      result = result.replaceAll(from, to);
    }
    return result;
  })
}));

class MockTextComponentInTab {
  public inputEl: HTMLInputElement = activeDocument.createElement('input');
}

vi.mock('obsidian', () => ({
  Setting: class MockSetting {
    public constructor(el: HTMLElement) {
      el.appendChild(activeDocument.createElement('div'));
    }

    public addText(cb: (text: MockTextComponentInTab) => void): this {
      const mockText = new MockTextComponentInTab();
      cb(mockText);
      return this;
    }

    public setDesc(_desc: string): this {
      return this;
    }

    public setName(_name: string): this {
      return this;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- imported module reference must exist for InstanceType resolution.
  TextComponent: class MockTextComponentGlobal {}
}));

describe('PluginSettingsTab', () => {
  function createSettingsTab(): PluginSettingsTab {
    capturedBinds.length = 0;
    return new PluginSettingsTab(castTo<PluginSettingsTabBaseConstructorParams<PluginSettings>>({}));
  }

  it('should create an instance', () => {
    const tab = createSettingsTab();

    expect(tab).toBeInstanceOf(PluginSettingsTab);
  });

  it('should render three settings on display()', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    const EXPECTED_SETTING_COUNT = 3;
    expect(mockContainerEl.children.length).toBe(EXPECTED_SETTING_COUNT);
  });

  it('should bind attachmentLinksPrefix', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    expect(capturedBinds.map((b) => b.key)).toContain('attachmentLinksPrefix');
  });

  it('should bind attachmentLinksDelimiter', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    expect(capturedBinds.map((b) => b.key)).toContain('attachmentLinksDelimiter');
  });

  it('should bind attachmentLinksSuffix', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    expect(capturedBinds.map((b) => b.key)).toContain('attachmentLinksSuffix');
  });

  it('should convert newline to visible enter character when reading value from plugin settings', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    const prefixBind = capturedBinds.find((b) => b.key === 'attachmentLinksPrefix');
    const converter = prefixBind?.options?.pluginSettingsToComponentValueConverter;
    expect(converter).toBeDefined();

    expect(converter?.('\n')).toBe('↵');
  });

  it('should convert space to visible space character when reading value from plugin settings', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    const prefixBind = capturedBinds.find((b) => b.key === 'attachmentLinksPrefix');
    const converter = prefixBind?.options?.pluginSettingsToComponentValueConverter;
    expect(converter).toBeDefined();

    expect(converter?.(' ')).toBe('␣');
  });

  it('should restore visible enter character back to newline when saving to plugin settings', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    const prefixBind = capturedBinds.find((b) => b.key === 'attachmentLinksPrefix');
    const converter = prefixBind?.options?.componentToPluginSettingsValueConverter;
    expect(converter).toBeDefined();

    expect(converter?.('↵')).toBe('\n');
  });

  it('should restore visible space character back to space when saving to plugin settings', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    const prefixBind = capturedBinds.find((b) => b.key === 'attachmentLinksPrefix');
    const converter = prefixBind?.options?.componentToPluginSettingsValueConverter;
    expect(converter).toBeDefined();

    expect(converter?.('␣')).toBe(' ');
  });

  it('should replace visible space character when user types in input field', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    const prefixBind = capturedBinds.find((b) => b.key === 'attachmentLinksPrefix');
    const inputEl = prefixBind?.component.inputEl;
    expect(inputEl).toBeDefined();

    const safeInputEl = ensureNonNullable(inputEl);
    safeInputEl.value = ' ';
    safeInputEl.dispatchEvent(new Event('input'));

    expect(safeInputEl.value).toBe('␣');
  });

  it('should insert visible enter character when user presses Enter key', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    const prefixBind = capturedBinds.find((b) => b.key === 'attachmentLinksPrefix');
    const inputEl = prefixBind?.component.inputEl;
    expect(inputEl).toBeDefined();

    const safeInputEl = ensureNonNullable(inputEl);
    safeInputEl.value = 'prefix';
    Object.defineProperty(safeInputEl, 'selectionStart', { configurable: true, value: 6 });
    Object.defineProperty(safeInputEl, 'selectionEnd', { configurable: true, value: 6 });

    const keypressEvent = new KeyboardEvent('keypress', { key: 'Enter' });
    const preventDefaultSpy = vi.spyOn(keypressEvent, 'preventDefault');
    safeInputEl.dispatchEvent(keypressEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(safeInputEl.value).toBe('prefix↵');
  });

  it('should not intercept non-Enter key presses', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    const prefixBind = capturedBinds.find((b) => b.key === 'attachmentLinksPrefix');
    const inputEl = prefixBind?.component.inputEl;
    expect(inputEl).toBeDefined();

    const safeInputEl = ensureNonNullable(inputEl);
    safeInputEl.value = 'prefix';
    const keypressEvent = new KeyboardEvent('keypress', { key: 'a' });
    const preventDefaultSpy = vi.spyOn(keypressEvent, 'preventDefault');
    safeInputEl.dispatchEvent(keypressEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(safeInputEl.value).toBe('prefix');
  });

  it('should use 0 as fallback when selectionStart is null on input event', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    const prefixBind = capturedBinds.find((b) => b.key === 'attachmentLinksPrefix');
    const inputEl = prefixBind?.component.inputEl;
    expect(inputEl).toBeDefined();

    const safeInputEl = ensureNonNullable(inputEl);
    Object.defineProperty(safeInputEl, 'selectionStart', { configurable: true, value: null });
    Object.defineProperty(safeInputEl, 'selectionEnd', { configurable: true, value: null });

    safeInputEl.value = ' ';
    safeInputEl.dispatchEvent(new Event('input'));

    expect(safeInputEl.value).toBe('␣');
  });

  it('should use 0 as fallback when selectionStart is null on Enter keypress', () => {
    const tab = createSettingsTab();

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- display() is the entry point for PluginSettingsTabBase; calling it in tests is intentional.
    tab.display();

    const prefixBind = capturedBinds.find((b) => b.key === 'attachmentLinksPrefix');
    const inputEl = prefixBind?.component.inputEl;
    expect(inputEl).toBeDefined();

    const safeInputEl = ensureNonNullable(inputEl);
    safeInputEl.value = 'text';
    Object.defineProperty(safeInputEl, 'selectionStart', { configurable: true, value: null });
    Object.defineProperty(safeInputEl, 'selectionEnd', { configurable: true, value: null });

    const keypressEvent = new KeyboardEvent('keypress', { key: 'Enter' });
    safeInputEl.dispatchEvent(keypressEvent);

    expect(safeInputEl.value).toBe('↵text');
  });
});
/* eslint-enable @typescript-eslint/no-empty-function -- End of test file. */
