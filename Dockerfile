# syntax=docker/dockerfile:1

########################
# Build stage
########################
FROM node:18-alpine AS builder
WORKDIR /app

# Speed up installs in CI-like environments
ENV CI=true

# Install deps
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
# Prefer prod build script if present, fallback to default build
RUN npm run build:prod

########################
# Run stage
########################
FROM nginx:1.25-alpine AS runner

# Replace default site config with SPA-friendly config
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy compiled app
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
