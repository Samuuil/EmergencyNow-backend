# Use full Node image (not Alpine) so crypto is globally available
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Optional: explicitly set global crypto for Alpine fallback
# RUN echo "import * as crypto from 'crypto'; (global as any).crypto = crypto;" >> /app/src/main.ts

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
