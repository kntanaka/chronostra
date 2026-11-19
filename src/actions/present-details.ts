// Keep the list mounted behind the native dialog: its tab, filters, scroll
// position and return-focus target survive the entire detail visit.
export function presentDetails(node: HTMLDialogElement) {
  const ownerWindow = node.ownerDocument.defaultView ?? window;
  const host = node.closest('.preview-active') ?? node.closest('.workspace-leaf-content') ?? node.closest('.chrono-wrapper');
  let unfocusedHeight = ownerWindow.visualViewport?.height ?? ownerWindow.innerHeight;
  const update = () => {
    const rect = host?.getBoundingClientRect();
    const viewport = ownerWindow.visualViewport;
    // Safari pans the document to focus low fields. The host rect then moves
    // offscreen; intersecting it with the keyboard viewport can collapse the dialog.
    const active = node.ownerDocument.activeElement;
    const editing = active && node.contains(active) && active.matches('input, textarea, select');
    // iOS can shrink innerHeight as well, so compare with the pre-focus height.
    if (!editing && !viewport?.offsetTop) unfocusedHeight = viewport?.height ?? ownerWindow.innerHeight;
    const keyboardOpen = viewport && editing && unfocusedHeight - viewport.height > 100;
    const top = keyboardOpen ? viewport.offsetTop : Math.max(rect?.top ?? 0, viewport?.offsetTop ?? 0);
    const left = Math.max(rect?.left ?? 0, viewport?.offsetLeft ?? 0);
    const right = Math.min(rect?.right ?? ownerWindow.innerWidth, (viewport?.offsetLeft ?? 0) + (viewport?.width ?? ownerWindow.innerWidth));
    const bottom = keyboardOpen ? viewport.offsetTop + viewport.height : Math.min(rect?.bottom ?? ownerWindow.innerHeight, (viewport?.offsetTop ?? 0) + (viewport?.height ?? ownerWindow.innerHeight));
    node.style.top = `${top}px`;
    node.style.left = `${left}px`;
    node.style.width = `${Math.max(0, right - left)}px`;
    node.style.height = `${Math.max(0, bottom - top)}px`;
  };
  let focusFrame = 0;
  const revealFocused = () => {
    ownerWindow.cancelAnimationFrame(focusFrame);
    focusFrame = ownerWindow.requestAnimationFrame(() => {
      const active = node.ownerDocument.activeElement;
      const content = node.querySelector<HTMLElement>('.mobile-detail-content');
      if (!content || !active || !content.contains(active) || !active.matches('input, textarea, select')) return;
      const bounds = content.getBoundingClientRect();
      const field = active.getBoundingClientRect();
      // Keep nearby submit controls visible with the final field when they fit.
      const submit = active.closest('form')?.querySelector('button[type="submit"]');
      const actions = submit?.parentElement?.getBoundingClientRect();
      const bottom = actions && actions.bottom >= field.bottom && actions.bottom - field.top <= bounds.height - 24
        ? actions.bottom : field.bottom;
      if (bottom > bounds.bottom - 12) content.scrollTop += bottom - bounds.bottom + 12;
      else if (field.top < bounds.top + 12) content.scrollTop -= bounds.top + 12 - field.top;
    });
  };
  const resize = () => { update(); revealFocused(); };
  update();
  node.showModal();
  node.addEventListener('focusin', revealFocused);
  const observer = new ResizeObserver(update);
  if (host) observer.observe(host);
  ownerWindow.addEventListener('resize', resize);
  ownerWindow.visualViewport?.addEventListener('resize', resize);
  ownerWindow.visualViewport?.addEventListener('scroll', resize);
  return { destroy() {
    observer.disconnect();
    ownerWindow.cancelAnimationFrame(focusFrame);
    node.removeEventListener('focusin', revealFocused);
    ownerWindow.removeEventListener('resize', resize);
    ownerWindow.visualViewport?.removeEventListener('resize', resize);
    ownerWindow.visualViewport?.removeEventListener('scroll', resize);
    node.close();
  } };
}
