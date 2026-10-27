ARG NODE_VERSION=24


FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable \
    && pnpm install --frozen-lockfile

COPY . .

ARG VITE_APP_ENV=staging
ARG VITE_API_BASE_URL=/api

ENV VITE_APP_ENV=$VITE_APP_ENV \
    VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm build


FROM nginx:1.28-alpine AS production

RUN apk upgrade --no-cache

LABEL org.opencontainers.image.source="https://github.com/tir-lavigny/register-app"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
