import {
  Plugin,
  MarkdownPostProcessorContext,
  Platform,
  TFile,
  TFolder,
  WorkspaceLeaf,
  normalizePath,
} from 'obsidian';
import { mount, unmount } from 'svelte';
import ChronoTable from './components/ChronoTable.svelte';
import {
  type ChronostraSettings,
  DEFAULT_SETTINGS,
  ChronostraSettingTab,
  type TimelineDisplay,
} from './settings';
import { buildTreeFromFlatItems, flattenTreeToItems } from './parser';
import type { FlatItem, ChronoData } from './types';
import { ChronostraView, VIEW_TYPE_CHRONOSTRA } from './view';

/**
 * Markdown and Live Preview wrap code blocks in nested boxes. Some of those boxes create
 * scrollports or containing blocks, causing sticky chrome to stop short of the note viewport.
 * Reset only the wrappers around our rendered table while it is mounted.
 */
function fixAncestorsForStickyToolbar(host: HTMLElement): () => void {
  const adjusted: Array<{ el: HTMLElement; className: string }> = [];

  let p: HTMLElement | null = host.parentElement;
  while (p) {
    const tag = p.tagName;
    if ((tag === 'PRE' || tag === 'CODE') && !p.classList.contains('chronostra-sticky-overflow-reset')) {
      p.addClass('chronostra-sticky-overflow-reset');
      adjusted.push({ el: p, className: 'chronostra-sticky-overflow-reset' });
    }

    if (
      p.classList.contains('markdown-preview-section') ||
      p.classList.contains('markdown-preview-sizer') ||
      p.classList.contains('cm-contentContainer') ||
      p.classList.contains('cm-content') ||
      p.classList.contains('cm-line') ||
      p.classList.contains('HyperMD-codeblock') ||
      p.classList.contains('cm-embed-block') ||
      p.classList.contains('markdown-rendered')
    ) {
      if (!p.classList.contains('chronostra-sticky-containing-block-reset')) {
        p.addClass('chronostra-sticky-containing-block-reset');
        adjusted.push({ el: p, className: 'chronostra-sticky-containing-block-reset' });
      }
    }
    p = p.parentElement;
  }

  return () => {
    for (const { el, className } of adjusted) {
      el.removeClass(className);
    }
  };
}

function getOwnerWindow(el: HTMLElement): Window {
  return el.ownerDocument.defaultView ?? window;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readTimelineDisplay(value: unknown, fallback: TimelineDisplay): TimelineDisplay {
  return value === 'year' || value === 'age' || value === 'both' ? value : fallback;
}

function readStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === 'string')
    ? value
    : fallback;
}

function normalizeSettings(raw: unknown): ChronostraSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const settings = raw as Record<string, unknown>;

  return {
    targetFilePath: readString(settings.targetFilePath, DEFAULT_SETTINGS.targetFilePath),
    expandedIds: readStringArray(settings.expandedIds, DEFAULT_SETTINGS.expandedIds),
    birthDate: readString(settings.birthDate, DEFAULT_SETTINGS.birthDate),
    timelineDisplay: readTimelineDisplay(settings.timelineDisplay, DEFAULT_SETTINGS.timelineDisplay),
    timelineStartYear: readNumber(settings.timelineStartYear, DEFAULT_SETTINGS.timelineStartYear),
    timelineEndYear: readNumber(settings.timelineEndYear, DEFAULT_SETTINGS.timelineEndYear),
    showRowBorders: readBoolean(settings.showRowBorders, DEFAULT_SETTINGS.showRowBorders),
    showSummaryMeta: readBoolean(settings.showSummaryMeta, DEFAULT_SETTINGS.showSummaryMeta),
    zenMode: readBoolean(settings.zenMode, DEFAULT_SETTINGS.zenMode),
  };
}

export default class ChronostraPlugin extends Plugin {
  settings: ChronostraSettings = DEFAULT_SETTINGS;
  private svelteInstances = new Map<
    HTMLElement,
    { instance: Record<string, unknown>; dispose: () => void }
  >();

