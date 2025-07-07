# Geo: A Country Chooser Built With Elixir, Phoenix LiveView, and Ash

## License

Apache 2.0

## Demo

https://geo-demo.fly.dev/

## Purpose

Geo is the world's most over-engineered country combobox. Countries are stored in a Postgres table and cached in memory for fast searches.

![CleanShot 2025-06-12 at 20 40 52@2x](https://github.com/user-attachments/assets/d477b01d-dece-4fff-ac26-d139cfc8a611)
**Or:**

Geo is an Elixir/Phoenix application built with the Ash Framework that provides efficient geographic data management and search capabilities.

## Why?

This project might be useful if you're curious about the Ash Framework (version 3.5+) and you're looking for slightly more advanced Ash usage like:

**Resources:**

- Implementing manual reads and generic actions
- Defining reusable attributes via macros
- Implementing `slug` attributes that are computed via a 'change' when not provided (a change is the primary mechanism for customizing what happens during create, update, and destroy actions)
- Seeding data via bulk upsert
- Using manual read actions for cache-backed queries
- Implementing search functionality with dedicated search result resources

**LiveView:**

- A Phoenix component built from Mishka Chelekom's `<.combobox>`
  ![CleanShot 2025-06-16 at 11 03 53@2x](https://github.com/user-attachments/assets/0d672734-855c-49dc-828e-a539d29f078b)
  - `<.search_combobox>` invokes a remote search. Results are presented in two groups that can be expanded/collapsed and sorted separately.
  - Fun fact: The component was 100% vibe coded using Sonnet 4
  - Not very fun fact: It has complex state and took well over 90% of the development effort. Ash was the easy part, by far!
- A LiveView component that orchestrates Phoenix components and Ash resources

**Caching & Performance:**

- Poolboy-based worker pool for high-performance caching
- On-demand worker creation with overflow capacity
- Intelligent search prioritization and result grouping
- Automatic cache refresh with graceful error handling

## Custom Mix Tasks

- `geo.seed`: Upserts seed data
- `geo.start`: Starts the server in a foreground process
- `geo.restart`: Starts/restarts server in background process, sends STDOUT and STDERR to geo.log
- `geo.stop`: Stops server running in background process 

## Running on Fly.io

These tips are only suitable for a hobby project. Real projects should use an alternative Postgres solution.

### Preparation

1. Go to fly.io and create an account
2. Install the fly command aka flyctl
  - brew install fly

### Environment Variables (secrets)

fly will add these for you:

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

D) Modify secrets for `geo-demo`

- Using the the fly.io web app, navigate to the geo-demo app and then to Secrets
- Set `DATABASE_URL` to `postgresql://geo_demo:<db password >@geo-demo-db.internal:5432/geo_demo?sslmode=disable`

E) Modify Dockerfile

Environment variables:

```txt
ENV MIX_ENV=prod
ENV PHX_SERVER=true
ENV ECTO_IPV6=true
```

CMD/Run script:

Since I run migrations and seeders on my laptop, I created a `start.sh` that runs `mix phx.server` and can be easily changed when troubleshooting.

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
- **Search Layer**: `Geo.Geography.Country.SearchResult` - Dedicated search result resource for structured search responses
- **Web Layer**: Phoenix LiveView components for interactive UI
- **Caching Layer**: High-performance country lookup and search caching with Poolboy-managed GenServer workers
- **Attribute Layer**: Reusable attribute modules (`Geo.Resources.Attributes.*`) for DRY resource definitions
- **Change Layer**: Custom change modules for automatic data transformations

### Key Features

- **Country Management**: Full CRUD operations for country data (ISO codes, names, flags, slugs)
- **Intelligent Search**: Multi-criteria search with prioritized results (ISO codes, names) returned in structured format
- **High-Performance Caching**: Fast searches via `Geo.Geography.Country.Cache` with automatic refresh every 30 minutes
- **Pooled Workers**: Poolboy-managed cache workers (0 permanent, up to min(8, System.schedulers_online()) overflow workers)
- **Interactive UI**: Real-time search with grouped, sortable results
- **Upsert Operations**: Efficient create-or-update operations using unique identities
- **Manual Read Actions**: Cache-backed queries that bypass the database for ultra-fast lookups

