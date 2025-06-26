# Geo: A Country Chooser Built With Elixir, Phoenix LiveView, and Ash

## License

Apache 2.0

## Demo

https://geo-demo.fly.dev/

## Purpose

Geo is the world's most overengineered country combobox. Countries are stored in a Postgres table and cached in memory for fast searches.

![CleanShot 2025-06-12 at 20 40 52@2x](https://github.com/user-attachments/assets/d477b01d-dece-4fff-ac26-d139cfc8a611)
**Or:**

Geo is an Elixir/Phoenix application built with the Ash Framework that provides efficient geographic data management and search capabilities.

## Why?

This project might be useful if you're curious about the Ash Framework (version 3.5+) and you're looking for slightly more advanced Ash usage like:

Resources:

- Implementing manual reads and generic actions
- Defining reusable attributes via macros
- Implementing `slug` attributes that are computed via a 'change' when not provided (a change is the primary mechanism for customizing what happens during create, update, and destroy actions)
- Implementing Ash actions that use a custom supervised GenServer
- Seeding data via bulk upsert

LiveView:

- A Phoenix component built from Mishka Chelekom's `<.combobox>`
  ![CleanShot 2025-06-16 at 11 03 53@2x](https://github.com/user-attachments/assets/0d672734-855c-49dc-828e-a539d29f078b)
  - `<.search_combobox>` invokes a remote search. Results are presented in two groups that can be expanded/collapsed and sorted separately.
  - Fun fact: The component was 100% vibe coded using Sonnet 4
  - Not very fun fact: It has complex state and took well over 90% of the development effort. Ash was the easy part, by far!
- A LiveView component that orchestrates Phoenix components and Ash resources

## Custom Mix Aliases

- `seed`: Upserts seed data
- `restart`: Starts/restarts server in background process
- `stop`: Stops server running in background process 

## Running on Fly.io

These tips are only suitable for a hobby project. Real projects should use an alternative Postgres solution.

### Environment variables (secrets)

- `DATABASE_URL`
- `SECRET_KEY_BASE`

### Initial Deployment

A) Create the Postgres server `geo-demo-db`

- `fly postgres create -r sjc`
  - App name: `geo-demo-db`
  - Select configuration: `Development - Single node, 1x shared CPU, 256MB RAM, 1GB disk`
  - Note the password! You will never see it again.

B) Create the database and add seed records **locally**

1. `fly proxy 5432 -a geo-demo-db`
2. `export DB_PASSWORD=...`
3. `export DATABASE_URL="postgresql://geo_demo:${DB_PASSWORD}@localhost:5432/postgres?sslmode=disable"`
4. `mix setup`

C) Create the `geo-demo` app

- `fly launch`
  - App name: `geo-demo`
  - Configuration: 1 CPU, 512 MB
- `fly deploy --strategy immediate --skip-release-command`

D) Add/modify secrets to the `geo-demo` app via the fly.io web app

- Set `DATABASE_URL` to `postgresql://geo_demo:<db password >@geo-demo-db.internal:5432/geo_demo?sslmode=disable`

E) Modify Dockerfile

Environment variables

```txt
ENV MIX_ENV=prod
ENV PHX_SERVER=true
ENV ECTO_IPV6=tru
```

CMD/Run script

Since I run migrations from my laptop, I created a `start.sh` that runs `mix phx.server` and can be easily changed for troubleshooting.

```txt
RUN echo '#!/bin/sh\n\
mix phx.server' > /app/start.sh && chmod +x /app/start.sh

# Start the application
CMD ["/app/start.sh"]
```

### Redeployment

After updating secrets or code, run `mix deploy`

### ssh into the application server

`fly ssh console -a geo-demo`

## Architecture