  onload(): void {
    void this.loadSettings().then(() => {
      this.registerView(
        VIEW_TYPE_CHRONOSTRA,
        (leaf) => new ChronostraView(leaf, this)
      );

      this.addRibbonIcon('table', 'Open chronostra', () => {
        void this.activateView().catch((error: unknown) => {
          console.error('Chronostra: Failed to activate view from ribbon', error);
        });
      });

      this.addCommand({
        id: 'open',
        name: 'Open',
        callback: () => {
          void this.activateView().catch((error: unknown) => {
            console.error('Chronostra: Failed to activate view from command', error);
          });
        },
      });

      this.registerMarkdownCodeBlockProcessor(
        'future-data',
        (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
          this.renderCodeBlock(source, el, ctx);
        }
      );

      this.addSettingTab(new ChronostraSettingTab(this.app, this));
    }).catch((error: unknown) => {
      console.error('Chronostra: Failed to load plugin', error);
    });
  }

  /** Open the Chronostra sidebar view (or focus it if already open). */
  async activateView(): Promise<void> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | undefined = workspace.getLeavesOfType(VIEW_TYPE_CHRONOSTRA)[0];
    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE_CHRONOSTRA, active: true });
    }

    workspace.setActiveLeaf(leaf, { focus: true });
  }

  onunload() {
    for (const { dispose } of this.svelteInstances.values()) {
      dispose();
    }
    this.svelteInstances.clear();
  }

  private renderCodeBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(source) as unknown;
    } catch {
      el.createDiv({
        text: 'Chronostra: invalid JSON in future-data block',
        cls: 'chronostra-error',
      });
      return;
    }

    if (!Array.isArray(parsed)) {
      el.createDiv({
        text: 'Chronostra: future-data block must contain a JSON array',
        cls: 'chronostra-error',
      });
      return;
    }

    const flatItems = parsed as FlatItem[];

    const data = buildTreeFromFlatItems(flatItems);

    // Remove readable line width constraint
    const ownerWindow = getOwnerWindow(el);
    ownerWindow.setTimeout(() => {
      let ancestor: HTMLElement | null = el.parentElement;
      while (ancestor) {
        if (ancestor.classList.contains('markdown-preview-sizer') ||
            ancestor.classList.contains('cm-sizer') ||
            ancestor.classList.contains('markdown-source-view')) {
          ancestor.addClass('chronostra-full-width');
          break;
        }
        const computed = ownerWindow.getComputedStyle(ancestor);
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
        zenMode: this.settings.zenMode,
        isMobileApp: Platform.isMobileApp,
        sourcePath: ctx.sourcePath,
        onExpandChange: (expandedIds: string[]) => {
          this.settings.expandedIds = expandedIds;
          void this.saveSettings().catch((error: unknown) => {
            console.error('Chronostra: Failed to save expanded state', error);
          });
        },
        onDataChange: (updatedData: ChronoData) => {
          void this.saveDataToFile(updatedData, ctx.sourcePath).catch((error: unknown) => {
            console.error('Chronostra: Failed to save future-data block', error);
          });
        },
        onEnsureNote: async (payload: {
          notePath?: string;
          sourcePath: string;
          hierarchyPath: string[];
        }) => this.ensureRowNote(payload),
        onSettingsChange: (key: string, value: unknown) => {
          (this.settings as Record<string, unknown>)[key] = value;
          void this.saveSettings().catch((error: unknown) => {
            console.error('Chronostra: Failed to save settings', error);
          });
        },
      },
    });

    const dispose = () => {
      restoreStickyAncestors();
      void unmount(instance).catch((error: unknown) => {
        console.error('Chronostra: Failed to unmount code block UI', error);
      });
    };

    this.svelteInstances.set(el, { instance, dispose });

    const observer = new MutationObserver(() => {
      if (!el.isConnected) {
        dispose();
        this.svelteInstances.delete(el);
        observer.disconnect();
      }
    });
    observer.observe(el.parentElement || el.ownerDocument.body, { childList: true, subtree: true });
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
    const rawSettings: unknown = await this.loadData();
    this.settings = normalizeSettings(rawSettings);
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

    const existingFile = this.app.vault.getAbstractFileByPath(resolvedPath);
    let file: TFile | null = existingFile instanceof TFile ? existingFile : null;
    if (!file) {
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
