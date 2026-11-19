import { parseFlatItems, readFutureDataBlock, replaceFutureDataBlock } from './markdown-data';
import { TFile, TAbstractFile } from 'obsidian';
import type ChronostraPlugin from './main';
import type { ChronoData } from './types';
import { buildTreeFromFlatItems, flattenTreeToItems } from './parser';

/** Serializes saves and checks the disk version inside vault.process. */
export class DataProvider {
  private baseline: string | null = null;
  private revision = 0;
  private failedSave = false;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private plugin: ChronostraPlugin, private sourcePath = plugin.settings.targetFilePath) {}

  private file(): TFile {
    const file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath);
    if (!(file instanceof TFile)) throw new Error('Plan file is missing. Original data was not changed.');
    return file;
  }

  private enqueue<T>(action: () => Promise<T>): Promise<T> {
    const result = this.queue.then(action);
    this.queue = result.catch(() => undefined);
    return result;
  }

  load(): Promise<ChronoData> {
    return this.enqueue(async () => {
      this.baseline = null;
      this.revision++;
      const json = readFutureDataBlock(await this.plugin.app.vault.read(this.file()));
      const data = buildTreeFromFlatItems(parseFlatItems(json));
      this.baseline = json;
      this.failedSave = false;
      return data;
    });
  }

  /** A rendered code block supplies its own initial source, verified again on save. */
  initialize(json: string): ChronoData {
    const data = buildTreeFromFlatItems(parseFlatItems(json));
    this.baseline = json.trim();
    return data;
  }

  save(data: ChronoData): Promise<void> {
    const revision = this.revision;
    const json = JSON.stringify(flattenTreeToItems(data), null, 2);
    return this.enqueue(async () => {
      try {
        if (this.baseline === null || revision !== this.revision) throw new Error('Plan changed or could not be loaded. Reopen it before saving.');
        parseFlatItems(json);
        await this.plugin.app.vault.process(this.file(), content => {
          if (readFutureDataBlock(content) !== this.baseline) throw new Error('Plan changed outside this view. Your edits are still here; the file was not overwritten.');
          return replaceFutureDataBlock(content, json);
        });
        this.baseline = json;
        this.failedSave = false;
      } catch (error) {
        this.failedSave = true;
        throw error;
      }
    });
  }

  handleFileChange(changedFile: TAbstractFile, onUpdate: (data: ChronoData) => boolean | void, onError: (error: unknown) => void = console.error): Promise<void> {
    if (changedFile.path !== this.sourcePath) return Promise.resolve();
    return this.enqueue(async () => {
      const json = readFutureDataBlock(await this.plugin.app.vault.read(this.file()));
      if (json === this.baseline) return;
      if (this.failedSave) throw new Error('External changes detected. Unsaved edits are kept in this view; reopen after copying them.');
      const data = buildTreeFromFlatItems(parseFlatItems(json));
      if (onUpdate(data) === false) throw new Error('External changes detected. Finish or copy your draft, then reopen the plan.');
      this.baseline = json;
      this.revision++;
    }).catch(onError);
  }
}
