ARG ELIXIR_VERSION=1.18.4
ARG OTP_VERSION=27.3.4.1
ARG DEBIAN_VERSION=bookworm-20250610-slim

FROM docker.io/hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}

# Install build dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential git \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Install hex + rebar
RUN mix local.hex --force && mix local.rebar --force

# Set env vars
ENV MIX_ENV=prod
ENV PHX_SERVER=true
ENV ECTO_IPV6=true

# Copy application files
COPY mix.exs mix.lock ./
COPY config config
COPY priv priv
COPY lib lib
COPY assets assets

# Install dependencies
RUN mix deps.get --only prod
RUN mix assets.setup
RUN mix assets.build
RUN mix phx.digest

# This is a dummy start-up script for troubleshooting
# RUN echo '#!/bin/sh\n\
# while true; do sleep 1; done' > /app/start.sh && chmod +x /app/start.sh

# Create a startup script
RUN echo '#!/bin/sh\n\
mix phx.server' > /app/start.sh && chmod +x /app/start.sh

# Start the application
CMD ["/app/start.sh"]

