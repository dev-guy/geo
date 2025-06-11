// Verification script for combobox scrolling behavior
// Run this in the browser console after opening the combobox

function verifyScrollingBehavior() {
    console.log('=== Combobox Scrolling Verification ===');

    // Find the combobox elements
    const combobox = document.querySelector('[phx-hook="SearchCombobox"]');
    const scrollArea = document.querySelector('.scroll-viewport');
    const trigger = document.querySelector('.search-combobox-trigger');

    if (!combobox || !scrollArea || !trigger) {
        console.error('Could not find combobox elements');
        return;
    }

    console.log('Found combobox elements');

    // Open the combobox
    trigger.click();

    setTimeout(() => {
        const options = document.querySelectorAll('.search-combobox-option');
        console.log(`Found ${options.length} options`);

        if (options.length === 0) {
            console.error('No options found');
            return;
        }

        // Test scrolling behavior
        console.log('Testing down arrow navigation...');

        // Navigate to the bottom of the visible area
        let currentIndex = 0;
        const maxVisible = Math.floor(scrollArea.clientHeight / 40); // Approximate options per viewport

        console.log(`Viewport height: ${scrollArea.clientHeight}px`);
        console.log(`Estimated visible options: ${maxVisible}`);

        // Navigate down to test scrolling
        for (let i = 0; i < Math.min(10, options.length - 1); i++) {
            // Simulate arrow down
            const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
            document.activeElement.dispatchEvent(event);

            setTimeout(() => {
                const selected = document.querySelector('.search-combobox-option[data-combobox-selected]');
                if (selected) {
                    const rect = selected.getBoundingClientRect();
                    const scrollRect = scrollArea.getBoundingClientRect();
                    const isVisible = rect.top >= scrollRect.top && rect.bottom <= scrollRect.bottom;
                    console.log(`Option ${i + 1}: ${selected.getAttribute('data-combobox-value')} - Visible: ${isVisible}`);
                    console.log(`  Option position: ${rect.top}-${rect.bottom}, Scroll area: ${scrollRect.top}-${scrollRect.bottom}`);
                }
            }, 100);
        }

    }, 500);
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    console.log('Combobox scrolling verification script loaded. Run verifyScrollingBehavior() to test.');
}
