FROM apify/actor-node:20

COPY package*.json ./

RUN NODE_ENV=development npm ci

COPY . ./

RUN npm run build

RUN npm prune --omit=dev

CMD ["node", "dist/index.js"]
