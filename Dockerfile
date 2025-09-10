# syntax=docker/dockerfile:1

########################
# Build stage
########################
FROM node:18-alpine AS builder
WORKDIR /app

# Speed up installs in CI-like environments
ENV CI=true

# Build target (maps to npm script name suffix, e.g. build:prod / build:one)
ARG BUILD_TARGET=prod

# Install deps
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
# Use passed build target script (e.g. build:prod or build:one)
RUN echo "Building with npm run build:${BUILD_TARGET}" \
	&& npm run build:${BUILD_TARGET}

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
