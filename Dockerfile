# Build stage
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

# We need tsx to run the server.ts in production if we don't compile it
RUN npm install tsx

COPY --from=build /app/dist ./dist
COPY server.ts ./
COPY services ./services
COPY types.ts ./

# Expose the port the app runs on
EXPOSE 3000

# Start the server
CMD ["npx", "tsx", "server.ts"]
