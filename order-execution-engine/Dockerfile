FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies without running scripts (postinstall tries to build before source files exist)
RUN npm ci --production=false --ignore-scripts

# Copy source code and config files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]

