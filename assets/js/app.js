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
// Simplified CountrySelector hook - delegates most functionality to SearchCombobox
const CountrySelector = {
  mounted() {
    console.log('CountrySelector: Mounted - using SearchCombobox for all navigation');

    // Listen for form changes (country selections) to close dropdown
    this.el.addEventListener('change', (event) => {
      if (event.target.name === 'country') {
        // Close dropdown after selection
        this.closeDropdown();
      }
    });
  },

  updated() {
    console.log('CountrySelector: Updated - SearchCombobox handles all updates');
  },

  closeDropdown() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const trigger = this.el.querySelector('.search-combobox-trigger');

    if (dropdown && trigger) {
      dropdown.setAttribute('hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');

      // Update SearchCombobox state
      const comboboxWrapper = this.el.querySelector('#country-combobox-search-combobox-wrapper');
      if (comboboxWrapper && comboboxWrapper.__liveViewHook) {
        comboboxWrapper.__liveViewHook.dropdownWasOpen = false;
      }

      console.log('CountrySelector: Closed dropdown after selection');
    }
  },

  destroyed() {
    console.log('CountrySelector: Destroyed - minimal cleanup needed');
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