This project uses `dialyzer` and `credo` for code cleanliness.

### Requirements

- PostgreSQL
- Elixir 1.18+
- Node.js (for asset compilation)

### Technology Stack

- **Backend**: Elixir
- **Frontend**: Phoenix LiveView with Mishka Chelekom components
- **Database**: PostgreSQL with Ecto/AshPostgres
- **Application Framework**: Ash Framework for domain modeling
- **Caching**: Poolboy for worker management
- **Testing**: Playwright for E2E testing, ExUnit for unit testing

## Usage

1. Install Elixir 1.18+
2. Install PostgreSQL
3. Install Node.js
4. `mix setup` to install and setup dependencies
5. `mix phx.server` or inside IEx with `iex -S mix phx.server`

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser.

Ready to run in production? Please [check our deployment guides](https://hexdocs.pm/phoenix/deployment.html).

## Running Tests

1. **UI Tests**:
   - `npm run lint` - ESLint checking
   - `npm run format` - Prettier formatting
   - `npm test` - Playwright E2E tests

2. **Elixir Tests**:
   - `mix credo` - Code quality analysis
   - `mix dialyzer` - Static type analysis
   - `mix test` - Unit tests

3. **E2E Tests**:
   - Playwright tests for the country combobox functionality
   - Tests cover search, selection, grouping, and sorting behavior

## Architecture

### Ash Resources Overview

```mermaid
classDiagram
    class Geo.Geography {
        <<Domain>>
        list_countries()
        search_countries!(query)
        get_country_by_iso_code!(iso_code)
        create_country(attrs)
        update_country(country, attrs)
        upsert_country(attrs)
    }
    
    class Geo.Geography.Country {
        <<Resource>>
        Domain: Geo.Geography
        Source: lib/geo/geography/country.ex

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
        get_by_iso_code(iso_code)
    }
    
    class Geo.Geography.Country.SearchResult {
        <<Resource>>
        Domain: Geo.Geography
        Source: lib/geo/geography/country/search_result.ex

        Array~Country~ countries_by_iso_code
        Array~Country~ countries_by_name
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
        <<Module>>
        search!(query) SearchResult
        get_by_iso_code!(iso_code) country
        refresh() ok
        running?() boolean
        status() map
        stop() ok
    }
    
    class Geo.Geography.Country.Cache.Server {
        <<GenServer>>
        start_link() ok_pid
        search!(query) SearchResult
        get_by_iso_code!(iso_code) country
        refresh() ok
        handle_info(:refresh) noreply
        @refresh_interval 30 minutes
    }
    
    class Poolboy {
        <<Pool Manager>>
        transaction(pool, fun) result
        status(pool) keyword
        size 0
        max_overflow min(8, System.schedulers_online())
    }
    
    Geo.Geography --> Geo.Geography.Country : uses
    Geo.Geography --> Geo.Geography.Country.SearchResult : uses
    Geo.Geography.Country --|> Geo.Resources.Attributes.Id : uses
    Geo.Geography.Country --|> Geo.Resources.Attributes.Name : uses
    Geo.Geography.Country --|> Geo.Resources.Attributes.Slug : uses
    Geo.Geography.Country --|> Geo.Resources.Attributes.Timestamps : uses
    Geo.Geography.Country --> Geo.Resources.Changes.SlugifyName : applies
    Geo.Geography.Country.Cache.Server --> Geo.Geography : calls for refresh
    Poolboy --> Geo.Geography.Country.Cache.Server : manages overflow workers
    Geo.Geography.Country.Cache --> Poolboy : uses pool transactions
    Geo.Geography.Country.Cache --> Geo.Geography.Country.Cache.Server : calls via pool
```

### Country Search Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant LiveView as GeoWeb.HomeLive
    participant Component as GeoWeb.CountrySelector
    participant Domain as Geo.Geography
    participant SearchResource as Geo.Geography.Country.SearchResult
    participant Cache as Geo.Geography.Country.Cache
    participant Pool as Poolboy
    participant Worker as Cache.Server
    participant DB as PostgreSQL

    User->>Component: Types search query
    Component->>Component: handle_event("search_combobox_search")
    Component->>Domain: search_countries!(query)
    Domain->>SearchResource: search action
    SearchResource->>Cache: search!(query)
    Cache->>Pool: transaction(pool, fn worker -> ... end)
    Pool->>Worker: GenServer.call(worker, {:search, query})
    
    alt Cache Hit
        Worker-->>Pool: SearchResult struct
        Pool-->>Cache: SearchResult struct
        Cache-->>SearchResource: SearchResult struct
        SearchResource-->>Domain: SearchResult resource
    else Cache Miss/Refresh
        Worker->>Domain: list_countries() for refresh
        Domain->>DB: Query all countries
        DB-->>Domain: Country records
        Domain-->>Worker: Countries for caching
        Worker->>Worker: Process and cache results
        Worker-->>Pool: SearchResult struct
        Pool-->>Cache: SearchResult struct
        Cache-->>SearchResource: SearchResult struct
        SearchResource-->>Domain: SearchResult resource
    end
    
    Domain-->>Component: SearchResult{countries_by_iso_code: [...], countries_by_name: [...]}
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
        search_combobox_search/2
        search_combobox_toggle_group_sort/2
        search_combobox_toggle_group_collapse/2
        country_selected/2
    }
    
    class GeoWeb.SearchCombobox {
        <<Component>>
        name String
        value String
        placeholder String
        search_event String
        variant String
        color String
        enable_group_sorting Boolean
        group_states Map
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
    
    class Geo.Geography.Country.SearchResult {
        <<Resource>>
        countries_by_iso_code Array~Country~
        countries_by_name Array~Country~
    }
    
    GeoWeb.HomeLive --> GeoWeb.CountrySelector : uses
    GeoWeb.CountrySelector --> GeoWeb.SearchCombobox : renders
    GeoWeb.CountrySelector --> CountryOptionContent : renders
    GeoWeb.CountrySelector --> Geo.Geography : calls
    GeoWeb.HomeLive ..> Geo.Geography.Country : displays
    GeoWeb.CountrySelector ..> Geo.Geography.Country.SearchResult : receives
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
        Container(cache, "Country Cache", "Poolboy/GenServer", "High-performance country lookup cache with worker pool")
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
        Component(search_resource, "SearchResult Resource", "Ash Resource", "Search result data model with manual search action")
        Component(manual_read, "ManualGetByIsoCode", "Ash Manual Read", "Custom read implementation using cache")
        Component(manual_search, "ManualSearch", "Ash Manual Read", "Custom search implementation using cache")
    }
    
    Container_Boundary(cache, "Caching Layer") {
        Component(cache, "Country.Cache", "Module", "Poolboy-based cache API")
        Component(poolboy, "Poolboy Pool", "Pool Manager", "Manages overflow worker processes (0 permanent, up to 8 overflow)")
        Component(cache_genserver, "Country.Cache.Server", "GenServer", "High-performance country caching workers")
    }
    
    ContainerDb(postgres, "PostgreSQL", "Database")
    
    Rel(home_live, country_selector, "Uses")
    Rel(country_selector, geography, "Calls search_countries")
    Rel(geography, search_resource, "Uses for search")
    Rel(geography, country_resource, "Uses for CRUD")
    Rel(search_resource, manual_search, "Uses for cached search")
    Rel(country_resource, manual_read, "Uses for cached reads")
    Rel(manual_read, cache, "get_by_iso_code!")
    Rel(manual_search, cache, "search!")
    Rel(cache, poolboy, "Uses pool transactions")
    Rel(poolboy, cache_genserver, "Manages overflow workers")
    Rel(cache_genserver, geography, "Periodic refresh via (30 min)")
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
- `search_countries!/1` - Intelligent search returning structured results via SearchResult resource
- `get_country_by_iso_code!/1` - High-performance country lookup by ISO code using cache
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
- Manual read action `get_by_iso_code` that bypasses database for cached lookups

