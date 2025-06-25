defmodule Geo.Geography.Country.CacheRegistry do
  @moduledoc """
  Alternative Registry-based approach for managing cache workers.
  This provides better process tracking and avoids global name conflicts.
  """

  @registry __MODULE__
  @cache_key :country_cache

  def start_link(_opts) do
    Registry.start_link(keys: :unique, name: @registry)
  end

  def ensure_cache_running do
    case Registry.lookup(@registry, @cache_key) do
      [{pid, _}] when is_pid(pid) ->
        if Process.alive?(pid) do
          :ok
        else
          start_cache()
        end

      [] ->
        start_cache()
    end
  end

  defp start_cache do
    case Registry.register(@registry, @cache_key, nil) do
      {:ok, _} ->
        # We got the lock, start the cache
        case Geo.Geography.Country.CacheGenServer.start_link([]) do
          {:ok, pid} ->
            # Update registry with actual pid
            Registry.update_value(@registry, @cache_key, fn _ -> pid end)
            :ok

          {:error, reason} ->
            Registry.unregister(@registry, @cache_key)
            {:error, reason}
        end

      {:error, {:already_registered, _}} ->
        # Another process is starting it
        :timer.sleep(100)
        ensure_cache_running()
    end
  end

  def get_cache_pid do
    case Registry.lookup(@registry, @cache_key) do
      [{pid, _}] -> {:ok, pid}
      [] -> {:error, :not_running}
    end
  end
end
