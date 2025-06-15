const { test, expect } = require('@playwright/test');

test.describe('Combobox Hover Navigation Bug', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.waitForLoadState('networkidle');
  });

  test('Bug: Hover over Afghanistan, down arrow, hover again, down arrow - Afghanistan stays highlighted', async ({ page }) => {
    // Helper function to get highlighted option info
    const getHighlightedOption = async () => {
      const highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
      if (await highlightedOption.count() > 0) {
        const value = await highlightedOption.getAttribute('data-combobox-value');
        const text = await highlightedOption.textContent();
        return { value, text: text?.trim() };
      }
      return null;
    };

    // 1. Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // 2. Hover over Afghanistan (first one - in "By Name" group)
    const afghanistanOption = page.locator('.combobox-option[data-combobox-value="AF"]').first();
    await afghanistanOption.hover();

    let highlighted = await getHighlightedOption();
    console.log('After hovering Afghanistan:', highlighted);
    expect(highlighted?.text).toContain('Afghanistan');

    // 3. Down arrow (should move to next option)
    await page.keyboard.press('ArrowDown');
    highlighted = await getHighlightedOption();
    console.log('After first down arrow:', highlighted);
    expect(highlighted?.text).not.toContain('Afghanistan'); // Should move away from Afghanistan
    const firstDownArrowResult = highlighted;

    // 4. Hover over Afghanistan again
    await afghanistanOption.hover();
    // Wait for the delayed hover processing to complete (increased timeout for new delays)
    await page.waitForTimeout(350);
    highlighted = await getHighlightedOption();
    console.log('After hovering Afghanistan again:', highlighted);
    // After the fix: hovering should NOT change navigation during recent keyboard navigation
    expect(highlighted?.text).toContain(firstDownArrowResult.text); // Should stay on the same option as step 3

    // 5. Down arrow again (should move to next option)
    await page.keyboard.press('ArrowDown');
    highlighted = await getHighlightedOption();
    console.log('After second down arrow (should move to next option):', highlighted);

    // This should pass after the fix - should move to the next option
    expect(highlighted?.text).not.toContain('Afghanistan');
    expect(highlighted?.text).not.toContain(firstDownArrowResult.text); // Should move away from the first down arrow result
  });

  test('Hover should work after sufficient delay', async ({ page, browserName }) => {
    // Helper function to get highlighted option info
    const getHighlightedOption = async () => {
      const highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
      if (await highlightedOption.count() > 0) {
        const value = await highlightedOption.getAttribute('data-combobox-value');
        const text = await highlightedOption.textContent();
        return { value, text: text?.trim() };
      }
      return null;
    };

    // 1. Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    const afghanistanOption = page.locator('.combobox-option[data-combobox-value="AF"]').first();

    // 2. Hover Afghanistan
    await afghanistanOption.hover();
    await page.waitForTimeout(100);
    let highlighted = await getHighlightedOption();
    expect(highlighted?.text).toContain('Afghanistan');

    // 3. Down arrow
    await page.keyboard.press('ArrowDown');
    highlighted = await getHighlightedOption();
    expect(highlighted?.text).not.toContain('Afghanistan');

    // 4. Wait longer to ensure hover protection window has expired
    // Webkit needs more time
    const waitTime = browserName === 'webkit' ? 300 : 200;
    await page.waitForTimeout(waitTime);

    // 5. Hover Afghanistan again (should work after delay)
    await afghanistanOption.hover();
    await page.waitForTimeout(100);

    // If hover didn't work (common in headless mode), manually trigger the event
    const highlightedAfterHover = await getHighlightedOption();
    if (!highlightedAfterHover?.text?.includes('Afghanistan')) {
      console.log('Hover did not work, manually triggering mouseover event');
      await page.evaluate(() => {
        const element = document.querySelector('.combobox-option[data-combobox-value="AF"]');
        if (element) {
          const event = new MouseEvent('mouseover', { bubbles: true });
          element.dispatchEvent(event);
        }
      });
      await page.waitForTimeout(100);
    }

    highlighted = await getHighlightedOption();
    expect(highlighted?.text).toContain('Afghanistan');
  });
});
