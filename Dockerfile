# --- Build stage ---
# 使用预构建的基础镜像（运维已推送），已经包含 git、ca-certificates、tzdata 和所有 Go 依赖
FROM swr.cn-lflt-1.enncloud.cn/base/multica-base:1.26 AS builder

# Go proxy 和 GOSUMDB 已经在基础镜像中设置

WORKDIR /src

# 复制源代码（依赖已经预下载，只需要复制代码）
COPY server/ ./server/

# 构建二进制文件
ARG VERSION=dev
ARG COMMIT=unknown

# 构建 server（使用预下载的依赖）
RUN cd server && \
    go version && \
    CGO_ENABLED=0 go build \
    -ldflags "-s -w -X main.version=${VERSION} -X main.commit=${COMMIT}" \
    -o bin/server \
    ./cmd/server

# 构建 multica CLI
RUN cd server && \
    CGO_ENABLED=0 go build \
    -ldflags "-s -w -X main.version=${VERSION} -X main.commit=${COMMIT}" \
    -o bin/multica \
    ./cmd/multica

# 构建 migrate 工具
RUN cd server && \
    CGO_ENABLED=0 go build \
    -ldflags "-s -w" \
    -o bin/migrate \
    ./cmd/migrate

# --- Runtime stage ---
# 使用轻量级 Alpine 镜像作为运行时
FROM swr.cn-lflt-1.enncloud.cn/base/alpine:3.21

# 安装运行时依赖（ca-certificates 和 tzdata 也可以复用，但保持镜像轻量）
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /src/server/bin/server .
COPY --from=builder /src/server/bin/multica .
COPY --from=builder /src/server/bin/migrate .

# 复制数据库迁移文件
COPY server/migrations/ ./migrations/

# 复制启动脚本
COPY docker/entrypoint.sh .

# 修复 Windows 换行符并设置可执行权限
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]

# 构建信息标签
ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILD_DATE=
ARG VCS_REF=

LABEL maintainer="devops@enn.com"
LABEL description="Multica Server"
LABEL version="${VERSION}"
LABEL commit="${COMMIT}"
LABEL build-date="${BUILD_DATE}"
LABEL vcs-ref="${VCS_REF}"
