import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import ChronoTable from './components/ChronoTable.svelte';
import type ChronostraPlugin from './main';
import { DataProvider } from './data-provider';
import type { ChronoData } from './types';

export const VIEW_TYPE_CHRONOSTRA = 'chronostra-view';

export class ChronostraView extends ItemView {
  private svelteComponent: Record<string, unknown> | null = null;
  private dataProvider: DataProvider;
  private plugin: ChronostraPlugin;
  private data: ChronoData = { categories: [] };

  constructor(leaf: WorkspaceLeaf, plugin: ChronostraPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.dataProvider = new DataProvider(plugin);
  }

  getViewType(): string {
    return VIEW_TYPE_CHRONOSTRA;
  }

  getDisplayText(): string {
    return 'Chronostra';
  }

  getIcon(): string {
    return 'table';
  }

  async onOpen() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('chronostra-container');

    this.data = await this.dataProvider.load();

    this.mountSvelte(container);

    // Watch for external file changes
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        this.dataProvider.handleFileChange(file, (newData) => {
          this.data = newData;
          this.remount();
        });
      })
    );
  }

  onClose() {
    if (this.svelteComponent) {
      void unmount(this.svelteComponent);
      this.svelteComponent = null;
    }
  }

  private mountSvelte(container: HTMLElement) {
    this.svelteComponent = mount(ChronoTable, {
      target: container,
      props: {
        data: this.data,
        initialExpandedIds: this.plugin.settings.expandedIds,
        birthDate: this.plugin.settings.birthDate,
        timelineDisplay: this.plugin.settings.timelineDisplay,
        timelineStartYear: this.plugin.settings.timelineStartYear,
        timelineEndYear: this.plugin.settings.timelineEndYear,
        showRowBorders: this.plugin.settings.showRowBorders,
        sourcePath: this.plugin.settings.targetFilePath,
        onExpandChange: (expandedIds: string[]) => {
          this.plugin.settings.expandedIds = expandedIds;
          void this.plugin.saveSettings();
        },
        onEnsureNote: async (payload: {
          notePath?: string;
          sourcePath: string;
          hierarchyPath: string[];
        }) => this.plugin.ensureRowNote(payload),
        onSettingsChange: (key: string, value: unknown) => {
          (this.plugin.settings as Record<string, unknown>)[key] = value;
          void this.plugin.saveSettings();
        },
      },
    });
  }

  private remount() {
    const container = this.containerEl.children[1] as HTMLElement;
    if (this.svelteComponent) {
      void unmount(this.svelteComponent);
      this.svelteComponent = null;
    }
    container.empty();
    container.addClass('chronostra-container');
    this.mountSvelte(container);
  }
}
