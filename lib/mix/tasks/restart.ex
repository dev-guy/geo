defmodule Mix.Tasks.Restart do
  @moduledoc """
  Restarts the Phoenix server in the background with output redirected to geo.log.

  This task will:
  1. Stop any running Phoenix server and log trimmer
  2. Start the server in the background
  3. Redirect both stdout and stderr to geo.log
  4. Start a background LogTrimmer process to periodically trim the log file

  ## Examples

      mix restart
  """

  use Mix.Task

  @shortdoc "Restarts the Geo service"

  # Configuration for log trimming
  @trim_interval :timer.minutes(5)
  @max_log_lines 10_000

  @impl Mix.Task
  def run(_args) do
    log_file = "geo.log"

    # Stop existing server and log trimmer using the geo.stop task
    Mix.Tasks.Stop.run([])

    # Start server in background with output redirection
    Mix.shell().info("Starting Phoenix server in background...")
    Mix.shell().info("Output will be redirected to #{log_file}")
    Mix.shell().info("Log will be trimmed every #{div(@trim_interval, 60_000)} minutes to #{@max_log_lines} lines")

    # Create or truncate the log file
    File.write!(log_file, "")

    # Start log trimming process
    start_log_trimmer(log_file)

    # Use System.cmd with a shell command to properly background the process
    case System.cmd("sh", ["-c", "nohup mix phx.server > #{log_file} 2>&1 &"], cd: File.cwd!()) do
      {_, 0} ->
        # Give it a moment to start
        Process.sleep(2000)

        # Function to find Phoenix server PID
        find_phoenix_pid = fn ->
          case System.cmd("pgrep", ["-f", "beam.smp.*mix phx.server"], stderr_to_stdout: true) do
            {output, 0} ->
              output
              |> String.trim()
              |> String.split("\n")
              |> List.first()
              |> case do
                "" -> nil
                pid -> pid
              end

            _ ->
              nil
          end
        end

        # Verify it started
        case find_phoenix_pid.() do
          nil ->
            Mix.shell().error("Failed to start Phoenix server. Check #{log_file} for details.")

          pid ->
            Mix.shell().info("Phoenix server started successfully with PID: #{pid}")
            Mix.shell().info("Server is running in background. Check #{log_file} for logs.")
            Mix.shell().info("To stop the server, run: mix stop")
        end

      {error, exit_code} ->
        Mix.shell().error(
          "Failed to start server in background: #{error} (exit code: #{exit_code})"
        )
    end
  end

  defp start_log_trimmer(log_file) do
    # Stop any existing log trimmer first
    Geo.LogTrimmer.stop()

    # Start the LogTrimmer GenServer
    case Geo.LogTrimmer.start_link(log_file) do
      {:ok, _pid} ->
        Mix.shell().info("Log trimmer started successfully")

      {:error, {:already_started, _pid}} ->
        Mix.shell().info("Log trimmer already running")

      {:error, reason} ->
        Mix.shell().error("Failed to start log trimmer: #{inspect(reason)}")
    end
  end
end
