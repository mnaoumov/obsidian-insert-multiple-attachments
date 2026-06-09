import type { DataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import type { PluginEventSource } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';

import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

interface MockConstructorParams {
  readonly pluginSettingsClass: new () => unknown;
}

const PluginSettingsComponentBaseMock = vi.hoisted(() =>
  class {
    public readonly defaultSettings: unknown;
    protected legacyConverterCalled = false;

    public constructor(params: MockConstructorParams) {
      this.defaultSettings = new params.pluginSettingsClass();
    }

    protected registerLegacySettingsConverter(
      _legacyClass: new () => unknown,
      _converter: (settings: Record<string, unknown>) => void
    ): void {
      this.legacyConverterCalled = true;
    }

    protected registerLegacySettingsConverters(): void {
      // Base no-op
    }
  }
);

vi.mock('obsidian-dev-utils/obsidian/components/plugin-settings-component', () => ({
  PluginSettingsComponentBase: PluginSettingsComponentBaseMock
}));

// eslint-disable-next-line import-x/first, import-x/imports-first -- vi.mock must precede imports.
import { PluginSettingsComponent } from './plugin-settings-component.ts';

describe('PluginSettingsComponent', () => {
  it('should create an instance', () => {
    const component = new PluginSettingsComponent({
      dataHandler: strictProxy<DataHandler>({}),
      pluginEventSource: strictProxy<PluginEventSource>({})
    });

    expect(component).toBeInstanceOf(PluginSettingsComponent);
  });

  it('should pass pluginSettingsClass to base constructor', () => {
    const component = new PluginSettingsComponent({
      dataHandler: strictProxy<DataHandler>({}),
      pluginEventSource: strictProxy<PluginEventSource>({})
    });

    expect(component.defaultSettings).toBeDefined();
  });

  it('should convert legacy shouldInsertDoubleLinesBetweenAttachmentLinks=true to double newline delimiter', () => {
    const component = new PluginSettingsComponent({
      dataHandler: strictProxy<DataHandler>({}),
      pluginEventSource: strictProxy<PluginEventSource>({})
    });

    const legacySettings: Record<string, unknown> = {
      shouldInsertDoubleLinesBetweenAttachmentLinks: true
    };

    const converter = getLegacyConverter(component);
    converter(legacySettings);

    expect(legacySettings['attachmentLinksDelimiter']).toBe('\n\n');
  });

  it('should convert legacy shouldInsertDoubleLinesBetweenAttachmentLinks=false to single newline delimiter', () => {
    const component = new PluginSettingsComponent({
      dataHandler: strictProxy<DataHandler>({}),
      pluginEventSource: strictProxy<PluginEventSource>({})
    });

    const legacySettings: Record<string, unknown> = {
      shouldInsertDoubleLinesBetweenAttachmentLinks: false
    };

    const converter = getLegacyConverter(component);
    converter(legacySettings);

    expect(legacySettings['attachmentLinksDelimiter']).toBe('\n');
  });

  it('should not modify delimiter when legacy field is undefined', () => {
    const component = new PluginSettingsComponent({
      dataHandler: strictProxy<DataHandler>({}),
      pluginEventSource: strictProxy<PluginEventSource>({})
    });

    const legacySettings: Record<string, unknown> = {};

    const converter = getLegacyConverter(component);
    converter(legacySettings);

    expect(legacySettings['attachmentLinksDelimiter']).toBeUndefined();
  });

  it('should have shouldInsertDoubleLinesBetweenAttachmentLinks default to true in LegacySettings', () => {
    const component = new PluginSettingsComponent({
      dataHandler: strictProxy<DataHandler>({}),
      pluginEventSource: strictProxy<PluginEventSource>({})
    });

    const { legacyClass } = getLegacyRegistration(component);
    const legacyInstance = new legacyClass();

    expect(legacyInstance['shouldInsertDoubleLinesBetweenAttachmentLinks']).toBe(true);
  });
});

interface CapturedLegacyRegistration {
  converter(settings: Record<string, unknown>): void;
  readonly legacyClass: new () => Record<string, unknown>;
}

interface MockWithConverters {
  capturedConverter: ((settings: Record<string, unknown>) => void) | undefined;
  registerLegacySettingsConverter(legacyClass: new () => unknown, converter: (settings: Record<string, unknown>) => void): void;
  registerLegacySettingsConverters(): void;
}

function getLegacyConverter(component: PluginSettingsComponent): (settings: Record<string, unknown>) => void {
  return getLegacyRegistration(component).converter;
}

function getLegacyRegistration(component: PluginSettingsComponent): CapturedLegacyRegistration {
  // eslint-disable-next-line no-restricted-syntax -- test helper needs type assertion to access mock methods.
  const mock = component as unknown as MockWithConverters;
  let captured: CapturedLegacyRegistration | undefined;

  mock.registerLegacySettingsConverter = (
    legacyClass: new () => unknown,
    converter: (settings: Record<string, unknown>) => void
  ): void => {
    captured = {
      converter,
      legacyClass: legacyClass as new () => Record<string, unknown>
    };
  };

  mock.registerLegacySettingsConverters();

  if (!captured) {
    throw new Error('No legacy converter was registered');
  }

  return captured;
}
