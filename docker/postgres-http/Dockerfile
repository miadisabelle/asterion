# asterion-postgres-http: built here rather than pulled, because every query Asterion makes passes through it.
FROM node:22-alpine
WORKDIR /srv
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --chmod=0644 server.js ./
USER node
EXPOSE 4444
CMD ["node", "server.js"]