- **Domain Layer**: `Geo.Geography` - Core business logic and operations
- **Resource Layer**: `Geo.Geography.Country` - Data models and validations with modular attributes
- **Web Layer**: Phoenix LiveView components for interactive UI
- **Caching Layer**: High-performance country lookup and search caching with supervised GenServer
- **Attribute Layer**: Reusable attribute modules (`Geo.Resources.Attributes.*`) for DRY resource definitions
- **Change Layer**: Custom change modules for automatic data transformations

### Key Features

- **Country Management**: Full CRUD operations for country data (ISO codes, names, flags, slugs)
- **Intelligent Search**: Multi-criteria search with prioritized results (ISO codes, names)
- **High-Performance Caching**: Fast searches via `Geo.Geography.Country.Cache` with automatic refresh every 10 minutes
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

1. Install Elixir
2. Install PostgreSQL
3. Install `nodejs` (this might be optional)
4. `mix setup` to install and setup dependencies
5. `mix phx.server` or inside IEx with `iex -S mix phx.server`

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser.

Ready to run in production? Please [check our deployment guides](https://hexdocs.pm/phoenix/deployment.html).

## Running Tests

1. UI: `npm test`

## Architecture

### Ash Resources Overview

```mermaid
classDiagram
    class Geo.Geography {
        <<Domain>>
        list_countries()
        search_countries!(query)
        get_country_iso_code_cached!(iso_code)
        create_country(attrs)
        update_country(country, attrs)
        upsert_country(attrs)
    }
    
    class Geo.Geography.Country {
        <<Resource>>
        Domain: Geo.Geography
        Source: lib/geo/resources/country.ex

        Ash.Type.UUIDv7 id
        Ash.Type.CiString name
        Ash.Type.CiString slug
        Ash.Type.UtcDatetimeUsec created_at
        Ash.Type.UtcDatetimeUsec updated_at
        Ash.Type.CiString iso_code
        Ash.Type.String flag
        destroy()
        read()
        create(name, iso_code, flag, slug)
        upsert(name, iso_code, flag, slug)
        update(name, slug, iso_code, flag)
        get_by_iso_code_cached(iso_code)
        search(query)
    }
    
    class Geo.Resources.Attributes.Id {
        <<mixin>>
        uuid_v7_primary_key id
    }
    
    class Geo.Resources.Attributes.Name {
        <<mixin>>
        ci_string name
        identity unique_name
    }
    
    class Geo.Resources.Attributes.Slug {
        <<mixin>>
        ci_string slug
        identity unique_slug
        validation match_pattern
    }
    
    class Geo.Resources.Attributes.Timestamps {
        <<mixin>>
        utc_datetime_usec created_at
        utc_datetime_usec updated_at
    }
    
    class Geo.Resources.Changes.SlugifyName {
        <<change>>
        change() changeset
        maybe_generate_slug() changeset
        slugify() string
    }
    
    class Geo.Geography.Country.Cache {
        <<GenServer>>
        start_link() ok_pid
        search!(query) iso_name_results
        get_by_iso_code!(iso_code) country
        refresh() ok
        load_countries() ok_countries
        do_search() iso_name_results
    }
    
    class Geo.Geography.Country.CacheSupervisor {
        <<DynamicSupervisor>>
        start_link() ok_pid
        start_cache_worker() ok_pid
        start_cache_with_retry() ok_pid
        stop_worker(pid) ok
        list_cache_workers() list
        count_cache_workers() map
        restart_cache() ok_pid
    }
    
    class Geo.Geography.Country.Cache {
        <<Module>>
        search!(query) tuple
        get_by_iso_code!(iso_code) country
        refresh() ok
        running?() boolean
        ensure_running() ok
        stop() ok
        status() map
    }
    
    class Geo.Geography.Country.CacheGenServer {
        <<GenServer>>
        start_link() ok_pid
        search!(query) tuple
        get_by_iso_code!(iso_code) country
        refresh() ok
        handle_info(:inactivity_stop) stop
        handle_info(:refresh) noreply
    }
    
    Geo.Geography --> Geo.Geography.Country : uses
    Geo.Geography.Country --|> Geo.Resources.Attributes.Id : uses
    Geo.Geography.Country --|> Geo.Resources.Attributes.Name : uses
    Geo.Geography.Country --|> Geo.Resources.Attributes.Slug : uses
    Geo.Geography.Country --|> Geo.Resources.Attributes.Timestamps : uses
    Geo.Geography.Country --> Geo.Resources.Changes.SlugifyName : applies
    Geo.Geography.Country.CacheGenServer --> Geo.Geography : calls for refresh
    Geo.Geography.Country.CacheSupervisor --> Geo.Geography.Country.CacheGenServer : supervises dynamically
    Geo.Geography.Country.Cache --> Geo.Geography.Country.CacheSupervisor : starts workers lazily
    Geo.Geography.Country.Cache --> Geo.Geography.Country.CacheGenServer : calls when running
```

### Country Search Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant LiveView as GeoWeb.HomeLive
    participant Component as GeoWeb.CountrySelector
    participant Domain as Geo.Geography
    participant Resource as Geo.Geography.Country
    participant Cache as Geo.Geography.Country.Cache
    participant DB as PostgreSQL

    User->>Component: Types search query
    Component->>Component: handle_event("search_combobox_updated")
    Component->>Domain: search_countries!(query)
    Domain->>Resource: search action
    Resource->>Cache: search!(query)
    
    alt Cache Hit
        Cache-->>Resource: {iso_code_results, name_results}
        Resource-->>Domain: Search results
    else Cache Miss/Refresh
        Cache->>Domain: list_countries() for refresh
        Domain->>Resource: read action
        Resource->>DB: Query all countries
        DB-->>Resource: Country records
        Resource-->>Domain: Countries list
        Domain-->>Cache: Countries for caching
        Cache->>Cache: Process and cache results
        Cache-->>Resource: {iso_code_results, name_results}
        Resource-->>Domain: Search results
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
        <<LiveView>>
        mount/3
        handle_info/2
        render/1
        selected_country Country
    }
    
    class GeoWeb.CountrySelector {
        <<LiveComponent>>
        update/2
        render/1
        handle_event/3
        original_countries Map
        current_countries Map
        selected_country Country
        iso_code_group_collapsed Boolean
        name_group_collapsed Boolean
        group_order Atom
        search_combobox_updated/2
        toggle_group_sort/2
        toggle_group_collapse/2
        country_selected/2
    }
    
    class MishkaChelekom.SearchCombobox {
        <<Component>>
        name String
        value String
        placeholder String
        search_event String
        variant String
        color String
        enable_group_sorting Boolean
    }
    
    class CountryOptionContent {
        <<Helper Component>>
        country Geo.Geography.Country
        group_order Atom
        group_name String
    }
    
    class Geo.Geography {
        <<Domain>>
        search_countries!(query)
    }
    
    class Geo.Geography.Country {
        <<Resource>>
        id UUIDv7
        name CiString
        iso_code CiString
        flag String
        slug CiString
    }
    
    GeoWeb.HomeLive --> GeoWeb.CountrySelector : uses
    GeoWeb.CountrySelector --> MishkaChelekom.SearchCombobox : renders
    GeoWeb.CountrySelector --> CountryOptionContent : renders
    GeoWeb.CountrySelector --> Geo.Geography : calls
    GeoWeb.HomeLive ..> Geo.Geography.Country : displays
    GeoWeb.CountrySelector ..> Geo.Geography.Country : manages
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
    Rel(cache, domain, "Refreshes via", "Domain calls")
    Rel(domain, postgres, "Reads/writes", "SQL via Ash")
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
        Component(cache, "Country.Cache", "Module", "Lazy-loading cache entry point")
        Component(cache_genserver, "Country.CacheGenServer", "GenServer", "High-performance country caching with auto-stop")
        Component(cache_supervisor, "Country.CacheSupervisor", "DynamicSupervisor", "Dynamic cache worker management")
    }
    
    ContainerDb(postgres, "PostgreSQL", "Database")
    
    Rel(home_live, country_selector, "Uses")
    Rel(country_selector, geography, "Calls search_countries")
    Rel(geography, country_resource, "Uses for actions")
    Rel(country_resource, manual_read, "Uses for cached reads")
    Rel(manual_read, cache, "get_by_iso_code!")
    Rel(geography, cache, "search!")
    Rel(cache, cache_supervisor, "Starts workers via")
    Rel(cache, cache_genserver, "Calls when running")
    Rel(cache_genserver, geography, "Periodic refresh via")
    Rel(country_resource, postgres, "CRUD operations")
