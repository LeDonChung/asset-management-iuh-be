# Use official Node.js LTS image
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy Prisma schema and generate client first (for caching)
COPY prisma ./prisma
RUN pnpm prisma generate

# Copy rest of the source code
COPY . .

# Build the app
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start:prod"]
