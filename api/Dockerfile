# Imagen de la API de pacientes: Node.js LTS sobre Alpine Linux.
FROM node:24-alpine
WORKDIR /app

# 1. Dependencias de producción (caché mientras package*.json no cambie).
COPY package*.json ./
RUN npm ci --omit=dev

# 2. Código fuente.
COPY src ./src

# 3. SQLite solo si no hay DATABASE_URL (pruebas locales).
RUN mkdir -p /app/datos && chown node:node /app/datos
ENV NODE_ENV=production DB_ARCHIVO=/app/datos/citas-medicas.db

EXPOSE 3000
USER node
CMD ["node", "src/server.js"]