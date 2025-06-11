/**
 * search Combobox
 *
 * Intercepts the search input and sends it to the backend for prioritized search.
 * Lets LiveView handle the dropdown options rendering.
 */
const SearchCombobox = {
  mounted() {
    const key = this.el.parentElement.getAttribute('key');
    console.log(`SearchCombobox mounted with key: ${key}`);
    this.currentKey = key;

    // Store instance reference for debugging
    this.el.searchComboboxInstance = this;
    this.searchTerm = '';
    this.debounceTimer = null;
    this.dropdownWasOpen = false; // Track dropdown state across updates
    this.debounceDelay = 500;

    // Initialize advanced keyboard navigation (no longer dependent on CountrySelector)
    console.log('SearchCombobox: Initializing with advanced keyboard navigation');

    // Get the search event name from data attribute, default to 'search_countries'
    this.searchEventName = this.el.getAttribute('data-search-event') || 'search_countries';
    console.log(`SearchCombobox: Using search event name: ${this.searchEventName}`);

    // Initialize button interaction tracking
    this.hasScrolledThisSession = false;
    this.isButtonInteraction = false;

    this.setupTriggerButton();
    this.setupSearchIntercept();
    this.setupDropdownObserver();
    this.setupFormChangeForwarding();
    this.setupOptionHandlers();
    this.setupKeyboardNavigation();
    this.setupWindowResizeHandler();

    // Initialize the selection based on the current value
    console.log('SearchCombobox: About to initialize selection on mount');
    this.initializeSelection();
  },

  updated() {
    const key = this.el.parentElement.getAttribute('key');
    console.log(`SearchCombobox updated with key: ${key}`);
    console.log(`SearchCombobox: Tracked dropdown state was open: ${this.dropdownWasOpen}`);

    // Store whether search input was focused before update and its content
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const wasSearchFocused = searchInput && document.activeElement === searchInput;
    const hasSearchContent = searchInput && searchInput.value && searchInput.value.trim() !== '';

    // Check if the key has changed - if so, we need to completely reinitialize
    if (this.currentKey && this.currentKey !== key) {
      console.log(`SearchCombobox: Key changed from ${this.currentKey} to ${key} - performing full reinitialization`);
      this.currentKey = key;

      // Clear all state except dropdown tracking
      this.searchTerm = '';
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      // Clean up existing handlers
      this.cleanupHandlers();

      // Reinitialize everything
      this.setupTriggerButton();
      this.setupSearchIntercept();
      this.setupDropdownObserver();
      this.setupFormChangeForwarding();
      this.setupOptionHandlers();
      this.setupKeyboardNavigation();
      this.setupWindowResizeHandler();

      // Restore dropdown state if it was open
      if (this.dropdownWasOpen) {
        console.log('SearchCombobox: Restoring dropdown open state after key change');
        this.restoreDropdownState(true);
        // Recalculate height after restoration
        this.setOptimalDropdownHeight();
      }

      // Initialize selection
      setTimeout(() => {
        console.log('SearchCombobox: About to initialize selection after key change (delayed)');
        this.initializeSelection();
        // Restore focus if search was focused - prioritize search input if it has content
        if (wasSearchFocused || hasSearchContent) {
          setTimeout(() => {
            this.restoreSearchFocus();
          }, 300);
        }
      }, 10);
    } else {
      // Normal update - just refresh handlers and selection
      this.setupTriggerButton();
      this.setupSearchIntercept();
      this.setupFormChangeForwarding();
      this.setupOptionHandlers();
      this.setupKeyboardNavigation();
      this.setupWindowResizeHandler();

      // Restore dropdown state if it was open
      if (this.dropdownWasOpen) {
        console.log('SearchCombobox: Restoring dropdown open state after normal update');
        this.restoreDropdownState(true);
        // Recalculate height after restoration
        this.setOptimalDropdownHeight();
      }

      // Restore the search input value after LiveView updates
      this.restoreSearchValue();
      // Re-initialize the selection in case the value changed
      // Use a small delay to ensure DOM is fully updated
      setTimeout(() => {
        console.log('SearchCombobox: About to re-initialize selection on update (delayed)');
        this.initializeSelection();
        // Restore focus if search was focused OR if search has content (prioritize search input)
        if (wasSearchFocused || hasSearchContent) {
          setTimeout(() => {
            console.log('SearchCombobox: Restoring focus to search input (was focused or has content)');
            this.restoreSearchFocus();
          }, 300);
        }
      }, 10);
    }

    // Ensure there's always a highlighted option for navigation
    setTimeout(() => {
      this.ensureHighlightedOption();
    }, 50);
  },

  initializeSelection() {
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl) {
      console.log('search combobox: No select element found');
      return;
    }

    const currentValue = selectEl.value;
    console.log('search combobox: Initializing selection with value:', currentValue);

    if (currentValue && currentValue !== '') {
      // Try to find the option with this value
      let option = this.el.querySelector(`.search-combobox-option[data-combobox-value="${currentValue}"]`);

      if (!option) {
        // If not found immediately, wait progressively longer for options to render
        console.log('search combobox: Option not found immediately, waiting for options to render...');
        this.waitForOption(currentValue, 0);
      } else {
        console.log('search combobox: Found option immediately:', currentValue, 'setting as selected');
        this.setSelectedOption(option);
      }
    } else {
      console.log('search combobox: No value to select, clearing selection');
      // Clear all selections if no value
      this.el.querySelectorAll('.search-combobox-option[data-combobox-selected]')
        .forEach(opt => opt.removeAttribute('data-combobox-selected'));
      this.updateSingleDisplay(null);
    }
  },

  waitForOption(value, attempt) {
    const maxAttempts = 5;
    const delays = [50, 100, 200, 400, 800]; // Progressive backoff

    if (attempt >= maxAttempts) {
      console.log('search combobox: Option not found after maximum attempts:', value);
      console.log('Available options:', Array.from(this.el.querySelectorAll('.search-combobox-option')).map(opt => ({
        value: opt.getAttribute('data-combobox-value'),
        text: opt.textContent.trim()
      })));
      return;
    }

    setTimeout(() => {
      const option = this.el.querySelector(`.search-combobox-option[data-combobox-value="${value}"]`);
      if (option) {
        console.log(`search combobox: Found option after attempt ${attempt + 1}:`, value, 'setting as selected');
        this.setSelectedOption(option);
      } else {
        console.log(`search combobox: Option not found on attempt ${attempt + 1}, retrying...`);
        this.waitForOption(value, attempt + 1);
      }
    }, delays[attempt]);
  },

  setSelectedOption(option) {
    // Clear all selections first
    this.el.querySelectorAll('.search-combobox-option[data-combobox-selected]')
      .forEach(opt => opt.removeAttribute('data-combobox-selected'));

    // Set this option as selected
    option.setAttribute('data-combobox-selected', '');

    // Update the display
    this.updateSingleDisplay(option);
  },

  setupTriggerButton() {
    // Find the trigger button
    const triggerButton = this.el.querySelector('.search-combobox-trigger');
    if (triggerButton) {
      console.log('Found combobox trigger, setting up click and keyboard handlers');

      // Remove any existing event listeners to avoid duplicates
      if (this.boundTriggerHandler) {
        triggerButton.removeEventListener('click', this.boundTriggerHandler);
      }
      if (this.boundTriggerKeyHandler) {
        triggerButton.removeEventListener('keydown', this.boundTriggerKeyHandler);
      }

      // Ensure the trigger can receive focus and keyboard events
      if (!triggerButton.hasAttribute('tabindex')) {
        triggerButton.setAttribute('tabindex', '0');
      }

      // Set role if not already set
      if (!triggerButton.hasAttribute('role')) {
        triggerButton.setAttribute('role', 'combobox');
      }

      // Create bound handlers
      this.boundTriggerHandler = this.handleTriggerClick.bind(this);
      this.boundTriggerKeyHandler = this.handleTriggerKeydown.bind(this);

      // Add event listeners
      triggerButton.addEventListener('click', this.boundTriggerHandler);
      triggerButton.addEventListener('keydown', this.boundTriggerKeyHandler);

      // Store reference to the trigger button
      this.triggerButton = triggerButton;
    } else {
      console.log('Combobox trigger not found');
    }
  },

  setupOptionHandlers() {
    // Clean up previous handlers to avoid duplicates
    if (this.boundOptionClickHandlers) {
      this.boundOptionClickHandlers.forEach(({ option, handler }) => {
        option.removeEventListener('click', handler);
      });
    }
    if (this.boundOptionKeydownHandlers) {
      this.boundOptionKeydownHandlers.forEach(({ option, handler }) => {
        option.removeEventListener('keydown', handler);
      });
    }

    this.boundOptionClickHandlers = [];
    this.boundOptionKeydownHandlers = [];

    // Set up click and keydown handlers for all options
    const options = this.el.querySelectorAll('.search-combobox-option');
    options.forEach(option => {
      const clickHandler = this.handleOptionClick.bind(this, option);
      const keydownHandler = this.handleOptionKeydown.bind(this, option);

      option.addEventListener('click', clickHandler);
      option.addEventListener('keydown', keydownHandler);

      // Make options focusable
      option.setAttribute('tabindex', '-1');

      this.boundOptionClickHandlers.push({ option, handler: clickHandler });
      this.boundOptionKeydownHandlers.push({ option, handler: keydownHandler });
    });

    console.log(`Set up handlers for ${options.length} search options`);
  },

  handleOptionClick(option, event) {
    event.preventDefault();
    const value = option.getAttribute('data-combobox-value');
    const isMultiple = this.el.getAttribute('data-multiple') === 'true';

    // Check if search input has content before making changes
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const hasSearchContent = searchInput && searchInput.value && searchInput.value.trim() !== '';

    if (isMultiple) {
      this.toggleMultipleSelection(option, value);
    } else {
      this.setSingleSelection(option, value);
      // For single selection, only close dropdown if search input is empty
      if (!hasSearchContent) {
        const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
        if (dropdown) {
          dropdown.setAttribute('hidden', 'true');
          this.triggerButton.setAttribute('aria-expanded', 'false');
          this.dropdownWasOpen = false; // Update state tracking
        }
      } else {
        console.log('handleOptionClick: Keeping dropdown open because search input has content');
      }
    }
  },

  handleOptionKeydown(option, event) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

    if (!isDropdownOpen) return;

    // Check if the event originated from the search input
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const isFromSearchInput = event.target === searchInput;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      // Use advanced navigation for all search comboboxes
      event.preventDefault();
      this.navigateOptionsAdvanced(event.key === 'ArrowDown' ? 'down' : 'up');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      option.click();
    } else if (event.key === ' ') {
      // Only prevent space if it's not coming from the search input
      // This allows normal typing of spaces in the search box
      if (!isFromSearchInput) {
        event.preventDefault();
        console.log('SearchCombobox: Space key pressed on option (navigation only):', option.getAttribute('data-combobox-value'));
      }
      // If from search input, let the space be typed normally
    } else if (event.key === 'Tab' && !event.shiftKey) {
      // Handle Tab from option - check if this is the last option in the last group
      const allOptions = Array.from(this.el.querySelectorAll('.search-combobox-option'));
      const currentIndex = allOptions.indexOf(option);

      if (currentIndex === allOptions.length - 1) {
        // This is the last option - close dropdown and let tab go to next form element
        event.preventDefault();
        this.closeDropdown();
        // Focus will naturally move to next element after dropdown closes
        return;
      }

      // For other options, let default tab behavior continue to next focusable element
    } else if (event.key === 'Escape') {
      event.preventDefault();
      dropdown.setAttribute('hidden', 'true');
      this.triggerButton.setAttribute('aria-expanded', 'false');
      this.dropdownWasOpen = false;
      this.triggerButton.focus();
    }
  },

  toggleMultipleSelection(option, value) {
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl) return;

    const isSelected = option.hasAttribute('data-combobox-selected');

    // Find or create option in select
    let selectOption = Array.from(selectEl.options).find(opt => opt.value === value);
    if (!selectOption && !isSelected) {
      selectOption = document.createElement('option');
      selectOption.value = value;
      selectOption.textContent = value;
      selectEl.appendChild(selectOption);
    }

    if (isSelected) {
      // Remove selection
      option.removeAttribute('data-combobox-selected');
      if (selectOption) {
        selectOption.selected = false;
      }
    } else {
      // Add selection
      option.setAttribute('data-combobox-selected', '');
      if (selectOption) {
        selectOption.selected = true;
      }
    }

    // Update display and trigger change event
    this.updateMultipleDisplay();
    this.triggerChange();
  },

  setSingleSelection(option, value) {
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl) {
      console.log('setSingleSelection: No select element found');
      return;
    }

    console.log('setSingleSelection called with value:', value);
    console.log('setSingleSelection: selectEl.name =', selectEl.name);

    // Check if search input has content - if so, preserve its focus
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const hasSearchContent = searchInput && searchInput.value && searchInput.value.trim() !== '';
    const wasSearchFocused = searchInput && document.activeElement === searchInput;

    // Remove selection from all options
    this.el.querySelectorAll('.search-combobox-option[data-combobox-selected]')
      .forEach(opt => opt.removeAttribute('data-combobox-selected'));

    // Set selection on chosen option
    option.setAttribute('data-combobox-selected', '');

    // Update select element
    selectEl.value = value;
    console.log('setSingleSelection: set selectEl.value to:', selectEl.value);

    // Update display and trigger change event
    this.updateSingleDisplay(option);
    this.triggerChange();

    // If search input has content or was focused, restore focus to it
    if (hasSearchContent || wasSearchFocused) {
      setTimeout(() => {
        if (searchInput) {
          console.log('setSingleSelection: Restoring focus to search input after selection');
          searchInput.focus();
          // Position cursor at the end of the text
          if (searchInput.value) {
            searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
          }
        }
      }, 10);
    }
  },

  updateSingleDisplay(selectedOption) {
    // With the new div-based structure, the selection content is managed by the LiveView
    // through the :selection slot, so we don't need to manipulate the display here.
    // Just ensure proper form state is maintained.
    const placeholder = this.el.querySelector('.search-combobox-placeholder');

    if (placeholder) {
      if (selectedOption) {
        placeholder.classList.add('hidden');
      } else {
        placeholder.classList.remove('hidden');
      }
    }
  },

  updateMultipleDisplay() {
    const displayEl = this.el.querySelector('[data-part="select_toggle_label"]');
    const placeholder = this.el.querySelector('.search-combobox-placeholder');
    const selectedOptions = this.el.querySelectorAll('.search-combobox-option[data-combobox-selected]');

    if (displayEl) {
      // Clear current display
      displayEl.innerHTML = '';

      if (selectedOptions.length > 0) {
        // Create pill for each selected option
        selectedOptions.forEach(option => {
          const pill = document.createElement('div');
          pill.className = 'search-combobox-pill inline-flex items-center gap-1 rounded text-sm';
          pill.innerHTML = `
            <span>${option.textContent.trim()}</span>
            <button type="button" class="remove-pill" data-value="${option.getAttribute('data-combobox-value')}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
              </svg>
            </button>
          `;

          // Add click handler for remove button
          const removeBtn = pill.querySelector('.remove-pill');
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = removeBtn.getAttribute('data-value');
            const opt = this.el.querySelector(`.search-combobox-option[data-combobox-value="${value}"]`);
            if (opt) {
              this.toggleMultipleSelection(opt, value);
            }
          });

          displayEl.appendChild(pill);
        });

        if (placeholder) placeholder.classList.add('hidden');
      } else {
        if (placeholder) placeholder.classList.remove('hidden');
      }
    }

    // Show/hide clear button based on selection
    const clearButton = this.el.querySelector('[data-part="clear-combobox-button"]');
    if (clearButton) {
      if (selectedOptions.length > 0) {
        clearButton.removeAttribute('hidden');
      } else {
        clearButton.setAttribute('hidden', 'true');
      }
    }
  },

  triggerChange() {
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (selectEl) {
      console.log('triggerChange: dispatching change event on select with value:', selectEl.value);
      console.log('triggerChange: select element name:', selectEl.name);
      const event = new Event('change', { bubbles: true });
      selectEl.dispatchEvent(event);
      console.log('triggerChange: change event dispatched');
    } else {
      console.log('triggerChange: No select element found');
    }
  },

  handleTriggerClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (!dropdown) return;

    const isHidden = dropdown.hasAttribute('hidden');

        if (isHidden) {
      // Open dropdown first
      dropdown.removeAttribute('hidden');
      this.triggerButton.setAttribute('aria-expanded', 'true');
      this.dropdownWasOpen = true; // Track state

      // Send search event with empty string when dropdown opens, but only if search input is empty
      const searchInput = this.el.querySelector('.search-combobox-search-input');
      if (searchInput && (!searchInput.value || searchInput.value.trim() === '')) {
        this.searchTerm = ''; // Clear stored search term
        this.sendSearchEvent('');
      }

      // Calculate and set optimal height after opening and content is rendered
      setTimeout(() => {
        this.setOptimalDropdownHeight();
        // Retry after a longer delay if content might still be loading
        setTimeout(() => {
          this.setOptimalDropdownHeight();
        }, 200);
      }, 50);

      // Focus search input if available
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 10);
      }

      // Add document click listener to close when clicking outside
      if (!this.boundDocumentClickHandler) {
        this.boundDocumentClickHandler = this.handleDocumentClick.bind(this);
        document.addEventListener('click', this.boundDocumentClickHandler);
      }
    } else {
      // Close dropdown
      dropdown.setAttribute('hidden', 'true');
      this.triggerButton.setAttribute('aria-expanded', 'false');
      this.dropdownWasOpen = false; // Track state
    }
  },

  handleTriggerKeydown(event) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

    // Handle keyboard events for the div trigger (since it's no longer a button)
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleTriggerClick(event);
    } else if (event.key === 'Escape') {
      // Close dropdown if open
      if (isDropdownOpen) {
        dropdown.setAttribute('hidden', 'true');
        this.triggerButton.setAttribute('aria-expanded', 'false');
        this.dropdownWasOpen = false;
      }
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      // Open dropdown if closed and navigate options
      event.preventDefault();
      if (!isDropdownOpen) {
        this.openDropdownAndFocusSearch();
      } else {
        // Use advanced navigation for all search comboboxes
        this.navigateOptionsAdvanced(event.key === 'ArrowDown' ? 'down' : 'up');
      }
    } else if (this.isPrintableCharacter(event.key, event) && !isDropdownOpen) {
      // If a printable character is typed and dropdown is closed, open it and start typing
      console.log(`SearchCombobox: Opening dropdown and starting typing with character: "${event.key}"`);
      event.preventDefault();
      this.openDropdownAndStartTyping(event.key);
    }
  },

  navigateOptionsAdvanced(direction) {
    const options = Array.from(this.el.querySelectorAll('.search-combobox-option'));
    if (options.length === 0) return;

    let currentIndex = -1;
    const currentSelected = this.el.querySelector('.search-combobox-option[data-combobox-selected]');

    if (currentSelected) {
      currentIndex = options.indexOf(currentSelected);
    }

    let newIndex;
    if (direction === 'down') {
      if (currentIndex === -1) {
        // No current selection, select first option
        newIndex = 0;
      } else if (currentIndex < options.length - 1) {
        // Move to next option
        newIndex = currentIndex + 1;
      } else {
        // At last option, move focus back to search input
        const searchInput = this.el.querySelector('.search-combobox-search-input');
        if (searchInput) {
          searchInput.focus();
          this.clearAllHighlights();

          // Scroll to make search input visible
          const scrollArea = this.el.querySelector('.scroll-viewport');
          if (scrollArea) {
            scrollArea.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
            console.log('SearchCombobox: Scrolled to top to show search input from last option');
          }
        }
        return;
      }
    } else { // 'up'
      if (currentIndex === -1) {
        // No current selection, select last option
        newIndex = options.length - 1;
      } else if (currentIndex > 0) {
        // Move to previous option
        newIndex = currentIndex - 1;
      } else {
        // At first option, move focus back to search input
        const searchInput = this.el.querySelector('.search-combobox-search-input');
        if (searchInput) {
          searchInput.focus();
          this.clearAllHighlights();

          // Scroll to make search input visible
          const scrollArea = this.el.querySelector('.scroll-viewport');
          if (scrollArea) {
            scrollArea.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
            console.log('SearchCombobox: Scrolled to top to show search input');
          }
        }
        return;
      }
    }

    const newOption = options[newIndex];
    if (newOption) {
      this.highlightOption(newOption, false); // Allow scrolling for navigation
    }
  },

  isPrintableCharacter(key, event) {
    // Check if the key is a printable character (letters, numbers, symbols, spaces)
    // Exclude special keys like Tab, Shift, Control, etc.
    return key.length === 1 &&
           !event.ctrlKey &&
           !event.altKey &&
           !event.metaKey;
  },

  openDropdownAndFocusSearch() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const searchInput = this.el.querySelector('.search-combobox-search-input');

        if (dropdown && searchInput) {
      console.log('SearchCombobox: Opening dropdown and focusing search input');

      // Open dropdown first
      dropdown.removeAttribute('hidden');
      this.triggerButton.setAttribute('aria-expanded', 'true');
      this.dropdownWasOpen = true;

      // Send search event with empty string when dropdown opens, but only if search input is empty
      if (!searchInput.value || searchInput.value.trim() === '') {
        this.searchTerm = ''; // Clear stored search term
        this.sendSearchEvent('');
      }

      // Calculate and set optimal height after opening and content is rendered
      setTimeout(() => {
        this.setOptimalDropdownHeight();
        // Retry after a longer delay if content might still be loading
        setTimeout(() => {
          this.setOptimalDropdownHeight();
        }, 200);
      }, 50);

      // Focus search input
      setTimeout(() => searchInput.focus(), 10);

      // Add document click listener to close when clicking outside
      if (!this.boundDocumentClickHandler) {
        this.boundDocumentClickHandler = this.handleDocumentClick.bind(this);
        document.addEventListener('click', this.boundDocumentClickHandler);
      }
    }
  },

  openDropdownAndStartTyping(character) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const searchInput = this.el.querySelector('.search-combobox-search-input');

        if (dropdown && searchInput) {
      console.log(`SearchCombobox: Opening dropdown and starting typing with: "${character}"`);

      // Open dropdown first
      dropdown.removeAttribute('hidden');
      this.triggerButton.setAttribute('aria-expanded', 'true');
      this.dropdownWasOpen = true;

      // Set the character in the search input and focus it
      searchInput.value = character;
      this.searchTerm = character;

      // Calculate and set optimal height after opening and content is rendered
      setTimeout(() => {
        this.setOptimalDropdownHeight();
        // Retry after a longer delay if content might still be loading
        setTimeout(() => {
          this.setOptimalDropdownHeight();
        }, 200);
      }, 50);

      setTimeout(() => {
        searchInput.focus();
        // Position cursor at the end
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);

        // Trigger the search with the new character
        this.handleSearchInput({ target: searchInput });
      }, 10);

      // Add document click listener to close when clicking outside
      if (!this.boundDocumentClickHandler) {
        this.boundDocumentClickHandler = this.handleDocumentClick.bind(this);
        document.addEventListener('click', this.boundDocumentClickHandler);
      }
    }
  },

  handleDocumentClick(event) {
    // Close dropdown when clicking outside
    if (!this.el.contains(event.target)) {
      const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
      if (dropdown && !dropdown.hasAttribute('hidden')) {
        dropdown.setAttribute('hidden', 'true');
        this.triggerButton.setAttribute('aria-expanded', 'false');
        this.dropdownWasOpen = false; // Track state
      }
    }
  },

  setupSearchIntercept() {
    // Find the search input within the combobox
    const searchInput = this.el.querySelector('.search-combobox-search-input');

    if (searchInput) {
      console.log('Found combobox search input, setting up intercept');

      // Remove any existing event listeners to avoid duplicates
      if (this.boundSearchHandler) {
        searchInput.removeEventListener('input', this.boundSearchHandler);
      }
      if (this.boundSearchKeydownHandler) {
        searchInput.removeEventListener('keydown', this.boundSearchKeydownHandler);
      }

      // Create bound handlers
      this.boundSearchHandler = this.handleSearchInput.bind(this);
      this.boundSearchKeydownHandler = this.handleSearchKeydown.bind(this);

      // Add our custom search handlers
      searchInput.addEventListener('input', this.boundSearchHandler);
      searchInput.addEventListener('keydown', this.boundSearchKeydownHandler);

      // Store reference to the search input
      this.inputElement = searchInput;
    } else {
      console.log('Combobox search input not found yet');
    }
  },

  handleSearchKeydown(event) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

    if (!isDropdownOpen) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      // Use advanced navigation for all search comboboxes
      event.preventDefault();
      this.navigateOptionsAdvanced(event.key === 'ArrowDown' ? 'down' : 'up');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.selectHighlightedOption();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdown();
    }
  },

  selectHighlightedOption() {
    const selectedOption = this.el.querySelector('.search-combobox-option[data-combobox-selected]');
    if (selectedOption) {
      // Check if search input has content before selecting
      const searchInput = this.el.querySelector('.search-combobox-search-input');
      const hasSearchContent = searchInput && searchInput.value && searchInput.value.trim() !== '';

      selectedOption.click();
      console.log('SearchCombobox: Selected highlighted option:', selectedOption.getAttribute('data-combobox-value'));

      // If search input has content, ensure focus returns to it
      if (hasSearchContent) {
        setTimeout(() => {
          if (searchInput) {
            console.log('selectHighlightedOption: Restoring focus to search input after keyboard selection');
            searchInput.focus();
            searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
          }
        }, 10);
      }
    }
  },

  restoreSearchValue() {
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (searchInput && this.searchTerm && searchInput.value !== this.searchTerm) {
      console.log(`Restoring search value: "${this.searchTerm}"`);
      searchInput.value = this.searchTerm;
    }
  },

  restoreSearchFocus() {
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (searchInput) {
      console.log('Restoring focus to search input');
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        searchInput.focus();
        // Position cursor at the end of the text
        if (searchInput.value) {
          searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        }
      });
    }
  },

  restoreDropdownState(isOpen) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const triggerButton = this.el.querySelector('.search-combobox-trigger');

    if (dropdown && triggerButton) {
      if (isOpen) {
        console.log('SearchCombobox: Restoring dropdown to open state');
        dropdown.removeAttribute('hidden');
        triggerButton.setAttribute('aria-expanded', 'true');
      } else {
        console.log('SearchCombobox: Restoring dropdown to closed state');
        dropdown.setAttribute('hidden', 'true');
        triggerButton.setAttribute('aria-expanded', 'false');
      }
    }
  },

  handleSearchInput(event) {
    const searchTerm = event.target.value;
    console.log(`search search input: "${searchTerm}"`);

    // Store the search term
    this.searchTerm = searchTerm;

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce the search request (500ms delay to reduce focus loss)
    this.debounceTimer = setTimeout(() => {
      console.log(`Sending search for: "${this.searchTerm}"`);
      this.sendSearchEvent(this.searchTerm);
    }, this.debounceDelay);
  },

  sendSearchEvent(searchTerm) {
    console.log(`Sending search event with term: "${searchTerm}"`);

    // Check if there's a phx-target attribute on the search combobox
    const searchCombobox = this.el.closest('[phx-target]');
    if (searchCombobox) {
      const target = searchCombobox.getAttribute('phx-target');
      console.log(`Sending search event to target: ${target}`);
      // Send to the specific component
      this.pushEventTo(target, this.searchEventName, { value: searchTerm });
    } else {
      // Send to the parent LiveView (default behavior)
      this.pushEvent(this.searchEventName, { value: searchTerm });
    }
  },

  setupDropdownObserver() {
    // Watch for dropdown state changes to clear search term when closed
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (dropdown) {
      // Use MutationObserver to watch for hidden attribute changes
      this.dropdownObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
            const isHidden = dropdown.hasAttribute('hidden');
            if (isHidden) {
              // Dropdown was closed, clear the stored search term
              console.log('Dropdown closed, clearing stored search term');
              this.searchTerm = '';
            }
          }
        });
      });

      this.dropdownObserver.observe(dropdown, {
        attributes: true,
        attributeFilter: ['hidden']
      });
    }
  },

  setupFormChangeForwarding() {
    // Find the select element and ensure change events are forwarded
    const selectElement = this.el.querySelector('.search-combobox-select');
    if (selectElement) {
      console.log('Found select element, setting up change forwarding');

      // Remove existing listener if any
      if (this.boundChangeHandler) {
        selectElement.removeEventListener('change', this.boundChangeHandler);
      }

      // Create bound handler
      this.boundChangeHandler = this.handleSelectChange.bind(this);

      // Add change listener
      selectElement.addEventListener('change', this.boundChangeHandler);
      this.selectElement = selectElement;
    } else {
      console.log('Select element not found yet');
    }
  },

  handleSelectChange(event) {
    console.log('search select changed:', event.target.value);
    // Let the event bubble up normally to LiveView
    // The phx-change on the search_combobox should catch this
  },

  /**
   * Test method to manually trigger height calculation (for debugging)
   */
  testHeightCalculation() {
    console.log('SearchCombobox: Manual height calculation test triggered');
    this.setOptimalDropdownHeight();
  },

  /**
   * Sets up window resize handler to recalculate dropdown height when viewport changes
   */
  setupWindowResizeHandler() {
    // Remove existing listener if any
    if (this.boundWindowResizeHandler) {
      window.removeEventListener('resize', this.boundWindowResizeHandler);
    }

    // Create bound handler
    this.boundWindowResizeHandler = () => {
      const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
      if (dropdown && !dropdown.hasAttribute('hidden')) {
        // Only recalculate if dropdown is open
        this.setOptimalDropdownHeight();
      }
    };

    // Add resize listener
    window.addEventListener('resize', this.boundWindowResizeHandler);
  },

  cleanupHandlers() {
    console.log('SearchCombobox: Cleaning up handlers');
    if (this.boundSearchHandler && this.inputElement) {
      this.inputElement.removeEventListener('input', this.boundSearchHandler);
    }
    if (this.boundSearchKeydownHandler && this.inputElement) {
      this.inputElement.removeEventListener('keydown', this.boundSearchKeydownHandler);
    }
    if (this.boundTriggerHandler && this.triggerButton) {
      this.triggerButton.removeEventListener('click', this.boundTriggerHandler);
    }
    if (this.boundTriggerKeyHandler && this.triggerButton) {
      this.triggerButton.removeEventListener('keydown', this.boundTriggerKeyHandler);
    }
    if (this.boundDocumentClickHandler) {
      document.removeEventListener('click', this.boundDocumentClickHandler);
    }
    if (this.boundChangeHandler && this.selectElement) {
      this.selectElement.removeEventListener('change', this.boundChangeHandler);
    }
    if (this.boundOptionClickHandlers) {
      this.boundOptionClickHandlers.forEach(({ option, handler }) => {
        option.removeEventListener('click', handler);
      });
    }
    if (this.boundOptionKeydownHandlers) {
      this.boundOptionKeydownHandlers.forEach(({ option, handler }) => {
        option.removeEventListener('keydown', handler);
      });
    }
    if (this.boundButtonClickHandler) {
      const buttons = this.el.querySelectorAll('button[title*="Toggle group"], button[title*="sort order"]');
      buttons.forEach(button => {
        button.removeEventListener('click', this.boundButtonClickHandler);
      });
    }
    if (this.buttonInteractionTimeout) {
      clearTimeout(this.buttonInteractionTimeout);
    }
    if (this.dropdownObserver) {
      this.dropdownObserver.disconnect();
    }
    if (this.boundWindowResizeHandler) {
      window.removeEventListener('resize', this.boundWindowResizeHandler);
    }
  },

  destroyed() {
    const key = this.el.parentElement ? this.el.parentElement.getAttribute('key') : 'unknown';
    console.log(`SearchCombobox destroyed with key: ${key}`);
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.cleanupHandlers();
  },

  setupKeyboardNavigation() {
    // Remove existing listeners if any
    if (this.boundSearchKeydownHandler) {
      const searchInput = this.el.querySelector('.search-combobox-search-input');
      if (searchInput) {
        searchInput.removeEventListener('keydown', this.boundSearchKeydownHandler);
      }
    }

    if (this.boundButtonKeyboardHandler) {
      const buttons = this.el.querySelectorAll('button[title*="Toggle group"], button[title*="sort order"]');
      buttons.forEach(button => {
        button.removeEventListener('keydown', this.boundButtonKeyboardHandler);
        button.removeEventListener('click', this.boundButtonClickHandler);
      });
    }

    // Set up enhanced keyboard navigation
    this.boundSearchKeydownHandler = (event) => {
      this.handleAdvancedSearchKeydown(event);
    };

    this.boundButtonKeyboardHandler = (event) => {
      this.handleButtonKeydown(event);
    };

    this.boundButtonClickHandler = (event) => {
      console.log('SearchCombobox: Button clicked, setting long-duration interaction flag');
      this.isButtonInteraction = true;
      this.buttonInteractionTime = Date.now();

      // Store the current scroll position and highlighted option to restore later
      const scrollArea = this.el.querySelector('.scroll-viewport');
      const currentHighlighted = this.el.querySelector('.search-combobox-option[data-combobox-selected]');

      if (scrollArea) {
        this.preButtonScrollTop = scrollArea.scrollTop;
      }
      if (currentHighlighted) {
        this.preButtonHighlightedValue = currentHighlighted.getAttribute('data-combobox-value');
      }

      // Clear any existing timeout
      if (this.buttonInteractionTimeout) {
        clearTimeout(this.buttonInteractionTimeout);
      }

      // Keep the flag set for longer to account for LiveView update delays
      this.buttonInteractionTimeout = setTimeout(() => {
        console.log('SearchCombobox: Clearing button interaction flag after extended timeout');
        this.isButtonInteraction = false;
        this.buttonInteractionTime = null;
        this.preButtonScrollTop = null;
        this.preButtonHighlightedValue = null;
      }, 2000); // Extended to 2 seconds
    };

    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', this.boundSearchKeydownHandler);
    }

    const buttons = this.el.querySelectorAll('button[title*="Toggle group"], button[title*="sort order"]');
    buttons.forEach(button => {
      button.addEventListener('click', this.boundButtonClickHandler);
      button.addEventListener('keydown', this.boundButtonKeyboardHandler);
    });

    console.log(`SearchCombobox: Set up advanced keyboard navigation on search input and ${buttons.length} control buttons`);
  },

  handleButtonKeydown(event) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

    if (!isDropdownOpen) return;

    if (event.key === 'Tab' && !event.shiftKey) {
      // Find the current button and determine next focus target
      const currentButton = event.target;
      const buttonGroup = currentButton.closest('.option-group');

      if (buttonGroup) {
        // Check if this is a sort button (last button in group)
        const groupButtons = Array.from(buttonGroup.querySelectorAll('button'));
        const isSortButton = groupButtons.indexOf(currentButton) === groupButtons.length - 1;

        if (isSortButton) {
          // From sort button, go to first option in this group
          const firstOptionInGroup = buttonGroup.querySelector('.search-combobox-option');
          if (firstOptionInGroup) {
            event.preventDefault();
            this.highlightOption(firstOptionInGroup, false);
            return;
          }
        }
      }

      // For other buttons or if no option found, let default tab behavior continue
      // This will naturally move to the next focusable element
            } else if (event.key === 'Tab' && event.shiftKey) {
      // Handle Shift+Tab from buttons
      const currentButton = event.target;
      const buttonGroup = currentButton.closest('.option-group');

      console.log('SearchCombobox: Shift+Tab from button:', currentButton.title);

      if (buttonGroup) {
        // Check if this is the first group
        const allGroups = Array.from(this.el.querySelectorAll('.option-group'));
        const isFirstGroup = allGroups.indexOf(buttonGroup) === 0;

        console.log('SearchCombobox: Is first group:', isFirstGroup);

        if (isFirstGroup) {
          // Check if this is specifically the expand/collapse button (first button in group)
          const groupButtons = Array.from(buttonGroup.querySelectorAll('button'));
          const isExpandCollapseButton = groupButtons.indexOf(currentButton) === 0;

          console.log('SearchCombobox: Button index:', groupButtons.indexOf(currentButton), 'Is expand/collapse:', isExpandCollapseButton);

          if (isExpandCollapseButton) {
            // From first group's expand/collapse button, go to search input
            const searchInput = this.el.querySelector('.search-combobox-search-input');
            if (searchInput) {
              console.log('SearchCombobox: Moving focus to search input');
              event.preventDefault();
              searchInput.focus();
              return;
            }
          }
        }
      }

      // For other buttons (including sort button), let default behavior handle this
      console.log('SearchCombobox: Letting default Shift+Tab behavior handle this');
    }
  },

  handleAdvancedSearchKeydown(event) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

    if (!isDropdownOpen) {
      // Handle keys when dropdown is closed
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.openDropdownAndFocusSearch();
      } else if (this.isPrintableCharacter(event.key, event)) {
        // If a printable character is typed and dropdown is closed, open it and start typing
        console.log(`SearchCombobox: Opening dropdown and starting typing with character: "${event.key}"`);
        event.preventDefault();
        this.openDropdownAndStartTyping(event.key);
      }
      return;
    }

    // Handle keys when dropdown is open
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.navigateOptionsAdvanced('down');
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateOptionsAdvanced('up');
        break;
      case 'Enter':
        event.preventDefault();
        this.selectHighlightedOption();
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
      case ' ':
        // Space in search input should type normally, not select
        // Only prevent default if we're not in the search input
        if (event.target !== this.el.querySelector('.search-combobox-search-input')) {
          event.preventDefault();
          this.selectHighlightedOption();
        }
        break;
      case 'Tab':
        // Handle Tab navigation - move to first group button if available
        const firstGroupButton = this.el.querySelector('button[title*="Toggle group"]');
        if (firstGroupButton && !event.shiftKey) {
          event.preventDefault();
          firstGroupButton.focus();
        }
        break;
    }
  },

  highlightOption(option, preventScroll = false) {
    if (!option) return;

    // Clear all highlights first
    this.clearAllHighlights();

    // Highlight the new option
    option.setAttribute('data-combobox-selected', '');

    // Make sure the option is visible (unless prevented)
    if (!preventScroll) {
      this.scrollToOption(option);
    }

    // Check if search input has content - if so, don't steal focus
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const hasSearchContent = searchInput && searchInput.value && searchInput.value.trim() !== '';
    const isSearchFocused = searchInput && document.activeElement === searchInput;

    // Set tabindex for accessibility
    option.setAttribute('tabindex', '0');

    // Only focus the option if search input doesn't have content and isn't focused
    if (!hasSearchContent && !isSearchFocused) {
      option.focus();
      console.log('SearchCombobox: Highlighted and focused option:', option.getAttribute('data-combobox-value'));
    } else {
      console.log('SearchCombobox: Highlighted option without focusing (search input has content or focus):', option.getAttribute('data-combobox-value'));
    }
  },

  clearAllHighlights() {
    // Clear all selections and remove tabindex
    this.el.querySelectorAll('.search-combobox-option[data-combobox-selected]')
      .forEach(opt => {
        opt.removeAttribute('data-combobox-selected');
        opt.removeAttribute('tabindex');
      });
  },

  closeDropdown() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const trigger = this.el.querySelector('.search-combobox-trigger');

    if (dropdown && trigger) {
      dropdown.setAttribute('hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      this.dropdownWasOpen = false;
      console.log('SearchCombobox: Closed dropdown via keyboard');
    }
  },

  scrollToOption(option, forceGroupLabelVisible = false) {
    const scrollArea = this.el.querySelector('.scroll-viewport');
    if (!option || !scrollArea) return;

    const optionTop = option.offsetTop;
    const optionHeight = option.offsetHeight;
    const scrollAreaHeight = scrollArea.clientHeight;
    const currentScrollTop = scrollArea.scrollTop;

    // Check if this is the first option in its group
    const optionGroup = option.closest('.option-group');
    let groupLabel = null;
    let groupLabelHeight = 0;
    let shouldShowGroupLabel = forceGroupLabelVisible;

    if (optionGroup) {
      groupLabel = optionGroup.querySelector('.group-label');
      if (groupLabel) {
        groupLabelHeight = groupLabel.offsetHeight;

        // Check if this is the first option in the group
        const groupOptions = Array.from(optionGroup.querySelectorAll('.search-combobox-option'));
        const isFirstInGroup = groupOptions.indexOf(option) === 0;

        if (isFirstInGroup) {
          shouldShowGroupLabel = true;
        }
      }
    }

    // Current viewport boundaries
    const viewportTop = currentScrollTop;
    const viewportBottom = currentScrollTop + scrollAreaHeight;

    // Option boundaries
    const optionBottom = optionTop + optionHeight;

    // Check if option is already fully visible
    const isFullyVisible = optionTop >= viewportTop && optionBottom <= viewportBottom;

    // If showing group label, check if both label and option are visible
    if (shouldShowGroupLabel && groupLabel) {
      const groupLabelTop = groupLabel.offsetTop;
      const isGroupLabelVisible = groupLabelTop >= viewportTop;

      if (isGroupLabelVisible && isFullyVisible) {
        // Both group label and option are visible, no scroll needed
        return;
      }

      if (!isGroupLabelVisible) {
        // Need to show group label - scroll just enough to show it
        const newScrollTop = Math.max(0, groupLabelTop - 5); // Minimal padding
        if (Math.abs(newScrollTop - currentScrollTop) > 2) {
          scrollArea.scrollTo({
            top: newScrollTop,
            behavior: 'smooth'
          });
          console.log(`SearchCombobox: Scrolled to show group label from ${currentScrollTop} to ${newScrollTop}`);
        }
        return;
      }
    }

    // Calculate minimal scroll needed for true single-line scrolling
    let newScrollTop = currentScrollTop;

    if (optionTop < viewportTop) {
      // Option is above viewport - scroll up just enough to show it at the top
      // Set scroll position so the option appears at the top of the viewport
      newScrollTop = Math.max(0, optionTop - 5); // Position option at top with small padding
    } else if (optionBottom > viewportBottom) {
      // Option is below viewport - scroll down just enough to show it at the bottom
      // Calculate the minimal scroll needed to bring the bottom of the option into view
      const scrollNeeded = optionBottom - viewportBottom;
      newScrollTop = currentScrollTop + scrollNeeded + 5; // Small padding
    } else {
      // Option is already visible, no scroll needed
      return;
    }

    // Ensure we don't scroll beyond bounds
    const maxScrollTop = scrollArea.scrollHeight - scrollAreaHeight;
    newScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));

    // Only scroll if there's a meaningful change
    if (Math.abs(newScrollTop - currentScrollTop) > 1) {
      scrollArea.scrollTo({
        top: newScrollTop,
        behavior: 'smooth'
      });
      console.log(`SearchCombobox: Minimal scroll from ${currentScrollTop} to ${newScrollTop} (diff: ${newScrollTop - currentScrollTop}) for option ${option.getAttribute('data-combobox-value')}`);
    }
  },

  ensureHighlightedOption() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (!dropdown || dropdown.hasAttribute('hidden')) return;

    // If this is during a button interaction, use the no-scroll version instead
    if (this.isButtonInteraction || (this.buttonInteractionTime && Date.now() - this.buttonInteractionTime < 3000)) {
      console.log('SearchCombobox: Using no-scroll version due to button interaction');
      this.ensureHighlightedOptionNoScroll();
      return;
    }

    const currentHighlighted = this.el.querySelector('.search-combobox-option[data-combobox-selected]');
    if (!currentHighlighted) {
      // No option is highlighted, find the first visible option and highlight it
      const firstOption = this.el.querySelector('.search-combobox-option');
      if (firstOption) {
        this.highlightOption(firstOption, true); // Prevent auto-scroll
        console.log('SearchCombobox: Ensured highlighted option:', firstOption.getAttribute('data-combobox-value'));
      }
    }
  },

  ensureHighlightedOptionNoScroll() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (!dropdown || dropdown.hasAttribute('hidden')) return;

    // If this is after a button interaction, try to restore the previous state
    if (this.isButtonInteraction && this.preButtonHighlightedValue) {
      const previousOption = this.el.querySelector(`.search-combobox-option[data-combobox-value="${this.preButtonHighlightedValue}"]`);
      if (previousOption) {
        this.highlightOption(previousOption, true); // Prevent scroll
        console.log('SearchCombobox: Restored previous highlighted option after button interaction:', this.preButtonHighlightedValue);

        // Restore scroll position if available
        if (this.preButtonScrollTop !== null) {
          const scrollArea = this.el.querySelector('.scroll-viewport');
          if (scrollArea) {
            scrollArea.scrollTop = this.preButtonScrollTop;
            console.log('SearchCombobox: Restored scroll position after button interaction:', this.preButtonScrollTop);
          }
        }
        return;
      }
    }

    // Get the current value from the hidden select element
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl || !selectEl.value) {
      // No current value, just highlight first option without scrolling
      const firstOption = this.el.querySelector('.search-combobox-option');
      if (firstOption) {
        this.highlightOption(firstOption, true); // Prevent scroll
        console.log('SearchCombobox: Highlighted first option without scrolling');
      }
      return;
    }

    const currentValue = selectEl.value;

    // Find and highlight the option with the current value, but don't scroll
    const option = this.el.querySelector(`.search-combobox-option[data-combobox-value="${currentValue}"]`);
    if (option) {
      this.highlightOption(option, true); // Prevent scroll
      console.log('SearchCombobox: Highlighted selected option without scrolling:', currentValue);
    } else {
      // Fallback to first option
      const firstOption = this.el.querySelector('.search-combobox-option');
      if (firstOption) {
        this.highlightOption(firstOption, true); // Prevent scroll
        console.log('SearchCombobox: Option not found, highlighted first option without scrolling');
      }
    }
  },

    /**
   * Calculates and sets the optimal height for the dropdown to maintain a 50px margin at the bottom
   */
  setOptimalDropdownHeight() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const scrollArea = this.el.querySelector('.scroll-viewport');

    if (!dropdown || !scrollArea) {
      console.log('SearchCombobox: setOptimalDropdownHeight - dropdown or scrollArea not found');
      return;
    }

    // Check if dropdown is actually visible
    if (dropdown.hasAttribute('hidden')) {
      console.log('SearchCombobox: setOptimalDropdownHeight - dropdown is hidden, skipping');
      return;
    }

    // Get the dropdown's position relative to the viewport
    const dropdownRect = dropdown.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    console.log(`SearchCombobox: Height calculation - viewport: ${viewportHeight}px, dropdown top: ${dropdownRect.top}px`);

    // Calculate available space below the dropdown (accounting for 50px margin)
    const availableHeight = viewportHeight - dropdownRect.top - 50;

    // Get the current height of the dropdown content to determine if we need to limit it
    // Try multiple selectors to find the content container
    let dropdownContent = dropdown.querySelector('.px-1\\.5') ||
                         dropdown.querySelector('.scroll-content') ||
                         dropdown.querySelector('[data-part="search-combobox-listbox"] > div:last-child') ||
                         dropdown;

    let contentHeight = dropdownContent.scrollHeight;

    // If content height is very small, it might not be rendered yet - estimate based on options
    if (contentHeight < 100) {
      const options = dropdown.querySelectorAll('.search-combobox-option');
      if (options.length > 0) {
        // Estimate height: ~40px per option + group headers + padding
        const estimatedHeight = (options.length * 40) + 100; // Add 100px for headers and padding
        contentHeight = Math.max(contentHeight, estimatedHeight);
        console.log(`SearchCombobox: Content height too small (${dropdownContent.scrollHeight}px), estimated ${estimatedHeight}px based on ${options.length} options`);
      }
    }

    console.log(`SearchCombobox: Available height: ${availableHeight}px, content height: ${contentHeight}px`);

    // Add space for search input and padding (approximately 60px)
    const searchInputHeight = 60;
    const maxContentHeight = Math.max(100, availableHeight - searchInputHeight);

    // Only set height if we need to constrain it
    if (contentHeight > maxContentHeight) {
      const heightInRem = maxContentHeight / 16; // Convert px to rem (assuming 16px = 1rem)
      scrollArea.style.height = `${heightInRem}rem`;
      console.log(`SearchCombobox: Set dropdown height to ${heightInRem}rem (${maxContentHeight}px) to maintain 50px bottom margin`);
    } else {
      // Reset to default if content fits
      scrollArea.style.height = '';
      console.log('SearchCombobox: Using default height as content fits within viewport');
    }
  },
};

// Add global test function for debugging
window.testComboboxHeight = function() {
  const comboboxElements = document.querySelectorAll('[phx-hook="SearchCombobox"]');
  console.log(`Found ${comboboxElements.length} SearchCombobox elements`);

  comboboxElements.forEach((el, index) => {
    console.log(`Testing height calculation for combobox ${index + 1}`);
    if (el.searchComboboxInstance && el.searchComboboxInstance.testHeightCalculation) {
      el.searchComboboxInstance.testHeightCalculation();
    } else {
      console.log(`Combobox ${index + 1} does not have instance or test method`);
    }
  });
};

export default SearchCombobox;
