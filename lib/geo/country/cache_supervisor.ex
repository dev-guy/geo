defmodule Geo.Country.CacheSupervisor do
  @moduledoc """
  Supervisor for the Country.Cache GenServer that implements a restart strategy
  with a 1-minute delay when the cache fails to start (e.g., due to missing database table).
  """

  use Supervisor
  require Logger

  @name __MODULE__
  @restart_delay :timer.minutes(1)

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: @name)
  end

  @impl true
  def init(_init_arg) do
    children = [
      %{
        id: Geo.Country.CacheWorker,
        start: {__MODULE__, :start_cache_worker, []},
        restart: :permanent,
        shutdown: 5000,
        type: :worker
      }
    ]

    # Use :one_for_one strategy
    opts = [strategy: :one_for_one]
    Supervisor.init(children, opts)
  end

  @doc """
  Starts the cache worker with retry logic.
  """
  def start_cache_worker do
    case Geo.Country.Cache.start_link([]) do
      {:ok, pid} ->
        Logger.info("Country.Cache started successfully")
        {:ok, pid}

      {:error, reason} ->
        Logger.error("Country.Cache failed to start: #{inspect(reason)}")
        Logger.info("Will retry starting Country.Cache in #{@restart_delay}ms...")

        # Start a process that will retry after delay
        {:ok, spawn_link(fn -> retry_start_cache() end)}
    end
  end

  defp retry_start_cache do
    Process.sleep(@restart_delay)
    Logger.info("Retrying Country.Cache startup...")

    case Geo.Country.Cache.start_link([]) do
      {:ok, pid} ->
        Logger.info("Country.Cache started successfully on retry")
        # Keep this process alive to maintain the supervision tree
        Process.monitor(pid)
        receive do
          {:DOWN, _ref, :process, ^pid, reason} ->
            Logger.warning("Country.Cache went down: #{inspect(reason)}, will retry...")
            retry_start_cache()
        end

      {:error, reason} ->
        Logger.error("Country.Cache retry failed: #{inspect(reason)}")
        Logger.info("Will retry again in #{@restart_delay}ms...")
        retry_start_cache()
    end
  end
end
