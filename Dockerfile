# Build stage: Vite production build. VITE_* values are baked in at build time.
# With the default empty VITE_API_BASE_URL the SPA issues same-origin requests
# and nginx proxies them to event-admin (see nginx.conf).
FROM node:22-alpine AS build

WORKDIR /app

# events-design-system is a git dependency, but node:alpine ships no git and npm
# pins it to git+ssh (no key in-build). Install git and rewrite GitHub ssh URLs →
# anonymous https so `npm ci` can clone the (now public) repo.
RUN apk add --no-cache git \
 && git config --global url."https://github.com/".insteadOf "git+ssh://git@github.com/" \
 && git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" \
 && git config --global url."https://github.com/".insteadOf "git@github.com:"
COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=""
ARG VITE_ENABLE_DEV_BYPASS_LOGIN="false"
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
ARG SENTRY_AUTH_TOKEN=""
ARG SENTRY_RELEASE=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_ENABLE_DEV_BYPASS_LOGIN=${VITE_ENABLE_DEV_BYPASS_LOGIN} \
    SENTRY_ORG=${SENTRY_ORG} \
    SENTRY_PROJECT=${SENTRY_PROJECT} \
    SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN} \
    SENTRY_RELEASE=${SENTRY_RELEASE} \
    VITE_SENTRY_RELEASE=${SENTRY_RELEASE}
RUN npm run build

# Production stage: nginx serves the SPA and proxies API paths to event-admin.
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-env-config.sh /docker-entrypoint.d/40-env-config.sh
RUN chmod +x /docker-entrypoint.d/40-env-config.sh

EXPOSE 80
