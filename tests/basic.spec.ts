import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://143.47.254.99/#pod-info');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/OKE Cloud-Native App/);
});

test('get started link', async ({ page }) => {
  await page.goto('http://143.47.254.99/#pod-info');

  // Click the get started link.
  await page.getByRole('link', { name: 'Explore Pipeline' }).click();

  // Expects page to have a heading with the name of Actions.
  await expect(page.toHaveURL('https://github.com/ahmedibrahim-lab/OKE-App/actions')).toBeVisible();
});