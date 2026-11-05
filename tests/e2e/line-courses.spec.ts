import { test, expect } from '@playwright/test';
import { lineCourseReferences } from '../../src/challenges/line-courses';

for (const reference of lineCourseReferences) test(`${reference.id} loads its robot and parks after following the course`, async ({ page }) => {
  test.setTimeout(100000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/');
  const stage = page.locator('.unified-stage');
  await expect(stage).toHaveAttribute('data-status', 'ready', { timeout: 45000 });
  await page.getByRole('combobox', { name: 'Choose a mission or world' }).selectOption(reference.scene);
  await page.getByRole('button', { name: 'Load line follower program', exact: true }).click();
  await expect(stage).toHaveAttribute('data-status', 'ready', { timeout: 30000 });
  await expect(page.getByRole('combobox', { name: 'Robot', exact: true })).toHaveValue('custom');
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(stage).toHaveAttribute('data-status', 'complete', { timeout: 55000 });
  await expect(page.locator('.challenge-result')).toContainText('Objective complete');
  expect(errors).toEqual([]);
});
