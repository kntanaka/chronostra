import { PluginSettingTab, Setting, App } from 'obsidian';
import type ChronostraPlugin from './main';

export interface ChronostraSettings {
  targetFilePath: string;
  expandedIds: string[];
}

export const DEFAULT_SETTINGS: ChronostraSettings = {
  targetFilePath: 'Future Plan.md',
  expandedIds: [],
};

export class ChronostraSettingTab extends PluginSettingTab {
  plugin: ChronostraPlugin;

  constructor(app: App, plugin: ChronostraPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Target file')
      .setDesc('Path to the Markdown file containing the future-data code block')
      .addText((text) =>
        text
          .setPlaceholder('Future plan.md')
          .setValue(this.plugin.settings.targetFilePath)
          .onChange(async (value) => {
            this.plugin.settings.targetFilePath = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
