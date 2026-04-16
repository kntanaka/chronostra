import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
  type VirtualizerOptions,
  type VirtualItem
} from '@tanstack/virtual-core';

export function createVirtualizer<
  TScrollElement extends Element,
  TItemElement extends Element = Element
>(optionsFn: () => Partial<VirtualizerOptions<TScrollElement, TItemElement>>) {
  let virtualItems = $state<VirtualItem[]>([]);
  let totalSize = $state(0);
  let virt: Virtualizer<TScrollElement, TItemElement> | undefined;

  function syncState() {
    if (!virt) return;
    virtualItems = virt.getVirtualItems();
    totalSize = virt.getTotalSize();
  }

  function resolveOptions(
    opts: Partial<VirtualizerOptions<TScrollElement, TItemElement>>
  ): VirtualizerOptions<TScrollElement, TItemElement> {
    return {
      observeElementRect,
      observeElementOffset,
      scrollToFn: elementScroll,
      ...opts,
      onChange: (_inst: Virtualizer<TScrollElement, TItemElement>, sync: boolean) => {
        if (sync) {
          syncState();
        } else {
          queueMicrotask(syncState);
        }
        opts.onChange?.(_inst, sync);
      }
    } as VirtualizerOptions<TScrollElement, TItemElement>;
  }

  $effect.pre(() => {
    const opts = resolveOptions(optionsFn());

    if (!virt) {
      virt = new Virtualizer(opts);
    } else {
      virt.setOptions(opts);
    }

    virt._willUpdate();
    syncState();
  });

  $effect(() => {
    return virt?._didMount();
  });

  return {
    get instance() {
      return virt;
    },
    get virtualItems() {
      return virtualItems;
    },
    get totalSize() {
      return totalSize;
    }
  };
}
