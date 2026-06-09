import type {
  App,
  Component,
  PluginManifest
} from 'obsidian';

import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

const addedChildren: Component[] = [];
let layoutReadyCallback: (() => Promise<void>) | undefined;

const PluginBaseMock = vi.hoisted(() =>
  class {
    public app: unknown;
    public manifest: unknown;

    public constructor(app: unknown, manifest: unknown) {
      this.app = app;
      this.manifest = manifest;
    }

    public addChild<T extends Component>(child: T): T {
      addedChildren.push(child);
      return child;
    }
  }
);

const CallbackLayoutReadyComponentMock = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mock class stores side effects in constructor.
  class MockCallbackLayoutReadyComponent {
    public constructor(_app: unknown, callback: () => Promise<void>) {
      layoutReadyCallback = callback;
    }
  }
  return MockCallbackLayoutReadyComponent;
});

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin', () => ({
  PluginBase: PluginBaseMock
}));

vi.mock('obsidian-dev-utils/obsidian/components/layout-ready-component', () => ({
  CallbackLayoutReadyComponent: CallbackLayoutReadyComponentMock
}));

vi.mock('obsidian-dev-utils/function', () => ({
  noopAsync: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('obsidian-dev-utils/obsidian/active-file-provider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mock class must exist for constructor call.
  AppActiveFileProvider: class MockAppActiveFileProvider {}
}));

vi.mock('obsidian-dev-utils/obsidian/command-handlers/command-handler-component', () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mock class must exist for constructor call.
  CommandHandlerComponent: class MockCommandHandlerComponent {}
}));

vi.mock('obsidian-dev-utils/obsidian/command-registrar', () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mock class must exist for constructor call.
  PluginCommandRegistrar: class MockPluginCommandRegistrar {}
}));

vi.mock('obsidian-dev-utils/obsidian/components/menu-event-registrar-component', () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mock class must exist for constructor call.
  MenuEventRegistrarComponent: class MockMenuEventRegistrarComponent {}
}));

vi.mock('obsidian-dev-utils/obsidian/components/plugin-settings-tab-component', () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mock class must exist for constructor call.
  PluginSettingsTabComponent: class MockPluginSettingsTabComponent {}
}));

vi.mock('obsidian-dev-utils/obsidian/data-handler', () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mock class must exist for constructor call.
  PluginDataHandler: class MockPluginDataHandler {}
}));

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin-event-source', () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mock class must exist for constructor call.
  PluginEventSourceImpl: class MockPluginEventSourceImpl {}
}));

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin-settings-tab', () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mock class must exist for constructor call.
  PluginSettingsTabBase: class MockPluginSettingsTabBase {}
}));

vi.mock('obsidian-dev-utils/obsidian/components/plugin-settings-component', () => ({
  PluginSettingsComponentBase: class MockPluginSettingsComponentBase {
    public readonly settings = {};
  }
}));

vi.mock('obsidian', () => ({
  Setting: vi.fn(),
  TextComponent: vi.fn()
}));

interface InvokeCommandHandlerConstructorParamsMock {
  getPluginSettings(): unknown;
}

let capturedGetPluginSettings: (() => unknown) | undefined;

vi.mock('./command-handlers/invoke-command-handler.ts', () => {
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mock class stores side effects in constructor.
  class MockInvokeCommandHandler {
    public constructor(params: InvokeCommandHandlerConstructorParamsMock) {
      capturedGetPluginSettings = params.getPluginSettings.bind(params);
    }
  }
  return { InvokeCommandHandler: MockInvokeCommandHandler };
});

vi.mock('./plugin-settings-component.ts', () => ({
  PluginSettingsComponent: class MockPluginSettingsComponent {
    public readonly settings = {};
  }
}));

vi.mock('./plugin-settings-tab.ts', () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mock class must exist for constructor call.
  PluginSettingsTab: class MockPluginSettingsTab {}
}));

// eslint-disable-next-line import-x/first, import-x/imports-first -- vi.mock must precede imports.
import { noopAsync } from 'obsidian-dev-utils/function';

// eslint-disable-next-line import-x/first, import-x/imports-first -- vi.mock must precede imports.
import { Plugin } from './plugin.ts';

describe('Plugin', () => {
  afterEach(() => {
    addedChildren.length = 0;
    layoutReadyCallback = undefined;
    capturedGetPluginSettings = undefined;
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should create plugin instance', () => {
    const plugin = new Plugin(castTo<App>({}), castTo<PluginManifest>({ name: 'test-plugin' }));

    expect(plugin).toBeInstanceOf(Plugin);
  });

  it('should add five child components in the constructor', () => {
    addedChildren.length = 0;

    new Plugin(castTo<App>({}), castTo<PluginManifest>({ name: 'test-plugin' }));

    const EXPECTED_CHILD_COUNT = 5;
    expect(addedChildren).toHaveLength(EXPECTED_CHILD_COUNT);
  });

  it('should register a layout ready callback', () => {
    new Plugin(castTo<App>({}), castTo<PluginManifest>({ name: 'test-plugin' }));

    expect(layoutReadyCallback).toBeDefined();
  });

  it('should call noopAsync when onLayoutReady fires', async () => {
    new Plugin(castTo<App>({}), castTo<PluginManifest>({ name: 'test-plugin' }));

    await layoutReadyCallback?.();

    expect(noopAsync).toHaveBeenCalled();
  });

  it('should provide working getPluginSettings that returns settings', () => {
    new Plugin(castTo<App>({}), castTo<PluginManifest>({ name: 'test-plugin' }));

    expect(capturedGetPluginSettings).toBeDefined();
    const settings = capturedGetPluginSettings?.();

    expect(settings).toBeDefined();
  });
});
