defmodule Geo.MixProject do
  use Mix.Project

  def project do
    base_config = [
      app: :geo,
      version: "0.1.7", # GEO_VERSION
      # See also .tool-versions
      elixir: "~> 1.18", # Mishka Chelekom requires 1.17
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
      dialyzer: dialyzer()
    ]

    if Mix.env() == :dev do
      base_config ++ [listeners: [Phoenix.CodeReloader]]
    else
      base_config
    end
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Geo.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:dialyxir, "~> 1.4", only: [:dev], runtime: false},
      {:sourceror, "~> 1.8", only: [:dev, :test]},
      {:usage_rules, "~> 0.1", only: [:dev]},
      {:ash_ai, "~> 0.1"},
      {:tidewave, "~> 0.1", only: [:dev]},
      {:mishka_chelekom, "~> 0.0", only: [:dev]},
      {:live_debugger, "~> 0.2", only: [:dev]},
      {:ash_postgres, "~> 2.6.0"},
      {:phoenix, "~> 1.8.0-rc.3"},
      {:ash, "~> 3.0"},
      {:ash_phoenix, "~> 2.3"},
      {:igniter, "~> 0.6", only: [:dev, :test]},
      {:phoenix_ecto, "~> 4.5"},
      {:ecto_sql, "~> 3.10"},
      {:postgrex, ">= 0.0.0"},
      {:phoenix_html, "~> 4.1"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:phoenix_live_view, "~> 1.0"},
      {:floki, ">= 0.30.0", only: :test},
      {:phoenix_live_dashboard, "~> 0.8.3"},
      {:esbuild, "~> 0.8", runtime: Mix.env() == :dev},
      {:tailwind, "~> 0.3.0", runtime: Mix.env() == :dev},
      {:heroicons,
       github: "tailwindlabs/heroicons",
       tag: "v2.1.1",
       sparse: "optimized",
       app: false,
       compile: false,
       depth: 1},
      {:swoosh, "~> 1.5"},
      {:finch, "~> 0.13"},
      {:telemetry_metrics, "~> 1.0"},
      {:telemetry_poller, "~> 1.0"},
      {:gettext, "~> 0.26"},
      {:jason, "~> 1.2"},
      {:dns_cluster, "~> 0.2.0"},
      {:bandit, "~> 1.5"}
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  # For example, to install project dependencies and perform other setup tasks, run:
  #
  #     $ mix setup
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    base_aliases = [
      setup: ["deps.get", "ash.setup", "assets.setup", "assets.build", "run priv/repo/seeds.exs"],
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ash.setup --quiet", "test"],
      "assets.setup": ["tailwind.install --if-missing", "esbuild.install --if-missing"],
      "assets.build": ["tailwind geo", "esbuild geo"],
      "assets.deploy": [
        "tailwind geo --minify",
        "esbuild geo --minify",
        "phx.digest"
      ],
      "geo.deploy": ["cmd fly deploy --strategy immediate --skip-release-command"]
    ]

    if Mix.env() == :dev do
      base_aliases ++ ["deps.get": [&deps_get_with_sync/1]]
    else
      base_aliases
    end
  end

  defp deps_get_with_sync(_args) do
    Mix.Task.run("deps.get")
    Mix.Task.run("usage_rules.sync", [".rules", "--all"])
  end

  defp dialyzer do
    [
      plt_file: {:no_warn, "priv/plts/dialyzer.plt"},
      plt_add_apps: [:mix],
      ignore_warnings: ".dialyzer_ignore.exs",
      list_unused_filters: true
    ]
  end
end
