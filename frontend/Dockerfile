# Frontend development container
FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install for Linux platform (removes platform-specific bindings from lock file)
RUN rm -f package-lock.json && npm install

# Source code will be mounted via volume in development

# Expose port
EXPOSE 5173

# Start development server with proper file watching
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]