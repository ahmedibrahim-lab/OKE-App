import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://143.47.254.99/#pod-info');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/OKE Cloud-Native App/);
});

test('explore pipeline link', async ({ page }) => {
  await page.goto('http://143.47.254.99/#pod-info');

  // Wait for the new page to open
  const [newPage] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'Explore Pipeline' }).click(),
  ]);

  // Wait for the new page to finish loading
  await newPage.waitForLoadState();

  // Assert the URL
  await expect(newPage).toHaveURL(
    'https://github.com/ahmedibrahim-lab/OKE-App/actions'
  );
});