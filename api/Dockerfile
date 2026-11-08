# docker build -f api/Dockerfile -t anwar-shah-api .
# Migrations: docker run --rm -e DATABASE_URL=... anwar-shah-api node dist/db/migrate.js

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY api/package.json api/
RUN npm ci

COPY tsconfig.base.json ./
COPY shared shared
COPY api api
RUN npm run build -w shared && npm run build -w api
RUN npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app/api
RUN chown node:node /app/api

COPY --from=build --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/shared/package.json /app/shared/
COPY --from=build --chown=node:node /app/shared/dist /app/shared/dist
COPY --from=build --chown=node:node /app/api/package.json ./
COPY --from=build --chown=node:node /app/api/node_modules node_modules
COPY --from=build --chown=node:node /app/api/dist dist
COPY --from=build --chown=node:node /app/api/drizzle drizzle
USER node

EXPOSE 4000
CMD ["node", "dist/main"]
