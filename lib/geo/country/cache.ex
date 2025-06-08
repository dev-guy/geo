defmodule Geo.Country.Cache do
  @moduledoc """
  GenServer that caches country data in memory for fast lookup and search operations.
  Loads all countries once at startup and provides efficient search functions.
  Automatically refreshes the cache every 30 minutes.
  """

  use GenServer
  require Logger

  @name __MODULE__
  @refresh_interval :timer.minutes(10)

  # Client API

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: @name)
  end

  @doc """
  Search for countries by name. Returns a list of matching Country resources.
  Returns tuple of {iso_matches, name_matches} without any sorting applied.
  """
  def search!(query)
  def search!(query) when query == nil do
    # Return all countries when query is empty
    GenServer.call(@name, :search_all)
  end

  def search!(query) do
    GenServer.call(@name, {:search, query})
  end

  @doc """
  Get all countries.
  """
  def all_countries! do
    GenServer.call(@name, :all_countries)
  end

  @doc """
  Refresh the cache by reloading all countries from the database.
  """
  def refresh_cache do
    GenServer.call(@name, :refresh_cache)
  end

  # Server callbacks

  @impl true
  def init(_opts) do
    Logger.info("Starting CountryCache, loading countries from database...")

    case load_countries() do
      {:ok, countries_by_name, countries_by_iso_code} ->
        state = %{
          countries_by_name: countries_by_name,
          countries_by_iso_code: countries_by_iso_code,
          # Track the timer reference
          refresh_timer_ref: nil
        }

        timer_ref = schedule_refresh()
        {:ok, %{state | refresh_timer_ref: timer_ref}}

      {:error, reason} ->
        Logger.error("Failed to load countries: #{inspect(reason)}")
        {:stop, reason}
    end
  end

  @impl true
  def handle_call({:search, query}, _from, state) do
    Logger.info("CountryCache.search called with query: '#{query}'")
    {iso_results, name_results} = do_search(state, query)
    Logger.info("CountryCache.search returning {#{length(iso_results)}, #{length(name_results)}} results")
    {:reply, {iso_results, name_results}, state}
  end

  @impl true
  def handle_call(:search_all, _from, state) do
    Logger.info("CountryCache.search_all called")
    # Return all countries without sorting
    {iso_results, name_results} = do_search_all(state)
    Logger.info("CountryCache.search_all returning {#{length(iso_results)}, #{length(name_results)}} results")
    {:reply, {iso_results, name_results}, state}
  end

  @impl true
  def handle_call(:all_countries, _from, state) do
    {:reply, state.countries_by_name, state}
  end

  @impl true
  def handle_call(:refresh_cache, _from, state) do
    Logger.info("Refreshing CountryCache...")

    case load_countries() do
      {:ok, countries_by_name, countries_by_iso_code} ->
        new_state = %{
          countries_by_name: countries_by_name,
          countries_by_iso_code: countries_by_iso_code,
          refresh_timer_ref: state.refresh_timer_ref
        }

        Logger.info("CountryCache refreshed with #{length(countries_by_name)} countries")

        updated_state = reschedule_refresh(new_state)
        {:reply, :ok, updated_state}

      {:error, reason} ->
        Logger.error("Failed to refresh countries: #{inspect(reason)}")
        {:reply, {:error, reason}, state}
    end
  end

  @impl true
  def handle_info(:refresh_cache, state) do
    Logger.info("Automatic cache refresh triggered...")

    case load_countries() do
      {:ok, countries_by_name, countries_by_iso_code} ->
        new_state = %{
          countries_by_name: countries_by_name,
          countries_by_iso_code: countries_by_iso_code,
          refresh_timer_ref: state.refresh_timer_ref
        }

        updated_state = reschedule_refresh(new_state)
        {:noreply, updated_state}

      {:error, reason} ->
        Logger.error("Failed to automatically refresh countries: #{inspect(reason)}")
        # Schedule next refresh even if this one failed
        updated_state = reschedule_refresh(state)
        {:noreply, updated_state}
    end
  end

  # Private functions

  defp schedule_refresh do
    Process.send_after(self(), :refresh_cache, @refresh_interval)
  end

  defp reschedule_refresh(state) do
    if Map.get(state, :refresh_timer_ref) do
      Process.cancel_timer(state.refresh_timer_ref)
    end

    timer_ref = schedule_refresh()
    Map.put(state, :refresh_timer_ref, timer_ref)
  end

  defp load_countries do
    try do
      countries = Geo.Geography.get_all_countries!()

      # Sort by name for countries_by_name
      countries_by_name = Enum.sort_by(countries, fn country ->
        Ash.CiString.value(country.name)
      end)

      # Sort by ISO code for countries_by_iso_code
      countries_by_iso_code = Enum.sort_by(countries, fn country ->
        Ash.CiString.value(country.iso_code)
      end)

      Logger.info("Loaded #{length(countries_by_name)} countries from database")
      {:ok, countries_by_name, countries_by_iso_code}
    rescue
      e ->
        Logger.error("Error loading countries from database: #{inspect(e)}")
        {:error, e}
    end
  end

  defp do_search(state, query) do
    # Convert the incoming query into an Ash.CiString for case-insensitive exact compares
    query_down = String.downcase(query)

    countries = state.countries_by_name

    # 1. Exact ISO‐Code matches (case‐insensitive)
    exact_iso =
      Enum.filter(countries, fn country ->
        Comp.equal?(country.iso_code, query)
      end)

    # 2. Partial ISO‐Code matches (case‐insensitive), excluding those already in exact_iso
    partial_iso =
      Enum.filter(countries, fn country ->
        iso_str = Ash.CiString.to_comparable_string(country.iso_code)

        String.starts_with?(iso_str, query_down) and
          !Comp.equal?(country.iso_code, query)
      end)

    # 3. Exact Name matches (case‐insensitive), excluding any that matched in ISO
    exact_name =
      Enum.filter(countries, fn country ->
        Comp.equal?(country.name, query)
      end)

    # 4. Starts with
    starts_with_name =
      Enum.filter(countries, fn country ->
        name_str = Ash.CiString.to_comparable_string(country.name)

        String.starts_with?(name_str, query_down) and
          !Comp.equal?(country.name, query)
      end)

    # 5. Partial Name matches (case‐insensitive), excluding any that matched earlier
    partial_name =
      Enum.filter(countries, fn country ->
        name_str = Ash.CiString.to_comparable_string(country.name)

        String.contains?(name_str, query_down) and
          !Comp.equal?(country.name, query) and
          !String.starts_with?(name_str, query_down)
      end)

    # Return without any sorting - just the original order from filtering
    {exact_iso ++ partial_iso, exact_name ++ starts_with_name ++ partial_name}
  end

  defp do_search_all(state) do
    # For empty search, return all countries in both lists without any sorting
    countries_by_name = state.countries_by_name
    countries_by_iso = state.countries_by_iso_code

    # Return both lists in their original loaded order
    {countries_by_iso, countries_by_name}
  end
end
