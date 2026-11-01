/** Insert serialized JSON literally: replacement strings interpret dollar tokens. */
export function replaceFutureDataBlock(content: string, json: string): string {
  return content.replace(/```future-data\s*\n[\s\S]*?\n```/, () => '```future-data\n' + json + '\n```');
}
