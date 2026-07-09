export function shouldInsertCellLineBreak(e: KeyboardEvent): boolean {
  return e.key === 'Enter' && e.altKey;
}

export function insertTextAreaLineBreak(textarea: HTMLTextAreaElement, value: string): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const next = `${value.slice(0, start)}\n${value.slice(end)}`;
  const cursor = start + 1;
  textarea.value = next;
  textarea.selectionStart = cursor;
  textarea.selectionEnd = cursor;
  return next;
}
