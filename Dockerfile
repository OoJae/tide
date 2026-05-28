FROM ubuntu:24.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies + Node.js 22 via NodeSource
RUN apt-get update && apt-get install -y \
    curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm via corepack
RUN corepack enable pnpm

# Install coral binary
RUN curl -sSL https://github.com/withcoral/coral/releases/download/v0.4.1/coral-x86_64-unknown-linux-gnu.tar.gz \
    | tar xz -C /usr/local/bin coral \
    && chmod +x /usr/local/bin/coral

WORKDIR /app

# Install dependencies (cached layer)
COPY package.json pnpm-lock.yaml ./
RUN corepack prepare pnpm@9 --activate && pnpm install --frozen-lockfile

# Copy everything
COPY . .
RUN chmod +x ./scripts/add-sources.sh

# Build Next.js
RUN pnpm build

EXPOSE 3000

# At container start: add Coral sources, then start the app
CMD ["sh", "-c", "./scripts/add-sources.sh && pnpm start"]
