defmodule Geo.Geography.Country.Cache.Server do
  @moduledoc """
  GenServer that caches country data in memory for fast lookup and search operations.
  Loads all countries once at startup and provides efficient search functions.
  Designed to work as a pooled worker with Poolboy - no longer uses named registration.
  """

  use GenServer
  require Logger

  @refresh_interval :timer.minutes(30)

  defmodule State do
    @moduledoc """
    State structure for the Country Cache Server.
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
      countries_list_by_iso_code: [Geo.Geography.Country.t()],
      countries_list_by_name: [Geo.Geography.Country.t()],
      countries_map_by_iso_code: %{String.t() => Geo.Geography.Country.t()},
      countries_map_by_name: %{String.t() => Geo.Geography.Country.t()},
      last_refresh: DateTime.t(),
      timer_ref: reference() | nil
    }
  end

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [])
  end

  @impl true
  def init(_opts) do
    try do
      state = load_countries!()

      # Schedule periodic refresh
      timer_ref = Process.send_after(self(), :refresh, @refresh_interval)
      state = %{state | timer_ref: timer_ref}

      Logger.info("Cache worker started successfully")
      {:ok, state}
    rescue
      error ->
        Logger.error("Failed to initialize cache worker: #{inspect(error)}")
        {:stop, error}
    end
  end

  @impl true
  def handle_call(:search_all, _from, state) do
    {:reply, do_search_all(state), state}
  end

  @impl true
  def handle_call({:search, query}, _from, state) do
    {:reply, do_search(query, state), state}
  end

  @impl true
  def handle_call({:get_by_iso_code, iso_code}, _from, state) do
    country = Map.get(state.countries_map_by_iso_code, String.downcase(iso_code))
    {:reply, country, state}
  end

  @impl true
  def handle_call(:refresh, _from, state) do
    try do
      # Cancel existing timer if it exists
      if state.timer_ref do
        Process.cancel_timer(state.timer_ref)
      end

      new_state = load_countries!()

      # Schedule next refresh
      timer_ref = Process.send_after(self(), :refresh, @refresh_interval)
      new_state = %{new_state | timer_ref: timer_ref}

      Logger.info("Cache worker refreshed successfully")
      {:reply, :ok, new_state}
    rescue
      error ->
        Logger.error("Failed to refresh cache worker: #{inspect(error)}")
        {:reply, {:error, error}, state}
    end
  end

  @impl true
  def handle_call(:status, _from, state) do
    status = %{
      countries_count: map_size(state.countries_map_by_iso_code),
      last_refresh: state.last_refresh,
      worker_pid: self()
    }

    {:reply, status, state}
  end

  @impl true
  def handle_info(:refresh, state) do
    # Periodic refresh
    try do
      # Cancel existing timer if it exists
      if state.timer_ref do
        Process.cancel_timer(state.timer_ref)
      end

      new_state = load_countries!()

      Logger.debug("Cache worker auto-refreshed successfully")

      # Schedule next refresh
      timer_ref = Process.send_after(self(), :refresh, @refresh_interval)
      new_state = %{new_state | timer_ref: timer_ref}

      {:noreply, new_state}
    rescue
      error ->
        Logger.warning("Failed to auto-refresh cache worker: #{inspect(error)}")

        # Still schedule next refresh attempt
        timer_ref = Process.send_after(self(), :refresh, @refresh_interval)
        new_state = %{state | timer_ref: timer_ref}
        {:noreply, new_state}
    end
  end

  @impl true
  def terminate(_reason, state) do
    # Cancel timer when GenServer is stopping
    if state.timer_ref do
      Process.cancel_timer(state.timer_ref)
    end
    :ok
  end

  # Private functions

  # Returns a State struct with loaded countries data
  defp load_countries! do
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

    %State{
      countries_list_by_iso_code: countries_list_by_iso_code,
      countries_list_by_name: countries_list_by_name,
      countries_map_by_iso_code: countries_map_by_iso_code,
      countries_map_by_name: countries_map_by_name,
      last_refresh: DateTime.utc_now(),
      timer_ref: nil
    }
  end

  defp do_search(query, state) do
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

    # Return SearchResults struct
    %Geo.Geography.Country.Cache.SearchResults{
      by_iso_code: updated_iso_code_results,
      by_name: updated_name_results
    }
  end

  defp do_search_all(state) do
    # Return SearchResults struct with all countries
    %Geo.Geography.Country.Cache.SearchResults{
      by_iso_code: state.countries_list_by_iso_code,
      by_name: state.countries_list_by_name
    }
  end
end
