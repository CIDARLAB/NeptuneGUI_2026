# Stage 1 — build the Vue SPA
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock* ./
RUN yarn install --frozen-lockfile --ignore-engines
COPY . .
RUN NODE_OPTIONS=--openssl-legacy-provider yarn build

# Stage 2 — Express server (serves API + Vue static files)
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --production
COPY server/ ./server/
COPY --from=builder /app/dist ./dist
# Bundled defaults copied into /app/Data on startup when the Fly volume is empty.
COPY Data/3DuF_component/default/ ./seed-data/3DuF_component/default/
COPY Data/example/ ./seed-data/example/
# Data/ is mounted as a Fly.io volume at /app/Data
RUN mkdir -p /app/Data
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
