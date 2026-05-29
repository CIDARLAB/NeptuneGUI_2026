FROM node:18-alpine

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy server source
COPY server/ ./server/

# Data/ is mounted as an EFS volume at /app/Data in ECS
# dataLayer.js resolves it as path.join(__dirname, '..', 'Data') = /app/Data
RUN mkdir -p /app/Data

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
