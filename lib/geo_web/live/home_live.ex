defmodule GeoWeb.HomeLive do
  use GeoWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, :now, DateTime.utc_now())}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="p-6">
      <h1 class="text-3xl font-bold mb-4">Welcome to Geo!</h1>
      <p>Current UTC time: <%= @now %></p>
      <label class="block text-sm font-medium text-gray-700 mb-2">Country</label>
      <.search_combobox key='hi' name='Fruit'>
        <:option group="Fruits" value="apple">Apple</:option>
        <:option group="Fruits" value="banana">Banana</:option>
        <:option group="Vegetables" value="carrot">Carrot</:option>
        <:option group="Grains" value="rice">Rice</:option>
      </.search_combobox>
    </div>
    """
  end
end
