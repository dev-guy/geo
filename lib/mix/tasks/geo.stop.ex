defmodule Mix.Tasks.Stop do
  @moduledoc """
  Stops the server if it's running.

  This task will find and stop any running server process.

  ## Examples

      mix stop
  """

  use Mix.Task

  @shortdoc "Stops the Geo service"

  @impl Mix.Task
  def run(_args) do
    # Function to find the server PID
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

    # Stop existing server if running
    case find_phoenix_pid.() do
      nil ->
        Mix.shell().info("Server is not running.")

      pid ->
        Mix.shell().info("Found server running with PID: #{pid}")
        Mix.shell().info("Stopping server...")

        # Graceful shutdown first
        case System.cmd("kill", ["-TERM", pid], stderr_to_stdout: true) do
          {_, 0} ->
            wait_for_shutdown(pid, 3)

            # Check if still running and force kill if necessary
            case System.cmd("kill", ["-0", pid], stderr_to_stdout: true) do
              {_, 0} ->
                Mix.shell().info("Force stopping server")
                System.cmd("kill", ["-9", pid])
                wait_for_shutdown(pid, 1000)

              _ ->
                :ok
            end

            Mix.shell().info("Server stopped.")

          {error, _} ->
            Mix.shell().error("Failed to stop server: #{error}")
        end
    end
  end

  # Helper function to wait for process to stop
  defp wait_for_shutdown(pid, seconds_remaining) when seconds_remaining > 0 do
    case System.cmd("kill", ["-0", pid], stderr_to_stdout: true) do
      {_, 0} ->
        # Process still running, wait 1 second and try again
        Process.sleep(1000)
        wait_for_shutdown(pid, seconds_remaining - 1)

      _ ->
        # Process has stopped
        {:ok, :stopped}
    end
  end

  defp wait_for_shutdown(_pid, seconds_remaining) when seconds_remaining <= 0 do
    # Timeout reached
    {:error, :timeout}
  end
end
