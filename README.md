# Geo - Geographic Data Management System

## Project Overview

Geo is a modern Elixir/Phoenix application built with the Ash Framework that provides efficient geographic data management and search capabilities. The application focuses on country data management with high-performance caching and intelligent search functionality designed for user interfaces.

### Architecture

The application follows a clean domain-driven architecture using Ash Framework:

- **Domain Layer**: `Geo.Geography` - Core business logic and operations
- **Resource Layer**: `Geo.Country.Country` - Data models and validations  
- **Web Layer**: Phoenix LiveView components for interactive UI
- **Caching Layer**: High-performance country lookup and search caching

### Key Features

- **Country Management**: Full CRUD operations for country data (ISO codes, names, flags, slugs)
- **Intelligent Search**: Multi-criteria search with prioritized results (ISO codes, names)
- **High-Performance Caching**: Sub-millisecond country lookups via `Geo.Country.Cache`
- **Interactive UI**: Real-time search with grouped, sortable results
- **Upsert Operations**: Efficient create-or-update operations using unique identities

### Requirements

- PostgreSQL

### Technology Stack

- **Backend**: Elixir
- **Frontend**: Phoenix LiveView with Mishka Chelekom components
- **Database**: PostgreSQL with Ecto/AshPostgres
- **Application**: Ash Framework for domain modeling

## Usage

1. Install PostgreSQL
2. `mix setup` to install and setup dependencies
3. `mix phx.server` or inside IEx with `iex -S mix phx.server`

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser.

