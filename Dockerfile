FROM node:20-slim AS base

# Install coral binary
RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN curl -sSL https://github.com/withcoral/coral/releases/download/v0.4.1/coral-x86_64-unknown-linux-gnu.tar.gz \
    | tar xz -C /usr/local/bin coral \
    && chmod +x /usr/local/bin/coral

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build Next.js
RUN pnpm build

# Copy source specs and data for runtime
COPY coral/sources/ ./coral/sources/
COPY data/ ./data/
COPY scripts/add-sources.sh ./scripts/add-sources.sh
RUN chmod +x ./scripts/add-sources.sh

EXPOSE 3000

# At container start: add sources, then start the app
CMD ["sh", "-c", "./scripts/add-sources.sh && pnpm start"]
