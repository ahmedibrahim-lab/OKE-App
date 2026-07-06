# Production Stage
FROM node:24-alpine AS base

# Set production environment and port
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev --no-audit

# Copy application source code
COPY . .

# Change ownership of the directory to the non-privileged 'node' user
RUN chown -R node:node /usr/src/app

# Switch to non-privileged user for runtime security
USER node

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "app.js"]
