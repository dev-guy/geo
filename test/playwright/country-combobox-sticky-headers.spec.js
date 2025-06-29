// Test for sticky header bug when collapsing groups and scrolling
// Bug: When a group is collapsed and user scrolls, the top header moves up instead of staying stationary

const { test, expect } = require('@playwright/test');

test.describe('Country Combobox Sticky Header Bug', () => {
  test('sticky header should remain stationary after collapsing first group and scrolling', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:4000');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Find and click the combobox trigger to open it
    const comboboxTrigger = page.locator('.combobox-trigger').first();
    await expect(comboboxTrigger).toBeVisible();
    await comboboxTrigger.click();
    
    // Wait for dropdown to open
    const dropdown = page.locator('[data-part="search-combobox-listbox"]');
    await expect(dropdown).toBeVisible();
    
    // Wait for groups to load
    await page.waitForSelector('.option-group', { timeout: 5000 });
    
    // Find the first group and its collapse button
    const firstGroup = page.locator('.option-group').first();
    await expect(firstGroup).toBeVisible();
    
    // Find the collapse button in the first group header
    const collapseButton = firstGroup.locator('button[data-is-header-button="true"]').first();
    await expect(collapseButton).toBeVisible();
    
    // Get the first group header element to track its position
    const firstHeader = firstGroup.locator('.group-label').first();
    await expect(firstHeader).toBeVisible();
    
    // Get initial position of the first header
    const initialHeaderRect = await firstHeader.boundingBox();
    console.log('Initial header position:', initialHeaderRect);
    
    // Click the collapse button to collapse the first group
    await collapseButton.click();
    
    // Wait for collapse animation to complete
    await page.waitForTimeout(300);
    
    // Verify the group is collapsed by checking if content container is not visible
    // The collapse works by removing the element from DOM via :if condition
    const contentContainer = firstGroup.locator('.transition-all.duration-200.ease-in-out');
    await expect(contentContainer).not.toBeVisible();
    
    // Get header position after collapse
    const headerAfterCollapseRect = await firstHeader.boundingBox();
    console.log('Header position after collapse:', headerAfterCollapseRect);
    
    // Find the scroll area
    const scrollArea = page.locator('.scroll-viewport .overflow-y-auto').first();
    await expect(scrollArea).toBeVisible();
    
    // Get the scroll area bounding box for wheel events
    const scrollAreaRect = await scrollArea.boundingBox();
    
    // Perform mouse wheel scroll down in the scroll area
    await page.mouse.move(
      scrollAreaRect.x + scrollAreaRect.width / 2,
      scrollAreaRect.y + scrollAreaRect.height / 2
    );
    
    // Scroll down with mouse wheel
    await page.mouse.wheel(0, 200);
    
    // Wait for scroll to complete
    await page.waitForTimeout(100);
    
    // Get header position after scrolling
    const headerAfterScrollRect = await firstHeader.boundingBox();
    console.log('Header position after scroll:', headerAfterScrollRect);
    
    // The bug: header moves up instead of staying stationary
    // Expected: header should stay in the same position or maintain its sticky position
    // Actual (bug): header moves up unexpectedly
    
    // Test assertion: The header should not move up significantly after scrolling
    // Allow for small differences due to sticky positioning but not major jumps
    const verticalMovement = Math.abs(headerAfterScrollRect.y - headerAfterCollapseRect.y);
    
    // If the header moves up more than its own height, that's the bug
    const headerHeight = headerAfterCollapseRect.height;
    
    console.log(`Header vertical movement: ${verticalMovement}px`);
    console.log(`Header height: ${headerHeight}px`);
    
    // This test will currently fail due to the bug
    // The header should not move up by more than a small sticky positioning adjustment
    expect(verticalMovement).toBeLessThan(headerHeight * 0.5);
    
    // Additional verification: Check if header is still visible and properly positioned
    await expect(firstHeader).toBeVisible();
    
    // Verify the header maintains its sticky positioning
    const headerStyles = await firstHeader.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        position: styles.position,
        top: styles.top,
        visibility: styles.visibility,
        opacity: styles.opacity
      };
    });
    
    console.log('Header styles after scroll:', headerStyles);
    
    // Header should maintain sticky position
    expect(headerStyles.position).toBe('sticky');
    expect(headerStyles.visibility).toBe('visible');
    expect(headerStyles.opacity).toBe('1');
  });
  
  test('multiple scroll events should not cause header position drift', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:4000');
    await page.waitForLoadState('networkidle');
    
    // Open combobox
    const comboboxTrigger = page.locator('.combobox-trigger').first();
    await comboboxTrigger.click();
    
    // Wait for dropdown and groups
    await page.waitForSelector('.option-group', { timeout: 5000 });
    
    // Find first group and collapse it
    const firstGroup = page.locator('.option-group').first();
    const collapseButton = firstGroup.locator('button[data-is-header-button="true"]').first();
    await collapseButton.click();
    await page.waitForTimeout(300);
    
    // Get header element
    const firstHeader = firstGroup.locator('.group-label').first();
    const initialRect = await firstHeader.boundingBox();
    
    // Find scroll area
    const scrollArea = page.locator('.scroll-viewport .overflow-y-auto').first();
    const scrollAreaRect = await scrollArea.boundingBox();
    
    // Position mouse in scroll area
    await page.mouse.move(
      scrollAreaRect.x + scrollAreaRect.width / 2,
      scrollAreaRect.y + scrollAreaRect.height / 2
    );
    
    // Perform multiple scroll events
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(50);
    }
    
    // Check final position
    const finalRect = await firstHeader.boundingBox();
    const totalMovement = Math.abs(finalRect.y - initialRect.y);
    
    console.log(`Total header movement after multiple scrolls: ${totalMovement}px`);
    
    // Header should not drift significantly with multiple scrolls
    expect(totalMovement).toBeLessThan(initialRect.height);
  });
  
  test('header visibility should be correct when group is collapsed', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:4000');
    await page.waitForLoadState('networkidle');
    
    // Open combobox
    const comboboxTrigger = page.locator('.combobox-trigger').first();
    await comboboxTrigger.click();
    
    // Wait for dropdown and groups
    await page.waitForSelector('.option-group', { timeout: 5000 });
    
    // Find first group
    const firstGroup = page.locator('.option-group').first();
    const firstHeader = firstGroup.locator('.group-label').first();
    const collapseButton = firstGroup.locator('button[data-is-header-button="true"]').first();
    
    // Verify header is initially visible
    await expect(firstHeader).toBeVisible();
    let headerStyles = await firstHeader.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        visibility: styles.visibility,
        opacity: styles.opacity
      };
    });
    expect(headerStyles.visibility).toBe('visible');
    expect(headerStyles.opacity).toBe('1');
    
    // Collapse the group
    await collapseButton.click();
    await page.waitForTimeout(300);
    
    // After collapse, header should be visible
    headerStyles = await firstHeader.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        visibility: styles.visibility,
        opacity: styles.opacity
      };
    });
    
    // When collapsed, header should be visible
    expect(headerStyles.visibility).toBe('visible');
    expect(headerStyles.opacity).toBe('1');
    
    // Expand the group again
    await collapseButton.click();
    await page.waitForTimeout(300);
    
    // Header should be visible again
    headerStyles = await firstHeader.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        visibility: styles.visibility,
        opacity: styles.opacity
      };
    });
    expect(headerStyles.visibility).toBe('visible');
    expect(headerStyles.opacity).toBe('1');
  });
}); 