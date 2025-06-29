defmodule Geo.Geography.Country.Seed do
  @moduledoc """
  Creates valid `Country` structs through the canonical :create action.
  """
  def seed_countries!() do
    # Specify the fields that will be updated
    seed_countries_data()
    |> Geo.Geography.upsert_country!(upsert_fields: [:name, :flag, :slug])
  end

  # Pre-defined country data as used in the original seed
  def seed_countries_data do
    [
      %{name: "Afghanistan", iso_code: "AF", flag: "🇦🇫"},
      %{name: "Albania", iso_code: "AL", flag: "🇦🇱"},
      %{name: "Algeria", iso_code: "DZ", flag: "🇩🇿"},
      %{name: "Andorra", iso_code: "AD", flag: "🇦🇩"},
      %{name: "Angola", iso_code: "AO", flag: "🇦🇴"},
      %{name: "Antigua and Barbuda", iso_code: "AG", flag: "🇦🇬"},
      %{name: "Argentina", iso_code: "AR", flag: "🇦🇷"},
      %{name: "Armenia", iso_code: "AM", flag: "🇦🇲"},
      %{name: "Australia", iso_code: "AU", flag: "🇦🇺"},
      %{name: "Austria", iso_code: "AT", flag: "🇦🇹"},
      %{name: "Azerbaijan", iso_code: "AZ", flag: "🇦🇿"},
      %{name: "Bahamas", iso_code: "BS", flag: "🇧🇸"},
      %{name: "Bahrain", iso_code: "BH", flag: "🇧🇭"},
      %{name: "Bangladesh", iso_code: "BD", flag: "🇧🇩"},
      %{name: "Barbados", iso_code: "BB", flag: "🇧🇧"},
      %{name: "Belarus", iso_code: "BY", flag: "🇧🇾"},
      %{name: "Belgium", iso_code: "BE", flag: "🇧🇪"},
      %{name: "Belize", iso_code: "BZ", flag: "🇧🇿"},
      %{name: "Benin", iso_code: "BJ", flag: "🇧🇯"},
      %{name: "Bhutan", iso_code: "BT", flag: "🇧🇹"},
      %{name: "Bolivia", iso_code: "BO", flag: "🇧🇴"},
      %{name: "Bosnia and Herzegovina", iso_code: "BA", flag: "🇧🇦"},
      %{name: "Botswana", iso_code: "BW", flag: "🇧🇼"},
      %{name: "Brazil", iso_code: "BR", flag: "🇧🇷"},
      %{name: "Brunei", iso_code: "BN", flag: "🇧🇳"},
      %{name: "Bulgaria", iso_code: "BG", flag: "🇧🇬"},
      %{name: "Burkina Faso", iso_code: "BF", flag: "🇧🇫"},
      %{name: "Burundi", iso_code: "BI", flag: "🇧🇮"},
      %{name: "Cabo Verde", iso_code: "CV", flag: "🇨🇻"},
      %{name: "Cambodia", iso_code: "KH", flag: "🇰🇭"},
      %{name: "Cameroon", iso_code: "CM", flag: "🇨🇲"},
      %{name: "Canada", iso_code: "CA", flag: "🇨🇦"},
      %{name: "Central African Republic", iso_code: "CF", flag: "🇨🇫"},
      %{name: "Chad", iso_code: "TD", flag: "🇹🇩"},
      %{name: "Chile", iso_code: "CL", flag: "🇨🇱"},
      %{name: "China", iso_code: "CN", flag: "🇨🇳"},
      %{name: "Colombia", iso_code: "CO", flag: "🇨🇴"},
      %{name: "Comoros", iso_code: "KM", flag: "🇰🇲"},
      %{name: "Congo, Democratic Republic of the", iso_code: "CD", flag: "🇨🇩"},
      %{name: "Congo, Republic of the", iso_code: "CG", flag: "🇨🇬"},
      %{name: "Costa Rica", iso_code: "CR", flag: "🇨🇷"},
      %{name: "Côte d'Ivoire", iso_code: "CI", flag: "🇨🇮"},
      %{name: "Croatia", iso_code: "HR", flag: "🇭🇷"},
      %{name: "Cuba", iso_code: "CU", flag: "🇨🇺"},
      %{name: "Cyprus", iso_code: "CY", flag: "🇨🇾"},
      %{name: "Czech Republic", iso_code: "CZ", flag: "🇨🇿"},
      %{name: "Denmark", iso_code: "DK", flag: "🇩🇰"},
      %{name: "Djibouti", iso_code: "DJ", flag: "🇩🇯"},
      %{name: "Dominica", iso_code: "DM", flag: "🇩🇲"},
      %{name: "Dominican Republic", iso_code: "DO", flag: "🇩🇴"},
      %{name: "Ecuador", iso_code: "EC", flag: "🇪🇨"},
      %{name: "Egypt", iso_code: "EG", flag: "🇪🇬"},
      %{name: "El Salvador", iso_code: "SV", flag: "🇸🇻"},
      %{name: "Equatorial Guinea", iso_code: "GQ", flag: "🇬🇶"},
      %{name: "Eritrea", iso_code: "ER", flag: "🇪🇷"},
      %{name: "Estonia", iso_code: "EE", flag: "🇪🇪"},
      %{name: "Eswatini", iso_code: "SZ", flag: "🇸🇿"},
      %{name: "Ethiopia", iso_code: "ET", flag: "🇪🇹"},
      %{name: "Fiji", iso_code: "FJ", flag: "🇫🇯"},
      %{name: "Finland", iso_code: "FI", flag: "🇫🇮"},
      %{name: "France", iso_code: "FR", flag: "🇫🇷"},
      %{name: "Gabon", iso_code: "GA", flag: "🇬🇦"},
      %{name: "Gambia", iso_code: "GM", flag: "🇬🇲"},
      %{name: "Georgia", iso_code: "GE", flag: "🇬🇪"},
      %{name: "Germany", iso_code: "DE", flag: "🇩🇪"},
      %{name: "Ghana", iso_code: "GH", flag: "🇬🇭"},
      %{name: "Greece", iso_code: "GR", flag: "🇬🇷"},
      %{name: "Grenada", iso_code: "GD", flag: "🇬🇩"},
      %{name: "Guatemala", iso_code: "GT", flag: "🇬🇹"},
      %{name: "Guinea", iso_code: "GN", flag: "🇬🇳"},
      %{name: "Guinea-Bissau", iso_code: "GW", flag: "🇬🇼"},
      %{name: "Guyana", iso_code: "GY", flag: "🇬🇾"},
      %{name: "Haiti", iso_code: "HT", flag: "🇭🇹"},
      %{name: "Honduras", iso_code: "HN", flag: "🇭🇳"},
      %{name: "Hungary", iso_code: "HU", flag: "🇭🇺"},
      %{name: "Iceland", iso_code: "IS", flag: "🇮🇸"},
      %{name: "India", iso_code: "IN", flag: "🇮🇳"},
      %{name: "Indonesia", iso_code: "ID", flag: "🇮🇩"},
      %{name: "Iran", iso_code: "IR", flag: "🇮🇷"},
      %{name: "Iraq", iso_code: "IQ", flag: "🇮🇶"},
      %{name: "Ireland", iso_code: "IE", flag: "🇮🇪"},
      %{name: "Israel", iso_code: "IL", flag: "🇮🇱"},
      %{name: "Italy", iso_code: "IT", flag: "🇮🇹"},
      %{name: "Jamaica", iso_code: "JM", flag: "🇯🇲"},
      %{name: "Japan", iso_code: "JP", flag: "🇯🇵"},
      %{name: "Jordan", iso_code: "JO", flag: "🇯🇴"},
      %{name: "Kazakhstan", iso_code: "KZ", flag: "🇰🇿"},
      %{name: "Kenya", iso_code: "KE", flag: "🇰🇪"},
      %{name: "Kiribati", iso_code: "KI", flag: "🇰🇮"},
      %{name: "Kuwait", iso_code: "KW", flag: "🇰🇼"},
      %{name: "Kyrgyzstan", iso_code: "KG", flag: "🇰🇬"},
      %{name: "Laos", iso_code: "LA", flag: "🇱🇦"},
      %{name: "Latvia", iso_code: "LV", flag: "🇱🇻"},
      %{name: "Lebanon", iso_code: "LB", flag: "🇱🇧"},
      %{name: "Lesotho", iso_code: "LS", flag: "🇱🇸"},
      %{name: "Liberia", iso_code: "LR", flag: "🇱🇷"},
      %{name: "Libya", iso_code: "LY", flag: "🇱🇾"},
      %{name: "Liechtenstein", iso_code: "LI", flag: "🇱🇮"},
      %{name: "Lithuania", iso_code: "LT", flag: "🇱🇹"},
      %{name: "Luxembourg", iso_code: "LU", flag: "🇱🇺"},
      %{name: "Madagascar", iso_code: "MG", flag: "🇲🇬"},
      %{name: "Malawi", iso_code: "MW", flag: "🇲🇼"},
      %{name: "Malaysia", iso_code: "MY", flag: "🇲🇾"},
      %{name: "Maldives", iso_code: "MV", flag: "🇲🇻"},
      %{name: "Mali", iso_code: "ML", flag: "🇲🇱"},
      %{name: "Malta", iso_code: "MT", flag: "🇲🇹"},
      %{name: "Marshall Islands", iso_code: "MH", flag: "🇲🇭"},
      %{name: "Mauritania", iso_code: "MR", flag: "🇲🇷"},
      %{name: "Mauritius", iso_code: "MU", flag: "🇲🇺"},
      %{name: "Mexico", iso_code: "MX", flag: "🇲🇽"},
      %{name: "Micronesia", iso_code: "FM", flag: "🇫🇲"},
      %{name: "Moldova", iso_code: "MD", flag: "🇲🇩"},
      %{name: "Monaco", iso_code: "MC", flag: "🇲🇨"},
      %{name: "Mongolia", iso_code: "MN", flag: "🇲🇳"},
      %{name: "Montenegro", iso_code: "ME", flag: "🇲🇪"},
      %{name: "Morocco", iso_code: "MA", flag: "🇲🇦"},
      %{name: "Mozambique", iso_code: "MZ", flag: "🇲🇿"},
      %{name: "Myanmar", iso_code: "MM", flag: "🇲🇲"},
      %{name: "Namibia", iso_code: "NA", flag: "🇳🇦"},
      %{name: "Nauru", iso_code: "NR", flag: "🇳🇷"},
      %{name: "Nepal", iso_code: "NP", flag: "🇳🇵"},
      %{name: "Netherlands", iso_code: "NL", flag: "🇳🇱"},
      %{name: "New Zealand", iso_code: "NZ", flag: "🇳🇿"},
      %{name: "Nicaragua", iso_code: "NI", flag: "🇳🇮"},
      %{name: "Niger", iso_code: "NE", flag: "🇳🇪"},
      %{name: "Nigeria", iso_code: "NG", flag: "🇳🇬"},
      %{name: "North Korea", iso_code: "KP", flag: "🇰🇵"},
      %{name: "North Macedonia", iso_code: "MK", flag: "🇲🇰"},
      %{name: "Norway", iso_code: "NO", flag: "🇳🇴"},
      %{name: "Oman", iso_code: "OM", flag: "🇴🇲"},
      %{name: "Pakistan", iso_code: "PK", flag: "🇵🇰"},
      %{name: "Palau", iso_code: "PW", flag: "🇵🇼"},
      %{name: "Palestine", iso_code: "PS", flag: "🇵🇸"},
      %{name: "Panama", iso_code: "PA", flag: "🇵🇦"},
      %{name: "Papua New Guinea", iso_code: "PG", flag: "🇵🇬"},
      %{name: "Paraguay", iso_code: "PY", flag: "🇵🇾"},
      %{name: "Peru", iso_code: "PE", flag: "🇵🇪"},
      %{name: "Philippines", iso_code: "PH", flag: "🇵🇭"},
      %{name: "Poland", iso_code: "PL", flag: "🇵🇱"},
      %{name: "Portugal", iso_code: "PT", flag: "🇵🇹"},
      %{name: "Qatar", iso_code: "QA", flag: "🇶🇦"},
      %{name: "Romania", iso_code: "RO", flag: "🇷🇴"},
      %{name: "Russia", iso_code: "RU", flag: "🇷🇺"},
      %{name: "Rwanda", iso_code: "RW", flag: "🇷🇼"},
      %{name: "Saint Kitts and Nevis", iso_code: "KN", flag: "🇰🇳"},
      %{name: "Saint Lucia", iso_code: "LC", flag: "🇱🇨"},
      %{name: "Saint Vincent and the Grenadines", iso_code: "VC", flag: "🇻🇨"},
      %{name: "Samoa", iso_code: "WS", flag: "🇼🇸"},
      %{name: "San Marino", iso_code: "SM", flag: "🇸🇲"},
      %{name: "Sao Tome and Principe", iso_code: "ST", flag: "🇸🇹"},
      %{name: "Saudi Arabia", iso_code: "SA", flag: "🇸🇦"},
      %{name: "Senegal", iso_code: "SN", flag: "🇸🇳"},
      %{name: "Serbia", iso_code: "RS", flag: "🇷🇸"},
      %{name: "Seychelles", iso_code: "SC", flag: "🇸🇨"},
      %{name: "Sierra Leone", iso_code: "SL", flag: "🇸🇱"},
      %{name: "Singapore", iso_code: "SG", flag: "🇸🇬"},
      %{name: "Slovakia", iso_code: "SK", flag: "🇸🇰"},
      %{name: "Slovenia", iso_code: "SI", flag: "🇸🇮"},
      %{name: "Solomon Islands", iso_code: "SB", flag: "🇸🇧"},
      %{name: "Somalia", iso_code: "SO", flag: "🇸🇴"},
      %{name: "South Africa", iso_code: "ZA", flag: "🇿🇦"},
      %{name: "South Korea", iso_code: "KR", flag: "🇰🇷"},
      %{name: "South Sudan", iso_code: "SS", flag: "🇸🇸"},
      %{name: "Spain", iso_code: "ES", flag: "🇪🇸"},
      %{name: "Sri Lanka", iso_code: "LK", flag: "🇱🇰"},
      %{name: "Sudan", iso_code: "SD", flag: "🇸🇩"},
      %{name: "Suriname", iso_code: "SR", flag: "🇸🇷"},
      %{name: "Sweden", iso_code: "SE", flag: "🇸🇪"},
      %{name: "Switzerland", iso_code: "CH", flag: "🇨🇭"},
      %{name: "Syria", iso_code: "SY", flag: "🇸🇾"},
      %{name: "Taiwan", iso_code: "TW", flag: "🇹🇼"},
      %{name: "Tajikistan", iso_code: "TJ", flag: "🇹🇯"},
      %{name: "Tanzania", iso_code: "TZ", flag: "🇹🇿"},
      %{name: "Thailand", iso_code: "TH", flag: "🇹🇭"},
      %{name: "Timor-Leste", iso_code: "TL", flag: "🇹🇱"},
      %{name: "Togo", iso_code: "TG", flag: "🇹🇬"},
      %{name: "Tonga", iso_code: "TO", flag: "🇹🇴"},
      %{name: "Trinidad and Tobago", iso_code: "TT", flag: "🇹🇹"},
      %{name: "Tunisia", iso_code: "TN", flag: "🇹🇳"},
      %{name: "Turkey", iso_code: "TR", flag: "🇹🇷"},
      %{name: "Turkmenistan", iso_code: "TM", flag: "🇹🇲"},
      %{name: "Tuvalu", iso_code: "TV", flag: "🇹🇻"},
      %{name: "Uganda", iso_code: "UG", flag: "🇺🇬"},
      %{name: "Ukraine", iso_code: "UA", flag: "🇺🇦"},
      %{name: "United Arab Emirates", iso_code: "AE", flag: "🇦🇪"},
      %{name: "United Kingdom", iso_code: "GB", flag: "🇬🇧"},
      %{name: "United States", iso_code: "US", flag: "🇺🇸"},
      %{name: "Uruguay", iso_code: "UY", flag: "🇺🇾"},
      %{name: "Uzbekistan", iso_code: "UZ", flag: "🇺🇿"},
      %{name: "Vanuatu", iso_code: "VU", flag: "🇻🇺"},
      %{name: "Vatican City", iso_code: "VA", flag: "🇻🇦"},
      %{name: "Venezuela", iso_code: "VE", flag: "🇻🇪"},
      %{name: "Vietnam", iso_code: "VN", flag: "🇻🇳"},
      %{name: "Yemen", iso_code: "YE", flag: "🇾🇪"},
      %{name: "Zambia", iso_code: "ZM", flag: "🇿🇲"},
      %{name: "Zimbabwe", iso_code: "ZW", flag: "🇿🇼"}
    ]
  end
end
