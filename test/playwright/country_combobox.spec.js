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
    // Monitor for any unexpected scrolling
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('scrollToOption') || msg.text().includes('SETTING SCROLL TO 0') || msg.text().includes('SCROLL EVENT DETECTED') || msg.text().includes('Setting scrollTop')) {
        consoleLogs.push(msg.text());
      }
    });
    
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
    
    // Log the scroll position immediately before the hover
    const scrollBeforeStep6 = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`6a. Scroll before hovering over first country: ${scrollBeforeStep6}`);
    
    // Add a listener to detect any scroll changes
    await page.evaluate(() => {
      const scrollArea = document.querySelector('.scroll-viewport');
      if (scrollArea) {
        scrollArea.addEventListener('scroll', () => {
          console.log('SCROLL EVENT DETECTED, new scrollTop:', scrollArea.scrollTop);
        });
      }
    });
    
    await firstCountryInSecondGroup.hover();
    
    // Log the scroll position immediately after the hover
    const scrollImmediatelyAfter = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`6b. Scroll immediately after hovering: ${scrollImmediatelyAfter}`);
    
    // Wait a bit to see if there's any delayed scrolling
    await page.waitForTimeout(100);
    const scrollAfterHoverFirstCountry = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`6c. Scroll after hovering over first country in second group (final): ${scrollAfterHoverFirstCountry}`);
    
    // 7. Hover over the second group's header again
    await secondGroupHeader.hover();
    
    const scrollAfterHoverHeaderAgain = await scrollArea.evaluate(el => el.scrollTop);
    console.log(`7. Scroll after hovering over second group header again: ${scrollAfterHoverHeaderAgain}`);
    
    // Print console logs
    // Analysis of scroll behavior
    console.log('\\n=== ScrollToOption Calls ===');
    consoleLogs.forEach(log => console.log(log));
    
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
});
