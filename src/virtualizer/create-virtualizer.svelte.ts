import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
  type VirtualizerOptions
} from '@tanstack/virtual-core';

export function createVirtualizer<
  TScrollElement extends Element,
  TItemElement extends Element = Element
>(optionsFn: () => Partial<VirtualizerOptions<TScrollElement, TItemElement>>) {
  let instance = $state<Virtualizer<TScrollElement, TItemElement>>();

  $effect(() => {
    const opts = optionsFn();
    const v = new Virtualizer<TScrollElement, TItemElement>({
      observeElementRect,
      observeElementOffset,
      scrollToFn: elementScroll,
      ...opts,
      onChange: (updatedInstance, sync) => {
        if (sync) {
          instance = updatedInstance;
        } else {
          queueMicrotask(() => {
            instance = updatedInstance;
          });
        }
        opts.onChange?.(updatedInstance, sync);
      }
    } as VirtualizerOptions<TScrollElement, TItemElement>);

    v._willUpdate();
    instance = v;

    return () => {
      v._willUpdate();
    };
  });

  return {
    get instance() {
      return instance;
    }
  };
}
