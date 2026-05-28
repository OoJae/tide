FROM node:22-slim

# Install coral binary
RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN curl -sSL https://github.com/withcoral/coral/releases/download/v0.4.1/coral-x86_64-unknown-linux-gnu.tar.gz \
    | tar xz -C /usr/local/bin coral \
    && chmod +x /usr/local/bin/coral

WORKDIR /app

# Install dependencies (cached layer)
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Copy everything
COPY . .
RUN chmod +x ./scripts/add-sources.sh

# Build Next.js
RUN pnpm build

EXPOSE 3000

# At container start: add Coral sources, then start the app
CMD ["sh", "-c", "./scripts/add-sources.sh && pnpm start"]
