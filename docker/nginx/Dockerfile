# Vidflow Studio Nginx — Frontend Static + Reverse Proxy
# Multi-stage build: React build → Nginx serve

# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --silent 2>/dev/null || npm install --silent
COPY frontend/ .
RUN npm run build

# Stage 2: Nginx + built frontend
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built frontend from stage 1
COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
