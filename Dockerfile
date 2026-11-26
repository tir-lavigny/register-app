FROM node:24.22-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable \
    && pnpm install --frozen-lockfile

COPY . .

ARG VITE_APP_ENV=staging
ARG VITE_API_BASE_URL=/api
ARG VITE_BUILD_TAG=

ENV VITE_APP_ENV=$VITE_APP_ENV \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_BUILD_TAG=$VITE_BUILD_TAG

RUN pnpm build \
    && pnpm run check:dist


FROM nginx:1.30-alpine AS production

RUN apk upgrade --no-cache

LABEL org.opencontainers.image.source="https://github.com/tir-lavigny/register-app"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
