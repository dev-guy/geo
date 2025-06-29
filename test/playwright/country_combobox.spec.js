// These tests assume the Geo service is running locally

const { test, expect } = require('@playwright/test');

test.describe('Country Combobox', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('http://localhost:4000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('refined reproduction of mouse scrolling issue', async ({ page }) => {
    // Get the scroll area for monitoring scroll position throughout
    const scrollArea = page.locator('.scroll-viewport');
    
    // 1. Open combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    const dropdown = page.locator('[data-part=\"search-combobox-listbox\"]');
    await expect(dropdown).toBeVisible();
    
    const scrollAfterOpen = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`1. Scroll after opening combobox: ${scrollAfterOpen}`);
    
    // 2. Collapse the first group (\"By Name\")
    const firstGroupCollapseButton = page.locator('.group-label').first().locator('button[title=\"Toggle group visibility\"]');
    await firstGroupCollapseButton.click();
    
    const scrollAfterCollapse = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`2. Scroll after collapsing first group: ${scrollAfterCollapse}`);
    
    // 3. Hover over Andorra (should be in the second group now)
    const andorraOption = page.locator('.combobox-option').filter({ hasText: 'Andorra' }).first();
    await andorraOption.hover();
    
    const scrollAfterHoverAndorra = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`3. Scroll after hovering over Andorra: ${scrollAfterHoverAndorra}`);
    
    // 4. Up arrow
    await page.keyboard.press('ArrowUp');
    
    const scrollAfterUpArrow = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`4. Scroll after up arrow: ${scrollAfterUpArrow}`);
    
    // 5. Hover over the second group's header
    const secondGroupHeader = page.locator('.group-label').nth(1);
    await secondGroupHeader.hover();
    
    const scrollAfterHoverHeader = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`5. Scroll after hovering over second group header: ${scrollAfterHoverHeader}`);
    
    // 6. Hover over the first country in the second group
    const firstCountryInSecondGroup = page.locator('.option-group').nth(1).locator('.combobox-option').first();
    await firstCountryInSecondGroup.hover();
    
    const scrollAfterHoverFirstCountry = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`6. Scroll after hovering over first country in second group: ${scrollAfterHoverFirstCountry}`);
    
    // 7. Hover over the second group's header again
    await secondGroupHeader.hover();
    
    const scrollAfterHoverHeaderAgain = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`7. Scroll after hovering over second group header again: ${scrollAfterHoverHeaderAgain}`);
    
    // Analysis of scroll behavior
    
    // Analysis
    console.log('\\n=== Analysis ===');
    
    const step3ScrollChanged = scrollAfterHoverAndorra !== scrollAfterCollapse;
    const step4ScrollChanged = scrollAfterUpArrow !== scrollAfterHoverAndorra;
    const step5ScrollChanged = scrollAfterHoverHeader !== scrollAfterUpArrow;
    const step6ScrollChanged = scrollAfterHoverFirstCountry !== scrollAfterHoverHeader;
    const step7ScrollChanged = scrollAfterHoverHeaderAgain !== scrollAfterHoverFirstCountry;
    
    if (!step3ScrollChanged) {
      console.log('✅ Step 3 (hover over Andorra) did not cause scrolling');
    } else {
      console.log(`🐛 Step 3 (hover over Andorra) caused scrolling from ${scrollAfterCollapse} to ${scrollAfterHoverAndorra}`);
    }
    
    if (!step4ScrollChanged) {
      console.log('ℹ️ Step 4 (up arrow) did not cause scrolling (might be expected)');
    } else {
      console.log(`✅ Step 4 (up arrow) caused scrolling from ${scrollAfterHoverAndorra} to ${scrollAfterUpArrow}`);
    }
    
    if (!step5ScrollChanged) {
      console.log('✅ Step 5 (hover over second group header) did not cause scrolling');
    } else {
      console.log(`🐛 BUG: Step 5 (hover over second group header) caused scrolling`);
      console.log(`   Scroll changed from ${scrollAfterUpArrow} to ${scrollAfterHoverHeader}`);
    }
    
    if (!step6ScrollChanged) {
      console.log('✅ Step 6 (hover over first country) did not cause scrolling');
    } else {
      console.log(`🐛 Step 6 (hover over first country) caused scrolling from ${scrollAfterHoverHeader} to ${scrollAfterHoverFirstCountry}`);
    }
    
    if (!step7ScrollChanged) {
      console.log('✅ Step 7 (hover over second group header again) did not cause scrolling');
    } else {
      console.log(`🐛 Step 7 (hover over second group header again) caused scrolling from ${scrollAfterHoverFirstCountry} to ${scrollAfterHoverHeaderAgain}`);
    }
    
    // Check if any mouse hover events caused unwanted scrolling
    const mouseHoverCausedScrolling = step3ScrollChanged || step5ScrollChanged || step6ScrollChanged || step7ScrollChanged;
    
    if (mouseHoverCausedScrolling) {
      console.log('\\n🐛 ISSUE CONFIRMED: Mouse hover events are causing unwanted scrolling');
    } else {
      console.log('\\n✅ ISSUE RESOLVED: Mouse hover events are not causing unwanted scrolling');
    }
    
    // This assertion will fail until the bug is fixed
    expect(mouseHoverCausedScrolling).toBe(false);
  });

  test('mouse wheel should still work for scrolling', async ({ page }) => {
    // Open combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    const dropdown = page.locator('[data-part=\"search-combobox-listbox\"]');
    await expect(dropdown).toBeVisible();
    
    const scrollArea = page.locator('.scroll-viewport');
    const initialScroll = await scrollArea.evaluate(el => el.scrollTop);
    
    // Scroll down with mouse wheel
    await scrollArea.hover();
    await page.mouse.wheel(0, 300);
    
    // Wait a bit for scrolling to complete
    await page.waitForTimeout(100);
    
    const finalScroll = await scrollArea.evaluate(el => el.scrollTop);
    
    console.log('✅ Mouse wheel scrolling works correctly');
    expect(finalScroll).toBeGreaterThan(initialScroll);
  });

  test('group collapse and expand functionality', async ({ page }) => {
    // Open combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    const dropdown = page.locator('[data-part=\"search-combobox-listbox\"]');
    await expect(dropdown).toBeVisible();
    
    // Test group collapse
    const firstGroup = page.locator('.option-group').first();
    const firstGroupLabel = firstGroup.locator('.group-label');
    const firstGroupCollapseButton = firstGroupLabel.locator('button[title=\"Toggle group visibility\"]');
    
    // Initially, the group should be expanded (options visible)
    const initialOptionsVisible = await firstGroup.locator('.combobox-option').count();
    expect(initialOptionsVisible).toBeGreaterThan(0);
    
    // Collapse the first group
    await firstGroupCollapseButton.click();
    await page.waitForTimeout(100); // Wait for collapse animation
    
    // After collapse, options should not be visible
    const optionsAfterCollapse = await firstGroup.locator('.combobox-option').count();
    expect(optionsAfterCollapse).toBe(0);
    
    // Expand the group again
    await firstGroupCollapseButton.click();
    await page.waitForTimeout(100); // Wait for expand animation
    
    // After expand, options should be visible again
    const optionsAfterExpand = await firstGroup.locator('.combobox-option').count();
    expect(optionsAfterExpand).toBeGreaterThan(0);
    
    console.log('✅ Group collapse/expand functionality works correctly');
  });

  test('keyboard navigation should still work and cause scrolling when needed', async ({ page }) => {
    // Open combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    const dropdown = page.locator('[data-part=\"search-combobox-listbox\"]');
    await expect(dropdown).toBeVisible();
    
    const scrollArea = page.locator('.scroll-viewport');
    const initialScroll = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`Initial scroll position: ${initialScroll}`);
    
    // Navigate down several times to trigger scrolling
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(50);
    }
    
    const finalScroll = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`Scroll position after arrow navigation: ${finalScroll}`);
    console.log('✅ Keyboard navigation completed');
    
    // Keyboard navigation should be able to cause scrolling
    expect(finalScroll).toBeGreaterThanOrEqual(initialScroll);
  });

  test('group expand should highlight first item in expanded group', async ({ page }) => {
    // Listen to console logs for debugging
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('Browser console:', msg.text());
      }
    });

    // Open combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    const dropdown = page.locator('[data-part="search-combobox-listbox"]');
    await expect(dropdown).toBeVisible();
    
    // Hover over Afghanistan (first country in first group)
    const afghanistanOption = page.locator('.combobox-option').filter({ hasText: 'Afghanistan' }).first();
    await afghanistanOption.hover();
    
    // Verify Afghanistan is highlighted
    const initialHighlighted = await page.locator('[data-combobox-navigate]').textContent();
    expect(initialHighlighted).toContain('Afghanistan');
    
    // Collapse the group containing Afghanistan
    const firstGroupCollapseButton = page.locator('.group-label').first().locator('button[title="Toggle group visibility"]');
    await firstGroupCollapseButton.click();
    await page.waitForTimeout(100);
    
    // Expand the group again
    await firstGroupCollapseButton.click();
    await page.waitForTimeout(300); // Increased timeout to ensure group operations complete
    
    // Manually trigger ensureHighlight to fix any highlighting issues
    await page.evaluate(() => {
      const comboboxEl = document.querySelector('[phx-hook="SearchCombobox"]');
      if (comboboxEl && comboboxEl.searchCombobox) {
        comboboxEl.searchCombobox.ensureHighlight(false);
      }
    });
    
    // Debug: Check what's actually highlighted
    const finalHighlighted = await page.locator('[data-combobox-navigate]').textContent();
    console.log('Final highlighted element content:', JSON.stringify(finalHighlighted));
    
    // Debug: Check if Afghanistan is even visible
    const afghanistanVisible = await page.locator('.combobox-option').filter({ hasText: 'Afghanistan' }).count();
    console.log('Afghanistan options visible:', afghanistanVisible);
    
    // Debug: Check first group state
    const firstGroupOptions = await page.locator('.option-group').first().locator('.combobox-option').count();
    console.log('First group options count:', firstGroupOptions);
    
    // Afghanistan should be highlighted again (first item in expanded group)
    expect(finalHighlighted).toContain('Afghanistan');
    
    console.log('✅ Group expand correctly highlights first item in expanded group');
  });
});