### Geo.Geography.Country.SearchResult Resource

A dedicated resource for search results:
- `countries_by_iso_code` - Array of countries matching by ISO code
- `countries_by_name` - Array of countries matching by name
- Manual search action that returns structured search results from cache
- Enables clean separation of search logic from base country resource

## Performance Features

### Caching Strategy
- `Geo.Geography.Country.Cache` provides Poolboy-based cache API
- Pool of `Geo.Geography.Country.Cache.Server` workers managed by Poolboy
- **Configuration**: 0 permanent workers, up to `min(8, System.schedulers_online())` overflow workers
- **On-demand scaling**: Workers start only when needed, efficient resource usage
- **Automatic cache refresh**: Every 30 minutes via scheduled messages in each worker
- **Graceful startup**: Retry logic if database is not available during worker initialization
- **Intelligent search** with prioritized results returned in structured format:
  1. **ISO Code Results**: Exact ISO code matches, then partial ISO code matches (≤3 chars)
  2. **Name Results**: Exact name matches, names starting with query, then names containing query
- Each worker maintains optimized data structures: sorted lists and maps for fast lookup
- Pool transactions ensure worker availability and fault tolerance

### Search Algorithm Details

The cache implements a sophisticated search algorithm:

1. **Exact matches**: Direct hash lookups for ISO codes and names
2. **Partial ISO code matching**: Only for queries ≤ 3 characters to avoid noise
3. **Name prefix matching**: Efficient string prefix search
4. **Name substring matching**: Fallback for partial name matches
5. **Result deduplication**: Ensures no country appears in both result groups
6. **Cross-pollination**: Countries from ISO code results are added to name results and vice versa

