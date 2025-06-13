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

  def search!(query \\ nil)
  def search!(query) when query == nil do
    GenServer.call(@name, :search_all)
  end

  def search!(query) do
    trimmed_query = String.trim(query)
    if trimmed_query == "" do
      GenServer.call(@name, :search_all)
    else
      GenServer.call(@name, {:search, trimmed_query})
    end
  end

  @doc """
  Get a country by its ISO code. Returns the Country resource or raises an error if not found.
  """
  def get_by_iso_code!(iso_code) do
    country = GenServer.call(@name, {:get_by_iso_code, iso_code})
    if country do
      country
    else
      raise "Country with ISO code #{iso_code} not found"
    end
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
      {:ok, countries_by_iso_code, countries_by_name} ->
        state = %{
          countries_by_iso_code: countries_by_iso_code,
          countries_by_name: countries_by_name,
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
    {iso_code_results, name_results} = do_search(state, query)
    Logger.info("CountryCache.search returning {#{length(iso_code_results)}, #{length(name_results)}} results")
    {:reply, {iso_code_results, name_results}, state}
  end

  @impl true
  def handle_call(:search_all, _from, state) do
    Logger.info("CountryCache.search_all called")
    # Return all countries without sorting
    {iso_code_results, name_results} = do_search_all(state)
    Logger.info("CountryCache.search_all returning {#{length(iso_code_results)}, #{length(name_results)}} results")
    {:reply, {iso_code_results, name_results}, state}
  end

  @impl true
  def handle_call({:get_by_iso_code, iso_code}, _from, state) do
    country = Enum.find(state.countries_by_iso_code, fn country ->
      Comp.equal?(country.iso_code, iso_code)
    end)
    {:reply, country, state}
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
      countries = Geo.Geography.list_countries!()

      # Sort by name for countries_by_name
      countries_by_name = Enum.sort_by(countries, fn country ->
        Ash.CiString.value(country.name)
      end)

      # Sort by ISO code for countries_by_iso_code
      # Default Ash sort
      countries_by_iso_code = countries

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

    # 1. Exact ISO‐Code matches (case‐insensitive)
    exact_iso_code =
      Enum.filter(state.countries_by_iso_code, fn country ->
        Comp.equal?(country.iso_code, query)
      end)

    # 2. Partial ISO‐Code matches (case‐insensitive), excluding those already in exact_iso_code
    # Only search for partial ISO matches if query length is 3 or less
    partial_iso_code =
      if String.length(query) > 3 do
        []
      else
        Enum.filter(state.countries_by_iso_code, fn country ->
          iso_str = Ash.CiString.to_comparable_string(country.iso_code)

          String.starts_with?(iso_str, query_down) and
            !Comp.equal?(country.iso_code, query)
        end)
      end

    # 3. Exact Name matches (case‐insensitive), excluding any that matched in ISO
    exact_name =
      exact_iso_code ++
      Enum.filter(state.countries_by_name, fn country ->
        Comp.equal?(country.name, query) and
          !Comp.equal?(country.iso_code, query)
      end)

    # 4. Starts with
    starts_with_name =
      Enum.filter(state.countries_by_name, fn country ->
        name_str = Ash.CiString.to_comparable_string(country.name)

        String.starts_with?(name_str, query_down) and
          !Comp.equal?(country.iso_code, query) and
          !Comp.equal?(country.name, query)
      end)

    # 5. Partial Name matches (case‐insensitive), excluding any that matched earlier
    partial_name =
      Enum.filter(state.countries_by_name, fn country ->
        name_str = Ash.CiString.to_comparable_string(country.name)

        String.contains?(name_str, query_down) and
          !Comp.equal?(country.iso_code, query) and
          !Comp.equal?(country.name, query) and
          !String.starts_with?(name_str, query_down)
      end)

    iso_code_results = exact_iso_code ++ partial_iso_code
    name_results = exact_name ++ starts_with_name ++ partial_name

    # 1. Add countries from name_results to iso_code_results if not already present (by iso_code)
    iso_codes_in_iso_code_results = MapSet.new(iso_code_results, fn country ->
      Ash.CiString.to_comparable_string(country.iso_code)
    end)

    countries_to_add_to_iso = Enum.filter(name_results, fn country ->
      iso_code_str = Ash.CiString.to_comparable_string(country.iso_code)
      not MapSet.member?(iso_codes_in_iso_code_results, iso_code_str)
    end)

    updated_iso_code_results = iso_code_results ++ countries_to_add_to_iso

    # 2. Add countries from iso_code_results to name_results if not already present (by iso_code)
    iso_codes_in_name_results = MapSet.new(name_results, fn country ->
      Ash.CiString.to_comparable_string(country.iso_code)
    end)

    countries_to_add_to_name = Enum.filter(iso_code_results, fn country ->
      iso_code_str = Ash.CiString.to_comparable_string(country.iso_code)
      not MapSet.member?(iso_codes_in_name_results, iso_code_str)
    end)

    updated_name_results = name_results ++ countries_to_add_to_name

    Logger.info("CountryCache.search returning #{inspect(updated_name_results)}")

    # Return without any sorting - just the original order from filtering
    {updated_iso_code_results, updated_name_results}
  end

  defp do_search_all(state) do
    # For empty search, return all countries in both lists without any sorting
    {state.countries_by_iso_code, state.countries_by_name}
  end
end
