const { test, expect } = require('@playwright/test');

test.describe('Country Selector Requirements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.waitForLoadState('networkidle');
  });

  test('Requirement 1: Typing a letter when an item is selected should append to search input', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Select the first item
    const firstOption = page.locator('.combobox-option').first();
    await firstOption.click();

    // Verify an item is selected
    await expect(firstOption).toHaveAttribute('data-combobox-selected', '');

    // Hover over the combobox trigger to ensure mouse is over the combobox
    await page.hover('.search-combobox-trigger');

    // Type a letter
    await page.keyboard.type('a');

    // Verify the search input has focus and contains the typed character
    const searchInput = page.locator('.search-combobox-search-input');
    await expect(searchInput).toHaveValue('a');
  });
});
