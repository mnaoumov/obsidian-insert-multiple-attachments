import {
  describe,
  expect,
  it
} from 'vitest';

import { PluginSettings } from './plugin-settings.ts';

describe('PluginSettings', () => {
  it('should have attachmentLinksDelimiter default to double newline', () => {
    const settings = new PluginSettings();

    expect(settings.attachmentLinksDelimiter).toBe('\n\n');
  });

  it('should have attachmentLinksPrefix default to empty string', () => {
    const settings = new PluginSettings();

    expect(settings.attachmentLinksPrefix).toBe('');
  });

  it('should have attachmentLinksSuffix default to empty string', () => {
    const settings = new PluginSettings();

    expect(settings.attachmentLinksSuffix).toBe('');
  });

  it('should have shouldShowRibbonIcon default to true', () => {
    const settings = new PluginSettings();

    expect(settings.shouldShowRibbonIcon).toBe(true);
  });

  it('should have shouldShowInEditorContextMenu default to true', () => {
    const settings = new PluginSettings();

    expect(settings.shouldShowInEditorContextMenu).toBe(true);
  });
});
