defmodule Geo.Geography.Country.Cache.Server do
  @moduledoc """
  GenServer that caches country data in memory for fast lookup and search operations.
  Uses lazy loading - countries are loaded on first access rather than at startup.
  Designed to work as a pooled worker with Poolboy - no longer uses named registration.

  The server will automatically stop after @stop_interval once countries are loaded.
  """

  use GenServer
  require Logger

  @stop_interval :timer.minutes(1)

  defmodule State do
    @moduledoc """
    State structure for the Country Cache Server.
    All country-related fields are nil until first access (lazy loading).
    The timer_ref is nil until countries are loaded, then starts the stop timer.
    """
    defstruct [
      :countries_list_by_iso_code,
      :countries_list_by_name,
      :countries_map_by_iso_code,
      :countries_map_by_name,
      :last_refresh,
      :timer_ref
    ]

    @type t :: %__MODULE__{
      countries_list_by_iso_code: [Geo.Geography.Country.t()] | nil,
      countries_list_by_name: [Geo.Geography.Country.t()] | nil,
      countries_map_by_iso_code: %{String.t() => Geo.Geography.Country.t()} | nil,
      countries_map_by_name: %{String.t() => Geo.Geography.Country.t()} | nil,
      last_refresh: DateTime.t() | nil,
      timer_ref: reference() | nil
    }
  end

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [])
  end

  @impl true
  def init(_opts) do
    # Start with empty state - countries will be loaded on first access
    # Timer will only start when countries are actually loaded
    state = %State{
      countries_list_by_iso_code: nil,
      countries_list_by_name: nil,
      countries_map_by_iso_code: nil,
      countries_map_by_name: nil,
      last_refresh: nil,
      timer_ref: nil
    }

    Logger.info("Cache worker started successfully")
    {:ok, state}
  end

  @impl true
  def handle_call(:search_all, _from, state) do
    state = ensure_countries_loaded(state)
    result = do_search_all(state)
    {:reply, result, state}
  end

  @impl true
  def handle_call({:search, query}, _from, state) do
    state = ensure_countries_loaded(state)
    {:reply, do_search(query, state), state}
  end

  @impl true
  def handle_call({:get_by_iso_code, iso_code}, _from, state) do
    state = ensure_countries_loaded(state)

    country =
      if state.countries_map_by_iso_code do
        Map.get(state.countries_map_by_iso_code, String.downcase(iso_code))
      else
        nil
      end

    {:reply, country, state}
  end

  @impl true
  def handle_call(:status, _from, state) do
    status =
      if state.last_refresh do
        %{
          countries_count: map_size(state.countries_map_by_iso_code),
          last_refresh: state.last_refresh,
          worker_pid: self(),
          loaded: true
        }
      else
        %{
          countries_count: 0,
          last_refresh: nil,
          worker_pid: self(),
          loaded: false
        }
      end

    {:reply, status, state}
  end

  @impl true
  def handle_info(:stop, state) do
    Logger.info("Cache worker stopping after #{@stop_interval} ms as scheduled")
    {:stop, :normal, state}
  end

  @impl true
  def terminate(reason, state) do
    # Cancel stop timer when GenServer is stopping
    if state.timer_ref do
      Process.cancel_timer(state.timer_ref)
    end

    Logger.info("Cache worker exiting with reason: #{inspect(reason)}")
    :ok
  end

  # Private functions

  # Ensures countries are loaded in the state, loading them if last_refresh is nil
  defp ensure_countries_loaded(state) do
    if state.last_refresh do
      state
    else
      try do
        load_countries!(state)
      rescue
        error ->
          Logger.error("Failed to load countries: #{inspect(error)}")
          # Return state unchanged if loading fails
          state
      end
    end
  end

  # Returns a State struct with loaded countries data, preserving existing state
  defp load_countries!(existing_state) do
    # Get countries sorted by iso_code (default sort from the resource)
    countries = Geo.Geography.list_countries!(authorize?: false)

    # Create sorted lists
    countries_list_by_iso_code = countries  # Already sorted by iso_code
    countries_list_by_name = Enum.sort_by(countries, & &1.name)

    # Create maps for fast lookup
    countries_map_by_iso_code =
      countries
      |> Enum.into(%{}, fn country ->
        {Ash.CiString.to_comparable_string(country.iso_code), country}
      end)

    countries_map_by_name =
      countries
      |> Enum.into(%{}, fn country ->
        {Ash.CiString.to_comparable_string(country.name), country}
      end)

    # Cancel existing timer if there is one
    if existing_state.timer_ref do
      Process.cancel_timer(existing_state.timer_ref)
    end

    # Start stop timer now that countries are loaded
    timer_ref = Process.send_after(self(), :stop, @stop_interval)
    Logger.info("Countries loaded successfully, worker will stop in #{@stop_interval} ms")

    %State{
      countries_list_by_iso_code: countries_list_by_iso_code,
      countries_list_by_name: countries_list_by_name,
      countries_map_by_iso_code: countries_map_by_iso_code,
      countries_map_by_name: countries_map_by_name,
      last_refresh: DateTime.utc_now(),
      timer_ref: timer_ref
    }
  end

  defp do_search(query, state) do
    # If countries not loaded, return empty results
    if is_nil(state.countries_map_by_name) do
      %Geo.Geography.Country.Cache.SearchResult{
        by_iso_code: [],
        by_name: []
      }
    else
      do_search_with_data(query, state)
    end
  end

  defp do_search_with_data(query, state) do

    query_down = String.downcase(query)

    # Use exact match from countries_map_by_name for efficiency
    exact_name_match = Map.get(state.countries_map_by_name, query_down)

    exact_iso_code =
      Enum.filter(state.countries_map_by_iso_code, fn {_key, country} ->
        Comp.equal?(country.iso_code, query)
      end)
      |> Enum.map(fn {_key, country} -> country end)

    partial_iso_code =
      if String.length(query) > 3 do
        []
      else
        Enum.filter(state.countries_map_by_iso_code, fn {key, country} ->
          String.starts_with?(key, query_down) and
            !Comp.equal?(country.iso_code, query)
        end)
        |> Enum.map(fn {_key, country} -> country end)
      end

    exact_name =
      if exact_name_match do
        [exact_name_match]
      else
        []
      end

    starts_with_name =
      Enum.filter(state.countries_map_by_name, fn {key, country} ->
        String.starts_with?(key, query_down) and
          !Comp.equal?(country.name, query)
      end)
      |> Enum.map(fn {_key, country} -> country end)

    exact_iso_code_name =
      Enum.filter(state.countries_map_by_iso_code, fn {_key, country} ->
        name_str = Ash.CiString.to_comparable_string(country.name)

        Comp.equal?(country.iso_code, query) and
          !Comp.equal?(country.name, query) and
          !String.starts_with?(name_str, query_down)
      end)
      |> Enum.map(fn {_key, country} -> country end)

    partial_name =
      Enum.filter(state.countries_map_by_name, fn {key, country} ->
        String.contains?(key, query_down) and
          !Comp.equal?(country.iso_code, query) and
          !Comp.equal?(country.name, query) and
          !String.starts_with?(key, query_down)
      end)
      |> Enum.map(fn {_key, country} -> country end)

    iso_code_results = exact_iso_code ++ partial_iso_code
    name_results = exact_name ++ starts_with_name ++ exact_iso_code_name ++ partial_name

    # 1. Add countries from name_results to iso_code_results if not already present (by iso_code)
    iso_codes_in_iso_code_results =
      MapSet.new(iso_code_results, fn country ->
        Ash.CiString.to_comparable_string(country.iso_code)
      end)

    countries_to_add_to_iso =
      Enum.filter(name_results, fn country ->
        iso_code_str = Ash.CiString.to_comparable_string(country.iso_code)
        not MapSet.member?(iso_codes_in_iso_code_results, iso_code_str)
      end)

    updated_iso_code_results = iso_code_results ++ countries_to_add_to_iso

    # 2. Add countries from iso_code_results to name_results if not already present (by iso_code)
    iso_codes_in_name_results =
      MapSet.new(name_results, fn country ->
        Ash.CiString.to_comparable_string(country.iso_code)
      end)

    countries_to_add_to_name =
      Enum.filter(iso_code_results, fn country ->
        iso_code_str = Ash.CiString.to_comparable_string(country.iso_code)
        not MapSet.member?(iso_codes_in_name_results, iso_code_str)
      end)

    updated_name_results = name_results ++ countries_to_add_to_name

    %Geo.Geography.Country.Cache.SearchResult{
      by_iso_code: updated_iso_code_results,
      by_name: updated_name_results
    }
  end

  defp do_search_all(state) do
    # Return SearchResults struct with all countries, or empty if not loaded
    %Geo.Geography.Country.Cache.SearchResult{
      by_iso_code: state.countries_list_by_iso_code || [],
      by_name: state.countries_list_by_name || []
    }
  end
end
