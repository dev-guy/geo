defmodule Mix.Tasks.Stop do
  @moduledoc """
  Stops the Phoenix server if it's running.

  This task will find and stop any running Phoenix server process.

  ## Examples

      mix stop
  """

  use Mix.Task

  @shortdoc "Stops the Geo service"

  @impl Mix.Task
  def run(_args) do
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
        _ -> nil
      end
    end

    # Stop existing server if running
    case find_phoenix_pid.() do
      nil ->
        Mix.shell().info("Phoenix server is not running.")

      pid ->
        Mix.shell().info("Found Phoenix server running with PID: #{pid}")
        Mix.shell().info("Stopping Phoenix server...")

        # Graceful shutdown first
        case System.cmd("kill", ["-TERM", pid], stderr_to_stdout: true) do
          {_, 0} ->
            # TODO: Wait up to 20 seconds for graceful shutdown
            # There is a bug stopping the server from stopping
            Enum.reduce_while(1..1, nil, fn _, _acc ->
              Process.sleep(1000)
              case find_phoenix_pid.() do
                nil -> {:halt, :stopped}
                _ -> {:cont, :running}
              end
            end)

            # Check if still running and force kill if necessary
            case System.cmd("kill", ["-0", pid], stderr_to_stdout: true) do
              {_, 0} ->
                Mix.shell().info("Force stopping Phoenix server...")
                System.cmd("kill", ["-9", pid])
                Process.sleep(1000)
              _ ->
                :ok
            end

            Mix.shell().info("Phoenix server stopped.")

          {error, _} ->
            Mix.shell().error("Failed to stop Phoenix server: #{error}")
        end
    end
  end
end
