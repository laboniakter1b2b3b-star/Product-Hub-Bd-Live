FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY . .
RUN npm run build

RUN mkdir -p /app/data/uploads && chmod -R 777 /app/data

ENV NODE_ENV=production
ENV PORT=7860

EXPOSE 7860

CMD ["npm", "start"]
