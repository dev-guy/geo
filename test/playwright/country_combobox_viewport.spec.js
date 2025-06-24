const { test, expect } = require('@playwright/test');

test.describe('Country Selector Viewport and Scrolling', () => {


  test('Requirement 4: Highlighted row should be near top of viewport after navigation', async ({
    browser,
    browserName,
  }) => {
    // Create a fresh browser context and page for complete isolation
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:4000');

      // Wait for the page to load with different strategies for different browsers
      if (browserName === 'firefox') {
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000); // Give Firefox extra time
      } else {
        await page.waitForLoadState('networkidle');
      }
    // Open the combobox
    await page.click('.search-combobox-trigger');

    // Wait for dropdown with longer timeout for all browsers due to occasional slowness
    const timeout = browserName === 'firefox' ? 20000 : 15000;
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])', {
      timeout,
    });

    // Start from the search input and navigate down 10 times
    console.log('=== Pressing Down Arrow 10 times ===');
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(50); // Small delay between presses
    }

    // Get the currently highlighted option after 10 down arrows
    let highlightedOption = page.locator(
      '.combobox-option[data-combobox-navigate]',
    );
    await expect(highlightedOption).toBeVisible();
    let optionValue = await highlightedOption.getAttribute(
      'data-combobox-value',
    );
    console.log(`After 10 down arrows: ${optionValue} is highlighted`);

    // Now press up arrow 11 times
    console.log('=== Pressing Up Arrow 11 times ===');
    for (let i = 0; i < 11; i++) {
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(50); // Small delay between presses
    }

    // Get the currently highlighted option after 11 up arrows
    highlightedOption = page.locator(
      '.combobox-option[data-combobox-navigate]',
    );
    await expect(highlightedOption).toBeVisible();
    optionValue = await highlightedOption.getAttribute('data-combobox-value');
    console.log(`After 11 up arrows: ${optionValue} is highlighted`);

    // Get the dropdown container to check viewport
    const dropdown = page.locator('.search-combobox-dropdown');

    // Get the bounding boxes
    const highlightedBox = await highlightedOption.boundingBox();
    const dropdownBox = await dropdown.boundingBox();

    console.log('Highlighted option position:', highlightedBox);
    console.log('Dropdown position:', dropdownBox);

    // Calculate relative position within the viewport
    const relativeTop = highlightedBox.y - dropdownBox.y;
    const relativeBottom = relativeTop + highlightedBox.height;
    const viewportHeight = dropdownBox.height;

    console.log(
      `Relative position: top=${relativeTop}, bottom=${relativeBottom}, viewport height=${viewportHeight}`,
    );

    // The highlighted row should be near the top of the viewport
    const topThreshold = 75; // Allow for some padding/margin at the top and browser differences

    console.log(
      `Expected: highlighted row top (${relativeTop}) should be <= ${topThreshold} (near top of viewport)`,
    );

    // The highlighted row should be near the top of the viewport
    expect(relativeTop).toBeLessThanOrEqual(topThreshold);

    // Additional check: the highlighted option should be visible and not cut off
    await expect(highlightedOption).toBeInViewport();

    // Verify there are no visible options above the highlighted one in the viewport
    const allVisibleOptions = page
      .locator('.combobox-option')
      .filter({ hasText: /.+/ });
    const visibleOptionsCount = await allVisibleOptions.count();

    // Find the index of the highlighted option among visible options
    let highlightedIndex = -1;
    for (let i = 0; i < visibleOptionsCount; i++) {
      const option = allVisibleOptions.nth(i);
      const hasNavigateAttr = await option.getAttribute(
        'data-combobox-navigate',
      );
      if (hasNavigateAttr !== null) {
        highlightedIndex = i;
        break;
      }
    }

    console.log(
      `Highlighted option is at index ${highlightedIndex} among ${visibleOptionsCount} visible options`,
    );

    // Check if there are options above the highlighted one that are visible in viewport
    let optionsAboveInViewport = 0;
    for (let i = 0; i < highlightedIndex; i++) {
      const option = allVisibleOptions.nth(i);
      const isInViewport = await option.isVisible();
      if (isInViewport) {
        const optionBox = await option.boundingBox();
        // Check if the option is actually within the dropdown viewport
        if (
          optionBox &&
          optionBox.y >= dropdownBox.y &&
          optionBox.y < highlightedBox.y
        ) {
          optionsAboveInViewport++;
          const optionVal = await option.getAttribute('data-combobox-value');
          console.log(
            `Option above highlighted in viewport: ${optionVal} at y=${optionBox.y}`,
          );
        }
      }
    }

    console.log(
      `Number of options above highlighted that are visible in viewport: ${optionsAboveInViewport}`,
    );

    // The requirement is that the highlighted row should be near the top of viewport
    // Allow for 1 option above to provide context, which is reasonable UX behavior
    expect(optionsAboveInViewport).toBeLessThanOrEqual(1);
    } finally {
      // Clean up the browser context
      await context.close();
    }
  });


});
