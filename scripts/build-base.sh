#!/bin/bash
# Multica 基础镜像构建脚本
# 用途：构建并推送预配置的基础镜像（只需运行一次或依赖更新时运行）

set -e

# 配置变量
REGISTRY="swr.cn-lflt-1.enncloud.cn"
IMAGE_NAME="multica/base"
VERSION="1.26"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${VERSION}"
LATEST_TAG="${REGISTRY}/${IMAGE_NAME}:latest"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NO_COLOR='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NO_COLOR} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NO_COLOR} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NO_COLOR} $1"
}

# 检查是否登录
check_login() {
    log_info "检查 Docker 登录状态..."
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker 未运行，请先启动 Docker"
        exit 1
    fi
    log_info "Docker 运行正常"
}

# 构建基础镜像
build_base() {
    log_info "开始构建基础镜像..."
    log_info "镜像: ${FULL_IMAGE}"

    # 显示将包含的组件
    log_info "基础镜像将包含："
    log_info "  - Golang 1.26"
    log_info "  - Alpine Linux"
    log_info "  - git (预装)"
    log_info "  - ca-certificates (预装)"
    log_info "  - tzdata (预装)"
    log_info "  - 所有 Go 依赖 (预下载)"

    # 构建镜像
    docker build \
        -f Dockerfile.base \
        -t "${FULL_IMAGE}" \
        -t "${LATEST_TAG}" \
        .

    log_info "基础镜像构建完成"
}

# 推送镜像
push_image() {
    log_info "推送基础镜像到仓库..."

    docker push "${FULL_IMAGE}"

    log_info "推送 latest 标签..."
    docker push "${LATEST_TAG}"

    log_info "镜像推送完成"
}

# 显示镜像信息
show_image_info() {
    log_info "镜像信息："
    docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

    log_info ""
    log_info "运行镜像测试（显示已安装的工具版本）："
    docker run --rm "${FULL_IMAGE}" sh -c "echo '=== Pre-installed Tools ===' && go version && git --version && cat /etc/alpine-release && echo 'Go modules:' && cd /workspace/server && go list -m -json all | wc -l && echo 'packages'"
}

# 主流程
main() {
    log_info "========================================="
    log_info "Multica 基础镜像构建脚本"
    log_info "========================================="
    log_info ""

    check_login
    build_base
    push_image
    show_image_info

    log_info ""
    log_info "========================================="
    log_info "构建完成！"
    log_info "========================================="
    log_info ""
    log_warn "注意："
    log_warn "  1. 基础镜像只需构建一次或依赖更新时重新构建"
    log_warn "  2. 日常构建会直接使用此镜像，大幅减少构建时间"
    log_warn "  3. 如需更新依赖，请再次运行此脚本"
    log_info ""
    log_info "镜像地址："
    log_info "  ${FULL_IMAGE}"
    log_info "  ${LATEST_TAG}"
    log_info ""
}

# 运行主流程
main "$@"
