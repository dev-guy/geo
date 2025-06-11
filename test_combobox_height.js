// Test script for combobox height calculation
// Run this in the browser console after opening the page

function testComboboxHeight() {
  console.log('=== Testing Combobox Height Calculation ===');

  // Find the combobox
  const combobox = document.querySelector('.search-combobox-trigger');
  if (!combobox) {
    console.error('Combobox not found!');
    return;
  }

  console.log('1. Found combobox trigger');

  // Get viewport info
  const viewportHeight = window.innerHeight;
  console.log(`2. Viewport height: ${viewportHeight}px`);

  // Click to open the combobox
  console.log('3. Opening combobox...');
  combobox.click();

  // Wait for dropdown to open and test height
  setTimeout(() => {
    const dropdown = document.querySelector('[data-part="search-combobox-listbox"]');
    const scrollArea = document.querySelector('.scroll-viewport');

    if (!dropdown || dropdown.hasAttribute('hidden')) {
      console.error('Dropdown not open or not found!');
      return;
    }

    console.log('4. Dropdown is open');

    const dropdownRect = dropdown.getBoundingClientRect();
    const availableHeight = viewportHeight - dropdownRect.top - 50;

    console.log(`5. Dropdown position: top=${dropdownRect.top}px, height=${dropdownRect.height}px`);
    console.log(`6. Available height (with 50px margin): ${availableHeight}px`);

    if (scrollArea) {
      const scrollAreaHeight = scrollArea.getBoundingClientRect().height;
      const scrollAreaStyle = window.getComputedStyle(scrollArea);
      console.log(`7. Scroll area height: ${scrollAreaHeight}px`);
      console.log(`8. Scroll area style height: ${scrollAreaStyle.height}`);
      console.log(`9. Scroll area max-height: ${scrollAreaStyle.maxHeight}`);
    }

    // Check if height constraint was applied
    const bottomOfDropdown = dropdownRect.bottom;
    const marginFromBottom = viewportHeight - bottomOfDropdown;
    console.log(`10. Margin from bottom: ${marginFromBottom}px`);

    if (marginFromBottom >= 50) {
      console.log('✅ SUCCESS: 50px margin maintained!');
    } else {
      console.log(`❌ FAIL: Only ${marginFromBottom}px margin from bottom`);
    }

    // Count options for reference
    const options = dropdown.querySelectorAll('.search-combobox-option');
    console.log(`11. Number of options: ${options.length}`);

    // Test manual height calculation
    console.log('12. Testing manual height calculation...');
    if (window.testComboboxHeight) {
      window.testComboboxHeight();
    }

  }, 300); // Wait for content to load
}

function testDifferentViewportSizes() {
  console.log('=== Testing Different Viewport Sizes ===');

  const originalHeight = window.innerHeight;
  console.log(`Original viewport height: ${originalHeight}px`);

  // Test with smaller viewport (simulate mobile)
  console.log('Testing with simulated smaller viewport...');

  // We can't actually resize the window, but we can test the calculation logic
  const mockViewportHeight = 600;
  const dropdown = document.querySelector('[data-part="search-combobox-listbox"]');

  if (dropdown) {
    const dropdownRect = dropdown.getBoundingClientRect();
    const mockAvailableHeight = mockViewportHeight - dropdownRect.top - 50;
    console.log(`Mock available height for ${mockViewportHeight}px viewport: ${mockAvailableHeight}px`);
  }
}

// Auto-run test
console.log('Combobox height test script loaded. Run testComboboxHeight() to test.');

// Export functions to global scope
window.testComboboxHeight = testComboboxHeight;
window.testDifferentViewportSizes = testDifferentViewportSizes;
