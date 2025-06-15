import { test, expect } from '@playwright/test';

test.describe('Combobox Escape Behavior', () => {
  test('should close combobox when escape is pressed after mouse hover and keyboard navigation', async ({ page }) => {
    // Navigate to the page with the combobox
    await page.goto('http://localhost:4000');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Find and open the combobox
    const comboboxTrigger = page.locator('.search-combobox-trigger').first();
    await comboboxTrigger.click();

    // Wait for dropdown to open
    const dropdown = page.locator('[data-part="search-combobox-listbox"]');
    await expect(dropdown).not.toHaveAttribute('hidden');

    // Step 2: Hover over Afghanistan option
    const afghanistanOption = page.locator('.combobox-option').filter({ hasText: 'Afghanistan' }).first();
    await afghanistanOption.hover();

    // Step 3: Wait 1 second
    await page.waitForTimeout(1000);

    // Step 4: Press down arrow
    await page.keyboard.press('ArrowDown');

    // Step 5: Wait 1 second
    await page.waitForTimeout(1000);

    // Step 6: Move mouse outside the combobox
    await page.mouse.move(0, 0); // Move to top-left corner, outside combobox

    // Step 7: Wait 1 second
    await page.waitForTimeout(1000);

    // Step 8: Hover over Afghanistan again
    await afghanistanOption.hover();

    // Step 9: Press Escape
    await page.keyboard.press('Escape');

    // Expected result: Combobox should close
    await expect(dropdown).toHaveAttribute('hidden');

    // Also verify the trigger shows closed state
    await expect(comboboxTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('should close combobox when escape is pressed from search input', async ({ page }) => {
    // Navigate to the page with the combobox
    await page.goto('http://localhost:4000');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Find and open the combobox
    const comboboxTrigger = page.locator('.search-combobox-trigger').first();
    await comboboxTrigger.click();

    // Wait for dropdown to open
    const dropdown = page.locator('[data-part="search-combobox-listbox"]');
    await expect(dropdown).not.toHaveAttribute('hidden');

    // Focus the search input
    const searchInput = page.locator('.search-combobox-search-input');
    await searchInput.focus();

    // Press Escape
    await page.keyboard.press('Escape');

    // Expected result: Combobox should close
    await expect(dropdown).toHaveAttribute('hidden');
    await expect(comboboxTrigger).toHaveAttribute('aria-expanded', 'false');
  });
});
