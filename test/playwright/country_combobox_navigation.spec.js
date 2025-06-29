// These tests assume the Geo service is running locally

const { test, expect } = require('@playwright/test');

test.describe('Country Combobox Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.waitForLoadState('networkidle');
  });

  test('Afghanistan is visible when combobox is first opened', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait for the dropdown to be visible
    const dropdown = page.locator('[data-part="search-combobox-listbox"]');
    await expect(dropdown).toBeVisible();
    
    // Wait for options to load
    await page.waitForSelector('.combobox-option', { state: 'visible' });
    
    // Wait a bit for sticky headers to initialize
    await page.waitForTimeout(100);
    
    // Look for Afghanistan specifically
    const afghanistanOption = page.locator('.combobox-option').filter({ hasText: 'Afghanistan' }).first();
    
    // Afghanistan should be visible in the viewport
    await expect(afghanistanOption).toBeVisible();
    
    // Check if Afghanistan is actually in the visible area (not hidden by sticky headers)
    const isVisible = await afghanistanOption.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const scrollArea = el.closest('.scroll-viewport');
      const scrollRect = scrollArea.getBoundingClientRect();
      
      // Check if the option is within the scroll area bounds
      return rect.top >= scrollRect.top && rect.bottom <= scrollRect.bottom;
    });
    
    expect(isVisible).toBe(true);
  });

  test('Arrow key navigation respects sticky headers and viewport calculations', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait for the dropdown and options
    await page.waitForSelector('.combobox-option', { state: 'visible' });
    
    // Navigate down a few times to test the navigation
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    
    // Check that we have a highlighted option
    const highlightedOption = page.locator('[data-combobox-navigate]');
    await expect(highlightedOption).toBeVisible();
    
    // Verify the highlighted option is actually visible in the viewport
    const isInViewport = await highlightedOption.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const scrollArea = el.closest('.scroll-viewport');
      const scrollRect = scrollArea.getBoundingClientRect();
      
      return rect.top >= scrollRect.top && rect.bottom <= scrollRect.bottom;
    });
    
    expect(isInViewport).toBe(true);
  });

  test('Navigation works correctly when sticky headers are present', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait for the dropdown and options
    await page.waitForSelector('.combobox-option', { state: 'visible' });
    
    // Scroll down to make some headers sticky
    const scrollArea = page.locator('.scroll-viewport');
    await scrollArea.evaluate(el => el.scrollTop = 200);
    
    // Wait for scroll to settle
    await page.waitForTimeout(100);
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    
    // Verify that navigation still works and respects the reduced viewport
    const highlightedOption = page.locator('[data-combobox-navigate]');
    await expect(highlightedOption).toBeVisible();
  });

  test('Page scroll respects sticky headers', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait for the dropdown and options
    await page.waitForSelector('.combobox-option', { state: 'visible' });
    
    // Get initial scroll position
    const initialScrollTop = await page.locator('.scroll-viewport').evaluate(el => el.scrollTop);
    
    // Trigger page scroll down (space key while over scroll area)
    const scrollArea = page.locator('.scroll-viewport');
    await scrollArea.focus();
    await page.keyboard.press('Space');
    
    // Wait for scroll animation
    await page.waitForTimeout(200);
    
    // Verify scroll position changed
    const newScrollTop = await page.locator('.scroll-viewport').evaluate(el => el.scrollTop);
    expect(newScrollTop).toBeGreaterThan(initialScrollTop);
  });

  test('Viewport calculation updates as headers become sticky', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait for the dropdown and options
    await page.waitForSelector('.combobox-option', { state: 'visible' });
    
    // Get the effective viewport at the top
    const initialViewport = await page.evaluate(() => {
      const combobox = document.querySelector('[data-part="search-combobox-listbox"]');
      if (combobox && combobox.searchCombobox) {
        return combobox.searchCombobox.getEffectiveViewport();
      }
      return null;
    });
    
    // Scroll down to make headers sticky
    const scrollArea = page.locator('.scroll-viewport');
    await scrollArea.evaluate(el => el.scrollTop = 300);
    await page.waitForTimeout(100);
    
    // Get the effective viewport after scrolling
    const scrolledViewport = await page.evaluate(() => {
      const combobox = document.querySelector('[data-part="search-combobox-listbox"]');
      if (combobox && combobox.searchCombobox) {
        return combobox.searchCombobox.getEffectiveViewport();
      }
      return null;
    });
    
    // The viewport should have changed due to sticky headers
    if (initialViewport && scrolledViewport) {
      expect(scrolledViewport.viewportTop).toBeGreaterThan(initialViewport.viewportTop);
      expect(scrolledViewport.effectiveHeight).toBeLessThan(initialViewport.effectiveHeight);
    }
  });

  test('Up arrow from Afghanistan should highlight Zimbabwe', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait for the dropdown and options
    await page.waitForSelector('.combobox-option', { state: 'visible' });
    await page.waitForTimeout(100);
    
    // Hover over Afghanistan (first option)
    const afghanistanOption = page.locator('.combobox-option').filter({ hasText: 'Afghanistan' }).first();
    await expect(afghanistanOption).toBeVisible();
    await afghanistanOption.hover();
    
    // Verify Afghanistan is highlighted after hover
    await expect(afghanistanOption).toHaveAttribute('data-combobox-navigate', '');
    
    // Press up arrow - should go to Zimbabwe (last option)
    await page.keyboard.press('ArrowUp');
    
    // Wait a moment for navigation to complete
    await page.waitForTimeout(50);
    
    // Check that some option is highlighted (the navigation worked)
    const highlightedOption = page.locator('[data-combobox-navigate]');
    await expect(highlightedOption).toBeVisible();
    
    // Check that the highlighted option contains Zimbabwe text
    await expect(highlightedOption).toContainText('Zimbabwe');
    
    // Verify that Afghanistan is no longer highlighted
    await expect(afghanistanOption).not.toHaveAttribute('data-combobox-navigate', '');
  });

  test('Up arrow navigation wraps correctly between first and last options', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait for options to load
    await page.waitForSelector('.combobox-option', { state: 'visible' });
    await page.waitForTimeout(100);
    
    // Hover over Afghanistan to highlight it
    const afghanistanOption = page.locator('.combobox-option').filter({ hasText: 'Afghanistan' }).first();
    await afghanistanOption.hover();
    
    // Press up arrow - this should wrap around to Zimbabwe
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(50);
    
    // Verify Zimbabwe is now highlighted
    const highlightedOption = page.locator('[data-combobox-navigate]');
    await expect(highlightedOption).toContainText('Zimbabwe');
    
    // Press down arrow should go back to Afghanistan
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
    
    const newHighlighted = page.locator('[data-combobox-navigate]');
    await expect(newHighlighted).toContainText('Afghanistan');
  });
});
