import type {
  SettingDefinitionItem,
  TextComponent
} from 'obsidian';

import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-tab';
import { replace } from 'obsidian-dev-utils/string';

import type { PluginSettings } from './plugin-settings.ts';

const VISIBLE_SPACE_CHARACTER = '␣';
const VISIBLE_ENTER_CHARACTER = '↵';

export class PluginSettingsTab extends PluginSettingsTabBase<PluginSettings> {
  protected override getSettingDefinitionItems(): SettingDefinitionItem[] {
    return [
      this.settingEx({
        desc: 'The text to insert before attachment links.',
        name: 'Attachment links prefix',
        render: (setting) => {
          setting.addText((text) => {
            this.bind({
              componentToPluginSettingsValueConverter: restoreWhitespaceCharacters,
              pluginSettingsToComponentValueConverter: showWhitespaceCharacters,
              propertyName: 'attachmentLinksPrefix',
              valueComponent: text
            });

            handleWhitespace(text);
          });
        }
      }),
      this.settingEx({
        desc: 'The delimiter to insert between attachment links.',
        name: 'Attachment links delimiter',
        render: (setting) => {
          setting.addText((text) => {
            this.bind({
              componentToPluginSettingsValueConverter: restoreWhitespaceCharacters,
              pluginSettingsToComponentValueConverter: showWhitespaceCharacters,
              propertyName: 'attachmentLinksDelimiter',
              shouldShowPlaceholderForDefaultValues: false,
              valueComponent: text
            });

            handleWhitespace(text);
          });
        }
      }),
      this.settingEx({
        desc: 'The text to insert after attachment links.',
        name: 'Attachment links suffix',
        render: (setting) => {
          setting.addText((text) => {
            this.bind({
              componentToPluginSettingsValueConverter: restoreWhitespaceCharacters,
              pluginSettingsToComponentValueConverter: showWhitespaceCharacters,
              propertyName: 'attachmentLinksSuffix',
              valueComponent: text
            });

            handleWhitespace(text);
          });
        }
      }),
      this.settingEx({
        desc: 'Show an icon in the left ribbon to insert multiple attachments.',
        name: 'Show ribbon icon',
        render: (setting) => {
          setting.addToggle((toggle) => {
            this.bind({
              propertyName: 'shouldShowRibbonIcon',
              valueComponent: toggle
            });
          });
        }
      }),
      this.settingEx({
        desc: 'Show an item in the editor right-click menu to insert multiple attachments.',
        name: 'Show in editor context menu',
        render: (setting) => {
          setting.addToggle((toggle) => {
            this.bind({
              propertyName: 'shouldShowInEditorContextMenu',
              valueComponent: toggle
            });
          });
        }
      })
    ];
  }
}

function handleWhitespace(text: TextComponent): void {
  text.inputEl.addEventListener('input', () => {
    const start = text.inputEl.selectionStart ?? 0;
    const end = text.inputEl.selectionEnd ?? 0;
    text.inputEl.value = showWhitespaceCharacters(text.inputEl.value);
    text.inputEl.setSelectionRange(start, end);
  });

  text.inputEl.addEventListener('keypress', ($event) => {
    if ($event.key !== 'Enter') {
      return;
    }

    $event.preventDefault();
    const start = text.inputEl.selectionStart ?? 0;
    const end = text.inputEl.selectionEnd ?? 0;
    const value = text.inputEl.value;
    text.inputEl.value = `${value.slice(0, start)}${VISIBLE_ENTER_CHARACTER}${value.slice(end)}`;
    text.inputEl.setSelectionRange(start + 1, start + 1);
  });
}

function restoreWhitespaceCharacters($string: string): string {
  return replace($string, {
    [VISIBLE_ENTER_CHARACTER]: '\n',
    [VISIBLE_SPACE_CHARACTER]: ' '
  });
}

function showWhitespaceCharacters($string: string): string {
  return replace($string, {
    '\n': VISIBLE_ENTER_CHARACTER,
    ' ': VISIBLE_SPACE_CHARACTER
  });
}
