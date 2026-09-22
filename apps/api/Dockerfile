FROM node:20-alpine AS base
RUN npm install -g pnpm@9

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ packages/
COPY apps/api/ apps/api/

RUN pnpm install --frozen-lockfile --filter @scipal/api...

WORKDIR /app/apps/api
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/package.json .

EXPOSE 3001
CMD ["node", "dist/index.js"]
