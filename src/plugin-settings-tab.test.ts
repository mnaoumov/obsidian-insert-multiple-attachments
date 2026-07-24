import type {
  App as AppOriginal,
  Plugin,
  TextComponent
} from 'obsidian';
import type { PluginSettingsComponentBase } from 'obsidian-dev-utils/obsidian/components/plugin-settings-component';
import type { MockInstance } from 'vitest';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettings } from './plugin-settings.ts';

import { PluginSettingsTab } from './plugin-settings-tab.ts';

interface BindCapture {
  component: TextComponent;
  options: WhitespaceBindOptions;
}

interface WhitespaceBindOptions {
  componentToPluginSettingsValueConverter?(value: string): string;
  pluginSettingsToComponentValueConverter?(value: string): string;
}

// The real `bind` duck-types each component via property access (e.g. `setPlaceholderValue`), which the
// Test-mocks strict proxy rejects. It is exercised by dev-utils' own tests, so neutralizing its return value
// Is an allowed double — the real `PluginSettingsTabBase`, `Setting` and `TextComponent` are otherwise used
// Unmocked, and the tab's binding intent is asserted via the recorded `bind` calls.
let bindSpy: MockInstance<PluginSettingsTab['bind']>;
let app: AppOriginal;

function createSettingsTab(): PluginSettingsTab {
  const plugin = strictProxy<Plugin>({
    app,
    manifest: { id: 'insert-multiple-attachments' }
  });
  const pluginSettingsComponent = strictProxy<PluginSettingsComponentBase<PluginSettings>>({
    on: castTo<PluginSettingsComponentBase<PluginSettings>['on']>(vi.fn(() => ({
      asyncEventSource: { offref: vi.fn() }
    })))
  });
  return new PluginSettingsTab({ plugin, pluginSettingsComponent });
}

function findBind(key: keyof PluginSettings): BindCapture {
  const call = ensureNonNullable(bindSpy.mock.calls.find((bindCall) => bindCall[0].propertyName === key));
  return {
    component: castTo<TextComponent>(call[0].valueComponent),
    options: castTo<WhitespaceBindOptions>(call[0])
  };
}

describe('PluginSettingsTab', () => {
  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    bindSpy = vi.spyOn(PluginSettingsTab.prototype, 'bind').mockImplementation((params) => params.valueComponent);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create an instance', () => {
    expect(createSettingsTab()).toBeInstanceOf(PluginSettingsTab);
  });

  it('should render five settings on display', () => {
    const tab = createSettingsTab();

    tab.displayLegacy();

    const EXPECTED_SETTING_COUNT = 5;
    expect(tab.containerEl.children.length).toBe(EXPECTED_SETTING_COUNT);
  });

  it('should bind every setting to its property in order', () => {
    const tab = createSettingsTab();

    tab.displayLegacy();

    expect(bindSpy.mock.calls.map((bindCall) => bindCall[0].propertyName)).toEqual([
      'attachmentLinksPrefix',
      'attachmentLinksDelimiter',
      'attachmentLinksSuffix',
      'shouldShowRibbonIcon',
      'shouldShowInEditorContextMenu'
    ]);
  });

  it('should convert newline to a visible enter character when reading from plugin settings', () => {
    const tab = createSettingsTab();
    tab.displayLegacy();

    const converter = ensureNonNullable(findBind('attachmentLinksPrefix').options.pluginSettingsToComponentValueConverter);

    expect(converter('\n')).toBe('↵');
  });

  it('should convert space to a visible space character when reading from plugin settings', () => {
    const tab = createSettingsTab();
    tab.displayLegacy();

    const converter = ensureNonNullable(findBind('attachmentLinksPrefix').options.pluginSettingsToComponentValueConverter);

    expect(converter(' ')).toBe('␣');
  });

  it('should restore a visible enter character back to a newline when saving to plugin settings', () => {
    const tab = createSettingsTab();
    tab.displayLegacy();

    const converter = ensureNonNullable(findBind('attachmentLinksPrefix').options.componentToPluginSettingsValueConverter);

    expect(converter('↵')).toBe('\n');
  });

  it('should restore a visible space character back to a space when saving to plugin settings', () => {
    const tab = createSettingsTab();
    tab.displayLegacy();

    const converter = ensureNonNullable(findBind('attachmentLinksPrefix').options.componentToPluginSettingsValueConverter);

    expect(converter('␣')).toBe(' ');
  });

  it('should replace a typed space with a visible space character in the input field', () => {
    const tab = createSettingsTab();
    tab.displayLegacy();

    const inputEl = findBind('attachmentLinksPrefix').component.inputEl;
    inputEl.value = ' ';
    inputEl.dispatchEvent(new Event('input'));

    expect(inputEl.value).toBe('␣');
  });

  it('should insert a visible enter character when the user presses Enter', () => {
    const tab = createSettingsTab();
    tab.displayLegacy();

    const inputEl = findBind('attachmentLinksPrefix').component.inputEl;
    inputEl.value = 'prefix';
    Object.defineProperty(inputEl, 'selectionStart', { configurable: true, value: 6 });
    Object.defineProperty(inputEl, 'selectionEnd', { configurable: true, value: 6 });

    const keypressEvent = new KeyboardEvent('keypress', { key: 'Enter' });
    const preventDefaultSpy = vi.spyOn(keypressEvent, 'preventDefault');
    inputEl.dispatchEvent(keypressEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(inputEl.value).toBe('prefix↵');
  });

  it('should not intercept non-Enter key presses', () => {
    const tab = createSettingsTab();
    tab.displayLegacy();

    const inputEl = findBind('attachmentLinksPrefix').component.inputEl;
    inputEl.value = 'prefix';

    const keypressEvent = new KeyboardEvent('keypress', { key: 'a' });
    const preventDefaultSpy = vi.spyOn(keypressEvent, 'preventDefault');
    inputEl.dispatchEvent(keypressEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(inputEl.value).toBe('prefix');
  });

  it('should use 0 as the fallback when selectionStart is null on an input event', () => {
    const tab = createSettingsTab();
    tab.displayLegacy();

    const inputEl = findBind('attachmentLinksPrefix').component.inputEl;
    Object.defineProperty(inputEl, 'selectionStart', { configurable: true, value: null });
    Object.defineProperty(inputEl, 'selectionEnd', { configurable: true, value: null });
    inputEl.value = ' ';
    inputEl.dispatchEvent(new Event('input'));

    expect(inputEl.value).toBe('␣');
  });

  it('should use 0 as the fallback when selectionStart is null on an Enter keypress', () => {
    const tab = createSettingsTab();
    tab.displayLegacy();

    const inputEl = findBind('attachmentLinksPrefix').component.inputEl;
    inputEl.value = 'text';
    Object.defineProperty(inputEl, 'selectionStart', { configurable: true, value: null });
    Object.defineProperty(inputEl, 'selectionEnd', { configurable: true, value: null });

    inputEl.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));

    expect(inputEl.value).toBe('↵text');
  });
});
