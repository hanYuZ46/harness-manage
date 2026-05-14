# --- Build and Runtime ---
# 使用预构建的基础镜像（运维已推送），包含 git、ca-certificates、tzdata 和所有 Go 依赖
# 单阶段构建：编译和运行使用同一个镜像，避开网络依赖下载问题
FROM swr.cn-lflt-1.enncloud.cn/base/multica-base:1.26

# Go proxy 和 GOSUMDB 已经在基础镜像中设置

WORKDIR /app

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

# 复制编译好的二进制文件到根目录，然后清理 server 目录
# 原因：COPY server/ ./server/ 创建了 server/ 目录，无法直接移动 server/bin/ 到根目录
RUN cp server/bin/server . && \
    cp server/bin/multica . && \
    cp server/bin/migrate . && \
    chmod +x server multica migrate && \
    rm -rf server

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
LABEL description="Multica Server (Single-stage build)"
LABEL version="${VERSION}"
LABEL commit="${COMMIT}"
LABEL build-date="${BUILD_DATE}"
LABEL vcs-ref="${VCS_REF}"
