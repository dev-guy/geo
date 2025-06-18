defmodule Geo.Resources.Country.Cache do
  @moduledoc """
  Main entry point for country cache operations. Provides lazy-loading functionality
  that starts the cache GenServer only when needed and manages its lifecycle through
  the dynamic supervisor.
  """

  require Logger

  @cache_genserver Geo.Resources.Country.CacheGenServer
  @cache_supervisor Geo.Resources.Country.CacheSupervisor

  @doc """
  Search for countries with lazy cache initialization.
  Starts the cache if it's not running, then performs the search.
  """
  def search!(query \\ nil) do
    ensure_running()

    cond do
      query == nil ->
        GenServer.call(@cache_genserver, :search_all)

      String.trim(query) == "" ->
        GenServer.call(@cache_genserver, :search_all)

      true ->
        trimmed_query = String.trim(query)
        GenServer.call(@cache_genserver, {:search, trimmed_query})
    end
  end

  @doc """
  Get a country by ISO code with lazy cache initialization.
  Starts the cache if it's not running, then performs the lookup.
  """
  def get_by_iso_code!(iso_code) do
    ensure_running()

    country = GenServer.call(@cache_genserver, {:get_by_iso_code, iso_code})
    if country do
      country
    else
      raise "Country with ISO code #{iso_code} not found"
    end
  end

  @doc """
  Refresh the cache if it's running. If not running, does nothing.
  """
  def refresh do
    if running?() do
      GenServer.call(@cache_genserver, :refresh)
    else
      Logger.info("Cache worker not running, skipping refresh")
      :ok
    end
  end

  @doc """
  Check if the cache GenServer is currently running.
  """
  def running? do
    case Process.whereis(@cache_genserver) do
      nil -> false
      pid when is_pid(pid) -> Process.alive?(pid)
    end
  end

  @doc """
  Ensure the cache is running. If not, start it via the dynamic supervisor.
  Returns :ok if cache is running or successfully started.
  """
  def ensure_running do
    if running?() do
      :ok
    else
      Logger.info("Starting cache worker")

      case @cache_supervisor.start_cache_worker() do
        {:ok, _pid} ->
          Logger.info("Cache worker started successfully")
          :ok

        {:error, {:already_started, _pid}} ->
          # Race condition - another process started it
          Logger.info("Cache worker was started by another process")
          :ok

        {:error, reason} ->
          Logger.error("Failed to start cache worker: #{inspect(reason)}")
          {:error, reason}
      end
    end
  end

  @doc """
  Stop the cache if it's running.
  """
  def stop do
    case Process.whereis(@cache_genserver) do
      nil ->
        Logger.info("Cache worker not running, nothing to stop")
        :ok

      pid when is_pid(pid) ->
        Logger.info("Stopping cache worker")
        @cache_supervisor.stop_worker(pid)
    end
  end

  @doc """
  Get cache statistics and status.
  """
  def status do
    running = running?()
    worker_count = @cache_supervisor.count_cache_workers()

    %{
      running: running,
      worker_count: worker_count,
      process_info: if(running, do: Process.info(Process.whereis(@cache_genserver)), else: nil)
    }
  end
end
