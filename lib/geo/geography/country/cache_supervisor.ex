defmodule Geo.Geography.Country.CacheSupervisor do
  @moduledoc """
  Dynamic supervisor for the Country.Cache GenServer that can start cache workers
  dynamically and implements a retry strategy with exponential backoff when
  the cache fails to start (e.g., due to missing database table).
  """

  use DynamicSupervisor
  require Logger

  @name __MODULE__
  @initial_retry_delay :timer.seconds(5)
  @max_retry_delay :timer.minutes(5)
  @max_retries 10

  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: @name)
  end

  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  @doc """
  Starts a cache worker under the dynamic supervisor.
  """
  def start_cache_worker do
    child_spec = %{
      id: Geo.Geography.Country.CacheWorker,
      start: {__MODULE__, :start_cache_with_retry, []},
      restart: :temporary,
      shutdown: 5000,
      type: :worker
    }

    DynamicSupervisor.start_child(@name, child_spec)
  end

  @doc """
  Starts the cache with retry logic and exponential backoff.
  """
  def start_cache_with_retry do
    start_cache_with_retry(1, @initial_retry_delay)
  end

  defp start_cache_with_retry(attempt, delay) when attempt <= @max_retries do
    case Geo.Geography.Country.CacheGenServer.start_link([]) do
      {:ok, pid} ->
        Logger.info("Country.Cache started successfully on attempt #{attempt}")
        {:ok, pid}

      {:error, reason} ->
        Logger.warning("Country.Cache failed to start on attempt #{attempt}: #{inspect(reason)}")

        if attempt < @max_retries do
          Logger.info("Will retry starting Country.Cache in #{delay}ms... (attempt #{attempt + 1}/#{@max_retries})")
          Process.sleep(delay)

          # Exponential backoff with jitter
          next_delay = min(delay * 2 + :rand.uniform(1000), @max_retry_delay)
          start_cache_with_retry(attempt + 1, next_delay)
        else
          Logger.error("Country.Cache failed to start after #{@max_retries} attempts, giving up")
          {:error, {:max_retries_exceeded, reason}}
        end
    end
  end

  @doc """
  Stops a cache worker by PID.
  """
  def stop_worker(pid) when is_pid(pid) do
    DynamicSupervisor.terminate_child(@name, pid)
  end

  @doc """
  Lists all running cache workers.
  """
  def list_cache_workers do
    DynamicSupervisor.which_children(@name)
  end

  @doc """
  Counts the number of running cache workers.
  """
  def count_cache_workers do
    DynamicSupervisor.count_children(@name)
  end

  @doc """
  Restarts the cache by stopping the current worker and starting a new one.
  """
  def restart_cache do
    case list_cache_workers() do
      [] ->
        Logger.info("No cache workers running, starting new one")
        start_cache_worker()

      workers ->
        Logger.info("Restarting #{length(workers)} cache worker(s)")

        # Stop all existing workers
        Enum.each(workers, fn {_, pid, _, _} ->
          stop_worker(pid)
        end)

        # Start a new worker
        start_cache_worker()
    end
  end
end
