import { test, expect, type Page } from '@playwright/test';

async function mobile(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mobile', exact: true }).click();
}
async function details(page: Page) {
  await page.getByRole('button', { name: 'View details', exact: true }).click();
  return page.getByRole('dialog');
}

test('capture is modal, restores focus on close, Escape and submission', async ({ page }) => {
  await mobile(page);
  const add = page.getByRole('button', { name: 'Add', exact: true });
  for (const action of ['close', 'escape', 'submit']) {
    await add.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('textbox')).toBeFocused();
    expect(await dialog.evaluate(el => el.matches(':modal'))).toBe(true);
    // Background page content must not be reachable by Tab.
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('dialog'))).toBe(true);
    }
    if (action === 'close') await dialog.getByRole('button', { name: 'Close' }).click();
    if (action === 'escape') await page.keyboard.press('Escape');
    if (action === 'submit') {
      await dialog.getByRole('textbox').fill('Capture regression');
      await dialog.getByRole('button', { name: 'Add to Inbox' }).click();
    }
    await expect(dialog).toHaveCount(0);
    await expect(add).toBeFocused();
  }
  await page.getByRole('button', { name: 'Inbox', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Capture regression', exact: true })).toBeVisible();
});

test('validation targets the invalid field; save/cancel/delete restore focus and preserve notes', async ({ page }) => {
  await mobile(page);
  let dialog = await details(page);
  const add = dialog.getByRole('button', { name: 'Add a planned step', exact: true });
  await add.click();
  const title = dialog.getByRole('textbox', { name: 'What will you do?', exact: true });
  await expect(title).toBeFocused();
  await dialog.getByRole('button', { name: 'Save step' }).click();
  await expect(title).toBeFocused();
  await expect(title).toHaveAttribute('aria-invalid', 'true');
  await expect(title).toHaveAccessibleDescription('Enter a title.');
  await title.fill('Regression step');
  await dialog.getByLabel('Start date', { exact: true }).fill('2026-11-10');
  await dialog.getByLabel('End date', { exact: true }).fill('2026-11-09');
  await dialog.getByRole('button', { name: 'Save step' }).click();
  const end = dialog.getByLabel('End date', { exact: true });
  await expect(end).toBeFocused();
  await expect(end).toHaveAccessibleDescription('Enter an end date on or after the start date.');
  await end.fill('2026-11-12');
  await dialog.getByRole('textbox', { name: 'Details / next steps' }).fill('First line\n第二行\nThird line');
  await dialog.getByRole('button', { name: 'Save step' }).click();
  await expect(add).toBeFocused();
  let step = dialog.getByRole('button', { name: /^Regression step Start date/ });
  await step.click();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(step).toBeFocused();
  await page.reload();
  await page.getByRole('button', { name: 'Mobile', exact: true }).click();
  dialog = await details(page);
  step = dialog.getByRole('button', { name: /^Regression step Start date/ });
  await step.click();
  await expect(dialog.getByRole('textbox', { name: 'Details / next steps' })).toHaveValue('First line\n第二行\nThird line');
  await dialog.getByRole('button', { name: 'Remove step', exact: true }).click();
  await dialog.getByRole('button', { name: 'Tap again to delete', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Add a planned step', exact: true })).toBeFocused();
  await expect(step).toHaveCount(0);
});

test('completion stays operable through the last item and can be undone', async ({ page }) => {
  await mobile(page);
  const dialog = await details(page);
  while (await dialog.getByRole('button', { name: /^Mark as done:/ }).count()) {
    await dialog.getByRole('button', { name: /^Mark as done:/ }).first().click();
    expect(await dialog.evaluate(el => el.contains(el.ownerDocument.activeElement))).toBe(true);
    await expect(dialog.locator('[role=status]').filter({ hasText: /Done/ })).toHaveCount(1);
  }
  await expect(dialog.getByRole('button', { name: 'Add a planned step', exact: true })).toBeFocused();
  const completed = dialog.getByRole('button', { name: 'Completed 3', exact: true });
  await expect(completed).toHaveAttribute('aria-expanded', 'false');
  await completed.click();
  await dialog.getByRole('button', { name: /^Mark as to do:/ }).first().click();
  await expect(dialog.getByRole('button', { name: /^Mark as done:/ })).toHaveCount(1);
});

for (const locale of ['en', 'ja']) {
  test(`200% text only at 320px: ${locale}`, async ({ page }) => {
    await mobile(page);
    await page.getByLabel('Language', { exact: true }).selectOption(locale);
    const tabs = page.locator('.mobile-sections');
    const before = await tabs.locator('button').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    await page.getByLabel('Text size').selectOption('200');
    await expect.poll(() => tabs.locator('button').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBe(before * 2);
    expect(await page.locator('.preview-active').evaluate(el => el.getBoundingClientRect().width)).toBeLessThanOrEqual(322);
    await assertFits(tabs);
    await page.locator('.mobile-capture-button').click();
    const capture = page.getByRole('dialog');
    await capture.getByRole('textbox').fill('拡大入力 Text only');
    await assertFits(capture.locator('form'));
    await capture.getByRole('button', { name: locale === 'en' ? 'Close' : '閉じる', exact: true }).click();
    await page.getByRole('button', { name: locale === 'en' ? 'View details' : '詳細を見る', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await assertFits(dialog.locator('.mobile-detail-nav'));
    await dialog.locator('.new-step').click();
    const editor = dialog.locator('.step-editor');
    await editor.locator('textarea').first().fill('Long title 長い予定のタイトル');
    await editor.locator('input[type=date]').first().fill('2026-11-01');
    await editor.locator('input[type=date]').nth(1).fill('2026-11-01');
    await editor.locator('input[type=date]').last().fill('2026-11-03');
    await editor.locator('textarea').last().fill('One\nTwo\nThree');
    await editor.locator('textarea').last().press('Tab');
    await expect(editor.locator('button[type=submit]')).toBeFocused();
    await assertFits(editor);
    await editor.locator('button[type=submit]').press('Enter');
    await expect(dialog.locator('.new-step')).toBeFocused();
    await dialog.getByRole('button', { name: /^(Mark as done|完了にする): Long title/ }).click();
    await assertFits(dialog.locator('.mobile-detail-content'));
  });
}

async function assertFits(locator: import('@playwright/test').Locator) {
  const overflow = await locator.evaluate(el => [el, ...el.querySelectorAll('button,input,textarea,select,time')].filter(n => {
    const style = getComputedStyle(n);
    return n.checkVisibility() && n.clientWidth > 0 && style.display !== 'none' && n.scrollWidth > n.clientWidth + 2;
  }).map(n => ({ tag: n.tagName, text: n.textContent?.slice(0, 80), client: n.clientWidth, scroll: n.scrollWidth })));
  expect(overflow).toEqual([]);
}
