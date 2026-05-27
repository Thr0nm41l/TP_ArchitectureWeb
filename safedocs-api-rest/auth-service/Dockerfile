FROM node:23-alpine

# Set the working directory
WORKDIR /app

# Copy package files first and install dependencies (cache-friendly)
COPY package*.json ./
RUN npm ci --production

# Copy rest of the application
COPY . .

# Install curl for healthchecks
RUN apk add --no-cache curl

# Run the app when the container launches
CMD ["node", "index.js"]