```

## Modular Architecture

### Reusable Attribute Modules

The application uses a modular approach to define common resource attributes:

- **`Geo.Resources.Attributes.Id`** - Provides UUIDv7 primary key
- **`Geo.Resources.Attributes.Name`** - Provides case-insensitive name attribute with optional uniqueness
- **`Geo.Resources.Attributes.Slug`** - Provides URL-friendly slug with validation and optional uniqueness  
- **`Geo.Resources.Attributes.Timestamps`** - Provides created_at/updated_at timestamps

These modules use `__using__` macros to inject attribute definitions, validations, and identities into resources, promoting DRY principles and consistent attribute behavior across the application.

### Custom Change Modules

- **`Geo.Resources.Changes.SlugifyName`** - Automatically generates URL-friendly slugs from names
  - Handles Unicode normalization and diacritical mark removal
  - Converts to lowercase with hyphens replacing spaces and special characters
  - Only regenerates slug when name changes and no explicit slug is provided

## Domain Model

### Geo.Geography Domain

The main domain provides these key operations:

- `list_countries/0` - Lists all countries
- `search_countries/1` - Intelligent search for UI components
- `get_country_iso_code_cached/1` - High-performance country search by ISO code
- `create_country/1`, `update_country/1`, `upsert_country/1` - Country management

### Geo.Geography.Country Resource

Core attributes:
- `id` (UUIDv7) - Primary key
- `name` (CiString) - Country name
- `iso_code` (CiString) - ISO country code (2-3 chars, unique)
- `flag` (String) - Unicode flag emoji
- `slug` (CiString) - URL-friendly identifier
- `created_at`, `updated_at` - Timestamps

Key features:
- Unique constraints on `iso_code` and `slug`
- Automatic slug generation from name via `Geo.Resources.Changes.SlugifyName`
- Upsert capability using ISO code identity
- Cached search operations for performance via manual read actions
- Modular attribute composition using reusable attribute modules
- Manual read action `get_by_iso_code_cached` that bypasses database for cached lookups
- Map action `search` that returns structured search results from cache

## Performance Features

### Caching Strategy
- `Geo.Geography.Country.Cache` provides lazy-loading cache entry point
- `Geo.Geography.Country.CacheGenServer` provides fast searches and stops after 5 minutes of inactivity
- Dynamically supervised by `Geo.Geography.Country.CacheSupervisor` with exponential backoff retry logic
- Cache only starts when first accessed (lazy loading) - no startup overhead
- Automatic cache refresh every 10 minutes via scheduled messages when running
- Intelligent search with prioritized results returned as separate lists:
  1. **ISO Code Results**: Exact ISO code matches, then partial ISO code matches (≤3 chars)
  2. **Name Results**: Exact name matches, names starting with query, then names containing query
- Cache maintains two sorted collections: `countries_by_iso_code` and `countries_by_name`
- Graceful startup with 1-minute retry delay if database is not available

### UI Optimizations
- Real-time search with debouncing
- Grouped results (by ISO code and name)
- Sortable groups with multiple sort orders
- Collapsible groups for better UX
- Efficient re-rendering with LiveView
