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
