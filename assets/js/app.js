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
import 'phoenix_html';
// Establish Phoenix Socket and LiveView configuration. Connect if there are
// any LiveViews on the page.
import { Socket } from 'phoenix';
import { LiveSocket } from 'phoenix_live_view';
import topbar from '../vendor/topbar';
import MishkaComponents from '../vendor/mishka_components.js';
import { ThemeToggle } from './theme_toggle.js';
import search_combobox from "../vendor/search_combobox";

// AutoDismiss Hook for flash messages
const AutoDismiss = {
  mounted() {
    // Check if element becomes visible (when disconnected event fires)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const isVisible = !this.el.hasAttribute('hidden') && 
                          this.el.style.display !== 'none' &&
                          this.el.style.opacity !== '0';
          
          if (isVisible && !this.timer) {
            this.startDismissTimer();
          }
        }
      });
    });
    
    observer.observe(this.el, { 
      attributes: true, 
      attributeFilter: ['style', 'hidden'] 
    });
    
    this.observer = observer;
  },
  
  startDismissTimer() {
    const dismissAfter = parseInt(this.el.dataset.dismissAfter || "5000");
    
    this.timer = setTimeout(() => {
      // Start the dissolve animation (2 seconds)
      this.el.style.transition = "opacity 2s ease-out, transform 2s ease-out";
      this.el.style.opacity = "0";
      this.el.style.transform = "scale(0.95)";
      
      // Hide element completely after animation
      setTimeout(() => {
        this.el.style.display = "none";
        this.el.setAttribute('hidden', '');
      }, 2000);
    }, dismissAfter);
  },
  
  destroyed() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    if (this.observer) {
      this.observer.disconnect();
    }
  }
};

let csrfToken = document
  .querySelector("meta[name='csrf-token']")
  .getAttribute('content');
let liveSocket = new LiveSocket('/live', Socket, {
  longPollFallbackMs: 2500,
  params: { _csrf_token: csrfToken },
  hooks: {
    ...MishkaComponents,
    ThemeToggle,
    search_combobox,
    AutoDismiss,
  },
});
// Show progress bar on live navigation and form submits
topbar.config({
  barColors: {
    0: '#29d',
  },
  shadowColor: 'rgba(0, 0, 0, .3)',
});
window.addEventListener('phx:page-loading-start', (_info) => topbar.show(300));
window.addEventListener('phx:page-loading-stop', (_info) => topbar.hide());
// connect if there are any LiveViews on the page
liveSocket.connect();
// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket;
