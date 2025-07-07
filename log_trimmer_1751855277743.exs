#!/usr/bin/env elixir

defmodule LogTrimmer do
  @trim_interval 300000
  @max_log_lines 10000

  def run(log_file) do
    trim_log_periodically(log_file)
  end

  defp trim_log_periodically(log_file) do
    Process.sleep(@trim_interval)

    try do
      trim_log_file(log_file)
    rescue
      _ -> :ok
    end

    trim_log_periodically(log_file)
  end

  defp trim_log_file(log_file) do
    if File.exists?(log_file) do
      content = File.read!(log_file)
      lines = String.split(content, "\n")

      if length(lines) > @max_log_lines do
        # Keep only the last @max_log_lines lines
        trimmed_lines = lines |> Enum.take(-@max_log_lines)
        trimmed_content = Enum.join(trimmed_lines, "\n")

        # Write to a temporary file and rename for atomic operation
        temp_file = log_file <> ".tmp"
        File.write!(temp_file, trimmed_content)
        File.rename!(temp_file, log_file)
      end
    end
  end
end

LogTrimmer.run("geo.log")
