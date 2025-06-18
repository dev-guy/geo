defmodule Geo.Resources.Country.CacheGenServer do
  @moduledoc """
  GenServer that caches country data in memory for fast lookup and search operations.
  Loads all countries once at startup and provides efficient search functions.
  Automatically refreshes the cache every 10 minutes and stops itself after 5 minutes of inactivity.
  """

  use GenServer
  require Logger

  @name __MODULE__
  @refresh_interval :timer.minutes(30)
  @inactivity_timeout :timer.minutes(3)

  # Client API

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: @name)
  end

  # Server callbacks

  @impl true
  def init(_opts) do
    case load_countries() do
      {:ok, countries_by_name, countries_by_iso_code} ->
        state = %{
          countries_by_iso_code: countries_by_iso_code,
          countries_by_name: countries_by_name,
          # Track the timer references
          refresh_timer_ref: nil,
          inactivity_timer_ref: nil
        }

        refresh_timer = schedule_refresh()
        inactivity_timer = schedule_inactivity_stop()

        {:ok, %{state | refresh_timer_ref: refresh_timer, inactivity_timer_ref: inactivity_timer}}

      {:error, reason} ->
        {:stop, reason}
    end
  end

  @impl true
  def handle_call({:search, query}, _from, state) do
    {iso_code_results, name_results} = do_search(state, query)
    new_state = reset_inactivity_timer(state)
    {:reply, {iso_code_results, name_results}, new_state}
  end

  @impl true
  def handle_call(:search_all, _from, state) do
    # Return all countries without sorting
    {iso_code_results, name_results} = do_search_all(state)
    new_state = reset_inactivity_timer(state)
    {:reply, {iso_code_results, name_results}, new_state}
  end

  @impl true
  def handle_call({:get_by_iso_code, iso_code}, _from, state) do
    country = Enum.find(state.countries_by_iso_code, fn country ->
      Comp.equal?(country.iso_code, iso_code)
    end)
    new_state = reset_inactivity_timer(state)
    {:reply, country, new_state}
  end

  @impl true
  def handle_call(:refresh, _from, state) do
    case load_countries() do
      {:ok, countries_by_name, countries_by_iso_code} ->
        new_state = %{
          countries_by_name: countries_by_name,
          countries_by_iso_code: countries_by_iso_code,
          refresh_timer_ref: state.refresh_timer_ref,
          inactivity_timer_ref: state.inactivity_timer_ref
        }

        updated_state = reschedule_refresh(new_state)
        final_state = reset_inactivity_timer(updated_state)
        {:reply, :ok, final_state}

      {:error, reason} ->
        Logger.error("Failed to refresh countries: #{inspect(reason)}")
        new_state = reset_inactivity_timer(state)
        {:reply, {:error, reason}, new_state}
    end
  end

  @impl true
  def handle_info(:refresh, state) do
    Logger.info("Automatic cache refresh triggered")

    case load_countries() do
      {:ok, countries_by_name, countries_by_iso_code} ->
        new_state = %{
          countries_by_name: countries_by_name,
          countries_by_iso_code: countries_by_iso_code,
          refresh_timer_ref: state.refresh_timer_ref,
          inactivity_timer_ref: state.inactivity_timer_ref
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

  @impl true
  def handle_info(:inactivity_stop, state) do
    Logger.info("Country cache stopping due to inactivity")
    {:stop, :normal, state}
  end

  @impl true
  def terminate(reason, state) do
    Logger.info("Country cache terminating: #{inspect(reason)}")

    # Clean up timers
    if state.refresh_timer_ref do
      Process.cancel_timer(state.refresh_timer_ref)
    end

    if state.inactivity_timer_ref do
      Process.cancel_timer(state.inactivity_timer_ref)
    end

    :ok
  end

  # Private functions

  defp schedule_refresh do
    Process.send_after(self(), :refresh, @refresh_interval)
  end

  defp schedule_inactivity_stop do
    Process.send_after(self(), :inactivity_stop, @inactivity_timeout)
  end

  defp reset_inactivity_timer(state) do
    # Cancel existing timer
    if state.inactivity_timer_ref do
      Process.cancel_timer(state.inactivity_timer_ref)
    end

    # Start new timer
    new_timer = schedule_inactivity_stop()
    %{state | inactivity_timer_ref: new_timer}
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
        country.name
      end)

      # Sort by ISO code for countries_by_iso_code
      # Default Ash sort
      countries_by_iso_code = countries

      {:ok, countries_by_name, countries_by_iso_code}
    rescue
      e ->
        Logger.error("Error loading countries from database: #{inspect(e)}")
        {:error, e}
    end
  end

  defp do_search(state, query) do
    query_down = String.downcase(query)

    exact_iso_code =
      Enum.filter(state.countries_by_iso_code, fn country ->
        Comp.equal?(country.iso_code, query)
      end)

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

    exact_name =
      Enum.filter(state.countries_by_name, fn country ->
        Comp.equal?(country.name, query)
      end)

    starts_with_name =
      Enum.filter(state.countries_by_name, fn country ->
        name_str = Ash.CiString.to_comparable_string(country.name)

        String.starts_with?(name_str, query_down) and
          !Comp.equal?(country.name, query)
      end)

    exact_iso_code_name =
      Enum.filter(state.countries_by_iso_code, fn country ->
        name_str = Ash.CiString.to_comparable_string(country.name)

        Comp.equal?(country.iso_code, query) and
          !Comp.equal?(country.name, query) and
          !String.starts_with?(name_str, query_down)
      end)

    partial_name =
      Enum.filter(state.countries_by_name, fn country ->
        name_str = Ash.CiString.to_comparable_string(country.name)

        String.contains?(name_str, query_down) and
          !Comp.equal?(country.iso_code, query) and
          !Comp.equal?(country.name, query) and
          !String.starts_with?(name_str, query_down)
      end)

    iso_code_results = exact_iso_code ++ partial_iso_code
    name_results = exact_name ++ starts_with_name ++ exact_iso_code_name ++ partial_name

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

    # Return without any sorting - just the original order from filtering
    {updated_iso_code_results, updated_name_results}
  end

  defp do_search_all(state) do
    # For empty search, return all countries in both lists without any sorting
    {state.countries_by_iso_code, state.countries_by_name}
  end
end
