defmodule GeoWeb.HomeLive do
  use GeoWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:selected_country, nil)
    }
  end

  # Forward group toggle events to the country selector component
  @impl true
  def handle_info({:country_selected, country}, socket) do
    {:noreply, assign(socket, :selected_country, country)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="p-6">
      <h1 class="text-3xl font-bold mb-4">Welcome to Geo!</h1>
      <.live_component
        module={GeoWeb.CountrySelector}
        id="country"
        selected_country={@selected_country}
      />

      <%= if @selected_country do %>
        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
          <h2 class="text-lg font-semibold mb-2">Selected Country (Ash Resource):</h2>
          <div class="flex items-center">
            <span class="text-2xl mr-3">{to_string(@selected_country.flag)}</span>
            <div>
              <div class="font-semibold">{to_string(@selected_country.name)}</div>
              <div class="text-sm text-gray-600">{to_string(@selected_country.iso_code)}</div>
            </div>
          </div>
          <div class="mt-2 text-xs text-gray-500">
            ID: {@selected_country.id} | Slug: {@selected_country.slug}
          </div>
        </div>
      <% end %>
    </div>
    """
  end
end
