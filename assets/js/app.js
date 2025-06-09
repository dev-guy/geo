// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"
// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "../vendor/some-package.js"
//
// Alternatively, you can `npm install some-package --prefix assets` and import
// them using a path starting with the package name:
//
//     import "some-package"
//
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
// Establish Phoenix Socket and LiveView configuration.
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import topbar from "../vendor/topbar";
import MishkaComponents from "../vendor/mishka_components.js";
let csrfToken = document
  .querySelector("meta[name='csrf-token']")
  .getAttribute("content");
// Hook to handle country selector dropdown closing
const CountrySelector = {
  mounted() {
    // Listen for form changes (country selections)
    this.el.addEventListener('change', (event) => {
      if (event.target.name === 'country') {
        // Close dropdown immediately and prevent SearchCombobox from reopening it
        this.closeDropdownPermanently();
      }
    });

    // Listen for dropdown opening to ensure selected option is highlighted
    this.observeDropdownOpening();

    // Set up keyboard navigation
    this.setupKeyboardNavigation();
  },

  setupKeyboardNavigation() {
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (event) => {
        this.handleKeyboardNavigation(event);
      });
    }
  },

  handleKeyboardNavigation(event) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (!dropdown || dropdown.hasAttribute('hidden')) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.navigateOptions('down');
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateOptions('up');
        break;
      case 'Enter':
        event.preventDefault();
        this.selectHighlightedOption();
        break;
    }
  },

  closeDropdown() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const trigger = this.el.querySelector('.search-combobox-trigger');

    if (dropdown && trigger) {
      dropdown.setAttribute('hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      console.log('CountrySelector: Closed dropdown via keyboard');
    }
  },

  navigateOptions(direction) {
    const options = Array.from(this.el.querySelectorAll('.search-combobox-option'));
    const currentSelected = this.el.querySelector('.search-combobox-option[data-combobox-selected]');

    if (options.length === 0) return;

    let newIndex = 0;

    if (currentSelected) {
      const currentIndex = options.indexOf(currentSelected);
      if (direction === 'down') {
        newIndex = (currentIndex + 1) % options.length;
      } else {
        newIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
      }
    }

    // Clear all selections
    options.forEach(opt => opt.removeAttribute('data-combobox-selected'));

    // Select new option
    const newOption = options[newIndex];
    if (newOption) {
      newOption.setAttribute('data-combobox-selected', '');
      this.scrollToOption(newOption);
      console.log('CountrySelector: Navigated to option:', newOption.getAttribute('data-combobox-value'));
    }
  },

  selectHighlightedOption() {
    const selectedOption = this.el.querySelector('.search-combobox-option[data-combobox-selected]');
    if (selectedOption) {
      selectedOption.click();
      console.log('CountrySelector: Selected option via keyboard:', selectedOption.getAttribute('data-combobox-value'));
    }
  },

  scrollToOption(option) {
    const scrollArea = this.el.querySelector('.scroll-viewport');
    if (option && scrollArea) {
      const optionTop = option.offsetTop;
      const optionHeight = option.offsetHeight;
      const scrollAreaHeight = scrollArea.clientHeight;
      const scrollTop = scrollArea.scrollTop;

      // Check if option is visible
      const optionBottom = optionTop + optionHeight;
      const viewportTop = scrollTop;
      const viewportBottom = scrollTop + scrollAreaHeight;

      if (optionTop < viewportTop) {
        // Option is above viewport, scroll up
        scrollArea.scrollTo({
          top: optionTop - 10, // Small padding
          behavior: 'smooth'
        });
      } else if (optionBottom > viewportBottom) {
        // Option is below viewport, scroll down
        scrollArea.scrollTo({
          top: optionBottom - scrollAreaHeight + 10, // Small padding
          behavior: 'smooth'
        });
      }
    }
  },

  observeDropdownOpening() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (dropdown) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
            if (!dropdown.hasAttribute('hidden')) {
              // Dropdown just opened, check if this is an initial opening (no search query)
              setTimeout(() => {
                this.highlightSelectedOption();
              }, 50); // Small delay to ensure DOM is ready
            } else {
              // Dropdown closed, reset the scroll flag for next time
              this.hasScrolledThisSession = false;
            }
          }
        });
      });

      observer.observe(dropdown, { attributes: true, attributeFilter: ['hidden'] });
      this.dropdownObserver = observer;
    }

    // Also observe for content changes to handle search results
    this.observeSearchResults();
  },

  observeSearchResults() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (dropdown) {
      const contentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'subtree') {
            // Content changed, check if we need to highlight first option during search
            setTimeout(() => {
              this.handleSearchResultsUpdate();
            }, 50);
          }
        });
      });

      contentObserver.observe(dropdown, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-combobox-selected']
      });
      this.contentObserver = contentObserver;
    }
  },

  handleSearchResultsUpdate() {
    // Throttle the updates to prevent excessive highlighting
    if (this.searchUpdateTimeout) {
      clearTimeout(this.searchUpdateTimeout);
    }

    this.searchUpdateTimeout = setTimeout(() => {
      const searchInput = this.el.querySelector('.search-combobox-search-input');
      const hasSearchQuery = searchInput && searchInput.value.trim().length > 0;

      if (hasSearchQuery) {
        // User is searching, highlight the first visible option
        this.highlightFirstOption();
      }
    }, 100);
  },

  highlightFirstOption() {
    // Clear all existing selections first
    this.el.querySelectorAll('.search-combobox-option[data-combobox-selected]')
      .forEach(opt => opt.removeAttribute('data-combobox-selected'));

    // Find the first visible option
    const firstOption = this.el.querySelector('.search-combobox-option');
    if (firstOption) {
      firstOption.setAttribute('data-combobox-selected', '');
      // Scroll to the first option during search
      this.scrollToOption(firstOption);
      console.log('CountrySelector: Highlighted first search result:', firstOption.getAttribute('data-combobox-value'));
    }
  },

  highlightSelectedOption() {
    // Get the current value from the hidden select element
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl) return;

    const currentValue = selectEl.value;
    if (!currentValue) return;

    // Check if there are characters in the search input
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const hasSearchQuery = searchInput && searchInput.value.trim().length > 0;

    // Find the SearchCombobox hook instance and call initializeSelection
    const comboboxWrapper = this.el.querySelector('#country-combobox-search-combobox-wrapper');
    if (comboboxWrapper && comboboxWrapper.__liveViewHook) {
      // Call the SearchCombobox's initializeSelection method
      comboboxWrapper.__liveViewHook.initializeSelection();
      console.log('CountrySelector: Triggered selection highlighting for value:', currentValue);
    } else {
      // Fallback: manually set the selected attribute
      this.manuallyHighlightOption(currentValue);
    }

    // Only scroll to the selected option if there's no search query and we haven't scrolled yet this session
    if (!hasSearchQuery && !this.hasScrolledThisSession) {
      this.scrollToSelectedOption(currentValue);
      this.hasScrolledThisSession = true;
    } else if (hasSearchQuery) {
      console.log('CountrySelector: Skipping scroll due to active search query:', searchInput.value);
    } else if (this.hasScrolledThisSession) {
      console.log('CountrySelector: Skipping scroll - already scrolled this session');
    }
  },

  scrollToSelectedOption(currentValue) {
    // Wait a bit for the DOM to update with the selected attribute
    setTimeout(() => {
      const selectedOption = this.el.querySelector(`.search-combobox-option[data-combobox-value="${currentValue}"]`);
      const scrollArea = this.el.querySelector('.scroll-viewport');

      if (selectedOption && scrollArea) {
        // Calculate the position to scroll to
        const optionTop = selectedOption.offsetTop;
        const optionHeight = selectedOption.offsetHeight;
        const scrollAreaHeight = scrollArea.clientHeight;

        // Center the selected option in the viewport
        const scrollTop = optionTop - (scrollAreaHeight / 2) + (optionHeight / 2);

        scrollArea.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth'
        });

        console.log('CountrySelector: Scrolled to selected option:', currentValue, 'at position:', optionTop);
      } else {
        console.log('CountrySelector: Could not find elements for scrolling. Option:', !!selectedOption, 'ScrollArea:', !!scrollArea);
      }
    }, 100);
  },

  manuallyHighlightOption(currentValue) {
    // Clear all existing selections
    this.el.querySelectorAll('.search-combobox-option[data-combobox-selected]')
      .forEach(opt => opt.removeAttribute('data-combobox-selected'));

    // Find and highlight the option with the current value
    const option = this.el.querySelector(`.search-combobox-option[data-combobox-value="${currentValue}"]`);
    if (option) {
      option.setAttribute('data-combobox-selected', '');
      console.log('CountrySelector: Manually highlighted option:', currentValue);
    }
  },

  destroyed() {
    // Clean up observers
    if (this.dropdownObserver) {
      this.dropdownObserver.disconnect();
    }
    if (this.contentObserver) {
      this.contentObserver.disconnect();
    }
    if (this.searchUpdateTimeout) {
      clearTimeout(this.searchUpdateTimeout);
    }
  },

  closeDropdownPermanently() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const trigger = this.el.querySelector('.search-combobox-trigger');

    if (dropdown && trigger) {
      // Close the dropdown
      dropdown.setAttribute('hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');

      // Find the SearchCombobox LiveView hook instance and reset its state
      const comboboxWrapper = this.el.querySelector('#country-combobox-search-combobox-wrapper');
      if (comboboxWrapper && comboboxWrapper.__liveViewHook) {
        // Reset the dropdownWasOpen state to prevent restoration
        comboboxWrapper.__liveViewHook.dropdownWasOpen = false;
        console.log('CountrySelector: Reset SearchCombobox dropdown state');
      }

      // Also set up a mutation observer to prevent any future reopening
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
            if (!dropdown.hasAttribute('hidden')) {
              // Something tried to open the dropdown, close it again
              dropdown.setAttribute('hidden', 'true');
              trigger.setAttribute('aria-expanded', 'false');
              console.log('CountrySelector: Prevented dropdown reopening');
            }
          }
        });
      });

      observer.observe(dropdown, { attributes: true, attributeFilter: ['hidden'] });

      // Clean up observer after a short time
      setTimeout(() => observer.disconnect(), 1000);
    }
  }
};

let liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: {
    _csrf_token: csrfToken,
  },
  hooks: {
    ...MishkaComponents,
    CountrySelector,
  },
});
// Show progress bar on live navigation and form submits
topbar.config({
  barColors: {
    0: "#29d",
  },
  shadowColor: "rgba(0, 0, 0, .3)",
});
window.addEventListener("phx:page-loading-start", (_info) => topbar.show(300));
window.addEventListener("phx:page-loading-stop", (_info) => topbar.hide());
// connect if there are any LiveViews on the page
liveSocket.connect();
// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket;
