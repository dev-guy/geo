defmodule Mix.Tasks.Seed do
  @moduledoc """
  Runs database seeds without starting the full application supervision tree.

  This task configures the application to only start essential components
  (database, etc.) and skips the cache supervisor and web endpoint.

  ## Examples

      mix seed
  """

  use Mix.Task

  @shortdoc "Runs database seeds in minimal mode"

  @impl Mix.Task
  def run(args) do
    # Set the application to seed-only mode before starting
    Application.put_env(:geo, :start_mode, :seed_resources)

    # Parse command line args
    {opts, [], []} = OptionParser.parse(args, strict: [file: :string])
    seed_file = opts[:file] || "priv/repo/seeds.exs"

    # Start only the minimal required applications
    Mix.Task.run("app.start", [])

    # Run the seed file
    if File.exists?(seed_file) do
      Mix.shell().info("Running seed file: #{seed_file}")
      Code.eval_file(seed_file)
      Mix.shell().info("Seeding completed successfully!")
    else
      Mix.shell().error("Seed file not found: #{seed_file}")
    end
  end
end
