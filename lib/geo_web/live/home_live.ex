defmodule GeoWeb.HomeLive do
  use GeoWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:selected_country, Geo.Geography.get_country_iso_code_cached!("AU"))
     |> assign(:theme, "system")}
  end

  # Forward group toggle events to the country selector component
  @impl true
  def handle_info({:country_selected, country}, socket) do
    {:noreply, assign(socket, :selected_country, country)}
  end

  @impl true
  def handle_event("cycle_theme", _params, socket) do
    new_theme =
      case socket.assigns.theme do
        "system" -> "light"
        "light" -> "dark"
        "dark" -> "system"
      end

    {:noreply,
     socket
     |> assign(:theme, new_theme)
     |> push_event("cycle_theme", %{theme: new_theme})}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class={[@theme]} phx-hook="ThemeToggle" id="theme-container">
      <div class="p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-200 flex flex-col">
        <div class="flex-grow">
          <h1 class="text-3xl font-bold mb-4">Welcome to Geo!</h1>
          <.live_component
            module={GeoWeb.CountrySelector}
            id="country-selector-v2"
            selected_country={@selected_country}
          />

          <%= if @selected_country do %>
            <div class="mt-6 p-4 bg-blue-50 dark:bg-gray-800 rounded-lg">
              <h2 class="text-lg font-semibold mb-2">Selected Country:</h2>
              <div class="flex items-center">
                <span class="text-2xl mr-3">{to_string(@selected_country.flag)}</span>
                <div>
                  <div class="font-semibold">{to_string(@selected_country.name)}</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300">
                    {to_string(@selected_country.iso_code)}
                  </div>
                </div>
              </div>
              <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                ID: {@selected_country.id} | Slug: {@selected_country.slug}
              </div>
            </div>
          <% end %>
        </div>

        <div class="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a
            href="https://fly.io"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <span>Powered by</span>
            <img
              src="/images/fly-logo.png"
              alt="Fly.io"
              class="h-6 w-auto"
            />
          </a>
        </div>
      </div>
    </div>
    """
  end
end
