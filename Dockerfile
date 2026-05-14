# --- Dependencies ---
FROM swr.cn-lflt-1.enncloud.cn/base/node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy workspace config and all package.json files for dependency resolution
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/ui/package.json packages/ui/
COPY packages/views/package.json packages/views/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/

RUN pnpm install --frozen-lockfile

# --- Build ---
FROM swr.cn-lflt-1.enncloud.cn/base/node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy installed dependencies (preserves pnpm symlink structure)
COPY --from=deps /app ./

# Copy source
COPY package.json turbo.json pnpm-workspace.yaml ./
COPY apps/web/ apps/web/
COPY packages/ packages/

# Re-link after source overlay (fixes any symlinks overwritten by COPY)
RUN pnpm install --frozen-lockfile --offline

# Set build-time env: tells Next.js rewrites to proxy API calls to the backend service
ARG REMOTE_API_URL=https://harness-manager.dev.ennew.com
ARG NEXT_PUBLIC_WS_URL=wss://harness-manager.dev.ennew.com/ws
ARG NEXT_PUBLIC_APP_VERSION=dev
ENV REMOTE_API_URL=$REMOTE_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV STANDALONE=true

# Build the web app (standalone output for minimal runtime)
RUN pnpm --filter @multica/web build

# --- Runtime ---
FROM swr.cn-lflt-1.enncloud.cn/base/node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (includes traced node_modules)
# 先复制到临时位置，修复权限后再移动
COPY --from=builder /app/apps/web/.next/standalone /tmp/standalone
RUN chown -R nextjs:nodejs /tmp/standalone && \
    cp -a /tmp/standalone/. /app/ && \
    rm -rf /tmp/standalone

# Copy static files (not included in standalone)
COPY --from=builder /app/apps/web/.next/static /tmp/static
RUN chown -R nextjs:nodejs /tmp/static && \
    cp -a /tmp/static /app/apps/web/.next/ && \
    rm -rf /tmp/static

# Copy public assets
COPY --from=builder /app/apps/web/public /tmp/public
RUN chown -R nextjs:nodejs /tmp/public && \
    cp -a /tmp/public /app/apps/web/ && \
    rm -rf /tmp/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
