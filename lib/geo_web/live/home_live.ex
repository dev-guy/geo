defmodule GeoWeb.HomeLive do
  use GeoWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:selected_country, nil)
    }
  end

  @impl true
  def handle_event("selection_updated", %{"value" => country}, socket) do
    {:noreply, assign(socket, :selected_country, country)}
  end

  @impl true
  def handle_event("country_selected", %{"value" => country}, socket) do
    {:noreply, assign(socket, :selected_country, country)}
  end

  # Forward group toggle events to the country selector component
  @impl true
  def handle_event("toggle_iso_code_sort", params, socket) do
    send_update(GeoWeb.CountrySelector, id: "country", toggle_iso_code_sort: params)
    {:noreply, socket}
  end

  @impl true
  def handle_event("toggle_iso_code_group", params, socket) do
    send_update(GeoWeb.CountrySelector, id: "country", toggle_iso_code_group: params)
    {:noreply, socket}
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
    </div>
    """
  end
end
