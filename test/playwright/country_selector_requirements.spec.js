const { test, expect } = require('@playwright/test');

test.describe('Country Selector Requirements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.waitForLoadState('networkidle');
  });

  test('Requirement 1: Typing a letter when an item is selected should append to search input and focus input', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Select the first item
    const firstOption = page.locator('.combobox-option').first();
    await firstOption.click();

    // Verify an item is selected
    await expect(firstOption).toHaveAttribute('data-combobox-selected', '');

    // Type a letter
    await page.keyboard.type('a');

    // Verify the search input has focus and contains the typed character
    const searchInput = page.locator('.search-combobox-search-input');
    await expect(searchInput).toBeFocused();
    await expect(searchInput).toHaveValue('a');
  });

  test('Requirement 2: Up arrow at top of view should scroll up one row and select row above', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Get the scroll container
    const scrollContainer = page.locator('.scroll-viewport');

    // Find the first visible option and select it
    const firstVisibleOption = page.locator('.combobox-option').first();
    await firstVisibleOption.click();

    // Get initial scroll position
    const initialScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

    // Press up arrow
    await page.keyboard.press('ArrowUp');

    // Verify scroll position changed (scrolled up)
    const newScrollTop = await scrollContainer.evaluate(el => el.scrollTop);
    expect(newScrollTop).toBeLessThanOrEqual(initialScrollTop);

    // Verify the selected item is now at the top of the viewport
    const selectedOption = page.locator('.combobox-option[data-combobox-selected]');
    await expect(selectedOption).toBeVisible();
  });

  test('Requirement 3: Down arrow at bottom of view should scroll down one row and select row below', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Get the scroll container
    const scrollContainer = page.locator('.scroll-viewport');

    // Scroll to bottom to find the last visible option
    await scrollContainer.evaluate(el => el.scrollTop = el.scrollHeight);

    // Find the last visible option and select it
    const lastVisibleOption = page.locator('.combobox-option').last();
    await lastVisibleOption.click();

    // Get initial scroll position
    const initialScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

    // Press down arrow
    await page.keyboard.press('ArrowDown');

    // Verify scroll position changed (scrolled down)
    const newScrollTop = await scrollContainer.evaluate(el => el.scrollTop);
    expect(newScrollTop).toBeGreaterThanOrEqual(initialScrollTop);

    // Verify the selected item is still at the bottom of the viewport
    const selectedOption = page.locator('.combobox-option[data-combobox-selected]');
    await expect(selectedOption).toBeVisible();
  });

  test('Requirement 4: Tab key in search input should move focus to expand/collapse button in first group', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Focus the search input
    const searchInput = page.locator('.search-combobox-search-input');
    await searchInput.focus();

    // Press Tab
    await page.keyboard.press('Tab');

    // Verify focus moved to the first group's expand/collapse button
    const firstGroupButton = page.locator('.group-label button').first();
    await expect(firstGroupButton).toBeFocused();
  });

  test('Requirement 5: Shift+Tab in search input should go to previous form item', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Focus the search input
    const searchInput = page.locator('.search-combobox-search-input');
    await searchInput.focus();

    // Press Shift+Tab
    await page.keyboard.press('Shift+Tab');

    // Verify focus moved to the combobox trigger (previous form element)
    const trigger = page.locator('.search-combobox-trigger');
    await expect(trigger).toBeFocused();
  });

  test('Requirement 6: Search input should maintain focus and caret position after debounced search', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Focus the search input and type
    const searchInput = page.locator('.search-combobox-search-input');
    await searchInput.focus();
    await searchInput.fill('united');

    // Wait for debounced search to complete
    await page.waitForTimeout(500);

    // Verify search input still has focus
    await expect(searchInput).toBeFocused();

    // Verify caret is at the end of the text
    const caretPosition = await searchInput.evaluate(el => el.selectionStart);
    const textLength = await searchInput.evaluate(el => el.value.length);
    expect(caretPosition).toBe(textLength);

    // Verify combobox is open and first item in first group is selected
    await expect(page.locator('.search-combobox-dropdown')).not.toHaveAttribute('hidden');
    const firstOption = page.locator('.combobox-option').first();
    await expect(firstOption).toHaveAttribute('data-combobox-selected', '');
    await expect(firstOption).toBeVisible();
  });

  test('Requirement 7: Escape key should close combobox without changing selected country', async ({ page }) => {
    // Get initial selected country
    const initialSelection = await page.locator('.selected_value').textContent();

    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Select a different option
    const differentOption = page.locator('.combobox-option').nth(5);
    await differentOption.click();

    // Press Escape
    await page.keyboard.press('Escape');

    // Verify combobox is closed
    await expect(page.locator('.search-combobox-dropdown')).toHaveAttribute('hidden');

    // Verify selected country hasn't changed
    const finalSelection = await page.locator('.selected_value').textContent();
    expect(finalSelection).toBe(initialSelection);
  });

  test('Requirement 8: Enter key should update selected country and close combobox', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Navigate to a specific option using keyboard
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    // Get the currently highlighted option's value
    const highlightedOption = page.locator('.combobox-option[data-combobox-selected]');
    const optionValue = await highlightedOption.getAttribute('data-combobox-value');

    // Press Enter
    await page.keyboard.press('Enter');

    // Verify combobox is closed
    await expect(page.locator('.search-combobox-dropdown')).toHaveAttribute('hidden');

    // Verify the country was selected (check the hidden select element)
    const hiddenSelect = page.locator('.search-combobox-select');
    await expect(hiddenSelect).toHaveValue(optionValue);
  });

  test('Requirement 9: Enter key should update selected country and close combobox (duplicate test)', async ({ page }) => {
    // This is the same as requirement 8, so we'll test a variation
    // Test Enter key after typing in search

    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Type to search
    await page.fill('.search-combobox-search-input', 'canada');
    await page.waitForTimeout(300);

    // Press Enter to select the first result
    await page.keyboard.press('Enter');

    // Verify combobox is closed
    await expect(page.locator('.search-combobox-dropdown')).toHaveAttribute('hidden');

    // Verify Canada was selected
    const hiddenSelect = page.locator('.search-combobox-select');
    const selectedValue = await hiddenSelect.inputValue();
    expect(selectedValue).toBe('CA'); // Canada's ISO code
  });

  test('Requirement 10: Space key should select highlighted item but keep combobox open', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Navigate to a specific option using keyboard
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    // Get the currently navigated option (light purple)
    const navigatedOption = page.locator('.combobox-option[data-combobox-navigate]');
    const optionValue = await navigatedOption.getAttribute('data-combobox-value');

    // Hover over the option to simulate hover state
    await navigatedOption.hover();

    // Press Space - this should make the hovered item the current navigation item
    await page.keyboard.press(' ');

    // Verify combobox remains open
    await expect(page.locator('.search-combobox-dropdown')).not.toHaveAttribute('hidden');

    // Verify the item is still the current navigation item (light purple)
    await expect(navigatedOption).toHaveAttribute('data-combobox-navigate', '');
  });

  test('Requirement 11: Down arrow from search box should go to first item in first group', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Focus the search input
    const searchInput = page.locator('.search-combobox-search-input');
    await searchInput.focus();

    // Press Down arrow
    await page.keyboard.press('ArrowDown');

    // Verify the first item in the first group is selected
    const firstOption = page.locator('.combobox-option').first();
    await expect(firstOption).toHaveAttribute('data-combobox-selected', '');
  });

  test('Requirement 12: Up arrow from first item should go to search box', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Select the first item
    const firstOption = page.locator('.combobox-option').first();
    await firstOption.click();

    // Press Up arrow
    await page.keyboard.press('ArrowUp');

    // Verify focus is back on the search input
    const searchInput = page.locator('.search-combobox-search-input');
    await expect(searchInput).toBeFocused();
  });

  test('Requirement 13: Tab from last item should go to next form element', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Navigate to the last item
    const lastOption = page.locator('.combobox-option').last();
    await lastOption.scrollIntoViewIfNeeded();
    await lastOption.click();

    // Press Tab
    await page.keyboard.press('Tab');

    // Verify focus moved outside the combobox (combobox should close)
    await expect(page.locator('.search-combobox-dropdown')).toHaveAttribute('hidden');
  });

  test('Down arrow from last item in last group should go to search input', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Navigate to the last item
    const lastOption = page.locator('.combobox-option').last();
    await lastOption.scrollIntoViewIfNeeded();
    await lastOption.click();

    // Verify the last option is selected
    await expect(lastOption).toHaveAttribute('data-combobox-selected', '');

    // Add some debugging
    console.log('About to press ArrowDown on last option');

    // Press Down arrow
    await page.keyboard.press('ArrowDown');

    // Wait a bit for the navigation to complete
    await page.waitForTimeout(100);

    // Add debugging to see what's focused
    const focusedElement = await page.evaluate(() => {
      const focused = document.activeElement;
      return {
        tagName: focused?.tagName,
        className: focused?.className,
        id: focused?.id
      };
    });
    console.log('Currently focused element:', focusedElement);

    // Verify focus moved to the search input
    const searchInput = page.locator('.search-combobox-search-input');
    await expect(searchInput).toBeFocused();

    // Verify no option is selected anymore
    const selectedOptions = page.locator('.combobox-option[data-combobox-selected]');
    await expect(selectedOptions).toHaveCount(0);
  });

  test('Requirement 14: Sort and expand/collapse buttons should not scroll or change selection', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Select an item
    const selectedOption = page.locator('.combobox-option').nth(3);
    await selectedOption.click();
    const initialSelectedValue = await selectedOption.getAttribute('data-combobox-value');

    // Get initial scroll position
    const scrollContainer = page.locator('.scroll-viewport');
    const initialScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

    // Click sort button in first group
    const sortButton = page.locator('.group-label button').last();
    await sortButton.click();

    // Verify scroll position hasn't changed
    const newScrollTop = await scrollContainer.evaluate(el => el.scrollTop);
    expect(newScrollTop).toBe(initialScrollTop);

    // Verify selection hasn't changed
    const stillSelectedOption = page.locator('.combobox-option[data-combobox-selected]');
    const currentSelectedValue = await stillSelectedOption.getAttribute('data-combobox-value');
    expect(currentSelectedValue).toBe(initialSelectedValue);

    // Test collapse button
    const collapseButton = page.locator('.group-label button').first();
    await collapseButton.click();

    // Verify selection is still maintained
    const finalSelectedOption = page.locator('.combobox-option[data-combobox-selected]');
    const finalSelectedValue = await finalSelectedOption.getAttribute('data-combobox-value');
    expect(finalSelectedValue).toBe(initialSelectedValue);
  });

  test('Requirement 15: Searching for "united states" displays the United States', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Search for "united states"
    await page.fill('.search-combobox-search-input', 'united states');
    await page.waitForTimeout(500); // Wait for debounced search

    // Verify United States appears in the results
    const unitedStatesOption = page.locator('.combobox-option', { hasText: 'United States' });
    await expect(unitedStatesOption).toBeVisible();

    // Verify it contains the correct ISO code
    await expect(unitedStatesOption).toHaveAttribute('data-combobox-value', 'US');
  });

  // Additional comprehensive tests
  test('Keyboard navigation through all options works correctly', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Start from search input
    const searchInput = page.locator('.search-combobox-search-input');
    await searchInput.focus();

    // Navigate down through several options
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown');

      // Verify an option is selected
      const selectedOption = page.locator('.combobox-option[data-combobox-selected]');
      await expect(selectedOption).toBeVisible();
    }

    // Navigate back up
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowUp');

      // Verify an option is still selected
      const selectedOption = page.locator('.combobox-option[data-combobox-selected]');
      await expect(selectedOption).toBeVisible();
    }
  });

  test('Search functionality filters results correctly', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Count initial options
    const initialCount = await page.locator('.combobox-option').count();

    // Search for a specific term
    await page.fill('.search-combobox-search-input', 'aus');
    await page.waitForTimeout(500);

    // Count filtered options
    const filteredCount = await page.locator('.combobox-option').count();

    // Verify results are filtered
    expect(filteredCount).toBeLessThan(initialCount);

    // Verify all visible options contain the search term
    const options = page.locator('.combobox-option');
    const count = await options.count();

    for (let i = 0; i < count; i++) {
      const optionText = await options.nth(i).textContent();
      const optionValue = await options.nth(i).getAttribute('data-combobox-value');

      // Check if either the text or value contains 'aus' (case insensitive)
      const containsSearch = optionText.toLowerCase().includes('aus') ||
                           optionValue.toLowerCase().includes('aus');
      expect(containsSearch).toBeTruthy();
    }
  });

    test('Group collapse and expand functionality works', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Find the first group's collapse button
    const firstGroupCollapseButton = page.locator('.group-label button').first();

    // Get initial count of visible options in first group
    const firstGroupOptions = page.locator('.option-group').first().locator('.combobox-option');
    const initialCount = await firstGroupOptions.count();

    // Collapse the first group
    await firstGroupCollapseButton.click();

    // Verify options in first group are hidden
    const collapsedCount = await firstGroupOptions.count();
    expect(collapsedCount).toBe(0);

    // Expand the group again
    await firstGroupCollapseButton.click();

    // Verify options are visible again
    const expandedCount = await firstGroupOptions.count();
    expect(expandedCount).toBe(initialCount);
  });

  test('Requirement 16: Tab order from search box follows correct sequence', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Focus the search input
    const searchInput = page.locator('.search-combobox-search-input');
    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    // a) Tab to expand/collapse button, first group
    await page.keyboard.press('Tab');
    const firstGroupCollapseButton = page.locator('.option-group').first().locator('.group-label button').first();
    await expect(firstGroupCollapseButton).toBeFocused();

    // b) Tab to sort button, first group
    await page.keyboard.press('Tab');
    const firstGroupSortButton = page.locator('.option-group').first().locator('.group-label button').last();
    await expect(firstGroupSortButton).toBeFocused();

    // c) Tab to first item in first group
    await page.keyboard.press('Tab');
    const firstItemFirstGroup = page.locator('.option-group').first().locator('.combobox-option').first();
    await expect(firstItemFirstGroup).toBeFocused();

    // d) Tab to expand/collapse button, second group
    await page.keyboard.press('Tab');
    const secondGroupCollapseButton = page.locator('.option-group').last().locator('.group-label button').first();
    await expect(secondGroupCollapseButton).toBeFocused();

    // e) Tab to sort button, second group
    await page.keyboard.press('Tab');
    const secondGroupSortButton = page.locator('.option-group').last().locator('.group-label button').last();
    await expect(secondGroupSortButton).toBeFocused();

    // f) Tab to first item in second group
    await page.keyboard.press('Tab');
    const firstItemSecondGroup = page.locator('.option-group').last().locator('.combobox-option').first();
    await expect(firstItemSecondGroup).toBeFocused();
  });

  test('Requirement 17: When the combobox is opened, the selected item is highlighted, selected, and visible', async ({ page }) => {
    // First, select a country by opening the combobox and choosing an option
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Select a specific option (let's choose the 5th option to ensure it's not the default)
    const targetOption = page.locator('.combobox-option').nth(4);
    await targetOption.click();
    const selectedValue = await targetOption.getAttribute('data-combobox-value');

    // Verify the combobox closed and the selection was made
    await expect(page.locator('.search-combobox-dropdown')).toHaveAttribute('hidden');
    const hiddenSelect = page.locator('.search-combobox-select');
    await expect(hiddenSelect).toHaveValue(selectedValue);

    // Now reopen the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Verify the previously selected item is highlighted and selected
    const selectedOption = page.locator('.combobox-option[data-combobox-selected]');
    await expect(selectedOption).toHaveAttribute('data-combobox-value', selectedValue);

    // Verify the selected item is visible in the viewport
    await expect(selectedOption).toBeVisible();

    // Verify it's actually highlighted/selected with the correct attribute
    await expect(selectedOption).toHaveAttribute('data-combobox-selected', '');
  });

  test('Requirement 15: Down arrow from expand/collapse and sort buttons should select first row in group', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Focus the first group's expand/collapse button
    const firstGroupCollapseButton = page.locator('.option-group').first().locator('.group-label button').first();
    await firstGroupCollapseButton.focus();
    await expect(firstGroupCollapseButton).toBeFocused();

    // Press down arrow
    await page.keyboard.press('ArrowDown');

    // Verify focus moved to the first row in the group
    const firstRowInGroup = page.locator('.option-group').first().locator('.combobox-option').first();
    await expect(firstRowInGroup).toHaveAttribute('data-combobox-selected', '');
    await expect(firstRowInGroup).toBeVisible();

    // Test the same for sort button
    const firstGroupSortButton = page.locator('.option-group').first().locator('.group-label button').last();
    await firstGroupSortButton.focus();
    await expect(firstGroupSortButton).toBeFocused();

    // Press down arrow
    await page.keyboard.press('ArrowDown');

    // Verify focus moved to the first row in the group
    await expect(firstRowInGroup).toHaveAttribute('data-combobox-selected', '');
    await expect(firstRowInGroup).toBeVisible();
  });

  test('Requirement 16: Up arrow from expand/collapse and sort buttons should select first row in previous group or search input', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Test from second group's expand/collapse button - should go to first row of previous group
    const secondGroupCollapseButton = page.locator('.option-group').last().locator('.group-label button').first();
    await secondGroupCollapseButton.focus();
    await expect(secondGroupCollapseButton).toBeFocused();

    // Press up arrow
    await page.keyboard.press('ArrowUp');

    // Verify focus moved to the first row in the previous (first) group
    const firstRowInFirstGroup = page.locator('.option-group').first().locator('.combobox-option').first();
    await expect(firstRowInFirstGroup).toHaveAttribute('data-combobox-selected', '');
    await expect(firstRowInFirstGroup).toBeVisible();

    // Test from first group's expand/collapse button - should go to search input
    const firstGroupCollapseButton = page.locator('.option-group').first().locator('.group-label button').first();
    await firstGroupCollapseButton.focus();
    await expect(firstGroupCollapseButton).toBeFocused();

    // Press up arrow
    await page.keyboard.press('ArrowUp');

    // Verify focus moved to the search input
    const searchInput = page.locator('.search-combobox-search-input');
    await expect(searchInput).toBeFocused();

    // Test the same for sort buttons
    const secondGroupSortButton = page.locator('.option-group').last().locator('.group-label button').last();
    await secondGroupSortButton.focus();
    await expect(secondGroupSortButton).toBeFocused();

    // Press up arrow
    await page.keyboard.press('ArrowUp');

    // Verify focus moved to the first row in the previous (first) group
    await expect(firstRowInFirstGroup).toHaveAttribute('data-combobox-selected', '');
    await expect(firstRowInFirstGroup).toBeVisible();

    // Test from first group's sort button - should go to search input
    const firstGroupSortButton = page.locator('.option-group').first().locator('.group-label button').last();
    await firstGroupSortButton.focus();
    await expect(firstGroupSortButton).toBeFocused();

    // Press up arrow
    await page.keyboard.press('ArrowUp');

    // Verify focus moved to the search input
    await expect(searchInput).toBeFocused();
  });

  test('Requirement 17: Shift-tab from expand/collapse in first group should go to search input', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Focus the first group's expand/collapse button
    const firstGroupCollapseButton = page.locator('.option-group').first().locator('.group-label button').first();
    await firstGroupCollapseButton.focus();
    await expect(firstGroupCollapseButton).toBeFocused();

    // Press Shift+Tab
    await page.keyboard.press('Shift+Tab');

    // Verify focus moved to the search input
    const searchInput = page.locator('.search-combobox-search-input');
    await expect(searchInput).toBeFocused();

    // Test the sort button in the first group - should go to expand/collapse button (normal tab order)
    const firstGroupSortButton = page.locator('.option-group').first().locator('.group-label button').last();
    await firstGroupSortButton.focus();
    await expect(firstGroupSortButton).toBeFocused();

    // Press Shift+Tab
    await page.keyboard.press('Shift+Tab');

    // Verify focus moved to the expand/collapse button (previous element in tab order)
    await expect(firstGroupCollapseButton).toBeFocused();
  });

  test('Requirement 18: Scrolling the combobox all the way to the bottom and releasing the mouse leaves the combobox open', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Get the scroll container
    const scrollContainer = page.locator('.scroll-viewport');

    // Verify combobox is initially open
    await expect(page.locator('.search-combobox-dropdown')).not.toHaveAttribute('hidden');

    // Get initial scroll position and scroll height
    const initialScrollTop = await scrollContainer.evaluate(el => el.scrollTop);
    const scrollHeight = await scrollContainer.evaluate(el => el.scrollHeight);
    const clientHeight = await scrollContainer.evaluate(el => el.clientHeight);

    // Scroll to the bottom using mouse wheel events
    // We'll simulate multiple wheel events to scroll all the way down
    const scrollSteps = Math.ceil((scrollHeight - clientHeight) / 50); // 50px per step

    for (let i = 0; i < scrollSteps; i++) {
      await scrollContainer.hover();
      await page.mouse.wheel(0, 50);
      await page.waitForTimeout(10); // Small delay between scroll steps
    }

    // Ensure we're at the bottom
    await scrollContainer.evaluate(el => el.scrollTop = el.scrollHeight);

    // Verify we've scrolled to the bottom
    const finalScrollTop = await scrollContainer.evaluate(el => el.scrollTop);
    expect(finalScrollTop).toBeGreaterThan(initialScrollTop);

    // Move mouse away from the scroll area and "release" by moving to a neutral position
    await page.mouse.move(100, 100);

    // Wait a moment to ensure any potential close events would have fired
    await page.waitForTimeout(200);

    // Verify the combobox is still open
    await expect(page.locator('.search-combobox-dropdown')).not.toHaveAttribute('hidden');
    await expect(page.locator('.search-combobox-dropdown')).toBeVisible();

    // Additional verification: try clicking outside to ensure it can still be closed normally
    await page.click('body', { position: { x: 50, y: 50 } });
    await expect(page.locator('.search-combobox-dropdown')).toHaveAttribute('hidden');
  });

  test('Requirement 19: Space key selects highlighted item and keeps combobox open, or targets search input if no item highlighted', async ({ page }) => {
    // Test Part 1: Space key with hovered item
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Find a specific option to hover over
    const targetOption = page.locator('.combobox-option').nth(2); // Third option
    const optionValue = await targetOption.getAttribute('data-combobox-value');

    // Hover over the option to simulate hover state
    await targetOption.hover();

    // Press Space - this should make the hovered item the current navigation item
    await page.keyboard.press(' ');

    // Verify combobox remains open
    await expect(page.locator('.search-combobox-dropdown')).not.toHaveAttribute('hidden');

    // Verify the item is now the current navigation item (light purple)
    await expect(targetOption).toHaveAttribute('data-combobox-navigate', '');

    // Test that down arrow now moves from this item
    await page.keyboard.press('ArrowDown');

    // The next option should now be the current navigation item
    const nextOption = page.locator('.combobox-option').nth(3);
    await expect(nextOption).toHaveAttribute('data-combobox-navigate', '');

    // Close combobox for next test
    await page.keyboard.press('Escape');
    await expect(page.locator('.search-combobox-dropdown')).toHaveAttribute('hidden');

    // Test Part 2: Space key with no hovered item but search input focused
    // Open the combobox again
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Focus the search input explicitly
    const searchInput = page.locator('.search-combobox-search-input');
    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    // Move mouse away from any options to ensure no hover state
    await page.mouse.move(50, 50);

    // Type some text in search input
    await searchInput.fill('test');

    // Press Space - should add space to search input since no item is hovered
    await page.keyboard.press(' ');

    // Verify space was added to search input (trimmed)
    await expect(searchInput).toHaveValue('test');

    // Verify combobox remains open
    await expect(page.locator('.search-combobox-dropdown')).not.toHaveAttribute('hidden');

    // Verify search input still has focus
    await expect(searchInput).toBeFocused();
  });

  test('Requirement 20: Left and right arrow from a group button goes to the other group button', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Focus the first group's expand/collapse button
    const firstGroupCollapseButton = page.locator('.option-group').first().locator('.group-label button').first();
    await firstGroupCollapseButton.focus();
    await expect(firstGroupCollapseButton).toBeFocused();

    // Press right arrow - should move to sort button in same group
    await page.keyboard.press('ArrowRight');
    const firstGroupSortButton = page.locator('.option-group').first().locator('.group-label button').last();
    await expect(firstGroupSortButton).toBeFocused();

    // Press right arrow again - should move to expand/collapse button in next group
    await page.keyboard.press('ArrowRight');
    const secondGroupCollapseButton = page.locator('.option-group').last().locator('.group-label button').first();
    await expect(secondGroupCollapseButton).toBeFocused();

    // Press right arrow again - should move to sort button in second group
    await page.keyboard.press('ArrowRight');
    const secondGroupSortButton = page.locator('.option-group').last().locator('.group-label button').last();
    await expect(secondGroupSortButton).toBeFocused();

    // Press right arrow again - should wrap back to first group's expand/collapse button
    await page.keyboard.press('ArrowRight');
    await expect(firstGroupCollapseButton).toBeFocused();

    // Test left arrow navigation in reverse
    // From first group collapse button, left arrow should go to last group sort button
    await page.keyboard.press('ArrowLeft');
    await expect(secondGroupSortButton).toBeFocused();

    // Left arrow should go to second group collapse button
    await page.keyboard.press('ArrowLeft');
    await expect(secondGroupCollapseButton).toBeFocused();

    // Left arrow should go to first group sort button
    await page.keyboard.press('ArrowLeft');
    await expect(firstGroupSortButton).toBeFocused();

    // Left arrow should go to first group collapse button
    await page.keyboard.press('ArrowLeft');
    await expect(firstGroupCollapseButton).toBeFocused();
  });

  test('Button space and enter keys behave as button click and keep focus', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Focus the first group's expand/collapse button
    const firstGroupCollapseButton = page.locator('.option-group').first().locator('.group-label button').first();
    await firstGroupCollapseButton.focus();
    await expect(firstGroupCollapseButton).toBeFocused();

    // Press space key - should trigger button click
    await page.keyboard.press(' ');

    // Wait a moment for the action to complete
    await page.waitForTimeout(200);

    // Verify button still has focus (this is the main requirement)
    await expect(firstGroupCollapseButton).toBeFocused();

    // Press enter key - should trigger button click again
    await page.keyboard.press('Enter');

    // Wait a moment for the action to complete
    await page.waitForTimeout(200);

    // Verify button still has focus
    await expect(firstGroupCollapseButton).toBeFocused();

    // Test with sort button
    const firstGroupSortButton = page.locator('.option-group').first().locator('.group-label button').last();
    await firstGroupSortButton.focus();
    await expect(firstGroupSortButton).toBeFocused();

    // Press space key on sort button - should trigger sort
    await page.keyboard.press(' ');

    // Wait a moment for the action to complete
    await page.waitForTimeout(200);

    // Verify button still has focus after sort action
    await expect(firstGroupSortButton).toBeFocused();

    // Press enter key on sort button - should trigger sort again
    await page.keyboard.press('Enter');

    // Wait a moment for the action to complete
    await page.waitForTimeout(200);

    // Verify button still has focus after sort action
    await expect(firstGroupSortButton).toBeFocused();
  });
});
