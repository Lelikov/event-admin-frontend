# Build stage: Vite production build. VITE_* values are baked in at build time.
# With the default empty VITE_API_BASE_URL the SPA issues same-origin requests
# and nginx proxies them to event-admin (see nginx.conf).
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=""
ARG VITE_ENABLE_DEV_BYPASS_LOGIN="false"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_ENABLE_DEV_BYPASS_LOGIN=${VITE_ENABLE_DEV_BYPASS_LOGIN}
RUN npm run build

# Production stage: nginx serves the SPA and proxies API paths to event-admin.
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
