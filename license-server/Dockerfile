# Umiestnenie: license-server/Dockerfile
# Licenčný server + webová administrácia v jednom obraze.
#
# Zostavuje sa z koreňa repozitára (workspaces zdieľajú package-lock.json):
#   docker build -f license-server/Dockerfile -t clubw-licencie .
# Bežne ho zostavuje docker compose v deploy/licencny-server.

# ── Zostavenie ─────────────────────────────────────────────────────────
FROM node:22-alpine AS zostavenie
WORKDIR /app

# Najprv len manifesty - vrstva so závislosťami sa znovu použije,
# kým sa nezmení package-lock.json
COPY package.json package-lock.json ./
COPY license-server/package.json license-server/
COPY license-server/admin/package.json license-server/admin/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace=license-server --workspace=license-server/admin --include-workspace-root=false --no-audit --no-fund

COPY license-server license-server
RUN npm run build --workspace=license-server && npm run build --workspace=license-server/admin

# ── Prevádzka ──────────────────────────────────────────────────────────
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3001 \
    BALIKY_DIR=/data/baliky \
    NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app

COPY package.json package-lock.json ./
COPY license-server/package.json license-server/
COPY license-server/admin/package.json license-server/admin/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace=license-server --omit=dev --include-workspace-root=false --no-audit --no-fund \
 && npm cache clean --force

COPY --from=zostavenie /app/license-server/dist license-server/dist
COPY --from=zostavenie /app/license-server/admin/dist license-server/admin/dist
COPY license-server/config license-server/config
COPY license-server/migrations license-server/migrations
COPY license-server/scripts license-server/scripts
COPY license-server/.sequelizerc license-server/.sequelizerc

RUN mkdir -p /data/baliky && chown -R node:node /data
USER node
WORKDIR /app/license-server
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://127.0.0.1:3001/health >/dev/null || exit 1

# Migrácie pri každom štarte - po aktualizácii obrazu netreba nič spúšťať ručne
CMD ["sh", "-c", "npx sequelize-cli db:migrate && exec node dist/index.js"]
