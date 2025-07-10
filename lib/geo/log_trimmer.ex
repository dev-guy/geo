defmodule Geo.LogTrimmer do
  @moduledoc """
  A GenServer that periodically trims log files to prevent them from growing too large.

  This process runs in the background and periodically checks the specified log file.
  If the file exceeds the maximum number of lines, it trims it to keep only the most recent lines.
  """

  use GenServer
  require Logger

  @trim_interval :timer.minutes(5)
  @max_log_lines 10_000
  @max_file_size "5 MB"

  # Client API

  @doc """
  Starts the log trimmer for the specified log file.
  """
  def start_link(log_file) when is_binary(log_file) do
    GenServer.start_link(__MODULE__, log_file, name: __MODULE__)
  end

  @doc """
  Stops the log trimmer.
  """
  def stop do
    if Process.whereis(__MODULE__) do
      GenServer.stop(__MODULE__)
    end
  end

  @doc """
  Manually triggers a log trim operation.
  """
  def trim_now do
    if Process.whereis(__MODULE__) do
      GenServer.cast(__MODULE__, :trim_now)
    end
  end

  @doc """
  Gets the current status of the log trimmer.
  """
  def status do
    if Process.whereis(__MODULE__) do
      GenServer.call(__MODULE__, :status)
    else
      {:error, :not_running}
    end
  end

  # Server Callbacks

  @impl GenServer
  def init(log_file) do
    # Schedule the first trim
    schedule_trim()

    state = %{
      log_file: log_file,
      last_trim: DateTime.utc_now(),
      trim_count: 0
    }

    max_size_bytes = parse_size(@max_file_size)
    Logger.info("LogTrimmer: Started for #{log_file}, Trimming every #{div(@trim_interval, 60_000)} minutes, Maximum file size: #{max_size_bytes} bytes (#{@max_file_size}), Trimming to #{@max_log_lines} lines")

    {:ok, state}
  end

  @impl GenServer
  def handle_info(:trim, state) do
    new_state = perform_trim(state)
    schedule_trim()
    {:noreply, new_state}
  end

  @impl GenServer
  def handle_cast(:trim_now, state) do
    new_state = perform_trim(state)
    {:noreply, new_state}
  end

  @impl GenServer
  def handle_call(:status, _from, state) do
    status = %{
      log_file: state.log_file,
      last_trim: state.last_trim,
      trim_count: state.trim_count,
      max_lines: @max_log_lines,
      trim_interval_minutes: div(@trim_interval, 60_000)
    }
    {:reply, {:ok, status}, state}
  end

  # Private Functions

  defp schedule_trim do
    Process.send_after(self(), :trim, @trim_interval)
  end

  defp perform_trim(state) do
    case trim_log_file(state.log_file) do
      {:ok, :trimmed, lines_removed} ->
        Logger.debug("LogTrimmer: Trimmed #{lines_removed} lines from #{state.log_file}")
        %{state | last_trim: DateTime.utc_now(), trim_count: state.trim_count + 1}

      {:ok, :no_trim_needed} ->
        %{state | last_trim: DateTime.utc_now()}

      {:error, reason} ->
        Logger.warning("LogTrimmer: Failed to trim #{state.log_file}: #{reason}")
        state
    end
  end

  defp trim_log_file(log_file) do
    try do
      if File.exists?(log_file) do
        # Check file size first
        %{size: file_size} = File.stat!(log_file)
        max_size_bytes = parse_size(@max_file_size)
        
        Logger.debug("LogTrimmer: Checking #{log_file} - File size: #{file_size} bytes, Max size: #{max_size_bytes} bytes")

        # Read the file content
        content = File.read!(log_file)
        lines = String.split(content, "\n")
        line_count = length(lines)
        
        Logger.debug("LogTrimmer: File has #{line_count} lines, max allowed: #{@max_log_lines}")

        # Trim if either file size exceeds limit OR line count exceeds limit
        needs_trim = file_size > max_size_bytes || line_count > @max_log_lines

        if needs_trim do
          # Keep only the last @max_log_lines lines
          trimmed_lines = lines |> Enum.take(-@max_log_lines)
          trimmed_content = Enum.join(trimmed_lines, "\n")

          # Write to a temporary file and rename for atomic operation
          temp_file = log_file <> ".tmp"
          File.write!(temp_file, trimmed_content)
          File.rename!(temp_file, log_file)

          lines_removed = line_count - length(trimmed_lines)
          Logger.debug("LogTrimmer: Trimmed #{log_file} - Removed #{lines_removed} lines, kept #{length(trimmed_lines)} lines")
          {:ok, :trimmed, lines_removed}
        else
          Logger.debug("LogTrimmer: File size (#{file_size} bytes) and line count (#{line_count}) are both under limits, no trim needed")
          {:ok, :no_trim_needed}
        end
      else
        Logger.debug("LogTrimmer: File #{log_file} does not exist")
        {:ok, :no_trim_needed}
      end
    rescue
      error ->
        {:error, Exception.message(error)}
    end
  end

  defp parse_size(size_string) do
    # Parse strings like "5 MB", "10 GB", "500 KB", "2 G", "1024 K" into bytes
    # Default to bytes when no unit is specified
    case Regex.run(~r/^(\d+(?:\.\d+)?)\s*(B|K|KB|M|MB|G|GB|T|TB)?$/i, size_string) do
      [_, number_str] ->
        # No unit specified, default to bytes
        parse_number(number_str)

      [_, number_str, unit] ->
        number = parse_number(number_str)

        multiplier = case String.upcase(unit) do
          "B" -> 1
          "K" -> 1_024
          "KB" -> 1_024
          "M" -> 1_024 * 1_024
          "MB" -> 1_024 * 1_024
          "G" -> 1_024 * 1_024 * 1_024
          "GB" -> 1_024 * 1_024 * 1_024
          "T" -> 1_024 * 1_024 * 1_024 * 1_024
          "TB" -> 1_024 * 1_024 * 1_024 * 1_024
        end

        round(number * multiplier)

      _ ->
        raise ArgumentError, "Invalid size format: #{size_string}"
    end
  end

  defp parse_number(number_str) do
    if String.contains?(number_str, ".") do
      String.to_float(number_str)
    else
      String.to_integer(number_str)
    end
  end
end
