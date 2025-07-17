FROM node:20.10.0

WORKDIR /app

COPY package*.json ./

ARG NODE_ENV
RUN if [ "$NODE_ENV" = "development" ]; then \
    npm install; \
    else \
    npm install --only=production; \
    fi

COPY . .

ENV NODE_ENV=$NODE_ENV
ENV PORT 3000

EXPOSE $PORT

CMD ["node" ,"server.js"]