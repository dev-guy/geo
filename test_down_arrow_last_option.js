// Test script to verify down arrow from last option behavior
function testDownArrowFromLastOption() {
    console.log('Testing down arrow from last option behavior...');

    // Wait for page to load
    setTimeout(() => {
        const combobox = document.querySelector('[data-part="search-combobox-trigger"]');
        if (!combobox) {
            console.error('Combobox not found');
            return;
        }

        // Open the combobox
        combobox.click();

        setTimeout(() => {
            const dropdown = document.querySelector('[data-part="search-combobox-listbox"]');
            if (!dropdown || dropdown.hasAttribute('hidden')) {
                console.error('Dropdown not open');
                return;
            }

            // Find all options
            const options = Array.from(document.querySelectorAll('.search-combobox-option'));
            if (options.length === 0) {
                console.error('No options found');
                return;
            }

            // Select the last option
            const lastOption = options[options.length - 1];
            lastOption.click();

            console.log('Selected last option:', lastOption.getAttribute('data-combobox-value'));

            setTimeout(() => {
                // Simulate down arrow key press
                const event = new KeyboardEvent('keydown', {
                    key: 'ArrowDown',
                    bubbles: true,
                    cancelable: true
                });

                lastOption.dispatchEvent(event);

                setTimeout(() => {
                    // Check if search input is focused
                    const searchInput = document.querySelector('.search-combobox-search-input');
                    const isSearchFocused = document.activeElement === searchInput;

                    // Check if any option is still selected
                    const selectedOptions = document.querySelectorAll('.search-combobox-option[data-combobox-selected]');

                    console.log('Search input focused:', isSearchFocused);
                    console.log('Selected options count:', selectedOptions.length);

                    if (isSearchFocused && selectedOptions.length === 0) {
                        console.log('✅ Test PASSED: Down arrow from last option correctly moved focus to search input');
                    } else {
                        console.log('❌ Test FAILED: Expected search input to be focused and no options selected');
                    }
                }, 100);
            }, 100);
        }, 100);
    }, 1000);
}

// Run the test when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testDownArrowFromLastOption);
} else {
    testDownArrowFromLastOption();
}
