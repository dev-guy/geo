import { test, expect } from '@playwright/test';

test.describe('Country Combobox Mobile Behavior', () => {
  test('Combobox should open and be scrollable on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to the home page
    await page.goto('/');

    // Wait for the combobox to be visible and hooks to mount
    await page.waitForSelector('.country-selector', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Open the combobox dropdown by clicking the trigger
    const trigger = page.locator('.country-selector .search-combobox-trigger');
    await trigger.click();

    // Wait for dropdown to be visible with retry logic
    try {
      await page.waitForSelector('[data-part="search-combobox-listbox"]:not([hidden])', { timeout: 5000 });
    } catch (e) {
      // Retry once on timeout
      await trigger.click();
      await page.waitForSelector('[data-part="search-combobox-listbox"]:not([hidden])', { timeout: 5000 });
    }

    // Verify scroll area exists and is scrollable
    const scrollArea = page.locator('.scroll-viewport');
    await expect(scrollArea).toBeVisible();

    // Get initial scroll position
    const initialScrollTop = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`Initial scroll position: ${initialScrollTop}`);

    // Scroll the area using wheel event (simulates scrolling gesture)
    await scrollArea.hover();
    await page.mouse.wheel(0, 100);

    // Wait a bit for scroll to complete
    await page.waitForTimeout(300);

    // Get final scroll position
    const finalScrollTop = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`Final scroll position: ${finalScrollTop}`);

    // Verify that scrolling occurred
    expect(finalScrollTop).toBeGreaterThan(initialScrollTop);

    // Verify the previously selected option is still selected after scrolling
    const selectElement = page.locator('.search-combobox-select');
    const selectValue = await selectElement.inputValue();
    expect(selectValue).toBe('AU');

    console.log('SUCCESS: Dropdown is scrollable without selecting options');
  });

  test('Clicking option should select it on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to the home page
    await page.goto('/');

    // Wait for the combobox to be visible and hooks to mount
    await page.waitForSelector('.country-selector', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Open the combobox dropdown
    const trigger = page.locator('.country-selector .search-combobox-trigger');
    await trigger.click();

    // Wait for dropdown to be visible with retry logic
    try {
      await page.waitForSelector('[data-part="search-combobox-listbox"]:not([hidden])', { timeout: 5000 });
    } catch (e) {
      // Retry once on timeout
      await trigger.click();
      await page.waitForSelector('[data-part="search-combobox-listbox"]:not([hidden])', { timeout: 5000 });
    }

    // Get the first option
    const firstOption = page.locator('.combobox-option').first();
    await expect(firstOption).toBeVisible();

    const firstOptionValue = await firstOption.getAttribute('data-combobox-value');
    const firstOptionText = await firstOption.textContent();

    console.log(`First option value: "${firstOptionValue}", text: "${firstOptionText}"`);

    // Click the option
    await firstOption.click();

    // Wait a moment for selection to occur
    await page.waitForTimeout(200);

    // Check that the select value has changed
    const selectElement = page.locator('.search-combobox-select');
    const finalValue = await selectElement.inputValue();

    console.log(`Final select value: "${finalValue}"`);
    expect(finalValue).toBe(firstOptionValue);

    console.log('SUCCESS: Click correctly selected the option');
  });

  test('Touch scroll prevention code should be present', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Wait for the country selector to be visible and hooks to mount
    await page.waitForSelector('.country-selector', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Check that the SearchCombobox instance has touch handling methods
    const hasTouchHandling = await page.evaluate(() => {
      const combobox = document.querySelector('.country-selector');
      if (combobox && combobox.searchComboboxInstance) {
        const instance = combobox.searchComboboxInstance;
        return {
          hasHandleTouchStart: typeof instance.handleTouchStart === 'function',
          hasHandleTouchMove: typeof instance.handleTouchMove === 'function',
          hasHandleTouchEnd: typeof instance.handleTouchEnd === 'function',
          touchMoveThreshold: instance.touchMoveThreshold,
          touchTimeThreshold: instance.touchTimeThreshold
        };
      }
      return null;
    });

    expect(hasTouchHandling).not.toBeNull();
    expect(hasTouchHandling.hasHandleTouchStart).toBe(true);
    expect(hasTouchHandling.hasHandleTouchMove).toBe(true);
    expect(hasTouchHandling.hasHandleTouchEnd).toBe(true);
    expect(hasTouchHandling.touchMoveThreshold).toBe(5);
    expect(hasTouchHandling.touchTimeThreshold).toBe(300);

    console.log('SUCCESS: Touch handling code is properly initialized');
  });
});
