FROM node:20-alpine

# Use production mode
ENV NODE_ENV=production

# Provide a default volume mount point
ENV DB_PATH=/data/game.db

# Create the working directory
WORKDIR /app

# Install dependencies first for cache layering
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application
COPY . .

# Ensure data directory exists and has correct permissions
RUN mkdir -p /data && chown -R node:node /data

# Run the app as a non-root user for security
USER node

# Expose the API port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
