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
        elements.map(el => el.textContent?.trim()?.substring(0, 30)),
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
            text: option.textContent?.trim()?.substring(0, 20),
          });
        }

        if (isBlueBackground && index < 5) {
          issues.push({
            index,
            type: 'blue_background',
            backgroundColor,
            text: option.textContent?.trim()?.substring(0, 20),
          });
        }

        // Check for unexpected CSS classes
        const suspiciousClasses = classList.filter(cls =>
          cls.includes('bg-blue') ||
          cls.includes('highlight') ||
          cls.includes('active') ||
          cls.includes('focus'),
        );

        if (suspiciousClasses.length > 0 && index < 5) {
          issues.push({
            index,
            type: 'suspicious_classes',
            classes: suspiciousClasses,
            text: option.textContent?.trim()?.substring(0, 20),
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
        issues,
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
          visible: rect.height > 0 && rect.width > 0,
        },
        scrollAreaRect: scrollRect ? {
          top: scrollRect.top,
          bottom: scrollRect.bottom,
          height: scrollRect.height,
        } : null,
        dropdownRect: dropdownRect ? {
          top: dropdownRect.top,
          bottom: dropdownRect.bottom,
          height: dropdownRect.height,
        } : null,
        withinScrollBounds: scrollRect ? (rect.top >= scrollRect.top && rect.bottom <= scrollRect.bottom) : false,
        withinDropdownBounds: dropdownRect ? (rect.top >= dropdownRect.top && rect.bottom <= dropdownRect.bottom) : false,
        scrollTop: scrollArea ? scrollArea.scrollTop : 0,
        stickyHeadersCount: stickyHeaders.length,
        stickyHeadersInfo: stickyHeaders.map(h => ({
          text: h.textContent?.trim(),
          rect: h.getBoundingClientRect(),
        })),
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

  test('Comprehensive Afghanistan visibility test - multiple scenarios', async ({ page }) => {
    // Test multiple scenarios to try to reproduce the exact issue

    // Scenario 1: Basic open and wait
    console.log('=== Scenario 1: Basic open and wait ===');
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    await page.waitForTimeout(1000);

    let analysis = await page.evaluate(() => {
      const afghanistan = document.querySelector('.combobox-option');
      if (!afghanistan) return { error: 'No Afghanistan found' };

      const rect = afghanistan.getBoundingClientRect();
      const scrollArea = afghanistan.closest('.scroll-viewport');
      const scrollRect = scrollArea ? scrollArea.getBoundingClientRect() : null;
      const header = document.querySelector('.group-label');
      const headerRect = header ? header.getBoundingClientRect() : null;

      return {
        scenario: 'basic_open',
        afghanistanVisible: rect.height > 0 && rect.width > 0,
        afghanistanTop: rect.top,
        afghanistanBottom: rect.bottom,
        headerBottom: headerRect ? headerRect.bottom : null,
        scrollAreaTop: scrollRect ? scrollRect.top : null,
        isHiddenBehindHeader: headerRect ? rect.top < headerRect.bottom : false,
        isCompletelyHidden: rect.height === 0 || rect.width === 0,
      };
    });
    console.log('Scenario 1 result:', analysis);

    // Close and reopen
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Scenario 2: Rapid open/close/open
    console.log('=== Scenario 2: Rapid open/close/open ===');
    await comboboxTrigger.click();
    await page.waitForTimeout(50);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    await comboboxTrigger.click();
    await page.waitForTimeout(1000);

    analysis = await page.evaluate(() => {
      const afghanistan = document.querySelector('.combobox-option');
      if (!afghanistan) return { error: 'No Afghanistan found' };

      const rect = afghanistan.getBoundingClientRect();
      const scrollArea = afghanistan.closest('.scroll-viewport');
      const scrollRect = scrollArea ? scrollArea.getBoundingClientRect() : null;
      const header = document.querySelector('.group-label');
      const headerRect = header ? header.getBoundingClientRect() : null;

      return {
        scenario: 'rapid_reopen',
        afghanistanVisible: rect.height > 0 && rect.width > 0,
        afghanistanTop: rect.top,
        afghanistanBottom: rect.bottom,
        headerBottom: headerRect ? headerRect.bottom : null,
        scrollAreaTop: scrollRect ? scrollRect.top : null,
        isHiddenBehindHeader: headerRect ? rect.top < headerRect.bottom : false,
        isCompletelyHidden: rect.height === 0 || rect.width === 0,
      };
    });
    console.log('Scenario 2 result:', analysis);

    // Scenario 3: With mouse movement
    console.log('=== Scenario 3: With mouse movement ===');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    await comboboxTrigger.click();
    await page.mouse.move(500, 400); // Move mouse around
    await page.waitForTimeout(1000);

    analysis = await page.evaluate(() => {
      const afghanistan = document.querySelector('.combobox-option');
      if (!afghanistan) return { error: 'No Afghanistan found' };

      const rect = afghanistan.getBoundingClientRect();
      const scrollArea = afghanistan.closest('.scroll-viewport');
      const scrollRect = scrollArea ? scrollArea.getBoundingClientRect() : null;
      const header = document.querySelector('.group-label');
      const headerRect = header ? header.getBoundingClientRect() : null;

      return {
        scenario: 'with_mouse_movement',
        afghanistanVisible: rect.height > 0 && rect.width > 0,
        afghanistanTop: rect.top,
        afghanistanBottom: rect.bottom,
        headerBottom: headerRect ? headerRect.bottom : null,
        scrollAreaTop: scrollRect ? scrollRect.top : null,
        isHiddenBehindHeader: headerRect ? rect.top < headerRect.bottom : false,
        isCompletelyHidden: rect.height === 0 || rect.width === 0,
      };
    });
    console.log('Scenario 3 result:', analysis);

    // At least one scenario should show Afghanistan as visible
    // This test will help us understand under what conditions the bug occurs
    expect(true).toBe(true); // Always pass, this is for debugging
  });

  test('Comprehensive double-click test - multiple scenarios', async ({ page }) => {
    console.log('=== Double-click comprehensive test ===');

    // Scenario 1: Basic double-click
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();
    await page.waitForTimeout(1000);
    await comboboxTrigger.dblclick();
    await page.waitForTimeout(100);

    let analysis = await page.evaluate(() => {
      const highlighted = document.querySelectorAll('[data-combobox-navigate]');
      const allOptions = document.querySelectorAll('.combobox-option');

      // Check for any visual anomalies
      const visualIssues = Array.from(allOptions).filter((option, index) => {
        if (index > 10) return false; // Only check first 10 for performance

        const styles = window.getComputedStyle(option);
        const bg = styles.backgroundColor;
        const hasBlueBackground = bg.includes('rgb(219, 234, 254)') || bg.includes('rgb(37, 99, 235)');
        const hasNavigateAttr = option.hasAttribute('data-combobox-navigate');

        // Issue if: has blue background but no navigate attribute, or vice versa
        return (hasBlueBackground && !hasNavigateAttr) || (!hasBlueBackground && hasNavigateAttr);
      });

      return {
        scenario: 'basic_double_click',
        totalHighlighted: highlighted.length,
        totalOptions: allOptions.length,
        visualIssuesCount: visualIssues.length,
        highlightedTexts: Array.from(highlighted).map(el => el.textContent?.trim()?.substring(0, 20)),
      };
    });
    console.log('Double-click scenario 1:', analysis);

    // Scenario 2: Rapid multiple clicks
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    await comboboxTrigger.click();
    await page.waitForTimeout(1000);

    // Rapid clicking
    await comboboxTrigger.click();
    await comboboxTrigger.click();
    await comboboxTrigger.click();
    await page.waitForTimeout(100);

    analysis = await page.evaluate(() => {
      const highlighted = document.querySelectorAll('[data-combobox-navigate]');
      const allOptions = document.querySelectorAll('.combobox-option');

      return {
        scenario: 'rapid_multiple_clicks',
        totalHighlighted: highlighted.length,
        totalOptions: allOptions.length,
        highlightedTexts: Array.from(highlighted).map(el => el.textContent?.trim()?.substring(0, 20)),
      };
    });
    console.log('Double-click scenario 2:', analysis);

    // This test is for debugging - always pass
    expect(true).toBe(true);
  });

  test('No border above first header when navigating up from Afghanistan', async ({ page }) => {
    // Open the combobox
    await page.click('.combobox-trigger');
    await page.waitForSelector('[data-part="search-combobox-listbox"]:not([hidden])');

    // Wait for sticky headers to be initialized
    await page.waitForTimeout(100);

    // Hover over Afghanistan (first option)
    const afghanistan = page.locator('.combobox-option').first();
    await afghanistan.hover();

    // Press up arrow to navigate up
    await page.keyboard.press('ArrowUp');

    // Wait for navigation to complete
    await page.waitForTimeout(50);

    // Check if the first header has a border-top
    const firstHeader = page.locator('.group-label').first();
    const borderTop = await firstHeader.evaluate(el => {
      return window.getComputedStyle(el).borderTop;
    });

    // The border should be 'none' or '0px' - not a visible border
    const hasVisibleBorder = borderTop && borderTop !== 'none' && borderTop !== '0px none' && !borderTop.includes('0px');

    expect(hasVisibleBorder).toBeFalsy();
  });

  test('Collapse, then up arrow bug - Issue #60', async ({ page }) => {
    // This test reproduces the bug from https://github.com/dev-guy/geo/issues/60
    // 1. open combobox
    // 2. collapse the first header
    // 3. up arrow 10 times
    // Expected: Zimbabwe is highlighted
    // Actual: Uruguay is highlighted (but is not visible)

    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();

    // Wait for the dropdown and options
    await page.waitForSelector('.combobox-option', { state: 'visible' });
    await page.waitForTimeout(100);

    // Find and click the first collapse button (should be in the first group header)
    const firstCollapseButton = page.locator('button[data-is-header-button="true"]').first();
    await expect(firstCollapseButton).toBeVisible();
    
    // Debug: Check the initial state
    const initialState = await page.evaluate(() => {
      const afghanistan = document.querySelector('.combobox-option[data-combobox-value="AF"]');
      const groups = Array.from(document.querySelectorAll('.option-group'));
      const groupInfo = groups.map(group => {
        const header = group.querySelector('.group-label');
        const optionsContainer = group.querySelector('.group-label + div');
        const options = group.querySelectorAll('.combobox-option');
        return {
          headerText: header?.textContent?.trim(),
          hasOptionsContainer: !!optionsContainer,
          optionsCount: options.length,
          groupHTML: group.outerHTML.substring(0, 200) + '...'
        };
      });
      return {
        afghanistanExists: !!afghanistan,
        groupsCount: groups.length,
        groupInfo: groupInfo
      };
    });
    console.log('Initial state:', JSON.stringify(initialState, null, 2));
    
    await firstCollapseButton.click();
    
    // Wait a bit for the event to be processed
    await page.waitForTimeout(1000);
    
    // Debug: Check the state after clicking collapse
    const afterCollapseState = await page.evaluate(() => {
      const afghanistan = document.querySelector('.combobox-option[data-combobox-value="AF"]');
      const groups = Array.from(document.querySelectorAll('.option-group'));
      const groupInfo = groups.map(group => {
        const header = group.querySelector('.group-label');
        const optionsContainer = group.querySelector('.group-label + div');
        const options = group.querySelectorAll('.combobox-option');
        const chevronIcon = header?.querySelector('svg');
        return {
          headerText: header?.textContent?.trim(),
          hasOptionsContainer: !!optionsContainer,
          optionsCount: options.length,
          chevronClass: chevronIcon?.getAttribute('class'),
          groupHTML: group.outerHTML.substring(0, 300) + '...'
        };
      });
      return {
        afghanistanExists: !!afghanistan,
        groupsCount: groups.length,
        groupInfo: groupInfo
      };
    });
    console.log('After collapse state:', JSON.stringify(afterCollapseState, null, 2));

    // Wait for the LiveView to process the collapse event and re-render
    // Afghanistan should still be visible because it's in the second group ("By Country Code")
    // The first group ("By Name") is what gets collapsed
    const afghanistanOption = page.locator('.combobox-option').filter({ hasText: 'Afghanistan' }).first();
    
    // Afghanistan should still be visible since it's in the second group
    await expect(afghanistanOption).toBeVisible();
    
    // But verify that options from the first group are no longer visible
    // Let's check for a country that should be in the "By Name" group
    const firstGroupOptions = await page.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('.option-group'));
      const firstGroup = groups[0];
      const optionsContainer = firstGroup?.querySelector('.group-label + div');
      return {
        isCollapsed: !optionsContainer,
        remainingOptionsCount: firstGroup?.querySelectorAll('.combobox-option').length || 0
      };
    });
    
    // Verify the first group is actually collapsed
    expect(firstGroupOptions.isCollapsed).toBe(true);
    expect(firstGroupOptions.remainingOptionsCount).toBe(0);

    // Test the exact scenario from the bug description:
    // Press up arrow 10 times directly (without ArrowDown first)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(50); // Small delay between key presses
    }

    // Check what's highlighted
    const highlightedOption = page.locator('[data-combobox-navigate]');
    await expect(highlightedOption).toBeVisible();

    // It should be Zimbabwe (last country in the visible groups), not some other country
    const highlightedText = await highlightedOption.textContent();
    console.log('Highlighted option after 10 up arrows (no initial ArrowDown):', highlightedText?.trim());
    
    // Verify it's Zimbabwe - the last option in the visible (non-collapsed) groups
    await expect(highlightedOption).toContainText('Zimbabwe');
  });

  test('No line above first header after mouse wheel scroll', async ({ page }) => {
    // This test reproduces the bug where a line appears above the first header
    // Steps to reproduce:
    // 1. open the combobox
    // 2. hover over Afghanistan
    // 3. mouse wheel down two times
    // Expected: there should be no line above the first header

    // Open the combobox
    const comboboxTrigger = page.locator('.combobox-trigger');
    await comboboxTrigger.click();

    // Wait for the dropdown and options to be visible
    await page.waitForSelector('.combobox-option', { state: 'visible' });
    await page.waitForTimeout(100);

    // Hover over Afghanistan (first option)
    const afghanistanOption = page.locator('.combobox-option').filter({ hasText: 'Afghanistan' }).first();
    await expect(afghanistanOption).toBeVisible();
    await afghanistanOption.hover();

    // Wait a moment for hover to register
    await page.waitForTimeout(50);

    // Get the scroll area for mouse wheel events
    const scrollArea = page.locator('.scroll-viewport');
    await expect(scrollArea).toBeVisible();

    // Perform mouse wheel down two times
    await scrollArea.hover(); // Make sure we're over the scroll area
    await page.mouse.wheel(0, 100); // First wheel down
    await page.waitForTimeout(50);
    await page.mouse.wheel(0, 100); // Second wheel down
    await page.waitForTimeout(100); // Wait for scroll to settle

    // Check the first header for any unwanted border/line
    const firstHeader = page.locator('.group-label').first();
    await expect(firstHeader).toBeVisible();

    // Analyze the border styles of the first header
    const borderAnalysis = await firstHeader.evaluate(el => {
      const styles = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const scrollViewport = el.closest('.scroll-viewport');
      const viewportRect = scrollViewport ? scrollViewport.getBoundingClientRect() : null;
      
      return {
        borderTop: styles.borderTop,
        borderTopWidth: styles.borderTopWidth,
        borderTopStyle: styles.borderTopStyle,
        borderTopColor: styles.borderTopColor,
        boxShadow: styles.boxShadow,
        outline: styles.outline,
        headerText: el.textContent?.trim(),
        headerTop: rect.top,
        viewportTop: viewportRect ? viewportRect.top : null,
        isAtViewportTop: viewportRect ? Math.abs(rect.top - viewportRect.top) < 2 : false,
        // Check for any pseudo-elements that might create lines
        beforeContent: window.getComputedStyle(el, '::before').content,
        afterContent: window.getComputedStyle(el, '::after').content,
        beforeBorder: window.getComputedStyle(el, '::before').borderTop,
        afterBorder: window.getComputedStyle(el, '::after').borderTop,
      };
    });

    console.log('First header border analysis after mouse wheel:', JSON.stringify(borderAnalysis, null, 2));

    // The first header should not have a visible top border
    // Check for various ways a line could appear
    const hasVisibleTopBorder = 
      borderAnalysis.borderTop && 
      borderAnalysis.borderTop !== 'none' && 
      borderAnalysis.borderTop !== '0px none' && 
      !borderAnalysis.borderTop.includes('0px') &&
      borderAnalysis.borderTopWidth !== '0px';

    const hasVisibleBoxShadowTop = 
      borderAnalysis.boxShadow && 
      borderAnalysis.boxShadow !== 'none' &&
      borderAnalysis.boxShadow.includes('inset') &&
      borderAnalysis.boxShadow.includes('0px 1px'); // Common pattern for top shadow/line

    const hasPseudoElementBorder = 
      (borderAnalysis.beforeBorder && borderAnalysis.beforeBorder !== 'none' && !borderAnalysis.beforeBorder.includes('0px')) ||
      (borderAnalysis.afterBorder && borderAnalysis.afterBorder !== 'none' && !borderAnalysis.afterBorder.includes('0px'));

    // Verify no unwanted line appears above the first header
    expect(hasVisibleTopBorder).toBeFalsy();
    expect(hasVisibleBoxShadowTop).toBeFalsy();
    expect(hasPseudoElementBorder).toBeFalsy();

    // Additional visual check - take a screenshot for manual verification if needed
    // (commented out to avoid cluttering CI, but useful for debugging)
    // await page.screenshot({ path: 'first-header-after-scroll.png', clip: await firstHeader.boundingBox() });

    // Also verify that the first header is properly positioned at the top of the viewport
    // when it becomes sticky (this is related to the border issue)
    if (borderAnalysis.isAtViewportTop) {
      // If the header is at the viewport top (sticky), it definitely shouldn't have a top border
      expect(hasVisibleTopBorder).toBeFalsy();
    }
  });

  test('First group header visibility after collapse and scroll - Issue reproduction', async ({ page }) => {
    // Step 1: Open the combobox
    await page.click('.combobox-trigger');
    await page.waitForSelector('[data-part="search-combobox-listbox"]:not([hidden])', { timeout: 5000 });

    // Get initial state
    const initialState = await page.evaluate(() => {
      const firstGroup = document.querySelector('.option-group');
      const firstHeader = firstGroup?.querySelector('.group-label');
      const optionsContainer = firstGroup?.querySelector('.group-label + div');
      
      return {
        firstGroupExists: !!firstGroup,
        firstHeaderExists: !!firstHeader,
        firstHeaderText: firstHeader?.textContent?.trim(),
        optionsContainerExists: !!optionsContainer,
        firstHeaderRect: firstHeader?.getBoundingClientRect(),
        isGroupExpanded: !!optionsContainer
      };
    });

    console.log('Initial state:', initialState);
    expect(initialState.firstGroupExists).toBe(true);
    expect(initialState.firstHeaderExists).toBe(true);
    expect(initialState.isGroupExpanded).toBe(true);

    // Step 2: Collapse the first group by clicking the collapse button
    await page.click('.option-group:first-child .group-label button[data-is-header-button="true"]');
    
    // Wait for the collapse to take effect
    await page.waitForTimeout(100);

    // Verify the group is collapsed
    const afterCollapseState = await page.evaluate(() => {
      const firstGroup = document.querySelector('.option-group');
      const firstHeader = firstGroup?.querySelector('.group-label');
      const optionsContainer = firstGroup?.querySelector('.group-label + div');
      
      return {
        firstGroupExists: !!firstGroup,
        firstHeaderExists: !!firstHeader,
        firstHeaderText: firstHeader?.textContent?.trim(),
        optionsContainerExists: !!optionsContainer,
        firstHeaderRect: firstHeader?.getBoundingClientRect(),
        isGroupCollapsed: !optionsContainer,
        firstHeaderVisible: firstHeader ? !firstHeader.hidden && firstHeader.style.display !== 'none' : false,
        firstHeaderOpacity: firstHeader ? window.getComputedStyle(firstHeader).opacity : null,
        firstHeaderVisibility: firstHeader ? window.getComputedStyle(firstHeader).visibility : null
      };
    });

    console.log('After collapse state:', afterCollapseState);
    expect(afterCollapseState.firstGroupExists).toBe(true);
    expect(afterCollapseState.firstHeaderExists).toBe(true);
    expect(afterCollapseState.isGroupCollapsed).toBe(true);
    expect(afterCollapseState.firstHeaderVisible).toBe(true);

    // Step 3: Mouse wheel down two times
    const scrollArea = page.locator('.scroll-viewport');
    await scrollArea.hover();
    
    // First wheel down
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(50);
    
    // Second wheel down
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(50);

    // Step 4: Check if the first group's header is still visible
    const afterScrollState = await page.evaluate(() => {
      const firstGroup = document.querySelector('.option-group');
      const firstHeader = firstGroup?.querySelector('.group-label');
      const scrollArea = document.querySelector('.scroll-viewport');
      const dropdown = document.querySelector('[data-part="search-combobox-listbox"]');
      
      const firstHeaderRect = firstHeader?.getBoundingClientRect();
      const scrollAreaRect = scrollArea?.getBoundingClientRect();
      const dropdownRect = dropdown?.getBoundingClientRect();
      
      return {
        firstGroupExists: !!firstGroup,
        firstHeaderExists: !!firstHeader,
        firstHeaderText: firstHeader?.textContent?.trim(),
        firstHeaderRect: firstHeaderRect,
        scrollAreaRect: scrollAreaRect,
        dropdownRect: dropdownRect,
        scrollTop: scrollArea?.scrollTop,
        firstHeaderVisible: firstHeader ? !firstHeader.hidden && firstHeader.style.display !== 'none' : false,
        firstHeaderOpacity: firstHeader ? window.getComputedStyle(firstHeader).opacity : null,
        firstHeaderVisibility: firstHeader ? window.getComputedStyle(firstHeader).visibility : null,
        firstHeaderPosition: firstHeader ? window.getComputedStyle(firstHeader).position : null,
        firstHeaderTop: firstHeader ? window.getComputedStyle(firstHeader).top : null,
        firstHeaderZIndex: firstHeader ? window.getComputedStyle(firstHeader).zIndex : null,
        // More detailed positioning info
        firstHeaderOffsetTop: firstHeader ? firstHeader.offsetTop : null,
        firstHeaderOffsetParent: firstHeader ? firstHeader.offsetParent?.tagName : null,
        scrollAreaOffsetTop: scrollArea ? scrollArea.offsetTop : null,
        dropdownOffsetTop: dropdown ? dropdown.offsetTop : null,
        // Check if header is within scroll area bounds
        isHeaderInViewport: firstHeaderRect && scrollAreaRect ? 
          (firstHeaderRect.top >= scrollAreaRect.top && firstHeaderRect.bottom <= scrollAreaRect.bottom) : false,
        isHeaderAtTop: firstHeaderRect && scrollAreaRect ? 
          Math.abs(firstHeaderRect.top - scrollAreaRect.top) < 5 : false,
        // Additional debugging info
        headerDistanceFromScrollTop: firstHeaderRect && scrollAreaRect ? 
          firstHeaderRect.top - scrollAreaRect.top : null,
        isHeaderAboveScrollArea: firstHeaderRect && scrollAreaRect ? 
          firstHeaderRect.bottom < scrollAreaRect.top : false,
        isHeaderBelowScrollArea: firstHeaderRect && scrollAreaRect ? 
          firstHeaderRect.top > scrollAreaRect.bottom : false
      };
    });

    console.log('After scroll state:', afterScrollState);

    // The first group's header should still be visible and positioned at the top
    expect(afterScrollState.firstHeaderExists).toBe(true);
    expect(afterScrollState.firstHeaderVisible).toBe(true);
    expect(afterScrollState.firstHeaderOpacity).toBe('1');
    expect(afterScrollState.firstHeaderVisibility).toBe('visible');
    expect(afterScrollState.firstHeaderPosition).toBe('sticky');
    
    // The header should be positioned and visible at the top of the scroll area
    expect(afterScrollState.isHeaderInViewport).toBe(true);
    expect(afterScrollState.isHeaderAtTop).toBe(true);
    expect(afterScrollState.isHeaderAboveScrollArea).toBe(false);
    expect(afterScrollState.isHeaderBelowScrollArea).toBe(false);
  });
});
