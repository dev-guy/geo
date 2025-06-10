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
    this.searchTerm = '';
    this.debounceTimer = null;
    this.dropdownWasOpen = false; // Track dropdown state across updates

    // Check if this SearchCombobox is inside a CountrySelector component
    this.isInsideCountrySelector = !!this.el.closest('[phx-hook="CountrySelector"]');
    console.log(`SearchCombobox: Inside CountrySelector: ${this.isInsideCountrySelector}`);

    // Get the search event name from data attribute, default to 'search_countries'
    this.searchEventName = this.el.getAttribute('data-search-event') || 'search_countries';
    console.log(`SearchCombobox: Using search event name: ${this.searchEventName}`);

    this.setupTriggerButton();
    this.setupSearchIntercept();
    this.setupDropdownObserver();
    this.setupFormChangeForwarding();
    this.setupOptionHandlers();
    // Initialize the selection based on the current value
    console.log('SearchCombobox: About to initialize selection on mount');
    this.initializeSelection();
  },

  updated() {
    const key = this.el.parentElement.getAttribute('key');
    console.log(`SearchCombobox updated with key: ${key}`);
    console.log(`SearchCombobox: Tracked dropdown state was open: ${this.dropdownWasOpen}`);

    // Store whether search input was focused before update
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const wasSearchFocused = searchInput && document.activeElement === searchInput;

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

      // Restore dropdown state if it was open
      if (this.dropdownWasOpen) {
        console.log('SearchCombobox: Restoring dropdown open state after key change');
        this.restoreDropdownState(true);
      }

      // Initialize selection
      setTimeout(() => {
        console.log('SearchCombobox: About to initialize selection after key change (delayed)');
        this.initializeSelection();
        // Restore focus if search was focused - use longer delay to ensure other components finish
        if (wasSearchFocused) {
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

      // Restore dropdown state if it was open
      if (this.dropdownWasOpen) {
        console.log('SearchCombobox: Restoring dropdown open state after normal update');
        this.restoreDropdownState(true);
      }

      // Restore the search input value after LiveView updates
      this.restoreSearchValue();
      // Re-initialize the selection in case the value changed
      // Use a small delay to ensure DOM is fully updated
      setTimeout(() => {
        console.log('SearchCombobox: About to re-initialize selection on update (delayed)');
        this.initializeSelection();
        // Restore focus if search was focused - use longer delay to ensure other components finish
        if (wasSearchFocused) {
          setTimeout(() => {
            this.restoreSearchFocus();
          }, 300);
        }
      }, 10);
    }
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

    if (isMultiple) {
      this.toggleMultipleSelection(option, value);
    } else {
      this.setSingleSelection(option, value);
      // Close dropdown after single selection
      const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
      if (dropdown) {
        dropdown.setAttribute('hidden', 'true');
        this.triggerButton.setAttribute('aria-expanded', 'false');
      }
    }
  },

  handleOptionKeydown(option, event) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

    if (!isDropdownOpen) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!this.isInsideCountrySelector) {
        // Only handle navigation if not inside CountrySelector
        event.preventDefault();
        this.navigateOptions(event.key === 'ArrowDown' ? 'down' : 'up');
      }
      // If inside CountrySelector, let the event bubble up to CountrySelector
    } else if (event.key === 'Enter') {
      event.preventDefault();
      option.click();
    } else if (event.key === ' ') {
      // Space key should only highlight/navigate, not select
      event.preventDefault();
      // The option is already highlighted by the navigation, so we don't need to do anything
      console.log('SearchCombobox: Space key pressed on option (navigation only):', option.getAttribute('data-combobox-value'));
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
      // Open dropdown
      dropdown.removeAttribute('hidden');
      this.triggerButton.setAttribute('aria-expanded', 'true');
      this.dropdownWasOpen = true; // Track state

      // Send search event with empty string when dropdown opens, but only if search input is empty
      const searchInput = this.el.querySelector('.search-combobox-search-input');
      if (searchInput && (!searchInput.value || searchInput.value.trim() === '')) {
        this.searchTerm = ''; // Clear stored search term
        this.sendSearchEvent('');
      }

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
      } else if (!this.isInsideCountrySelector) {
        // Only handle navigation if not inside CountrySelector
        // CountrySelector will handle its own navigation
        this.navigateOptions(event.key === 'ArrowDown' ? 'down' : 'up');
      }
      // If inside CountrySelector, let the event bubble up to CountrySelector
    } else if (this.isPrintableCharacter(event.key, event) && !isDropdownOpen) {
      // If a printable character is typed and dropdown is closed, open it and start typing
      console.log(`SearchCombobox: Opening dropdown and starting typing with character: "${event.key}"`);
      event.preventDefault();
      this.openDropdownAndStartTyping(event.key);
    }
  },

  navigateOptions(direction) {
    const options = Array.from(this.el.querySelectorAll('.search-combobox-option'));
    if (options.length === 0) return;

    let currentIndex = -1;
    const currentSelected = this.el.querySelector('.search-combobox-option[data-combobox-selected]');

    if (currentSelected) {
      currentIndex = options.indexOf(currentSelected);
    }

    let newIndex;
    if (direction === 'down') {
      newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    }

    const newOption = options[newIndex];
    if (newOption) {
      // Clear all selections and reset tabindex
      options.forEach(opt => {
        opt.removeAttribute('data-combobox-selected');
        opt.setAttribute('tabindex', '-1');
      });

      // Set new selection and make it focusable
      newOption.setAttribute('data-combobox-selected', '');
      newOption.setAttribute('tabindex', '0');

      // Scroll the option into view
      newOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

      // Focus the option for accessibility
      newOption.focus();

      console.log(`SearchCombobox: Navigated ${direction} to option:`, newOption.getAttribute('data-combobox-value'));
    }
  },

  isPrintableCharacter(key, event) {
    // Check if the key is a printable character (letters, numbers, symbols)
    // Exclude special keys like Tab, Shift, Control, etc.
    return key.length === 1 &&
           !event.ctrlKey &&
           !event.altKey &&
           !event.metaKey &&
           key !== ' '; // Space is handled separately above
  },

  openDropdownAndFocusSearch() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const searchInput = this.el.querySelector('.search-combobox-search-input');

    if (dropdown && searchInput) {
      console.log('SearchCombobox: Opening dropdown and focusing search input');
      // Open dropdown
      dropdown.removeAttribute('hidden');
      this.triggerButton.setAttribute('aria-expanded', 'true');
      this.dropdownWasOpen = true;

      // Send search event with empty string when dropdown opens, but only if search input is empty
      if (!searchInput.value || searchInput.value.trim() === '') {
        this.searchTerm = ''; // Clear stored search term
        this.sendSearchEvent('');
      }

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
      // Open dropdown
      dropdown.removeAttribute('hidden');
      this.triggerButton.setAttribute('aria-expanded', 'true');
      this.dropdownWasOpen = true;

      // Set the character in the search input and focus it
      searchInput.value = character;
      this.searchTerm = character;

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
      if (!this.isInsideCountrySelector) {
        // Only handle navigation if not inside CountrySelector
        event.preventDefault();
        this.navigateOptions(event.key === 'ArrowDown' ? 'down' : 'up');
      }
      // If inside CountrySelector, let the event bubble up to CountrySelector
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.selectHighlightedOption();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      dropdown.setAttribute('hidden', 'true');
      this.triggerButton.setAttribute('aria-expanded', 'false');
      this.dropdownWasOpen = false;
    }
  },

  selectHighlightedOption() {
    const selectedOption = this.el.querySelector('.search-combobox-option[data-combobox-selected]');
    if (selectedOption) {
      selectedOption.click();
      console.log('SearchCombobox: Selected highlighted option:', selectedOption.getAttribute('data-combobox-value'));
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
      searchInput.focus();
      // Position cursor at the end of the text
      if (searchInput.value) {
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
      }
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

    // Debounce the search request (300ms delay for better responsiveness)
    this.debounceTimer = setTimeout(() => {
      console.log(`Sending search for: "${this.searchTerm}"`);
      this.sendSearchEvent(this.searchTerm);
    }, 300);
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
    if (this.dropdownObserver) {
      this.dropdownObserver.disconnect();
    }
  },

  destroyed() {
    const key = this.el.parentElement ? this.el.parentElement.getAttribute('key') : 'unknown';
    console.log(`SearchCombobox destroyed with key: ${key}`);
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.cleanupHandlers();
  }
};

export default SearchCombobox;
