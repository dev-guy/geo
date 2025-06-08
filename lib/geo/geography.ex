defmodule Geo.Geography do
  use Ash.Domain,
    otp_app: :geo

  resources do
    resource Geo.Country.Country do
      define :create_country, action: :create
      define :upsert_country, action: :upsert
      define :update_country, action: :update
      define :list, action: :read
      define :search_for_countries, action: :search, args: [{:optional, :query}]
    end
  end
end
