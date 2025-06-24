defmodule Geo.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {DNSCluster, query: Application.get_env(:geo, :dns_cluster_query) || :ignore}
    ]

    # Only start cache supervisor and web components if not in seed mode
    children = children ++ conditional_children()

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Geo.Supervisor]
    Supervisor.start_link(children, opts)
  end

  defp conditional_children do
    case Application.get_env(:geo, :start_mode, :full) do
      :seed_resources ->
        [
          Geo.Repo
        ]

      :full ->
        [
          Geo.Repo,
          GeoWeb.Telemetry,
          {Geo.Geography.Country.CacheSupervisor, []},
          # Start to serve requests, typically the last entry
          GeoWeb.Endpoint,
          {Phoenix.PubSub, name: Geo.PubSub},
          # Start the Finch HTTP client for sending emails
          {Finch, name: Geo.Finch}
        ]
    end
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    GeoWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
