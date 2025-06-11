// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Country Selector Space Key Issue', () => {
  test('Space key should highlight Albania when clicked', async ({ page }) => {
    // Navigate to the page with the country selector
    await page.goto('/');

    // Step 1: Click on combobox to open it
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Step 2: Press Tab to move focus
    await page.keyboard.press('Tab');

    // Step 3: Press Down Arrow
    await page.keyboard.press('ArrowDown');

    // Step 4: Find and hover over Albania
    const albaniaOption = page.locator('.search-combobox-option', { hasText: 'Albania' });
    await albaniaOption.scrollIntoViewIfNeeded();
    await albaniaOption.hover();

    // Log the state before pressing space
    console.log('Before space key press:');
    const beforeState = await albaniaOption.evaluate(el => ({
      dataComboboxNavigate: el.hasAttribute('data-combobox-navigate'),
      dataComboboxSelected: el.hasAttribute('data-combobox-selected'),
      hover: document.querySelector(':hover') === el
    }));
    console.log(beforeState);

    // Step 5: Press Space
    await page.keyboard.press(' ');

    // Wait a moment for any state changes
    await page.waitForTimeout(100);

    // Log the state after pressing space
    console.log('After space key press:');
    const afterState = await albaniaOption.evaluate(el => ({
      dataComboboxNavigate: el.hasAttribute('data-combobox-navigate'),
      dataComboboxSelected: el.hasAttribute('data-combobox-selected'),
      hover: document.querySelector(':hover') === el
    }));
    console.log(afterState);

    // Verify Albania is properly highlighted with data-combobox-navigate attribute
    await expect(albaniaOption).toHaveAttribute('data-combobox-navigate', '');

    // Test that down arrow navigation works from this point
    await page.keyboard.press('ArrowDown');

    // Albania should no longer be the navigation item
    await expect(albaniaOption).not.toHaveAttribute('data-combobox-navigate', '');

    // The next option should now be the navigation item
    const nextOption = page.locator('.search-combobox-option[data-combobox-navigate]');
    await expect(nextOption).toBeVisible();
  });
});
