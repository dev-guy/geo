defmodule Geo.Geography.Country.Cache do
  @moduledoc """
  API for country cache operations. Only used by the Country resource.
  Uses Poolboy to manage a pool of 5 cache GenServer workers for load balancing.
  """

  require Logger

  @pool_name :country_cache_pool

  @doc """
  Search for countries using the pooled cache workers.
  """
  def search!(query \\ nil) do
    :poolboy.transaction(@pool_name, fn worker ->
      cond do
        query == nil ->
          GenServer.call(worker, :search_all)

        String.trim(query) == "" ->
          GenServer.call(worker, :search_all)

        true ->
          trimmed_query = String.trim(query)
          GenServer.call(worker, {:search, trimmed_query})
      end
    end)
  end

  @doc """
  Get a country by ISO code using the pooled cache workers.
  """
  def get_by_iso_code!(iso_code) do
    country =
      :poolboy.transaction(@pool_name, fn worker ->
        GenServer.call(worker, {:get_by_iso_code, iso_code})
      end)

    if country do
      country
    else
      raise "Country with ISO code #{iso_code} not found"
    end
  end

  @doc """
  Refresh all cache workers in the pool.
  This will update the data in all workers to ensure consistency.
  """
  def refresh do
    # Get all workers and refresh them
    workers = :poolboy.status(@pool_name)
    worker_count = Keyword.get(workers, :ready, 0) + Keyword.get(workers, :busy, 0)

    Logger.info("Refreshing #{worker_count} cache workers")

    # Refresh each worker in the pool
    refresh_results =
      for _ <- 1..worker_count do
        :poolboy.transaction(
          @pool_name,
          fn worker ->
            GenServer.call(worker, :refresh)
          end,
          # 30 second timeout for refresh
          30_000
        )
      end

    case Enum.all?(refresh_results, &(&1 == :ok)) do
      true ->
        Logger.info("All cache workers refreshed successfully")
        :ok

      false ->
        failed_count = Enum.count(refresh_results, &(&1 != :ok))
        Logger.warning("#{failed_count} cache workers failed to refresh")
        {:error, :partial_refresh_failure}
    end
  end

  @doc """
  Check if the cache pool is running and has workers available.
  """
  def running? do
    try do
      workers = :poolboy.status(@pool_name)
      total_workers = Keyword.get(workers, :ready, 0) + Keyword.get(workers, :busy, 0)
      total_workers > 0
    rescue
      _ -> false
    end
  end

  @doc """
  Get cache pool statistics and status.
  """
  def status do
    try do
      pool_status = :poolboy.status(@pool_name)

      %{
        running: true,
        pool_name: @pool_name,
        ready_workers: Keyword.get(pool_status, :ready, 0),
        busy_workers: Keyword.get(pool_status, :busy, 0),
        overflow_workers: Keyword.get(pool_status, :overflow, 0),
        monitors: Keyword.get(pool_status, :monitors, 0)
      }
    rescue
      error ->
        %{
          running: false,
          error: inspect(error)
        }
    end
  end

  @doc """
  Stop the cache pool (for testing/maintenance).
  Note: This will stop the entire pool supervisor.
  """
  def stop do
    Logger.info("Stopping country cache pool")
    Supervisor.stop(@pool_name)
  end
end
