import { Plugin, MarkdownPostProcessorContext } from 'obsidian';
import { mount, unmount } from 'svelte';
import ChronoTable from './components/ChronoTable.svelte';
import {
  type ChronostraSettings,
  DEFAULT_SETTINGS,
  ChronostraSettingTab,
} from './settings';
import { buildTreeFromFlatItems } from './parser';
import type { FlatItem } from './types';

export default class ChronostraPlugin extends Plugin {
  settings: ChronostraSettings = DEFAULT_SETTINGS;
  private svelteInstances: Map<HTMLElement, Record<string, unknown>> = new Map();

  async onload() {
    await this.loadSettings();

    // Render future-data code blocks inline as Chronostra table
    this.registerMarkdownCodeBlockProcessor(
      'future-data',
      (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
        this.renderCodeBlock(source, el, ctx);
      }
    );

    this.addSettingTab(new ChronostraSettingTab(this.app, this));
  }

  async onunload() {
    // Clean up all mounted Svelte instances
    for (const [el, instance] of this.svelteInstances) {
      unmount(instance);
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
    } catch (e) {
      el.createEl('div', {
        text: 'Chronostra: Invalid JSON in future-data block',
        cls: 'chronostra-error',
      });
      return;
    }

    const data = buildTreeFromFlatItems(flatItems);

    // Remove readable line width constraint - find the sizer element
    setTimeout(() => {
      let ancestor: HTMLElement | null = el.parentElement;
      while (ancestor) {
        if (ancestor.classList.contains('markdown-preview-sizer') ||
            ancestor.classList.contains('cm-sizer') ||
            ancestor.classList.contains('markdown-source-view')) {
          ancestor.style.maxWidth = 'none';
          break;
        }
        // Also check for inline max-width style
        const computed = getComputedStyle(ancestor);
        const mw = parseInt(computed.maxWidth);
        if (mw > 0 && mw < 2000) {
          ancestor.style.maxWidth = 'none';
        }
        ancestor = ancestor.parentElement;
      }
    }, 100);

    const container = el.createDiv({ cls: 'chronostra-container' });

    const instance = mount(ChronoTable, {
      target: container,
      props: {
        data,
        initialExpandedIds: this.settings.expandedIds,
        onExpandChange: (expandedIds: string[]) => {
          this.settings.expandedIds = expandedIds;
          this.saveSettings();
        },
      },
    });

    this.svelteInstances.set(el, instance);

    // Clean up when the code block is removed from DOM
    const observer = new MutationObserver(() => {
      if (!el.isConnected) {
        unmount(instance);
        this.svelteInstances.delete(el);
        observer.disconnect();
      }
    });
    observer.observe(el.parentElement || document.body, { childList: true, subtree: true });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
