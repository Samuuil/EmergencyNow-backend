# Use Node 20 because NestJS + TypeORM require crypto.randomUUID()
FROM node:20

WORKDIR /app

# Copy dependency files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose API port
EXPOSE 3000

# Start NestJS in dev mode (your current workflow)
CMD ["npm", "run", "start:dev"]
