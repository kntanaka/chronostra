import { TFile, TAbstractFile } from 'obsidian';
import type ChronostraPlugin from './main';
import type { ChronoData } from './types';
import { buildTreeFromFlatItems, flattenTreeToItems } from './parser';
import type { FlatItem } from './types';

export class DataProvider {
  private plugin: ChronostraPlugin;
  private lastWriteTime = 0;
  private writeDebounceMs = 500;
  private isSaving = false;

  constructor(plugin: ChronostraPlugin) {
    this.plugin = plugin;
  }

  private getTargetFile(): TFile | null {
    const path = this.plugin.settings.targetFilePath;
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }

  /** Load data from the markdown file's future-data code block */
  async load(): Promise<ChronoData> {
    const file = this.getTargetFile();
    if (!file) {
      return { categories: [] };
    }

    const content = await this.plugin.app.vault.read(file);
    const json = this.extractFutureDataBlock(content);
    if (!json) {
      return { categories: [] };
    }

    try {
      const flatItems: FlatItem[] = JSON.parse(json);
      return buildTreeFromFlatItems(flatItems);
    } catch (e) {
      console.error('Chronostra: Failed to parse future-data JSON', e);
      return { categories: [] };
    }
  }

  /** Save data back to the markdown file's future-data code block */
  async save(data: ChronoData): Promise<void> {
    const file = this.getTargetFile();
    if (!file) return;

    this.isSaving = true;
    const flatItems = flattenTreeToItems(data);
    const newJson = JSON.stringify(flatItems, null, 2);

    await this.plugin.app.vault.process(file, (content) => {
      return this.replaceFutureDataBlock(content, newJson);
    });

    this.lastWriteTime = Date.now();
    setTimeout(() => {
      this.isSaving = false;
    }, this.writeDebounceMs);
  }

  /** Handle external file changes for bidirectional sync */
  handleFileChange(
    changedFile: TAbstractFile,
    onUpdate: (data: ChronoData) => void
  ) {
    const targetFile = this.getTargetFile();
    if (!targetFile || changedFile.path !== targetFile.path) return;

    // Ignore our own writes
    if (this.isSaving) return;
    if (Date.now() - this.lastWriteTime < this.writeDebounceMs) return;

    void this.load().then(onUpdate);
  }

  private extractFutureDataBlock(content: string): string | null {
    const regex = /```future-data\s*\n([\s\S]*?)\n```/;
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  private replaceFutureDataBlock(content: string, newJson: string): string {
    const regex = /```future-data\s*\n[\s\S]*?\n```/;
    return content.replace(regex, '```future-data\n' + newJson + '\n```');
  }
}
