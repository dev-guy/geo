defmodule Geo.Resources.Country.CacheStarter do
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
    ensure_cache_running()
    @cache_genserver.search!(query)
  end

  @doc """
  Get a country by ISO code with lazy cache initialization.
  Starts the cache if it's not running, then performs the lookup.
  """
  def get_by_iso_code!(iso_code) do
    ensure_cache_running()
    @cache_genserver.get_by_iso_code!(iso_code)
  end

  @doc """
  Refresh the cache if it's running. If not running, does nothing.
  """
  def refresh_cache do
    if cache_running?() do
      @cache_genserver.refresh_cache()
    else
      Logger.info("Cache not running, skipping refresh")
      :ok
    end
  end

  @doc """
  Check if the cache GenServer is currently running.
  """
  def cache_running? do
    case Process.whereis(@cache_genserver) do
      nil -> false
      pid when is_pid(pid) -> Process.alive?(pid)
    end
  end

  @doc """
  Ensure the cache is running. If not, start it via the dynamic supervisor.
  Returns :ok if cache is running or successfully started.
  """
  def ensure_cache_running do
    if cache_running?() do
      :ok
    else
      Logger.info("Cache not running, starting it now...")

      case @cache_supervisor.start_cache_worker() do
        {:ok, _pid} ->
          Logger.info("Cache started successfully")
          :ok

        {:error, {:already_started, _pid}} ->
          # Race condition - another process started it
          Logger.info("Cache was already started by another process")
          :ok

        {:error, reason} ->
          Logger.error("Failed to start cache: #{inspect(reason)}")
          {:error, reason}
      end
    end
  end

  @doc """
  Stop the cache if it's running.
  """
  def stop_cache do
    case Process.whereis(@cache_genserver) do
      nil ->
        Logger.info("Cache not running, nothing to stop")
        :ok

      pid when is_pid(pid) ->
        Logger.info("Stopping cache...")
        @cache_supervisor.stop_cache_worker(pid)
    end
  end

  @doc """
  Get cache statistics and status.
  """
  def cache_status do
    running = cache_running?()
    worker_count = @cache_supervisor.count_cache_workers()

    %{
      running: running,
      worker_count: worker_count,
      process_info: if(running, do: Process.info(Process.whereis(@cache_genserver)), else: nil)
    }
  end
end
