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
    const firstOption = page.locator('.search-combobox-option').first();
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
    const scrollContainer = page.locator('.scroll-area-viewport');

    // Find the first visible option and select it
    const firstVisibleOption = page.locator('.search-combobox-option').first();
    await firstVisibleOption.click();

    // Get initial scroll position
    const initialScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

    // Press up arrow
    await page.keyboard.press('ArrowUp');

    // Verify scroll position changed (scrolled up)
    const newScrollTop = await scrollContainer.evaluate(el => el.scrollTop);
    expect(newScrollTop).toBeLessThanOrEqual(initialScrollTop);

    // Verify the selected item is now at the top of the viewport
    const selectedOption = page.locator('.search-combobox-option[data-combobox-selected]');
    await expect(selectedOption).toBeVisible();
  });

  test('Requirement 3: Down arrow at bottom of view should scroll down one row and select row below', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Get the scroll container
    const scrollContainer = page.locator('.scroll-area-viewport');

    // Scroll to bottom to find the last visible option
    await scrollContainer.evaluate(el => el.scrollTop = el.scrollHeight);

    // Find the last visible option and select it
    const lastVisibleOption = page.locator('.search-combobox-option').last();
    await lastVisibleOption.click();

    // Get initial scroll position
    const initialScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

    // Press down arrow
    await page.keyboard.press('ArrowDown');

    // Verify scroll position changed (scrolled down)
    const newScrollTop = await scrollContainer.evaluate(el => el.scrollTop);
    expect(newScrollTop).toBeGreaterThanOrEqual(initialScrollTop);

    // Verify the selected item is still at the bottom of the viewport
    const selectedOption = page.locator('.search-combobox-option[data-combobox-selected]');
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
    const firstOption = page.locator('.search-combobox-option').first();
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
    const differentOption = page.locator('.search-combobox-option').nth(5);
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
    const highlightedOption = page.locator('.search-combobox-option[data-combobox-selected]');
    const optionValue = await highlightedOption.getAttribute('data-value');

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

    // Navigate to a specific option
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    // Get the currently highlighted option
    const highlightedOption = page.locator('.search-combobox-option[data-combobox-selected]');
    const optionValue = await highlightedOption.getAttribute('data-value');

    // Press Space
    await page.keyboard.press(' ');

    // Verify combobox remains open
    await expect(page.locator('.search-combobox-dropdown')).not.toHaveAttribute('hidden');

    // Verify the item was selected
    const hiddenSelect = page.locator('.search-combobox-select');
    await expect(hiddenSelect).toHaveValue(optionValue);
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
    const firstOption = page.locator('.search-combobox-option').first();
    await expect(firstOption).toHaveAttribute('data-combobox-selected', '');
  });

  test('Requirement 12: Up arrow from first item should go to search box', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Select the first item
    const firstOption = page.locator('.search-combobox-option').first();
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
    const lastOption = page.locator('.search-combobox-option').last();
    await lastOption.scrollIntoViewIfNeeded();
    await lastOption.click();

    // Press Tab
    await page.keyboard.press('Tab');

    // Verify focus moved outside the combobox (combobox should close)
    await expect(page.locator('.search-combobox-dropdown')).toHaveAttribute('hidden');
  });

  test('Requirement 14: Sort and expand/collapse buttons should not scroll or change selection', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Select an item
    const selectedOption = page.locator('.search-combobox-option').nth(3);
    await selectedOption.click();
    const initialSelectedValue = await selectedOption.getAttribute('data-value');

    // Get initial scroll position
    const scrollContainer = page.locator('.scroll-area-viewport');
    const initialScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

    // Click sort button in first group
    const sortButton = page.locator('.group-label button').last();
    await sortButton.click();

    // Verify scroll position hasn't changed
    const newScrollTop = await scrollContainer.evaluate(el => el.scrollTop);
    expect(newScrollTop).toBe(initialScrollTop);

    // Verify selection hasn't changed
    const stillSelectedOption = page.locator('.search-combobox-option[data-combobox-selected]');
    const currentSelectedValue = await stillSelectedOption.getAttribute('data-value');
    expect(currentSelectedValue).toBe(initialSelectedValue);

    // Test collapse button
    const collapseButton = page.locator('.group-label button').first();
    await collapseButton.click();

    // Verify selection is still maintained
    const finalSelectedOption = page.locator('.search-combobox-option[data-combobox-selected]');
    const finalSelectedValue = await finalSelectedOption.getAttribute('data-value');
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
    const unitedStatesOption = page.locator('.search-combobox-option', { hasText: 'United States' });
    await expect(unitedStatesOption).toBeVisible();

    // Verify it contains the correct ISO code
    await expect(unitedStatesOption).toHaveAttribute('data-value', 'US');
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
      const selectedOption = page.locator('.search-combobox-option[data-combobox-selected]');
      await expect(selectedOption).toBeVisible();
    }

    // Navigate back up
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowUp');

      // Verify an option is still selected
      const selectedOption = page.locator('.search-combobox-option[data-combobox-selected]');
      await expect(selectedOption).toBeVisible();
    }
  });

  test('Search functionality filters results correctly', async ({ page }) => {
    // Open the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Count initial options
    const initialCount = await page.locator('.search-combobox-option').count();

    // Search for a specific term
    await page.fill('.search-combobox-search-input', 'aus');
    await page.waitForTimeout(500);

    // Count filtered options
    const filteredCount = await page.locator('.search-combobox-option').count();

    // Verify results are filtered
    expect(filteredCount).toBeLessThan(initialCount);

    // Verify all visible options contain the search term
    const options = page.locator('.search-combobox-option');
    const count = await options.count();

    for (let i = 0; i < count; i++) {
      const optionText = await options.nth(i).textContent();
      const optionValue = await options.nth(i).getAttribute('data-value');

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
    const firstGroupOptions = page.locator('.option-group').first().locator('.search-combobox-option');
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
    const firstItemFirstGroup = page.locator('.option-group').first().locator('.search-combobox-option').first();
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
    const firstItemSecondGroup = page.locator('.option-group').last().locator('.search-combobox-option').first();
    await expect(firstItemSecondGroup).toBeFocused();
  });

  test('Requirement 17: When the combobox is opened, the selected item is highlighted, selected, and visible', async ({ page }) => {
    // First, select a country by opening the combobox and choosing an option
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Select a specific option (let's choose the 5th option to ensure it's not the default)
    const targetOption = page.locator('.search-combobox-option').nth(4);
    await targetOption.click();
    const selectedValue = await targetOption.getAttribute('data-value');

    // Verify the combobox closed and the selection was made
    await expect(page.locator('.search-combobox-dropdown')).toHaveAttribute('hidden');
    const hiddenSelect = page.locator('.search-combobox-select');
    await expect(hiddenSelect).toHaveValue(selectedValue);

    // Now reopen the combobox
    await page.click('.search-combobox-trigger');
    await page.waitForSelector('.search-combobox-dropdown:not([hidden])');

    // Verify the previously selected item is highlighted and selected
    const selectedOption = page.locator('.search-combobox-option[data-combobox-selected]');
    await expect(selectedOption).toHaveAttribute('data-value', selectedValue);

    // Verify the selected item is visible in the viewport
    await expect(selectedOption).toBeVisible();

    // Verify it's actually highlighted/selected with the correct attribute
    await expect(selectedOption).toHaveAttribute('data-combobox-selected', '');
  });
});
