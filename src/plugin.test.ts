import type {
  App as AppOriginal,
  PluginManifest
} from 'obsidian';

import { AppActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import { PluginCommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import { MenuEventRegistrarComponent } from 'obsidian-dev-utils/obsidian/components/menu-event-registrar-component';
import { PluginSettingsTabComponent } from 'obsidian-dev-utils/obsidian/components/plugin-settings-tab-component';
import { PluginDataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import { PluginEventSourceImpl } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';
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

// The real `PluginBase.onload()` loads dev-utils' own notice/context/debug components, which read a
// Shared-state bag off the app via `getObsidianDevUtilsState`. The strict App mock has no such bag, so
// Stub this one utility (return a fresh value wrapper per call) — mirroring dev-utils' own PluginBase test.
vi.mock('obsidian-dev-utils/obsidian/app', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian-dev-utils/obsidian/app')>(),
  getObsidianDevUtilsState: vi.fn((_app: unknown, _key: string, defaultValue: unknown) => ({ value: defaultValue }))
}));

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

vi.mock('obsidian-dev-utils/obsidian/components/menu-event-registrar-component', async () => ({
  MenuEventRegistrarComponent: await loadableComponentStub()
}));

vi.mock('obsidian-dev-utils/obsidian/components/plugin-settings-tab-component', async () => ({
  PluginSettingsTabComponent: await loadableComponentStub()
}));

vi.mock('obsidian-dev-utils/obsidian/command-handlers/command-handler-component', async () => ({
  CommandHandlerComponent: await loadableComponentStub()
}));

vi.mock('obsidian-dev-utils/obsidian/active-file-provider', () => ({
  AppActiveFileProvider: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/command-registrar', () => ({
  PluginCommandRegistrar: vi.fn()
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

vi.mock('./plugin-settings-tab.ts', () => ({
  PluginSettingsTab: vi.fn()
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

const MockAppActiveFileProvider = vi.mocked(AppActiveFileProvider);
const MockCommandHandlerComponent = vi.mocked(CommandHandlerComponent);
const MockPluginCommandRegistrar = vi.mocked(PluginCommandRegistrar);
const MockMenuEventRegistrarComponent = vi.mocked(MenuEventRegistrarComponent);
const MockPluginSettingsTabComponent = vi.mocked(PluginSettingsTabComponent);
const MockPluginDataHandler = vi.mocked(PluginDataHandler);
const MockPluginEventSourceImpl = vi.mocked(PluginEventSourceImpl);
const MockInvokeCommandHandler = vi.mocked(InvokeCommandHandler);
const MockPluginSettingsComponent = vi.mocked(PluginSettingsComponent);
const MockPluginSettingsTab = vi.mocked(PluginSettingsTab);

const manifest: PluginManifest = {
  author: 'test',
  description: 'test',
  id: 'insert-multiple-attachments',
  minAppVersion: '1.0.0',
  name: 'Insert Multiple Attachments',
  version: '1.0.0'
};

let app: AppOriginal;

function instanceOf(mock: ReturnType<typeof vi.fn>): unknown {
  return mock.mock.results[0]?.value;
}

describe('Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const appMock = App.createConfigured__();
    appMock.workspace.onLayoutReady = vi.fn((cb: () => void) => {
      cb();
    });
    app = appMock.asOriginalType__();
  });

  it('should create a plugin instance', () => {
    expect(new Plugin(app, manifest)).toBeInstanceOf(Plugin);
  });

  describe('onload', () => {
    it('should create PluginSettingsComponent with the data handler and plugin event source', async () => {
      const plugin = new Plugin(app, manifest);
      await plugin.onload();

      expect(MockPluginSettingsComponent).toHaveBeenCalledWith({
        dataHandler: MockPluginDataHandler.mock.instances[0],
        pluginEventSource: MockPluginEventSourceImpl.mock.instances[0]
      });
    });

    it('should create PluginSettingsTab with the plugin and settings component', async () => {
      const plugin = new Plugin(app, manifest);
      await plugin.onload();

      expect(MockPluginSettingsTab).toHaveBeenCalledWith({
        plugin,
        pluginSettingsComponent: instanceOf(MockPluginSettingsComponent)
      });
    });

    it('should create PluginSettingsTabComponent with the plugin and settings tab', async () => {
      const plugin = new Plugin(app, manifest);
      await plugin.onload();

      expect(MockPluginSettingsTabComponent).toHaveBeenCalledWith({
        plugin,
        pluginSettingsTab: MockPluginSettingsTab.mock.instances[0]
      });
    });

    it('should create MenuEventRegistrarComponent with the app', async () => {
      const plugin = new Plugin(app, manifest);
      await plugin.onload();

      expect(MockMenuEventRegistrarComponent).toHaveBeenCalledWith(app);
    });

    it('should create InvokeCommandHandler with the app and settings component', async () => {
      const plugin = new Plugin(app, manifest);
      await plugin.onload();

      const params = MockInvokeCommandHandler.mock.calls[0]?.[0];
      expect(params?.app).toBe(app);
      expect(params?.pluginSettingsComponent).toBe(instanceOf(MockPluginSettingsComponent));
    });

    it('should create CommandHandlerComponent wiring the invoke command and menu registrar', async () => {
      const plugin = new Plugin(app, manifest);
      await plugin.onload();

      expect(MockCommandHandlerComponent).toHaveBeenCalledWith({
        activeFileProvider: MockAppActiveFileProvider.mock.instances[0],
        commandHandlers: [MockInvokeCommandHandler.mock.instances[0]],
        commandRegistrar: MockPluginCommandRegistrar.mock.instances[0],
        menuEventRegistrar: instanceOf(MockMenuEventRegistrarComponent),
        pluginName: manifest.name
      });
    });

    it('should add the four plugin components as children', async () => {
      const plugin = new Plugin(app, manifest);
      const addChildSpy = vi.spyOn(plugin, 'addChild');
      await plugin.onload();

      expect(addChildSpy).toHaveBeenCalledWith(instanceOf(MockPluginSettingsComponent));
      expect(addChildSpy).toHaveBeenCalledWith(instanceOf(MockPluginSettingsTabComponent));
      expect(addChildSpy).toHaveBeenCalledWith(instanceOf(MockMenuEventRegistrarComponent));
      expect(addChildSpy).toHaveBeenCalledWith(instanceOf(MockCommandHandlerComponent));
    });
  });
});
