import { PluginSettingTab, Setting, App } from 'obsidian';
import type ChronostraPlugin from './main';

export type TimelineDisplay = 'year' | 'age' | 'both';

export interface ChronostraSettings {
  targetFilePath: string;
  expandedIds: string[];
  birthDate: string; // e.g. '20040706', stored locally only
  timelineDisplay: TimelineDisplay;
  timelineStartYear: number;
  timelineEndYear: number;
  showRowBorders: boolean;
  showSummaryMeta: boolean;
}

export const DEFAULT_SETTINGS: ChronostraSettings = {
  targetFilePath: 'Future plan.md',
  expandedIds: [],
  birthDate: '',
  timelineDisplay: 'year',
  timelineStartYear: 2025,
  timelineEndYear: 2050,
  showRowBorders: true,
  showSummaryMeta: false,
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

    new Setting(containerEl)
      .setName('Birth date')
      .setDesc('Used to calculate age for timeline display (stored locally only, never synced)')
      .addText((text) =>
        text
          .setPlaceholder('YYYYMMDD')
          .setValue(this.plugin.settings.birthDate)
          .onChange(async (value) => {
            this.plugin.settings.birthDate = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Timeline display')
      .setDesc('Show years or age in the timeline header')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('year', 'Year')
          .addOption('age', 'Age')
          .addOption('both', 'Year (age)')
          .setValue(this.plugin.settings.timelineDisplay)
          .onChange(async (value) => {
            this.plugin.settings.timelineDisplay = value as TimelineDisplay;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Timeline start year')
      .setDesc('First year shown in the timeline grid')
      .addText((text) =>
        text
          .setPlaceholder('2025')
          .setValue(String(this.plugin.settings.timelineStartYear))
          .onChange(async (value) => {
            const parsed = parseInt(value, 10);
            if (Number.isNaN(parsed)) return;
            this.plugin.settings.timelineStartYear = parsed;
            if (this.plugin.settings.timelineEndYear < parsed) {
              this.plugin.settings.timelineEndYear = parsed;
            }
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Timeline end year')
      .setDesc('Last year shown in the timeline grid')
      .addText((text) =>
        text
          .setPlaceholder('2050')
          .setValue(String(this.plugin.settings.timelineEndYear))
          .onChange(async (value) => {
            const parsed = parseInt(value, 10);
            if (Number.isNaN(parsed)) return;
            this.plugin.settings.timelineEndYear = Math.max(
              parsed,
              this.plugin.settings.timelineStartYear
            );
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Row borders')
      .setDesc('Show horizontal border lines between rows')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRowBorders)
          .onChange(async (value) => {
            this.plugin.settings.showRowBorders = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Summary meta')
      .setDesc('Show summary text like item, in-progress, done, and note counts')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showSummaryMeta)
          .onChange(async (value) => {
            this.plugin.settings.showSummaryMeta = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
