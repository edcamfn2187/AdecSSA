# Use Node.js LTS as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build

# Expose the port the app runs on
# This matches the PORT environment variable set in docker-compose.yml
EXPOSE 3001

# Start the application using tsx to run the server
# In a real production environment, you might want to compile to JS first,
# but tsx is used here to match the existing project structure.
CMD ["npm", "run", "dev"]
