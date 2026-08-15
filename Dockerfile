ARG NODE_IMAGE=node:20-bookworm-slim
FROM ${NODE_IMAGE} AS base

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
ENV NODE_ENV=development

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

FROM base AS dependencies
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .npmrc ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY shared/package.json ./shared/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
WORKDIR /app

ENV AI_NOVEL_DATABASE_MODE=postgresql
COPY shared ./shared
COPY server ./server
COPY client ./client
COPY desktop/package.json ./desktop/package.json
RUN pnpm --filter @ai-novel/shared build \
    && pnpm --filter @ai-novel/server prisma:generate \
    && pnpm --filter @ai-novel/server build \
    && pnpm --filter @ai-novel/client build

FROM base AS production-dependencies
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .npmrc ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY shared/package.json ./shared/package.json
COPY server/prisma.config.ts ./server/prisma.config.ts
COPY server/src/config/database.ts ./server/src/config/database.ts
COPY server/src/prisma ./server/src/prisma
ENV AI_NOVEL_DATABASE_MODE=postgresql
RUN pnpm install --frozen-lockfile \
    && pnpm --filter @ai-novel/server prisma:generate

ARG NODE_IMAGE
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV AI_NOVEL_DATABASE_MODE=postgresql
ENV AI_NOVEL_WEB_DIST_DIR=/app/client/dist

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/shared ./shared
COPY --from=build --chown=node:node /app/client/dist ./client/dist
RUN mkdir -p /app/storage/generated-images /app/node_modules/.bin \
    && printf '%s\n' '#!/bin/sh' 'exec node /app/server/node_modules/prisma/build/index.js "$@"' > /app/node_modules/.bin/prisma \
    && chmod +x /app/node_modules/.bin/prisma \
    && chown -R node:node /app/storage /app/node_modules/.bin/prisma

USER node
EXPOSE 3000

CMD ["node", "./server/dist/app.js"]
