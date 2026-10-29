import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type {
  RibbonIconRegistrar,
  RibbonIconRegistrarAddRibbonIconParams
} from '@mnaoumov/obsidian-lib/ribbon-icon-registrar';
import type { AsyncEventRef } from '@mnaoumov/typescript-lib/async-events';
import type {
  App,
  Editor
} from 'obsidian';
import type { Mock } from 'vitest';

import { noop } from '@mnaoumov/typescript-lib/function';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { ensureNonNullable } from '@mnaoumov/typescript-lib/type-guards';
import { strictProxy } from '@mnaoumov/typescript-test-toolkit/strict-proxy';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { PluginSettings } from './plugin-settings.ts';

import { RibbonIconComponent } from './ribbon-icon-component.ts';

const hoisted = vi.hoisted(() => ({
  mockInsertAttachmentsControlConstructor: vi.fn()
}));

vi.mock('./insert-attachments-control.ts', () => ({
  InsertAttachmentsControl: hoisted.mockInsertAttachmentsControlConstructor
}));

interface CreateHarnessOptions {
  readonly activeEditor?: Editor | null;
}

interface Harness {
  readonly addRibbonIcon: Mock<(params: RibbonIconRegistrarAddRibbonIconParams) => HTMLElement>;
  readonly app: App;
  readonly capturedEventCallbacks: Map<string, () => void>;
  readonly component: RibbonIconComponent;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly ribbonIconEl: HTMLElement;
  readonly settings: PluginSettings;
  readonly showNotice: Mock<PluginNoticeComponent['showNotice']>;
}

function createHarness(options?: CreateHarnessOptions): Harness {
  const settings = castTo<PluginSettings>({ shouldShowRibbonIcon: true });
  const capturedEventCallbacks = new Map<string, () => void>();

  const pluginSettingsComponent = strictProxy<PluginSettingsComponent>({
    on(name: string, callback: () => void, thisArgument?: unknown): AsyncEventRef {
      capturedEventCallbacks.set(name, callback);
      return castTo<AsyncEventRef>({ asyncEventSource: { offref: noop }, callback, name, thisArgument });
    },
    settings: castTo<PluginSettingsComponent['settings']>(settings)
  });

  const ribbonIconEl = createDiv();
  const addRibbonIcon: Mock<(params: RibbonIconRegistrarAddRibbonIconParams) => HTMLElement> = vi.fn(() => ribbonIconEl);
  const ribbonIconRegistrar = strictProxy<RibbonIconRegistrar>({ addRibbonIcon });

  const showNotice = vi.fn<PluginNoticeComponent['showNotice']>();
  const pluginNoticeComponent = strictProxy<PluginNoticeComponent>({ showNotice });

  const activeEditor = options && 'activeEditor' in options ? options.activeEditor : strictProxy<Editor>({});
  const app = strictProxy<App>({
    workspace: castTo<App['workspace']>({
      activeEditor: activeEditor === null ? null : castTo<NonNullable<App['workspace']['activeEditor']>>({ editor: activeEditor })
    })
  });

  const component = new RibbonIconComponent({
    app,
    pluginNoticeComponent,
    pluginSettingsComponent,
    ribbonIconRegistrar
  });

  return {
    addRibbonIcon,
    app,
    capturedEventCallbacks,
    component,
    pluginNoticeComponent,
    pluginSettingsComponent,
    ribbonIconEl,
    settings,
    showNotice
  };
}

function firstAddRibbonIconParams(harness: Harness): RibbonIconRegistrarAddRibbonIconParams {
  return ensureNonNullable(harness.addRibbonIcon.mock.calls[0])[0];
}

describe('RibbonIconComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an instance', () => {
    expect(createHarness().component).toBeInstanceOf(RibbonIconComponent);
  });

  it('should add the ribbon icon on load when the setting is enabled', () => {
    const harness = createHarness();
    harness.settings.shouldShowRibbonIcon = true;

    harness.component.load();

    expect(harness.addRibbonIcon).toHaveBeenCalledOnce();
    const params = firstAddRibbonIconParams(harness);
    expect(params.icon).toBe('lucide-paperclip');
    expect(params.title).toBe('Insert Multiple Attachments');
  });

  it('should not add the ribbon icon on load when the setting is disabled', () => {
    const harness = createHarness();
    harness.settings.shouldShowRibbonIcon = false;

    harness.component.load();

    expect(harness.addRibbonIcon).not.toHaveBeenCalled();
  });

  it('should add the ribbon icon when the setting is toggled on', () => {
    const harness = createHarness();
    harness.settings.shouldShowRibbonIcon = false;
    harness.component.load();

    harness.settings.shouldShowRibbonIcon = true;
    harness.capturedEventCallbacks.get('saveSettings')?.();

    expect(harness.addRibbonIcon).toHaveBeenCalledOnce();
  });

  it('should remove the ribbon icon when the setting is toggled off', () => {
    const harness = createHarness();
    harness.settings.shouldShowRibbonIcon = true;
    harness.component.load();
    const removeSpy = vi.spyOn(harness.ribbonIconEl, 'remove');

    harness.settings.shouldShowRibbonIcon = false;
    harness.capturedEventCallbacks.get('saveSettings')?.();

    expect(removeSpy).toHaveBeenCalledOnce();
  });

  it('should not add a second ribbon icon when settings change while already shown', () => {
    const harness = createHarness();
    harness.settings.shouldShowRibbonIcon = true;
    harness.component.load();

    harness.capturedEventCallbacks.get('loadSettings')?.();

    expect(harness.addRibbonIcon).toHaveBeenCalledOnce();
  });

  it('should remove the ribbon icon on unload', () => {
    const harness = createHarness();
    harness.settings.shouldShowRibbonIcon = true;
    harness.component.load();
    const removeSpy = vi.spyOn(harness.ribbonIconEl, 'remove');

    harness.component.unload();

    expect(removeSpy).toHaveBeenCalledOnce();
  });

  it('should insert attachments when the ribbon icon is clicked with an active editor', () => {
    const editor = strictProxy<Editor>({});
    const harness = createHarness({ activeEditor: editor });
    harness.component.load();

    firstAddRibbonIconParams(harness).callback(new MouseEvent('click'));

    expect(hoisted.mockInsertAttachmentsControlConstructor).toHaveBeenCalledWith({
      app: harness.app,
      editor,
      pluginNoticeComponent: harness.pluginNoticeComponent,
      pluginSettingsComponent: harness.pluginSettingsComponent
    });
    expect(harness.showNotice).not.toHaveBeenCalled();
  });

  it('should show a notice when the ribbon icon is clicked without an active editor', () => {
    const harness = createHarness({ activeEditor: null });
    harness.component.load();

    firstAddRibbonIconParams(harness).callback(new MouseEvent('click'));

    expect(harness.showNotice).toHaveBeenCalledWith('Open a note to insert attachments.');
    expect(hoisted.mockInsertAttachmentsControlConstructor).not.toHaveBeenCalled();
  });
});
