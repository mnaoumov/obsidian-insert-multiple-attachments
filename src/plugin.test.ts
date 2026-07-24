import type {
  App as AppOriginal,
  PluginManifest
} from 'obsidian';
import type { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { OpenDemoVaultCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/open-demo-vault-command-handler';
import { PluginSettingsTabComponent } from 'obsidian-dev-utils/obsidian/components/plugin-settings-tab-component';
import { PluginDataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import { PluginEventSourceImpl } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';
import { PluginRibbonIconRegistrar } from 'obsidian-dev-utils/obsidian/ribbon-icon-registrar';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { InvokeCommandHandler } from './command-handlers/invoke-command-handler.ts';
import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { Plugin } from './plugin.ts';
import { RibbonIconComponent } from './ribbon-icon-component.ts';

// A dev-utils component added via `addChild` must be loadable, so its stub returns a real `Component`. The
// Flowing instance is the stub's return value (`mock.results[0].value`), not the discarded `this`.
interface ObsidianComponentModule {
  Component: new () => object;
}

async function loadableComponentStub(): Promise<ReturnType<typeof vi.fn>> {
  const { Component } = await vi.importActual<ObsidianComponentModule>('obsidian');
  // Vitest requires a non-arrow function for a mock invoked with `new`; it must return a fresh real
  // `Component`. Constructing a stub class directly would route `this` through vitest's mock proxy and
  // Break the test-mocks `Component` constructor's own strict proxy.
  // eslint-disable-next-line prefer-arrow-callback -- See above; an arrow cannot be used here.
  return vi.fn(function componentStub() {
    return new Component();
  });
}

vi.mock('obsidian-dev-utils/obsidian/components/plugin-settings-tab-component', async () => ({
  PluginSettingsTabComponent: await loadableComponentStub()
}));

vi.mock('obsidian-dev-utils/obsidian/data-handler', () => ({
  PluginDataHandler: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin-event-source', () => ({
  PluginEventSourceImpl: vi.fn()
}));

vi.mock('./command-handlers/invoke-command-handler.ts', () => ({
  InvokeCommandHandler: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/command-handlers/open-demo-vault-command-handler', () => ({
  OpenDemoVaultCommandHandler: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/ribbon-icon-registrar', () => ({
  PluginRibbonIconRegistrar: vi.fn()
}));

vi.mock('./plugin-settings-tab.ts', () => ({
  PluginSettingsTab: vi.fn()
}));

vi.mock('./ribbon-icon-component.ts', async () => ({
  RibbonIconComponent: await loadableComponentStub()
}));

// The plugin's own settings component is added via `addChild`, so it must be loadable. The stub returns a
// Plain loadable object; the resolved instance is passed by reference to the settings tab and command handler.
vi.mock('./plugin-settings-component.ts', () => ({
  // eslint-disable-next-line prefer-arrow-callback -- vitest requires a non-arrow function for `new`.
  PluginSettingsComponent: vi.fn(function pluginSettingsComponentStub() {
    return {
      load: vi.fn()
    };
  })
}));

const MockPluginSettingsTabComponent = vi.mocked(PluginSettingsTabComponent);
const MockPluginDataHandler = vi.mocked(PluginDataHandler);
const MockPluginEventSourceImpl = vi.mocked(PluginEventSourceImpl);
const MockInvokeCommandHandler = vi.mocked(InvokeCommandHandler);
const MockOpenDemoVaultCommandHandler = vi.mocked(OpenDemoVaultCommandHandler);
const MockPluginSettingsComponent = vi.mocked(PluginSettingsComponent);
const MockPluginSettingsTab = vi.mocked(PluginSettingsTab);
const MockRibbonIconComponent = vi.mocked(RibbonIconComponent);
const MockPluginRibbonIconRegistrar = vi.mocked(PluginRibbonIconRegistrar);

const manifest: PluginManifest = {
  author: 'test',
  description: 'test',
  id: 'insert-multiple-attachments',
  minAppVersion: '1.0.0',
  name: 'Insert Multiple Attachments',
  version: '1.0.0'
};

// ODU 86.0.0 moved the command-handler component into `PluginBase` (`this.commandHandlerComponent`). Driving
// `onloadImpl()` directly with a seeded `_commandHandlerComponent` keeps this a focused wiring test — the base
// `onload()` (notice/context/debug components) is dev-utils' own concern, covered by its tests.
interface PluginInternals {
  _commandHandlerComponent: CommandHandlerComponent;
  _pluginNoticeComponent: PluginNoticeComponent;
  onloadImpl(): void;
}

let app: AppOriginal;
let pluginNoticeComponent: PluginNoticeComponent;

function instanceOf(mock: ReturnType<typeof vi.fn>): unknown {
  return mock.mock.results[0]?.value;
}

// `pluginNoticeComponent` is a getter that throws when its backing field is unset, so seed it too — the
// Open-demo-vault handler reads it. The base `onload()` would normally set it, but that is dev-utils' concern.
function seedAndRun(plugin: Plugin): ReturnType<typeof vi.fn> {
  const internals = castTo<PluginInternals>(plugin);
  const registerCommandHandlers = vi.fn();
  internals._commandHandlerComponent = strictProxy<CommandHandlerComponent>({ registerCommandHandlers });
  internals._pluginNoticeComponent = pluginNoticeComponent;
  internals.onloadImpl();
  return registerCommandHandlers;
}

describe('Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    app = App.createConfigured__().asOriginalType__();
    pluginNoticeComponent = strictProxy<PluginNoticeComponent>({});
  });

  it('should create a plugin instance', () => {
    expect(new Plugin(app, manifest)).toBeInstanceOf(Plugin);
  });

  describe('onloadImpl', () => {
    it('should create PluginSettingsComponent with the data handler and plugin event source', () => {
      const plugin = new Plugin(app, manifest);
      seedAndRun(plugin);

      expect(MockPluginSettingsComponent).toHaveBeenCalledWith({
        dataHandler: MockPluginDataHandler.mock.instances[0],
        pluginEventSource: MockPluginEventSourceImpl.mock.instances[0]
      });
    });

    it('should create PluginSettingsTab with the plugin and settings component', () => {
      const plugin = new Plugin(app, manifest);
      seedAndRun(plugin);

      expect(MockPluginSettingsTab).toHaveBeenCalledWith({
        plugin,
        pluginSettingsComponent: instanceOf(MockPluginSettingsComponent)
      });
    });

    it('should create PluginSettingsTabComponent with the plugin and settings tab', () => {
      const plugin = new Plugin(app, manifest);
      seedAndRun(plugin);

      expect(MockPluginSettingsTabComponent).toHaveBeenCalledWith({
        plugin,
        pluginSettingsTab: MockPluginSettingsTab.mock.instances[0]
      });
    });

    it('should create InvokeCommandHandler with the app and settings component', () => {
      const plugin = new Plugin(app, manifest);
      seedAndRun(plugin);

      const params = MockInvokeCommandHandler.mock.calls[0]?.[0];
      expect(params?.app).toBe(app);
      expect(params?.pluginSettingsComponent).toBe(instanceOf(MockPluginSettingsComponent));
    });

    it('should create OpenDemoVaultCommandHandler with the app, plugin id, notice component, and version', () => {
      const plugin = new Plugin(app, manifest);
      seedAndRun(plugin);

      const params = MockOpenDemoVaultCommandHandler.mock.calls[0]?.[0];
      expect(params?.app).toBe(app);
      expect(params?.pluginId).toBe(manifest.id);
      expect(params?.pluginNoticeComponent).toBe(pluginNoticeComponent);
      expect(params?.pluginVersion).toBe(manifest.version);
    });

    it('should create RibbonIconComponent with the app, notice component, settings component, and ribbon registrar', () => {
      const plugin = new Plugin(app, manifest);
      seedAndRun(plugin);

      const params = MockRibbonIconComponent.mock.calls[0]?.[0];
      expect(params?.app).toBe(app);
      expect(params?.pluginNoticeComponent).toBe(pluginNoticeComponent);
      expect(params?.pluginSettingsComponent).toBe(instanceOf(MockPluginSettingsComponent));
      expect(params?.ribbonIconRegistrar).toBe(MockPluginRibbonIconRegistrar.mock.instances[0]);
    });

    it('should create the ribbon registrar with the plugin', () => {
      const plugin = new Plugin(app, manifest);
      seedAndRun(plugin);

      expect(MockPluginRibbonIconRegistrar).toHaveBeenCalledWith(plugin);
    });

    it('should register the invoke and open demo vault command handlers on the base command-handler component', () => {
      const plugin = new Plugin(app, manifest);
      const registerCommandHandlers = seedAndRun(plugin);

      expect(registerCommandHandlers).toHaveBeenCalledOnce();
      expect(registerCommandHandlers).toHaveBeenCalledWith([
        instanceOf(MockInvokeCommandHandler),
        instanceOf(MockOpenDemoVaultCommandHandler)
      ]);
    });

    it('should add the three plugin components as children', () => {
      const plugin = new Plugin(app, manifest);
      const addChildSpy = vi.spyOn(plugin, 'addChild');
      seedAndRun(plugin);

      expect(addChildSpy).toHaveBeenCalledWith(instanceOf(MockPluginSettingsComponent));
      expect(addChildSpy).toHaveBeenCalledWith(instanceOf(MockPluginSettingsTabComponent));
      expect(addChildSpy).toHaveBeenCalledWith(instanceOf(MockRibbonIconComponent));

      const EXPECTED_ADD_CHILD_CALLS = 3;
      expect(addChildSpy).toHaveBeenCalledTimes(EXPECTED_ADD_CHILD_CALLS);
    });
  });
});
