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

  test('Afghanistan visibility issue - wait 1 second after opening', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait 1 second as described in the issue
    await page.waitForTimeout(1000);
    
    // Look for Afghanistan specifically
    const afghanistanOption = page.locator('.combobox-option').filter({ hasText: 'Afghanistan' }).first();
    
    // Afghanistan should be visible
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

  test('Double-click bug reproduction', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait 1 second
    await page.waitForTimeout(1000);
    
    // Double-click the combobox trigger (not the scroll area)
    await comboboxTrigger.dblclick();
    
    // Wait a moment for any async operations
    await page.waitForTimeout(100);
    
    // Check if all items are highlighted (this should NOT happen)
    const highlightedOptions = page.locator('[data-combobox-navigate]');
    const count = await highlightedOptions.count();
    
    // There should be at most 1 highlighted option, not all of them
    expect(count).toBeLessThanOrEqual(1);
    
    // Also check if there are any styling issues that might make it appear highlighted
    const allOptions = page.locator('.combobox-option');
    const totalOptions = await allOptions.count();
    
    // Debug: log the highlighted count vs total count
    console.log(`Highlighted: ${count}, Total: ${totalOptions}`);
    
    // If there are multiple highlighted options, log their details
    if (count > 1) {
      const highlightedTexts = await highlightedOptions.evaluateAll(elements => 
        elements.map(el => el.textContent?.trim()?.substring(0, 30))
      );
      console.log('Multiple highlighted options:', highlightedTexts);
    }
  });

  test('Rapid double-click should not cause multiple highlights', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait for initial load
    await page.waitForSelector('.combobox-option', { state: 'visible' });
    await page.waitForTimeout(100);
    
    // Perform rapid double-click
    await comboboxTrigger.click();
    await comboboxTrigger.click();
    
    // Wait for any async operations to complete
    await page.waitForTimeout(200);
    
    // Check highlighting state
    const highlightedOptions = page.locator('[data-combobox-navigate]');
    const count = await highlightedOptions.count();
    
    // Should have at most 1 highlighted option
    expect(count).toBeLessThanOrEqual(1);
    
    // Check if combobox is still properly functional
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
    
    const afterNavigation = page.locator('[data-combobox-navigate]');
    const afterCount = await afterNavigation.count();
    expect(afterCount).toBe(1);
  });

  test('Visual test - double-click highlighting issue', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait 1 second
    await page.waitForTimeout(1000);
    
    // Take screenshot before double-click
    await page.screenshot({ path: 'before-double-click.png', fullPage: false });
    
    // Double-click the combobox trigger
    await comboboxTrigger.dblclick();
    
    // Wait a moment
    await page.waitForTimeout(100);
    
    // Take screenshot after double-click
    await page.screenshot({ path: 'after-double-click.png', fullPage: false });
    
    // Check for visual highlighting issues by examining background colors
    const optionsWithBlueBackground = await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('.combobox-option'));
      return options.filter(option => {
        const styles = window.getComputedStyle(option);
        const backgroundColor = styles.backgroundColor;
        // Check if the background color is blue-ish (indicating highlighting)
        return backgroundColor.includes('rgb(219, 234, 254)') || // blue-100
               backgroundColor.includes('rgb(37, 99, 235)') ||   // blue-600
               option.hasAttribute('data-combobox-navigate');
      }).length;
    });
    
    console.log(`Options with blue background: ${optionsWithBlueBackground}`);
    
    // Should have at most 1 option with blue background
    expect(optionsWithBlueBackground).toBeLessThanOrEqual(1);
  });

  test('Check for CSS class issues causing visual highlighting', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait for options to load
    await page.waitForSelector('.combobox-option', { state: 'visible' });
    await page.waitForTimeout(100);
    
    // Double-click multiple times to try to trigger the issue
    await comboboxTrigger.click();
    await comboboxTrigger.click();
    await page.waitForTimeout(50);
    await comboboxTrigger.click();
    await page.waitForTimeout(50);
    
    // Check for any CSS classes that might cause highlighting
    const highlightingIssues = await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('.combobox-option'));
      const issues = [];
      
      options.forEach((option, index) => {
        const styles = window.getComputedStyle(option);
        const classList = Array.from(option.classList);
        const hasNavigateAttr = option.hasAttribute('data-combobox-navigate');
        const backgroundColor = styles.backgroundColor;
        const isBlueBackground = backgroundColor.includes('rgb(219, 234, 254)') || 
                                 backgroundColor.includes('rgb(37, 99, 235)');
        
        // Check for potential issues
        if (hasNavigateAttr && index < 5) {
          issues.push({
            index,
            type: 'navigate_attribute',
            text: option.textContent?.trim()?.substring(0, 20)
          });
        }
        
        if (isBlueBackground && index < 5) {
          issues.push({
            index,
            type: 'blue_background',
            backgroundColor,
            text: option.textContent?.trim()?.substring(0, 20)
          });
        }
        
        // Check for unexpected CSS classes
        const suspiciousClasses = classList.filter(cls => 
          cls.includes('bg-blue') || 
          cls.includes('highlight') || 
          cls.includes('active') ||
          cls.includes('focus')
        );
        
        if (suspiciousClasses.length > 0 && index < 5) {
          issues.push({
            index,
            type: 'suspicious_classes',
            classes: suspiciousClasses,
            text: option.textContent?.trim()?.substring(0, 20)
          });
        }
      });
      
      return {
        totalOptions: options.length,
        totalWithNavigate: options.filter(o => o.hasAttribute('data-combobox-navigate')).length,
        totalWithBlueBackground: options.filter(o => {
          const bg = window.getComputedStyle(o).backgroundColor;
          return bg.includes('rgb(219, 234, 254)') || bg.includes('rgb(37, 99, 235)');
        }).length,
        issues
      };
    });
    
         console.log('Highlighting analysis:', JSON.stringify(highlightingIssues, null, 2));
    
    // Should have at most 1 option with navigate attribute
    expect(highlightingIssues.totalWithNavigate).toBeLessThanOrEqual(1);
    
    // Should have at most 1 option with blue background
    expect(highlightingIssues.totalWithBlueBackground).toBeLessThanOrEqual(1);
  });

  test('Afghanistan visibility issue - detailed analysis', async ({ page }) => {
    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    
    // Wait exactly 1 second as described in the issue
    await page.waitForTimeout(1000);
    
    // Perform detailed analysis of Afghanistan's visibility
    const afghanistanAnalysis = await page.evaluate(() => {
      const afghanistanOption = document.querySelector('.combobox-option');
      if (!afghanistanOption) return { error: 'No options found' };
      
      const rect = afghanistanOption.getBoundingClientRect();
      const scrollArea = afghanistanOption.closest('.scroll-viewport');
      const scrollRect = scrollArea ? scrollArea.getBoundingClientRect() : null;
      const comboboxDropdown = document.querySelector('[data-part="search-combobox-listbox"]');
      const dropdownRect = comboboxDropdown ? comboboxDropdown.getBoundingClientRect() : null;
      
      // Check for sticky headers
      const stickyHeaders = Array.from(document.querySelectorAll('.group-label')).filter(header => {
        const headerRect = header.getBoundingClientRect();
        const headerStyle = window.getComputedStyle(header);
        return headerStyle.position === 'sticky' || headerStyle.position === 'fixed';
      });
      
      return {
        afghanistanText: afghanistanOption.textContent?.trim()?.substring(0, 50),
        afghanistanRect: {
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height,
          width: rect.width,
          visible: rect.height > 0 && rect.width > 0
        },
        scrollAreaRect: scrollRect ? {
          top: scrollRect.top,
          bottom: scrollRect.bottom,
          height: scrollRect.height
        } : null,
        dropdownRect: dropdownRect ? {
          top: dropdownRect.top,
          bottom: dropdownRect.bottom,
          height: dropdownRect.height
        } : null,
        withinScrollBounds: scrollRect ? (rect.top >= scrollRect.top && rect.bottom <= scrollRect.bottom) : false,
        withinDropdownBounds: dropdownRect ? (rect.top >= dropdownRect.top && rect.bottom <= dropdownRect.bottom) : false,
        scrollTop: scrollArea ? scrollArea.scrollTop : 0,
        stickyHeadersCount: stickyHeaders.length,
        stickyHeadersInfo: stickyHeaders.map(h => ({
          text: h.textContent?.trim(),
          rect: h.getBoundingClientRect()
        }))
      };
    });
    
    console.log('Afghanistan analysis:', JSON.stringify(afghanistanAnalysis, null, 2));
    
    // Afghanistan should be visible
    expect(afghanistanAnalysis.afghanistanRect.visible).toBe(true);
    
    // Afghanistan should be within scroll bounds
    expect(afghanistanAnalysis.withinScrollBounds).toBe(true);
    
    // Afghanistan should be within dropdown bounds
    expect(afghanistanAnalysis.withinDropdownBounds).toBe(true);
  });
});
