const { test, expect } = require('@playwright/test');

test.describe('Country Selector Requirements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4000');
    // Wait for the page to load and for the combobox to be available
    await page.waitForSelector('.search-combobox-trigger', { timeout: 15000 });
    // Give extra time for any JavaScript to initialize
    await page.waitForTimeout(1000);
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

  test('Requirement 2: Up arrow from first item in first group should go to last item in last group', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Type "by" in the search box to get a predictable set of results with multiple groups
    const searchInput = page.locator('.search-combobox-search-input');
    await searchInput.fill('by');
    await page.waitForTimeout(1000); // Wait for search results

    // Log the structure to understand what we're working with
    console.log('=== Options after searching for "by" ===');
    const options = page.locator('.combobox-option');
    const optionCount = await options.count();

    for (let i = 0; i < Math.min(optionCount, 6); i++) {
      const option = options.nth(i);
      const value = await option.getAttribute('data-combobox-value');
      const group = option.locator('xpath=ancestor::*[contains(@class, "option-group")]');
      let groupName = '';
      try {
        groupName = await group.locator('.group-label').textContent();
        groupName = groupName?.replace(/\s+/g, ' ').trim();
        if (groupName?.includes('Sort')) {
          groupName = groupName.split('Sort')[0].trim();
        }
      } catch (e) {
        groupName = 'Unknown';
      }
      console.log(`Option ${i}: ${value} in group: "${groupName}"`);
    }

    // Navigate to the first option in the first group from search input
    await page.keyboard.press('ArrowDown');

    let highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
    let optionValue = await highlightedOption.getAttribute('data-combobox-value');
    console.log(`\nAfter first down arrow from search: ${optionValue} is highlighted`);

    // Check if this is actually the first option (BY) - if not, navigate to it
    if (optionValue !== 'BY') {
      console.log('Not at first option, navigating to BY (first option)');
      // Keep pressing up until we reach BY (the first option)
      while (optionValue !== 'BY') {
        await page.keyboard.press('ArrowUp');
        highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
        optionValue = await highlightedOption.getAttribute('data-combobox-value');
        console.log(`After up arrow: ${optionValue} is highlighted`);
      }
    }

    console.log(`\nConfirmed: Starting from first option: ${optionValue}`);

    // Now press up arrow - this should go to the last item in the last expanded group
    console.log('\n=== Pressing Up Arrow from first item in first group ===');
    await page.keyboard.press('ArrowUp');

    // Check which option is highlighted now
    highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
    await expect(highlightedOption).toBeVisible();

    optionValue = await highlightedOption.getAttribute('data-combobox-value');
    console.log(`After up arrow: ${optionValue} is highlighted`);

    // Find which group this option belongs to
    const optionGroup = highlightedOption.locator('xpath=ancestor::*[contains(@class, "option-group")]');
    let groupName = '';
    try {
      groupName = await optionGroup.locator('.group-label').textContent();
      groupName = groupName?.replace(/\s+/g, ' ').trim();
      if (groupName?.includes('Sort')) {
        groupName = groupName.split('Sort')[0].trim();
      }
    } catch (e) {
      groupName = 'Unknown';
    }

    console.log(`Highlighted option is in group: "${groupName}"`);

    // According to the requirement: "Up arrow from first item in first group goes to the last item in the last expanded group"
    // We expect this to be LY in the "By Country Code" group (the last group)
    // The current implementation incorrectly stays at the first option or goes back to the first group

    // Let's verify we're in the last group by checking if this is "By Country Code"
    expect(groupName).toBe('By Country Code');

    // And verify it's Libya (LY) - the last item in that group
    expect(optionValue).toBe('LY');

    console.log(`SUCCESS: Up arrow from first item correctly navigated to last item (${optionValue}) in last group (${groupName})`);
  });

  test('Requirement 2b: Up arrow navigation works with different search terms', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Type "an" in the search box to get a different set of results
    const searchInput = page.locator('.search-combobox-search-input');
    await searchInput.fill('an');
    await page.waitForTimeout(1000); // Wait for search results

    // Log the structure to understand what we're working with
    console.log('=== Options after searching for "an" ===');
    const options = page.locator('.combobox-option');
    const optionCount = await options.count();

    // Log first few options to understand the structure
    for (let i = 0; i < Math.min(optionCount, 8); i++) {
      const option = options.nth(i);
      const value = await option.getAttribute('data-combobox-value');
      const group = option.locator('xpath=ancestor::*[contains(@class, "option-group")]');
      let groupName = '';
      try {
        groupName = await group.locator('.group-label').textContent();
        groupName = groupName?.replace(/\s+/g, ' ').trim();
        if (groupName?.includes('Sort')) {
          groupName = groupName.split('Sort')[0].trim();
        }
      } catch (e) {
        groupName = 'Unknown';
      }
      console.log(`Option ${i}: ${value} in group: "${groupName}"`);
    }

    // Navigate to the first option from search input
    await page.keyboard.press('ArrowDown');

    let highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
    let optionValue = await highlightedOption.getAttribute('data-combobox-value');
    console.log(`\nAfter first down arrow from search: ${optionValue} is highlighted`);

    // Get the first option value to compare
    const firstOption = options.first();
    const firstOptionValue = await firstOption.getAttribute('data-combobox-value');

    // Navigate to the actual first option if we're not there
    if (optionValue !== firstOptionValue) {
      console.log(`Not at first option (${firstOptionValue}), navigating to it`);
      while (optionValue !== firstOptionValue) {
        await page.keyboard.press('ArrowUp');
        highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
        optionValue = await highlightedOption.getAttribute('data-combobox-value');
        console.log(`After up arrow: ${optionValue} is highlighted`);
      }
    }

    console.log(`\nConfirmed: Starting from first option: ${optionValue}`);

    // Now press up arrow - this should go to the last item in the last expanded group
    console.log('\n=== Pressing Up Arrow from first item in first group ===');
    await page.keyboard.press('ArrowUp');

    // Check which option is highlighted now
    highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
    await expect(highlightedOption).toBeVisible();

    const finalOptionValue = await highlightedOption.getAttribute('data-combobox-value');
    console.log(`After up arrow: ${finalOptionValue} is highlighted`);

    // Find which group this option belongs to
    const optionGroup = highlightedOption.locator('xpath=ancestor::*[contains(@class, "option-group")]');
    let groupName = '';
    try {
      groupName = await optionGroup.locator('.group-label').textContent();
      groupName = groupName?.replace(/\s+/g, ' ').trim();
      if (groupName?.includes('Sort')) {
        groupName = groupName.split('Sort')[0].trim();
      }
    } catch (e) {
      groupName = 'Unknown';
    }

    console.log(`Final highlighted option is in group: "${groupName}"`);

    // The key requirement is that we should be in the last group (By Country Code)
    // and it should be different from the first option
    expect(groupName).toBe('By Country Code');
    expect(finalOptionValue).not.toBe(firstOptionValue);

    console.log(`SUCCESS: Up arrow from first item correctly navigated to last group (${groupName})`);
  });

  test('Requirement 3: Viewport scrolling after navigation - selection should be reasonably positioned', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Type "ag" in the search box
    const searchInput = page.locator('.search-combobox-search-input');
    await searchInput.fill('ag');
    await page.waitForTimeout(1000); // Wait for search results

    // Hover over the first country in the first group
    const firstOption = page.locator('.combobox-option').first();
    await firstOption.hover();

    // Wait a moment for hover to register
    await page.waitForTimeout(100);

    // Press down arrow 9 times
    console.log('=== Pressing Down Arrow 9 times ===');
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(50); // Small delay between presses
    }

    // Get the currently highlighted option
    const highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
    await expect(highlightedOption).toBeVisible();

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

    console.log(`Relative position: top=${relativeTop}, bottom=${relativeBottom}, viewport height=${viewportHeight}`);

    // The selection should be positioned reasonably within the viewport
    const bottomThreshold = viewportHeight * 0.3; // At least 30% down the viewport
    const topThreshold = viewportHeight * 0.1; // Not in the top 10% of the viewport

    console.log(`Expected: selection bottom (${relativeBottom}) should be > ${bottomThreshold} (30% of viewport)`);
    console.log(`Expected: selection top (${relativeTop}) should be > ${topThreshold} (10% of viewport)`);

    // The selection should be positioned reasonably within the viewport
    expect(relativeBottom).toBeGreaterThan(bottomThreshold);
    expect(relativeTop).toBeGreaterThan(topThreshold);

    // Additional check: the highlighted option should be visible and not cut off
    await expect(highlightedOption).toBeInViewport();
  });

  test('Requirement 3: Down arrow from last item in last group should go to first item in first group', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Type "au" in the search box to get a predictable set of results with multiple groups
    const searchInput = page.locator('.search-combobox-search-input');
    await searchInput.fill('au');
    await page.waitForTimeout(1000); // Wait for search results

    // Log the structure to understand what we're working with
    console.log('=== Options after searching for "au" ===');
    const options = page.locator('.combobox-option');
    const optionCount = await options.count();

    for (let i = 0; i < optionCount; i++) {
      const option = options.nth(i);
      const value = await option.getAttribute('data-combobox-value');
      const group = option.locator('xpath=ancestor::*[contains(@class, "option-group")]');
      let groupName = '';
      try {
        groupName = await group.locator('.group-label').textContent();
        groupName = groupName?.replace(/\s+/g, ' ').trim();
        if (groupName?.includes('Sort')) {
          groupName = groupName.split('Sort')[0].trim();
        }
      } catch (e) {
        groupName = 'Unknown';
      }
      console.log(`Option ${i}: ${value} in group: "${groupName}"`);
    }

    // Navigate to the first option from search input
    await page.keyboard.press('ArrowDown');

    let highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
    let optionValue = await highlightedOption.getAttribute('data-combobox-value');
    console.log(`\nAfter first down arrow from search: ${optionValue} is highlighted`);

        // Navigate to the last option by pressing down arrow until we reach it
    console.log('\n=== Navigating to the last option ===');
    const targetLastOption = options.last();
    const targetLastOptionValue = await targetLastOption.getAttribute('data-combobox-value');
    console.log(`Target last option: ${targetLastOptionValue}`);

    let pressCount = 0;
    while (optionValue !== targetLastOptionValue && pressCount < 20) { // Safety limit
      await page.keyboard.press('ArrowDown');
      pressCount++;
      highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
      optionValue = await highlightedOption.getAttribute('data-combobox-value');
      console.log(`After down arrow ${pressCount}: ${optionValue} is highlighted`);
    }

    // Find which group this option belongs to
    let optionGroup = highlightedOption.locator('xpath=ancestor::*[contains(@class, "option-group")]');
    let groupName = '';
    try {
      groupName = await optionGroup.locator('.group-label').textContent();
      groupName = groupName?.replace(/\s+/g, ' ').trim();
      if (groupName?.includes('Sort')) {
        groupName = groupName.split('Sort')[0].trim();
      }
    } catch (e) {
      groupName = 'Unknown';
    }

    console.log(`\nAfter navigating, highlighted option is: ${optionValue} in group: "${groupName}"`);

    // Verify we're at the last option in the last group
    // Based on the search for "au", we should be at the last option
    console.log(`Last option in list: ${targetLastOptionValue}`);

    // Now press down arrow one more time - this should wrap to the first option in the first group
    console.log('\n=== Pressing Down Arrow from last item in last group ===');
    await page.keyboard.press('ArrowDown');

    // Check which option is highlighted now
    highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
    await expect(highlightedOption).toBeVisible();

    const finalOptionValue = await highlightedOption.getAttribute('data-combobox-value');
    console.log(`After final down arrow: ${finalOptionValue} is highlighted`);

    // Find which group this option belongs to
    optionGroup = highlightedOption.locator('xpath=ancestor::*[contains(@class, "option-group")]');
    try {
      groupName = await optionGroup.locator('.group-label').textContent();
      groupName = groupName?.replace(/\s+/g, ' ').trim();
      if (groupName?.includes('Sort')) {
        groupName = groupName.split('Sort')[0].trim();
      }
    } catch (e) {
      groupName = 'Unknown';
    }

    console.log(`Final highlighted option is in group: "${groupName}"`);

    // According to the requirement: "down arrow in the last row of the last expanded group goes to the top of the first expanded group"
    // We expect this to be the first option in the first group
    const firstOption = options.first();
    const firstOptionValue = await firstOption.getAttribute('data-combobox-value');

    // Verify we wrapped around to the first option
    expect(finalOptionValue).toBe(firstOptionValue);

    console.log(`SUCCESS: Down arrow from last item correctly wrapped to first item (${finalOptionValue})`);
  });

  test('Requirement 4: Highlighted row should be near top of viewport after navigation', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Start from the search input and navigate down 10 times
    console.log('=== Pressing Down Arrow 10 times ===');
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(50); // Small delay between presses
    }

    // Get the currently highlighted option after 10 down arrows
    let highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
    await expect(highlightedOption).toBeVisible();
    let optionValue = await highlightedOption.getAttribute('data-combobox-value');
    console.log(`After 10 down arrows: ${optionValue} is highlighted`);

    // Now press up arrow 11 times
    console.log('=== Pressing Up Arrow 11 times ===');
    for (let i = 0; i < 11; i++) {
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(50); // Small delay between presses
    }

    // Get the currently highlighted option after 11 up arrows
    highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
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

    console.log(`Relative position: top=${relativeTop}, bottom=${relativeBottom}, viewport height=${viewportHeight}`);

    // The highlighted row should be near the top of the viewport
    const topThreshold = 75; // Allow for some padding/margin at the top and browser differences

    console.log(`Expected: highlighted row top (${relativeTop}) should be <= ${topThreshold} (near top of viewport)`);

    // The highlighted row should be near the top of the viewport
    expect(relativeTop).toBeLessThanOrEqual(topThreshold);

    // Additional check: the highlighted option should be visible and not cut off
    await expect(highlightedOption).toBeInViewport();

    // Verify there are no visible options above the highlighted one in the viewport
    const allVisibleOptions = page.locator('.combobox-option').filter({ hasText: /.+/ });
    const visibleOptionsCount = await allVisibleOptions.count();

    // Find the index of the highlighted option among visible options
    let highlightedIndex = -1;
    for (let i = 0; i < visibleOptionsCount; i++) {
      const option = allVisibleOptions.nth(i);
      const hasNavigateAttr = await option.getAttribute('data-combobox-navigate');
      if (hasNavigateAttr !== null) {
        highlightedIndex = i;
        break;
      }
    }

    console.log(`Highlighted option is at index ${highlightedIndex} among ${visibleOptionsCount} visible options`);

    // Check if there are options above the highlighted one that are visible in viewport
    let optionsAboveInViewport = 0;
    for (let i = 0; i < highlightedIndex; i++) {
      const option = allVisibleOptions.nth(i);
      const isInViewport = await option.isVisible();
      if (isInViewport) {
        const optionBox = await option.boundingBox();
        // Check if the option is actually within the dropdown viewport
        if (optionBox && optionBox.y >= dropdownBox.y && optionBox.y < highlightedBox.y) {
          optionsAboveInViewport++;
          const optionVal = await option.getAttribute('data-combobox-value');
          console.log(`Option above highlighted in viewport: ${optionVal} at y=${optionBox.y}`);
        }
      }
    }

    console.log(`Number of options above highlighted that are visible in viewport: ${optionsAboveInViewport}`);

    // The requirement is that the highlighted row should be near the top of viewport
    // Allow for 1 option above to provide context, which is reasonable UX behavior
    expect(optionsAboveInViewport).toBeLessThanOrEqual(1);
  });

  test('Normal navigation should not position at top of viewport', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Hover over Afghanistan to establish a starting point
    const afghanistanOption = page.locator('.combobox-option[data-combobox-value="AF"]').first();
    await afghanistanOption.hover();
    await page.waitForTimeout(100);

    // Navigate down 3 times
    console.log('=== Pressing Down Arrow 3 times ===');
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(50);
    }

    // Get the currently highlighted option
    const highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
    await expect(highlightedOption).toBeVisible();
    const optionValue = await highlightedOption.getAttribute('data-combobox-value');
    console.log(`After 3 down arrows: ${optionValue} is highlighted`);

    // Get the dropdown container to check viewport
    const dropdown = page.locator('.search-combobox-dropdown');

    // Get the bounding boxes
    const highlightedBox = await highlightedOption.boundingBox();
    const dropdownBox = await dropdown.boundingBox();

    // Calculate relative position within the viewport
    const relativeTop = highlightedBox.y - dropdownBox.y;
    const viewportHeight = dropdownBox.height;

    console.log(`Relative position: top=${relativeTop}, viewport height=${viewportHeight}`);

    // For normal navigation, the highlighted option should NOT be at the top of the viewport
    // It should be positioned more naturally (not at the very top)
    const topThreshold = 55;

    console.log(`Expected: highlighted row top (${relativeTop}) should be > ${topThreshold} (NOT at top of viewport for normal navigation)`);

    // The highlighted option should be visible but not necessarily at the top
    expect(relativeTop).toBeGreaterThan(topThreshold);
    await expect(highlightedOption).toBeInViewport();
  });

  test('Tab navigation after hover and scroll should focus correct group sort button', async ({ page }) => {
    // Helper function to get focused element info
    const getFocusedElementInfo = async () => {
      const focusedElement = await page.evaluate(() => {
        const focused = document.activeElement;
        if (!focused) return null;

        return {
          tagName: focused.tagName,
          title: focused.title || '',
          className: focused.className || '',
          textContent: focused.textContent?.trim() || '',
          groupInfo: (() => {
            const group = focused.closest('.option-group');
            if (group) {
              const groupLabel = group.querySelector('.group-label');
              return groupLabel ? groupLabel.textContent.trim() : 'Unknown Group';
            }
            return 'No Group';
          })()
        };
      });
      return focusedElement;
    };

    // 1. Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // 2. Hover over Afghanistan (first option in first group)
    const afghanistanOption = page.locator('.combobox-option[data-combobox-value="AF"]').first();
    await afghanistanOption.hover();
    await page.waitForTimeout(100);

    // Verify Afghanistan is highlighted
    const highlightedOption = page.locator('.combobox-option[data-combobox-navigate]');
    await expect(highlightedOption).toBeVisible();
    const highlightedValue = await highlightedOption.getAttribute('data-combobox-value');
    expect(highlightedValue).toBe('AF');

    // 3. Scroll the combobox one page down
    const scrollArea = page.locator('.scroll-viewport');
    await scrollArea.evaluate(el => {
      const pageSize = el.clientHeight * 0.8;
      el.scrollTo({ top: el.scrollTop + pageSize, behavior: 'instant' });
    });
    await page.waitForTimeout(200);

    // 4. Tab (should go to first group's expand/collapse button)
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    let focusedInfo = await getFocusedElementInfo();
    console.log('After first tab:', focusedInfo);

    // Should be on the first group's expand/collapse button
    expect(focusedInfo.tagName).toBe('BUTTON');
    expect(focusedInfo.title).toContain('Toggle group');

    // 5. Tab again (should go to first group's sort button)
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    focusedInfo = await getFocusedElementInfo();
    console.log('After second tab:', focusedInfo);

    // Expected: the sort button in the first group has focus
    expect(focusedInfo.tagName).toBe('BUTTON');
    expect(focusedInfo.title).toContain('sort order');

    // Verify it's in the first group (should be "By Name" group)
    expect(focusedInfo.groupInfo).toContain('By Name');

    console.log('SUCCESS: Sort button in first group has focus after hover, scroll, and two tabs');
  });
});
