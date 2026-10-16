# Two-stage build. Node 24 ships node:sqlite without a flag (it still prints an "experimental" notice).
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
# Optional build-time values: pass --build-arg SITE_URL=https://your-domain --build-arg CONTACT_EMAIL=...
ARG SITE_URL=""
ARG CONTACT_EMAIL=""
ENV SITE_URL=$SITE_URL CONTACT_EMAIL=$CONTACT_EMAIL
RUN npm run build

FROM node:24-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 STATIC_DIR=/app/dist WAITLIST_DB_PATH=/data/waitlist.db
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
RUN mkdir -p /data && chown node:node /data
USER node
# /data MUST be a persistent volume, otherwise registrations are lost when the container is replaced.
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist-server/index.mjs"]