Ready to run in production? Please [check our deployment guides](https://hexdocs.pm/phoenix/deployment.html).

## Architecture Diagrams

### Ash Resources Overview

```mermaid
classDiagram
    Geo.Geography
    class Geo.Country.Country {
        Domain: Geo.Geography
        Source: lib/geo/country/country.ex

        UUIDv7 id
        CiString name
        CiString slug
        UtcDatetimeUsec created_at
        UtcDatetimeUsec updated_at
        CiString iso_code
        String flag
        destroy()
        read()
        create(name, iso_code, flag, slug)
        upsert(name, iso_code, flag, slug)
        update(name, iso_code, flag, slug)
        get_by_iso_code_cached(iso_code)
        selector_search(query)
    }
```

### Country Search Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant LiveView as GeoWeb.HomeLive
    participant Component as GeoWeb.CountrySelector
    participant Domain as Geo.Geography
    participant Cache as Geo.Country.Cache
    participant DB as PostgreSQL

    User->>Component: Types search query
    Component->>Component: handle_event("search_combobox_updated")
    Component->>Domain: selector_search_countries!(query)
    Domain->>Cache: search!(query)
    
    alt Cache Hit
        Cache-->>Domain: {iso_code_results, name_results}
    else Cache Miss
        Cache->>DB: Query countries
        DB-->>Cache: Country records
        Cache->>Cache: Process and cache results
        Cache-->>Domain: {iso_code_results, name_results}
    end
    
    Domain-->>Component: %{by_iso_code: [...], by_name: [...]}
    Component->>Component: Update current_countries assign
    Component-->>User: Render updated search results
    
    User->>Component: Selects country
    Component->>Component: handle_event("country_selected")
    Component->>LiveView: send({:country_selected, country})
    LiveView->>LiveView: assign(:selected_country, country)
    LiveView-->>User: Display selected country details
```

### UI Components Class Diagram

```mermaid
classDiagram
    class GeoWeb.HomeLive {
        +mount/3
        +handle_info/2
        +render/1
        -selected_country: Country
    }
    
    class GeoWeb.CountrySelector {
        +update/2
        +render/1
        +handle_event/3
        -original_countries: Map
        -current_countries: Map
        -selected_country: Country
        -iso_code_group_collapsed: Boolean
        -name_group_collapsed: Boolean
        -group_order: Atom
        +search_combobox_updated/2
        +toggle_group_sort/2
        +toggle_group_collapse/2
        +country_selected/2
    }
    
    class SearchCombobox {
        <<Component>>
        +name: String
        +value: String
        +placeholder: String
        +search_event: String
        +variant: String
        +color: String
        +enable_group_sorting: Boolean
    }
    
    class CountryOptionContent {
        <<Helper Component>>
        +country: Country
        +group_order: Atom
        +group_name: String
    }
    
    GeoWeb.HomeLive --> GeoWeb.CountrySelector : uses
    GeoWeb.CountrySelector --> SearchCombobox : renders
    GeoWeb.CountrySelector --> CountryOptionContent : renders
    GeoWeb.HomeLive ..> Geo.Country.Country : displays
    GeoWeb.CountrySelector ..> Geo.Country.Country : manages
```

### C4 Architecture Diagrams

#### Level 1: System Context

```mermaid
C4Context
    title System Context Diagram - Geo Application
    
    Person(user, "User", "Application user searching and selecting countries")
    System(geo, "Geo Application", "Geographic data management system providing country search and selection")
    SystemDb(postgres, "PostgreSQL Database", "Stores country data with ISO codes, names, flags")
    
    Rel(user, geo, "Searches and selects countries", "HTTPS/WebSocket")
    Rel(geo, postgres, "Reads/writes country data", "SQL")
```

#### Level 2: Container Diagram

```mermaid
C4Container
    title Container Diagram - Geo Application
    
    Person(user, "User")
    
    Container_Boundary(geo, "Geo Application") {
        Container(web, "Phoenix Web Server", "Elixir/Phoenix", "Handles HTTP requests and WebSocket connections")
        Container(liveview, "LiveView Components", "Phoenix LiveView", "Interactive UI components for country selection")
        Container(domain, "Geography Domain", "Ash Framework", "Core business logic and country operations")
        Container(cache, "Country Cache", "Elixir/ETS", "High-performance country lookup cache")
    }
    
    ContainerDb(postgres, "PostgreSQL Database", "PostgreSQL", "Stores country data")
    
    Rel(user, web, "Uses", "HTTPS/WebSocket")
    Rel(web, liveview, "Renders")
    Rel(liveview, domain, "Calls")
    Rel(domain, cache, "Uses")
    Rel(domain, postgres, "Reads/writes", "SQL")
    Rel(cache, postgres, "Refreshes from", "SQL")
```

#### Level 3: Component Diagram

```mermaid
C4Component
    title Component Diagram - Geography Domain
    
    Container_Boundary(web, "Phoenix Web Layer") {
        Component(home_live, "HomeLive", "Phoenix LiveView", "Main application page")
        Component(country_selector, "CountrySelector", "LiveComponent", "Interactive country selection component")
    }
    
    Container_Boundary(domain, "Geography Domain") {
        Component(geography, "Geo.Geography", "Ash Domain", "Main domain interface with defined functions")
        Component(country_resource, "Country Resource", "Ash Resource", "Country data model with actions and validations")
        Component(manual_read, "ManualGetByIsoCode", "Ash Manual Read", "Custom read implementation using cache")
    }
    
    Container_Boundary(cache, "Caching Layer") {
        Component(country_cache, "Country.Cache", "GenServer", "High-performance country caching")
    }
    
    ContainerDb(postgres, "PostgreSQL", "Database")
    
    Rel(home_live, country_selector, "Uses")
    Rel(country_selector, geography, "Calls selector_search_countries")
    Rel(geography, country_resource, "Defines actions")
    Rel(country_resource, manual_read, "Uses for cached reads")
    Rel(manual_read, country_cache, "get_by_iso_code!")
    Rel(geography, country_cache, "search!")
    Rel(country_resource, postgres, "CRUD operations")
    Rel(country_cache, postgres, "Periodic refresh")
```

## Domain Model

### Geo.Geography Domain

The main domain provides these key operations:

- `list_countries/0` - Lists all countries
- `selector_search_countries/1` - Intelligent search for UI components
- `get_country_iso_code_cached/1` - High-performance country lookup by ISO code
- `create_country/1`, `update_country/1`, `upsert_country/1` - Country management

### Geo.Country.Country Resource

Core attributes:
- `id` (UUIDv7) - Primary key
- `name` (CiString) - Country name
- `iso_code` (CiString) - ISO country code (2-3 chars, unique)
- `flag` (String) - Unicode flag emoji
- `slug` (CiString) - URL-friendly identifier
- `created_at`, `updated_at` - Timestamps

Key features:
- Unique constraints on `iso_code` and `slug`
- Automatic slug generation from name
- Upsert capability using ISO code identity
- Cached search operations for performance

## Performance Features

### Caching Strategy
- `Geo.Country.Cache` provides sub-millisecond lookups
- Automatic cache refresh every 10 minutes
- Intelligent search with prioritized results:
  1. Exact ISO code matches
  2. Partial ISO code matches (≤3 chars)
  3. Exact name matches
  4. Names starting with query
  5. Names containing query

### UI Optimizations
- Real-time search with debouncing
- Grouped results (by ISO code and name)
- Sortable groups with multiple sort orders
- Collapsible groups for better UX
- Efficient re-rendering with LiveView
