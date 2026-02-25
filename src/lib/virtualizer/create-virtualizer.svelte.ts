import { Virtualizer, type VirtualizerOptions } from '@tanstack/virtual-core';

export function createVirtualizer<
  TScrollElement extends Element,
  TItemElement extends Element = Element
>(optionsFn: () => Partial<VirtualizerOptions<TScrollElement, TItemElement>>) {
  let instance = $state<Virtualizer<TScrollElement, TItemElement>>();

  $effect(() => {
    const opts = optionsFn();
    const v = new Virtualizer<TScrollElement, TItemElement>({
      ...opts,
      onChange: (updatedInstance, sync) => {
        if (sync) {
          instance = updatedInstance;
        } else {
          // Use microtask to batch updates
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
      // cleanup
    };
  });

  return {
    get instance() {
      return instance;
    }
  };
}
