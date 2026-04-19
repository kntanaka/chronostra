import {
  Plugin,
  MarkdownPostProcessorContext,
  TFile,
  TFolder,
  normalizePath,
} from 'obsidian';
import { mount, unmount } from 'svelte';
import ChronoTable from './components/ChronoTable.svelte';
import {
  type ChronostraSettings,
  DEFAULT_SETTINGS,
  ChronostraSettingTab,
} from './settings';
import { buildTreeFromFlatItems, flattenTreeToItems } from './parser';
import type { FlatItem, ChronoData } from './types';

/**
 * Markdown wraps code blocks in `pre`/`code` with overflow that creates a scrollport.
 * `position: sticky` is then resolved against that box instead of the note viewport, so the
 * toolbar stops "short" of the top and rows scroll into the gap. Reset overflow to visible
 * while our UI is mounted (the JSON is replaced by the table, so no horizontal scroll needed).
 */
function fixAncestorsForStickyToolbar(host: HTMLElement): () => void {
  const adjusted: HTMLElement[] = [];

  let p: HTMLElement | null = host.parentElement;
  while (p) {
    const tag = p.tagName;
    if ((tag === 'PRE' || tag === 'CODE') && !p.classList.contains('chronostra-sticky-overflow-reset')) {
      p.addClass('chronostra-sticky-overflow-reset');
      adjusted.push(p);
    }
    p = p.parentElement;
  }

  return () => {
    for (const el of adjusted) {
      el.removeClass('chronostra-sticky-overflow-reset');
    }
  };
}

export default class ChronostraPlugin extends Plugin {
  settings: ChronostraSettings = DEFAULT_SETTINGS;
  private svelteInstances = new Map<
    HTMLElement,
    { instance: Record<string, unknown>; dispose: () => void }
  >();

  async onload() {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor(
      'future-data',
      (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
        this.renderCodeBlock(source, el, ctx);
      }
    );

    this.addSettingTab(new ChronostraSettingTab(this.app, this));
  }

  onunload() {
    for (const [, { dispose }] of this.svelteInstances) {
      dispose();
    }
    this.svelteInstances.clear();
  }

  private renderCodeBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) {
    let flatItems: FlatItem[];
    try {
      flatItems = JSON.parse(source);
    } catch {
      el.createEl('div', {
        text: 'Chronostra: invalid JSON in future-data block',
        cls: 'chronostra-error',
      });
      return;
    }

    const data = buildTreeFromFlatItems(flatItems);

    // Remove readable line width constraint
    setTimeout(() => {
      let ancestor: HTMLElement | null = el.parentElement;
      while (ancestor) {
        if (ancestor.classList.contains('markdown-preview-sizer') ||
            ancestor.classList.contains('cm-sizer') ||
            ancestor.classList.contains('markdown-source-view')) {
          ancestor.addClass('chronostra-full-width');
          break;
        }
        const computed = getComputedStyle(ancestor);
        const mw = parseInt(computed.maxWidth);
        if (mw > 0 && mw < 2000) {
          ancestor.addClass('chronostra-full-width');
        }
        ancestor = ancestor.parentElement;
      }
    }, 100);

    const container = el.createDiv({ cls: 'chronostra-container' });

    const restoreStickyAncestors = fixAncestorsForStickyToolbar(container);

    const instance = mount(ChronoTable, {
      target: container,
      props: {
        data,
        initialExpandedIds: this.settings.expandedIds,
        birthDate: this.settings.birthDate,
        timelineDisplay: this.settings.timelineDisplay,
        timelineStartYear: this.settings.timelineStartYear,
        timelineEndYear: this.settings.timelineEndYear,
        showRowBorders: this.settings.showRowBorders,
        showSummaryMeta: this.settings.showSummaryMeta,
        sourcePath: ctx.sourcePath,
        onExpandChange: (expandedIds: string[]) => {
          this.settings.expandedIds = expandedIds;
          void this.saveSettings();
        },
        onDataChange: (updatedData: ChronoData) => {
          void this.saveDataToFile(updatedData, ctx.sourcePath);
        },
        onEnsureNote: async (payload: {
          notePath?: string;
          sourcePath: string;
          hierarchyPath: string[];
        }) => this.ensureRowNote(payload),
        onSettingsChange: (key: string, value: unknown) => {
          (this.settings as Record<string, unknown>)[key] = value;
          void this.saveSettings();
        },
      },
    });

    const dispose = () => {
      restoreStickyAncestors();
      void unmount(instance);
    };

    this.svelteInstances.set(el, { instance, dispose });

    const observer = new MutationObserver(() => {
      if (!el.isConnected) {
        dispose();
        this.svelteInstances.delete(el);
        observer.disconnect();
      }
    });
    observer.observe(el.parentElement || document.body, { childList: true, subtree: true });
  }

  /** Write updated data back to the markdown file's future-data code block */
  private async saveDataToFile(data: ChronoData, sourcePath: string) {
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!file || !(file instanceof TFile)) return;

    const flatItems = flattenTreeToItems(data);
    const newJson = JSON.stringify(flatItems, null, 2);

    await this.app.vault.process(file, (content: string) => {
      const regex = /```future-data\s*\n[\s\S]*?\n```/;
      return content.replace(regex, '```future-data\n' + newJson + '\n```');
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async ensureRowNote(payload: {
    notePath?: string;
    sourcePath: string;
    hierarchyPath: string[];
  }): Promise<string | null> {
    const resolvedPath = normalizePath(
      payload.notePath?.trim() || this.buildDefaultNotePath(payload.sourcePath, payload.hierarchyPath)
    );

    await this.ensureFolderForPath(resolvedPath);

    let file = this.app.vault.getAbstractFileByPath(resolvedPath);
    if (!(file instanceof TFile)) {
      const heading = payload.hierarchyPath.join(' > ');
      file = await this.app.vault.create(
        resolvedPath,
        `# ${payload.hierarchyPath[payload.hierarchyPath.length - 1]}\n\nLinked from Chronostra.\n\n- Path: ${heading}\n`
      );
    }

    await this.app.workspace.getLeaf(true).openFile(file);
    return file.path;
  }

  private buildDefaultNotePath(sourcePath: string, hierarchyPath: string[]): string {
    const segments = sourcePath.split('/');
    segments.pop();
    const folder = normalizePath(
      [...segments, 'Chronostra Notes'].filter(Boolean).join('/')
    );
    const basename = hierarchyPath
      .map((segment) => this.slugifySegment(segment))
      .join(' - ');
    return normalizePath(`${folder}/${basename || 'Untitled'}.md`);
  }

  private slugifySegment(segment: string): string {
    return segment
      .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async ensureFolderForPath(filePath: string): Promise<void> {
    const parts = filePath.split('/');
    parts.pop();

    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const normalized = normalizePath(current);
      const existing = this.app.vault.getAbstractFileByPath(normalized);
      if (!existing) {
        await this.app.vault.createFolder(normalized);
      } else if (!(existing instanceof TFolder)) {
        throw new Error(`Chronostra: ${normalized} exists and is not a folder`);
      }
    }
  }
}