### UI Optimizations
- Real-time search with debouncing
- Grouped results (by ISO code and name) with independent sorting
- Collapsible groups for better UX
- Efficient re-rendering with LiveView component state management
- Smart group ordering based on search context

## Database Schema

The PostgreSQL schema includes:

- **countries** table with columns: id, name, iso_code, flag, slug, created_at, updated_at
- **Unique constraints**: iso_code, slug, name
- **Indexes**: Automatically created for identities and primary key
- **Data types**: UUIDv7 for IDs, case-insensitive strings for searchable fields

## Testing Architecture

### End-to-End Testing
- **Playwright**: Comprehensive E2E testing of the country combobox
- **Test coverage**: Search functionality, group sorting, collapsing, country selection
- **CI/CD integration**: Tests run in headless mode with structured reporting

### Unit Testing
- **ExUnit**: Standard Elixir testing framework
- **Test utilities**: `Ash.Test` for resource testing
- **Mocking**: Test-specific configurations for cache and database operations

### Code Quality
- **Credo**: Elixir code style and quality analysis
- **Dialyzer**: Static type analysis and bug detection
- **Continuous integration**: Automated testing on all changes

## Development Workflow

### Local Development
1. **Database setup**: PostgreSQL with development database
2. **Dependency management**: Mix for Elixir deps, npm for JS/CSS
3. **Asset compilation**: Tailwind CSS + ESBuild for optimized assets
4. **Live reload**: Phoenix LiveReload for development efficiency

### Production Deployment
1. **Containerization**: Docker with multi-stage builds
2. **Asset optimization**: Minified CSS/JS with digest hashing
3. **Database migrations**: Automated via Ash codegen
4. **Monitoring**: Telemetry integration for performance tracking

### Cache Management
- **Development**: Cache workers start on-demand
- **Production**: Pool sizing based on system capabilities
- **Monitoring**: Cache status and performance metrics available
- **Maintenance**: Manual refresh capabilities for data updates
