# docker build -f web/Dockerfile --build-arg SITE_URL=https://example.com -t anwar-shah-web .
# Runtime environment: API_URL and SITE_URL.

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY web/package.json web/
RUN npm ci

COPY tsconfig.base.json ./
COPY shared shared
COPY web web
ARG SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w shared && npm run build -w web

FROM node:24-alpine
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=build --chown=node:node /app/web/.next/standalone ./
COPY --from=build --chown=node:node /app/web/.next/static web/.next/static
COPY --from=build --chown=node:node /app/web/public web/public
USER node

ENV HOSTNAME=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "web/server.js"]
