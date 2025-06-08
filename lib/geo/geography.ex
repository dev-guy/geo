defmodule Geo.Geography do
  use Ash.Domain,
    otp_app: :healthcompass_directory

  resources do
    resource Geo.Geography.Country do
      define :create_country, action: :create
      define :upsert_country, action: :upsert
      define :update_country, action: :update
      define :get_country_by_iso_code, action: :by_iso_code, args: [:iso_code]
      define :search_countries, action: :search_countries, args: [{:optional, :query}]
      define :get_all_countries, action: :read
    end
  end
end
