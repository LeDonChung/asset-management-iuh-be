# Development Dockerfile for hot reload
FROM node:20-alpine

# Install dumb-init and netcat
RUN apk add --no-cache dumb-init netcat-openbsd

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Install dependencies (including dev dependencies)
RUN pnpm install

# Copy entrypoint script and make it executable
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Use entrypoint script
ENTRYPOINT ["dumb-init", "/app/entrypoint.sh", "--"]
CMD ["pnpm", "run", "start:dev"]
