FROM node:20-alpine

WORKDIR /app

# Copy package files and tsconfig.json (needed for postinstall script)
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (postinstall will run build, but we need tsconfig.json first)
RUN npm ci --production=false

# Copy source code
COPY . .

# Build TypeScript (in case postinstall didn't work or for rebuild)
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]

