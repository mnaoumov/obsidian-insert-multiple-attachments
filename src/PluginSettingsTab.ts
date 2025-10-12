import {
  Setting,
  TextComponent
} from 'obsidian';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import { replace } from 'obsidian-dev-utils/String';

import type { PluginTypes } from './PluginTypes.ts';

const VISIBLE_SPACE_CHARACTER = '␣';
const VISIBLE_ENTER_CHARACTER = '↵';

export class PluginSettingsTab extends PluginSettingsTabBase<PluginTypes> {
  public override display(): void {
    super.display();

    new Setting(this.containerEl)
      .setName('Attachment links prefix')
      .setDesc('The text to insert before attachment links.')
      .addText((text) => {
        this.bind(text, 'attachmentLinksPrefix', {
          componentToPluginSettingsValueConverter: restoreWhitespaceCharacters,
          pluginSettingsToComponentValueConverter: showWhitespaceCharacters
        });

        handleWhitespace(text);
      });

    new Setting(this.containerEl)
      .setName('Attachment links delimiter')
      .setDesc('The delimiter to insert between attachment links.')
      .addText((text) => {
        this.bind(text, 'attachmentLinksDelimiter', {
          componentToPluginSettingsValueConverter: restoreWhitespaceCharacters,
          pluginSettingsToComponentValueConverter: showWhitespaceCharacters,
          shouldShowPlaceholderForDefaultValues: false
        });

        handleWhitespace(text);
      });

    new Setting(this.containerEl)
      .setName('Attachment links suffix')
      .setDesc('The text to insert after attachment links.')
      .addText((text) => {
        this.bind(text, 'attachmentLinksSuffix', {
          componentToPluginSettingsValueConverter: restoreWhitespaceCharacters,
          pluginSettingsToComponentValueConverter: showWhitespaceCharacters
        });

        handleWhitespace(text);
      });
  }
}

function handleWhitespace(text: TextComponent): void {
  text.inputEl.addEventListener('input', () => {
    const start = text.inputEl.selectionStart ?? 0;
    const end = text.inputEl.selectionEnd ?? 0;
    text.inputEl.value = showWhitespaceCharacters(text.inputEl.value);
    text.inputEl.setSelectionRange(start, end);
  });

  text.inputEl.addEventListener('keypress', (evt) => {
    if (evt.key !== 'Enter') {
      return;
    }

    evt.preventDefault();
    const start = text.inputEl.selectionStart ?? 0;
    const end = text.inputEl.selectionEnd ?? 0;
    const value = text.inputEl.value;
    text.inputEl.value = `${value.slice(0, start)}${VISIBLE_ENTER_CHARACTER}${value.slice(end)}`;
    text.inputEl.setSelectionRange(start + 1, start + 1);
  });
}

function restoreWhitespaceCharacters(str: string): string {
  return replace(str, {
    [VISIBLE_ENTER_CHARACTER]: '\n',
    [VISIBLE_SPACE_CHARACTER]: ' '
  });
}

function showWhitespaceCharacters(str: string): string {
  return replace(str, {
    '\n': VISIBLE_ENTER_CHARACTER,
    ' ': VISIBLE_SPACE_CHARACTER
  });
}
