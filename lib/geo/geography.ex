defmodule Geo.Geography do
  use Ash.Domain,
    otp_app: :geo

  resources do
    resource Geo.Country.Country do
      define :create_country, action: :create
      define :upsert_country, action: :upsert
      define :update_country, action: :update
      define :list_countries, action: :read
      # TODO: Re-enable when selector_search action is fixed
      define :selector_search_countries, action: :selector_search, args: [{:optional, :query}]
      define :get_country_iso_code_cached, action: :read, get_by: [:iso_code]
    end
  end
end
