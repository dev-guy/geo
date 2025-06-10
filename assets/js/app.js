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

    // Initialize button interaction tracking
    this.hasScrolledThisSession = false;
    this.isButtonInteraction = false;
  },

  updated() {
    // Re-setup keyboard navigation after LiveView updates
    console.log('CountrySelector: Re-setting up keyboard navigation after update');
    this.setupKeyboardNavigation();

    // Ensure there's always a highlighted option for navigation
    setTimeout(() => {
      this.ensureHighlightedOption();
    }, 50);

    // Don't reset button interaction flag here - let the timeout handle it
    // This prevents premature clearing during LiveView updates
  },

  ensureHighlightedOption() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (!dropdown || dropdown.hasAttribute('hidden')) return;

    // If this is during a button interaction, use the no-scroll version instead
    if (this.isButtonInteraction || (this.buttonInteractionTime && Date.now() - this.buttonInteractionTime < 3000)) {
      console.log('CountrySelector: Using no-scroll version due to button interaction');
      this.ensureHighlightedOptionNoScroll();
      return;
    }

    const currentHighlighted = this.el.querySelector('.search-combobox-option[data-combobox-selected]');
    if (!currentHighlighted) {
      // No option is highlighted, find the first visible option and highlight it
      const firstOption = this.el.querySelector('.search-combobox-option');
      if (firstOption) {
        this.highlightOption(firstOption, true); // Prevent auto-scroll
        console.log('CountrySelector: Ensured highlighted option:', firstOption.getAttribute('data-combobox-value'));
      }
    }
  },

  setupKeyboardNavigation() {
    // Remove existing listeners if any
    if (this.boundKeyboardHandler) {
      const searchInput = this.el.querySelector('.search-combobox-search-input');
      if (searchInput) {
        searchInput.removeEventListener('keydown', this.boundKeyboardHandler);
      }
    }

    if (this.boundOptionKeyboardHandler) {
      // Remove existing option listeners
      const options = this.el.querySelectorAll('.search-combobox-option');
      options.forEach(option => {
        option.removeEventListener('keydown', this.boundOptionKeyboardHandler);
      });
    }

    if (this.boundButtonKeyboardHandler) {
      // Remove existing button listeners
      const buttons = this.el.querySelectorAll('button[title*="Toggle group"], button[title*="sort order"]');
      buttons.forEach(button => {
        button.removeEventListener('keydown', this.boundButtonKeyboardHandler);
        button.removeEventListener('click', this.boundButtonClickHandler);
      });
    }

    // Set up listener on search input
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (searchInput) {
      console.log('CountrySelector: Setting up keyboard navigation on search input');
      this.boundKeyboardHandler = (event) => {
        this.handleKeyboardNavigation(event);
      };
      searchInput.addEventListener('keydown', this.boundKeyboardHandler);
    } else {
      console.log('CountrySelector: Search input not found for keyboard navigation');
    }

    // Set up keyboard navigation on options themselves
    this.boundOptionKeyboardHandler = (event) => {
      this.handleKeyboardNavigation(event);
    };

    const options = this.el.querySelectorAll('.search-combobox-option');
    options.forEach(option => {
      // Make options focusable
      option.setAttribute('tabindex', '-1'); // Programmatically focusable but not in tab order by default
      option.addEventListener('keydown', this.boundOptionKeyboardHandler);

      // Handle click to focus
      option.addEventListener('click', () => {
        this.highlightOption(option);
      });
    });

    // Set up keyboard navigation and click tracking on group control buttons
    this.boundButtonKeyboardHandler = (event) => {
      // For buttons, we only want to handle specific keys and prevent unwanted navigation
      if (event.key === 'Enter' || event.key === ' ') {
        // Let Enter and Space activate the button (default behavior)
        console.log('CountrySelector: Button activated via keyboard');

        // Set the button interaction flag
        this.isButtonInteraction = true;
        this.buttonInteractionTime = Date.now();

        // Store current state like in click handler
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
          console.log('CountrySelector: Clearing button interaction flag after keyboard activation');
          this.isButtonInteraction = false;
          this.buttonInteractionTime = null;
          this.preButtonScrollTop = null;
          this.preButtonHighlightedValue = null;
        }, 2000);
      } else {
        // For other keys, use normal keyboard navigation
        this.handleKeyboardNavigation(event);
      }
    };

    this.boundButtonClickHandler = (event) => {
      // Don't prevent default or stop propagation - we need the LiveView events to work
      console.log('CountrySelector: Button clicked, setting long-duration interaction flag');
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
        console.log('CountrySelector: Clearing button interaction flag after extended timeout');
        this.isButtonInteraction = false;
        this.buttonInteractionTime = null;
        this.preButtonScrollTop = null;
        this.preButtonHighlightedValue = null;
      }, 2000); // Extended to 2 seconds
    };

    const buttons = this.el.querySelectorAll('button[title*="Toggle group"], button[title*="sort order"]');
    buttons.forEach(button => {
      // Make sure buttons are focusable
      if (!button.hasAttribute('tabindex')) {
        button.setAttribute('tabindex', '-1');
      }
      button.addEventListener('keydown', this.boundButtonKeyboardHandler);
      button.addEventListener('click', this.boundButtonClickHandler);
    });

    console.log(`CountrySelector: Set up keyboard navigation on ${options.length} options and ${buttons.length} control buttons`);
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
      case 'Tab':
        // Handle Tab key to navigate into options, but allow leaving combobox when appropriate
        const shouldLeaveCombobox = this.shouldTabLeaveCombobox(event.shiftKey);
        if (!shouldLeaveCombobox) {
          event.preventDefault();
          this.handleTabNavigation(event.shiftKey);
        }
        // If shouldLeaveCombobox is true, we don't prevent default, allowing natural tab behavior
        break;
      case 'Enter':
        event.preventDefault();
        this.selectHighlightedOption();
        break;
      case ' ':
        // Space key should navigate down one option (like arrow down) but not select
        event.preventDefault();
        console.log('CountrySelector: Space key pressed - navigating down one option');
        this.navigateOptions('down');
        break;
    }
  },

  handleTabNavigation(isShiftTab) {
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const currentFocused = document.activeElement;

    // Build group-based tab order
    const groupTabOrder = this.buildGroupTabOrder();

    if (groupTabOrder.length === 0) return;

    // Find current position in group tab order
    let currentGroupIndex = -1;
    let currentPositionInGroup = 'none'; // 'none', 'first-option', 'collapse-button', 'sort-button'

    // Check if we're coming from search input
    if (currentFocused === searchInput) {
      currentGroupIndex = -1;
      currentPositionInGroup = 'none';
    } else {
      // Find which group and position we're currently in
      for (let i = 0; i < groupTabOrder.length; i++) {
        const group = groupTabOrder[i];

        // Check if current focus is the first option in this group
        if (group.firstOption && currentFocused === group.firstOption) {
          currentGroupIndex = i;
          currentPositionInGroup = 'first-option';
          break;
        }

        // Check if current focus is the collapse button
        if (group.collapseButton && currentFocused === group.collapseButton) {
          currentGroupIndex = i;
          currentPositionInGroup = 'collapse-button';
          break;
        }

        // Check if current focus is the sort button
        if (group.sortButton && currentFocused === group.sortButton) {
          currentGroupIndex = i;
          currentPositionInGroup = 'sort-button';
          break;
        }

        // Check if current focus is any option in this group (highlighted)
        if (group.firstOption && group.firstOption.hasAttribute('data-combobox-selected')) {
          currentGroupIndex = i;
          currentPositionInGroup = 'first-option';
          break;
        }
      }
    }

    if (isShiftTab) {
      this.handleShiftTabNavigation(currentGroupIndex, currentPositionInGroup, groupTabOrder, searchInput);
    } else {
      this.handleTabNavigation_Forward(currentGroupIndex, currentPositionInGroup, groupTabOrder, searchInput);
    }
  },

  handleTabNavigation_Forward(currentGroupIndex, currentPositionInGroup, groupTabOrder, searchInput) {
    if (currentGroupIndex === -1) {
      // Coming from search input - go to collapse button if exists, otherwise sort button, otherwise first option
      if (groupTabOrder.length > 0) {
        const firstGroup = groupTabOrder[0];
        if (firstGroup.collapseButton) {
          this.clearAllHighlights();
          firstGroup.collapseButton.focus();
          console.log('CountrySelector: Tab from search - focused first group collapse button');
        } else if (firstGroup.sortButton) {
          this.clearAllHighlights();
          firstGroup.sortButton.focus();
          console.log('CountrySelector: Tab from search - focused first group sort button');
        } else if (firstGroup.firstOption) {
          this.highlightOption(firstGroup.firstOption, true);
          console.log('CountrySelector: Tab from search - highlighted first option of first group (no buttons)');
        }
      }
      return;
    }

    const currentGroup = groupTabOrder[currentGroupIndex];

    if (currentPositionInGroup === 'first-option') {
      // Currently on first option - check if this is the last group
      const nextGroupIndex = currentGroupIndex + 1;
      if (nextGroupIndex < groupTabOrder.length) {
        // Move to next group's collapse button (or first option if no collapse button)
        const nextGroup = groupTabOrder[nextGroupIndex];
        if (nextGroup.collapseButton) {
          this.clearAllHighlights();
          nextGroup.collapseButton.focus();
          console.log('CountrySelector: Tab from first option - focused next group collapse button');
        } else if (nextGroup.firstOption) {
          this.highlightOption(nextGroup.firstOption, true);
          console.log('CountrySelector: Tab from first option - highlighted next group first option (no collapse button)');
        }
      } else {
        // This is the last group - tab should leave the combobox (handled by shouldTabLeaveCombobox)
        console.log('CountrySelector: Tab from last group first option - should leave combobox');
      }
    } else if (currentPositionInGroup === 'collapse-button') {
      // Currently on collapse button - move to sort button if exists, otherwise to first option of same group
      if (currentGroup.sortButton) {
        currentGroup.sortButton.focus();
        console.log('CountrySelector: Tab from collapse button - focused sort button');
      } else if (currentGroup.firstOption) {
        this.highlightOption(currentGroup.firstOption, true);
        console.log('CountrySelector: Tab from collapse button - highlighted first option (no sort button)');
      } else {
        // No sort button and no first option - should leave combobox (handled by shouldTabLeaveCombobox)
        console.log('CountrySelector: Tab from collapse button with no other elements - should leave combobox');
      }
    } else if (currentPositionInGroup === 'sort-button') {
      // Currently on sort button - move to first option of same group, or leave combobox if last group and no options
      if (currentGroup.firstOption) {
        this.highlightOption(currentGroup.firstOption, true);
        console.log('CountrySelector: Tab from sort button - highlighted first option');
      } else {
        // No first option - should leave combobox (handled by shouldTabLeaveCombobox)
        console.log('CountrySelector: Tab from sort button with no first option - should leave combobox');
      }
    }
  },

  handleShiftTabNavigation(currentGroupIndex, currentPositionInGroup, groupTabOrder, searchInput) {
    if (currentGroupIndex === -1) {
      // Coming from search input - this shouldn't happen in normal flow
      return;
    }

    const currentGroup = groupTabOrder[currentGroupIndex];

    if (currentPositionInGroup === 'first-option') {
      // Currently on first option - move to sort button if exists, otherwise collapse button of same group
      if (currentGroup.sortButton) {
        this.clearAllHighlights();
        currentGroup.sortButton.focus();
        console.log('CountrySelector: Shift+Tab from first option - focused sort button');
      } else if (currentGroup.collapseButton) {
        this.clearAllHighlights();
        currentGroup.collapseButton.focus();
        console.log('CountrySelector: Shift+Tab from first option - focused collapse button');
      } else if (currentGroupIndex === 0) {
        // First group with no buttons - go back to search input
        this.clearAllHighlights();
        searchInput.focus();
        console.log('CountrySelector: Shift+Tab from first group first option (no buttons) - focused search input');
      } else {
        // Move to previous group's first option
        const prevGroupIndex = currentGroupIndex - 1;
        if (prevGroupIndex >= 0 && groupTabOrder[prevGroupIndex].firstOption) {
          this.highlightOption(groupTabOrder[prevGroupIndex].firstOption, true);
          console.log('CountrySelector: Shift+Tab from first option - highlighted previous group first option');
        }
      }
    } else if (currentPositionInGroup === 'sort-button') {
      // Currently on sort button - move to collapse button of same group, or to search input if first group
      if (currentGroup.collapseButton) {
        currentGroup.collapseButton.focus();
        console.log('CountrySelector: Shift+Tab from sort button - focused collapse button');
      } else if (currentGroupIndex === 0) {
        // First group with no collapse button - go back to search input
        this.clearAllHighlights();
        searchInput.focus();
        console.log('CountrySelector: Shift+Tab from first group sort button (no collapse button) - focused search input');
      }
    } else if (currentPositionInGroup === 'collapse-button') {
      // Currently on collapse button
      if (currentGroupIndex === 0) {
        // First group collapse button - go back to search input
        this.clearAllHighlights();
        searchInput.focus();
        console.log('CountrySelector: Shift+Tab from first group collapse button - focused search input');
      } else {
        // Move to first option of previous group
        const prevGroupIndex = currentGroupIndex - 1;
        if (prevGroupIndex >= 0 && groupTabOrder[prevGroupIndex].firstOption) {
          this.highlightOption(groupTabOrder[prevGroupIndex].firstOption, true);
          console.log('CountrySelector: Shift+Tab from collapse button - highlighted previous group first option');
        }
      }
    }
  },

  buildGroupTabOrder() {
    const groupTabOrder = [];

    // Find all groups in order
    const groups = Array.from(this.el.querySelectorAll('.option-group'));

    groups.forEach(group => {
      const groupInfo = {
        group: group,
        collapseButton: null,
        sortButton: null,
        firstOption: null
      };

      const groupLabel = group.querySelector('.group-label');
      if (groupLabel) {
        // Find collapse/expand button
        groupInfo.collapseButton = groupLabel.querySelector('button[title*="Toggle group visibility"]');

        // Find sort button
        groupInfo.sortButton = groupLabel.querySelector('button[title*="sort order"]');
      }

      // Find first visible option in this group
      const options = Array.from(group.querySelectorAll('.search-combobox-option'));
      if (options.length > 0) {
        groupInfo.firstOption = options[0];
      }

      // Only add groups that have at least a first option or control buttons
      if (groupInfo.firstOption || groupInfo.collapseButton || groupInfo.sortButton) {
        groupTabOrder.push(groupInfo);
      }
    });

    // Handle ungrouped options as a single "group"
    const ungroupedOptions = Array.from(this.el.querySelectorAll('.search-combobox-option')).filter(option => {
      return !option.closest('.option-group');
    });

    if (ungroupedOptions.length > 0) {
      groupTabOrder.push({
        group: null,
        collapseButton: null,
        sortButton: null,
        firstOption: ungroupedOptions[0]
      });
    }

    console.log(`CountrySelector: Built group tab order with ${groupTabOrder.length} groups`);
    return groupTabOrder;
  },

    shouldTabLeaveCombobox(isShiftTab) {
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const currentFocused = document.activeElement;
    const groupTabOrder = this.buildGroupTabOrder();

    if (groupTabOrder.length === 0) return true; // No groups, allow leaving

    // Find current position
    let currentGroupIndex = -1;
    let currentPositionInGroup = 'none';

    if (currentFocused === searchInput) {
      // On search input - only leave on Shift+Tab
      return isShiftTab;
    }

    // Find which group and position we're currently in
    for (let i = 0; i < groupTabOrder.length; i++) {
      const group = groupTabOrder[i];

      if (group.firstOption && (currentFocused === group.firstOption || group.firstOption.hasAttribute('data-combobox-selected'))) {
        currentGroupIndex = i;
        currentPositionInGroup = 'first-option';
        break;
      }

      if (group.collapseButton && currentFocused === group.collapseButton) {
        currentGroupIndex = i;
        currentPositionInGroup = 'collapse-button';
        break;
      }

      if (group.sortButton && currentFocused === group.sortButton) {
        currentGroupIndex = i;
        currentPositionInGroup = 'sort-button';
        break;
      }
    }

        if (isShiftTab) {
      // Shift+Tab: never leave the combobox via natural tab behavior
      // Our custom navigation will handle going back to search input
      return false;
    } else {
      // Tab: leave if we're at the end (last group, last element)
      const lastGroupIndex = groupTabOrder.length - 1;
      if (currentGroupIndex === lastGroupIndex) {
        const lastGroup = groupTabOrder[lastGroupIndex];

        // Check if we're on the last element of the last group
        if (currentPositionInGroup === 'first-option') {
          // We're on first option of last group - this should be the last stop before leaving
          return true;
        } else if (currentPositionInGroup === 'sort-button' && !lastGroup.firstOption) {
          // We're on sort button and there's no first option - leave
          return true;
        } else if (currentPositionInGroup === 'collapse-button' && !lastGroup.sortButton && !lastGroup.firstOption) {
          // We're on collapse button, no sort button, no first option - leave
          return true;
        }
      }
    }

    return false; // Stay in combobox
  },

  allowTabToLeaveCombobox() {
    // Clear all highlights when leaving combobox
    this.clearAllHighlights();
    console.log('CountrySelector: Cleared highlights, allowing tab to leave combobox');
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

    // Set focus on the option for accessibility
    option.setAttribute('tabindex', '0');
    option.focus();

    const value = option.getAttribute('data-combobox-value');
    console.log('CountrySelector: Highlighted and focused option:', value);

    // Notify SearchCombobox hook to update its tracking
    this.notifySearchComboboxOfHighlightChange(value);
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
      console.log('CountrySelector: Closed dropdown via keyboard');
    }
  },

  navigateOptions(direction) {
    const options = Array.from(this.el.querySelectorAll('.search-combobox-option'));
    if (options.length === 0) return;

    // Find the currently highlighted option
    let currentIndex = -1;
    const currentHighlighted = this.el.querySelector('.search-combobox-option[data-combobox-selected]');

    if (currentHighlighted) {
      currentIndex = options.indexOf(currentHighlighted);
    }

    let targetIndex;
    if (direction === 'down') {
      if (currentIndex < options.length - 1) {
        targetIndex = currentIndex + 1;
      } else {
        // Already at last option, don't navigate
        console.log('CountrySelector: Already at last option');
        return;
      }
    } else { // direction === 'up'
      if (currentIndex > 0) {
        targetIndex = currentIndex - 1;
      } else {
        // Already at first option, behave like Shift+Tab
        console.log('CountrySelector: At first option, applying Shift+Tab logic');
        this.handleUpArrowFromFirstOption();
        return;
      }
    }

    const targetOption = options[targetIndex];
    if (targetOption) {
      // Clear all highlights first
      this.clearAllHighlights();

      // Highlight the new option
      targetOption.setAttribute('data-combobox-selected', '');
      targetOption.setAttribute('tabindex', '0');
      targetOption.focus();

      // Scroll the option into view smoothly
      targetOption.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });

      const value = targetOption.getAttribute('data-combobox-value');
      console.log(`CountrySelector: Navigated ${direction} to option ${value} (index ${currentIndex} → ${targetIndex})`);

      // Notify SearchCombobox hook to update its tracking
      this.notifySearchComboboxOfHighlightChange(value);
    }
  },

  handleUpArrowFromFirstOption() {
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const groupTabOrder = this.buildGroupTabOrder();

    if (groupTabOrder.length === 0) {
      // No groups, focus search input
      this.clearAllHighlights();
      searchInput.focus();
      console.log('CountrySelector: Up arrow from first option (no groups) - focused search input');
      return;
    }

    // Find the first group (where the first option is located)
    const firstGroup = groupTabOrder[0];

    // Apply the same logic as Shift+Tab from first option
    if (firstGroup.sortButton) {
      this.clearAllHighlights();
      firstGroup.sortButton.focus();
      console.log('CountrySelector: Up arrow from first option - focused sort button');
    } else if (firstGroup.collapseButton) {
      this.clearAllHighlights();
      firstGroup.collapseButton.focus();
      console.log('CountrySelector: Up arrow from first option - focused collapse button');
    } else {
      // First group with no buttons - go back to search input
      this.clearAllHighlights();
      searchInput.focus();
      console.log('CountrySelector: Up arrow from first option (no buttons) - focused search input');
    }
  },

  scrollToOptionMaintainPosition(option, direction) {
    const scrollArea = this.el.querySelector('.scroll-viewport');
    if (!option || !scrollArea) return;

    const optionTop = option.offsetTop;
    const optionHeight = option.offsetHeight;
    const optionBottom = optionTop + optionHeight;
    const scrollAreaHeight = scrollArea.clientHeight;
    const currentScrollTop = scrollArea.scrollTop;
    const viewportTop = currentScrollTop;
    const viewportBottom = currentScrollTop + scrollAreaHeight;

    // Check if option is already fully visible
    if (optionTop >= viewportTop && optionBottom <= viewportBottom) {
      // Option is fully visible, no scrolling needed
      console.log('CountrySelector: Option already visible, no scroll needed');
      return;
    }

    let newScrollTop = currentScrollTop;

    if (direction === 'down') {
      // Moving down: if option is below viewport, scroll to keep it at the bottom
      if (optionBottom > viewportBottom) {
        newScrollTop = optionBottom - scrollAreaHeight + 5; // 5px padding from bottom
      }
    } else {
      // Moving up: if option is above viewport, scroll to keep it at the top
      if (optionTop < viewportTop) {
        newScrollTop = optionTop - 5; // 5px padding from top
      }
    }

    // Ensure we don't scroll beyond bounds
    const maxScrollTop = scrollArea.scrollHeight - scrollAreaHeight;
    newScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));

    // Only scroll if there's a meaningful change
    if (Math.abs(newScrollTop - currentScrollTop) > 2) {
      scrollArea.scrollTo({
        top: newScrollTop,
        behavior: 'smooth'
      });
      console.log(`CountrySelector: Maintained position scroll from ${currentScrollTop} to ${newScrollTop} (diff: ${newScrollTop - currentScrollTop}) for option ${option.getAttribute('data-combobox-value')}`);
    }
  },

  isFirstInGroup(option) {
    const optionGroup = option.closest('.option-group');
    if (!optionGroup) return false;

    const groupOptions = Array.from(optionGroup.querySelectorAll('.search-combobox-option'));
    return groupOptions.indexOf(option) === 0;
  },

  notifySearchComboboxOfHighlightChange(value) {
    // Find the SearchCombobox hook instance and update its tracking
    const comboboxWrapper = this.el.querySelector('#country-combobox-search-combobox-wrapper');
    if (comboboxWrapper && comboboxWrapper.__liveViewHook) {
      comboboxWrapper.__liveViewHook.highlightedOptionValue = value;
      console.log('CountrySelector: Notified SearchCombobox of highlight change:', value);
    }
  },

  selectHighlightedOption() {
    const selectedOption = this.el.querySelector('.search-combobox-option[data-combobox-selected]');
    if (selectedOption) {
      selectedOption.click();
      console.log('CountrySelector: Selected option via keyboard:', selectedOption.getAttribute('data-combobox-value'));
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
          console.log(`CountrySelector: Scrolled to show group label from ${currentScrollTop} to ${newScrollTop}`);
        }
        return;
      }
    }

    // Calculate minimal scroll needed
    let newScrollTop = currentScrollTop;

    if (optionTop < viewportTop) {
      // Option is above viewport - scroll up just enough to show the top edge
      newScrollTop = optionTop - 2; // Minimal padding
    } else if (optionBottom > viewportBottom) {
      // Option is below viewport - scroll down just enough to show the bottom edge
      // Use minimal scroll: just enough to make the option visible
      const minimalScroll = optionBottom - viewportBottom + 2; // Minimal padding
      newScrollTop = currentScrollTop + minimalScroll;
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
      console.log(`CountrySelector: Minimal scroll from ${currentScrollTop} to ${newScrollTop} (diff: ${newScrollTop - currentScrollTop}) for option ${option.getAttribute('data-combobox-value')}`);
    }
  },

  observeDropdownOpening() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (dropdown) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
            if (!dropdown.hasAttribute('hidden')) {
              // Dropdown just opened - check if this is due to button interaction
              if (this.isButtonInteraction || (this.buttonInteractionTime && Date.now() - this.buttonInteractionTime < 3000)) {
                console.log('CountrySelector: Dropdown opened after button interaction - preventing auto-scroll');
                // Don't highlight/scroll - just ensure there's a highlighted option without scrolling
                setTimeout(() => {
                  this.ensureHighlightedOptionNoScroll();
                }, 50);
              } else {
                console.log('CountrySelector: Dropdown opened normally - allowing scroll to selected');
                // Normal dropdown opening, check if this is an initial opening (no search query)
                setTimeout(() => {
                  this.highlightSelectedOption();
                }, 50); // Small delay to ensure DOM is ready
              }
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

  ensureHighlightedOptionNoScroll() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (!dropdown || dropdown.hasAttribute('hidden')) return;

    // If this is after a button interaction, try to restore the previous state
    if (this.isButtonInteraction && this.preButtonHighlightedValue) {
      const previousOption = this.el.querySelector(`.search-combobox-option[data-combobox-value="${this.preButtonHighlightedValue}"]`);
      if (previousOption) {
        this.highlightOption(previousOption, true); // Prevent scroll
        console.log('CountrySelector: Restored previous highlighted option after button interaction:', this.preButtonHighlightedValue);

        // Restore scroll position if available
        if (this.preButtonScrollTop !== null) {
          const scrollArea = this.el.querySelector('.scroll-viewport');
          if (scrollArea) {
            scrollArea.scrollTop = this.preButtonScrollTop;
            console.log('CountrySelector: Restored scroll position after button interaction:', this.preButtonScrollTop);
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
        console.log('CountrySelector: Highlighted first option without scrolling');
      }
      return;
    }

    const currentValue = selectEl.value;

    // Find and highlight the option with the current value, but don't scroll
    const option = this.el.querySelector(`.search-combobox-option[data-combobox-value="${currentValue}"]`);
    if (option) {
      this.highlightOption(option, true); // Prevent scroll
      console.log('CountrySelector: Highlighted selected option without scrolling:', currentValue);
    } else {
      // Fallback to first option
      const firstOption = this.el.querySelector('.search-combobox-option');
      if (firstOption) {
        this.highlightOption(firstOption, true); // Prevent scroll
        console.log('CountrySelector: Option not found, highlighted first option without scrolling');
      }
    }
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
    // Find the first visible option
    const firstOption = this.el.querySelector('.search-combobox-option');
    if (firstOption) {
      this.highlightOption(firstOption, true); // Prevent auto-scroll during search
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

    // Check various conditions that should prevent scrolling
    const shouldNotScroll = hasSearchQuery ||
                           this.hasScrolledThisSession ||
                           this.isButtonInteraction;

    // Only scroll to the selected option if there's no search query, we haven't scrolled yet this session,
    // and this is not a button interaction
    if (!shouldNotScroll) {
      this.scrollToSelectedOption(currentValue);
      this.hasScrolledThisSession = true;
    } else {
      if (hasSearchQuery) {
        console.log('CountrySelector: Skipping scroll due to active search query:', searchInput.value);
      } else if (this.hasScrolledThisSession) {
        console.log('CountrySelector: Skipping scroll - already scrolled this session');
      } else if (this.isButtonInteraction) {
        console.log('CountrySelector: Skipping scroll due to button interaction');
      }
    }
  },

  scrollToSelectedOption(currentValue) {
    // Wait a bit for the DOM to update with the selected attribute
    setTimeout(() => {
      const selectedOption = this.el.querySelector(`.search-combobox-option[data-combobox-value="${currentValue}"]`);
      const scrollArea = this.el.querySelector('.scroll-viewport');

      if (selectedOption && scrollArea) {
        // Only scroll on initial load, not after button clicks
        // Use the improved scrollToOption method
        this.scrollToOption(selectedOption, false);
        console.log('CountrySelector: Scrolled to selected option:', currentValue);
      } else {
        console.log('CountrySelector: Could not find elements for scrolling. Option:', !!selectedOption, 'ScrollArea:', !!scrollArea);
      }
    }, 100);
  },

  manuallyHighlightOption(currentValue) {
    // Find and highlight the option with the current value
    const option = this.el.querySelector(`.search-combobox-option[data-combobox-value="${currentValue}"]`);
    if (option) {
      this.highlightOption(option, true); // Prevent auto-scroll during manual highlighting
      console.log('CountrySelector: Manually highlighted option:', currentValue);
    }
  },

  destroyed() {
    // Clean up keyboard handlers
    if (this.boundKeyboardHandler) {
      const searchInput = this.el.querySelector('.search-combobox-search-input');
      if (searchInput) {
        searchInput.removeEventListener('keydown', this.boundKeyboardHandler);
      }
    }

    if (this.boundOptionKeyboardHandler) {
      const options = this.el.querySelectorAll('.search-combobox-option');
      options.forEach(option => {
        option.removeEventListener('keydown', this.boundOptionKeyboardHandler);
      });
    }

    if (this.boundButtonKeyboardHandler) {
      const buttons = this.el.querySelectorAll('button[title*="Toggle group"], button[title*="sort order"]');
      buttons.forEach(button => {
        button.removeEventListener('keydown', this.boundButtonKeyboardHandler);
        button.removeEventListener('click', this.boundButtonClickHandler);
      });
    }

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
    if (this.buttonInteractionTimeout) {
      clearTimeout(this.buttonInteractionTimeout);
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

