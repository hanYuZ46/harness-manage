# Multica 镜像构建方案

## 方案说明

本项目采用**预构建基础镜像**方案，将所有外部依赖提前打包到一个基础镜像中，日常构建只需复制源代码并编译。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│         预构建基础镜像（需构建一次）                           │
│                                                             │
│  swr.cn-lflt-1.enncloud.cn/multica/base:1.26               │
│    ├─ Golang 1.26                                           │
│    ├─ git                                                   │
│    ├─ ca-certificates                                       │
│    ├─ tzdata                                                │
│    └─ 所有 Go 依赖 (go mod download)                       │
│                                                             │
│    大小: ~500MB                                             │
│    构建: 仅需一次（依赖更新时重新构建）                       │
└─────────────────────────────────────────────────────────────┘
                        ↓ 每次快速构建
┌─────────────────────────────────────────────────────────────┐
│         日常构建镜像（CI/CD 使用）                            │
│                                                             │
│  swr.cn-lflt-1.enncloud.cn/multica/app:${VERSION}          │
│    ├─ 复制源代码 (几秒)                                      │
│    ├─ 编译二进制 (几十秒)                                    │
│    └─ 轻量化运行时 (~200MB)                                  │
│                                                             │
│    构建: 每次发布/CI 自动触发                                 │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 首次使用：构建基础镜像

```bash
cd /Users/enn/IdeaProjects/multica
./scripts/build-base.sh
```

等价于：
```bash
docker build -f Dockerfile.base -t swr.cn-lflt-1.enncloud.cn/multica/base:1.26 .
docker push swr.cn-lflt-1.enncloud.cn/multica/base:1.26
```

### 2. 日常构建：应用镜像

```bash
# 构建
docker build -t swr.cn-lflt-1.enncloud.cn/multica/app:latest .

# 推送
docker push swr.cn-lflt-1.enncloud.cn/multica/app:latest
```

## 好处

| 对比项 | 原方案 | 预构建方案 |
|--------|--------|-----------|
| 基础镜像 | 官方 golang:1.26-alpine | 自定义 multica/base:1.26 |
| git 安装 | 每次构建都要 apk add git | ✅ 预装 |
| Go 依赖 | 每次构建都要 go mod download | ✅ 预下载 |
| 网络依赖 | 每次都访问 Alpine 软件源/Go proxy | ✅ 只需一次 |
| Jenkins 脆弱节点 | 每次都可能失败 | ✅ 避开问题 |
| 构建时间 | 5-10 分钟 | 1-2 分钟 |

## 文件说明

| 文件 | 说明 |
|------|------|
| `Dockerfile.base` | 基础镜像定义，包含所有依赖 |
| `Dockerfile` | 应用镜像定义，基于基础镜像编译 |
| `scripts/build-base.sh` | 基础镜像构建脚本 |

## 何时重新构建基础镜像

- **首次部署**：需要先构建一次
- **依赖更新**：修改 `server/go.mod` 后
- **工具版本升级**：需要更换 golang 或 git 版本时
- **依赖包变动**：Go proxy 源变化或新增工具时

## CI/CD 集成

### Jenkins Pipeline 示例

```groovy
pipeline {
    agent any

    stages {
        stage '检出代码' {
            steps {
                checkout scm
            }
        }

        stage '构建应用镜像' {
            steps {
                script {
                    // 直接使用预构建的基础镜像，无需再下载依赖
                    docker.withRegistry('https://swr.cn-lflt-1.enncloud.cn', 'docker-credentials') {
                        def appImage = docker.build("swr.cn-lflt-1.enncloud.cn/multica/app:${BUILD_NUMBER}")
                        appImage.push()
                        appImage.push('latest')
                    }
                }
            }
        }
    }
}
```

## 故障排除

### 问题：基础镜像未推送

```
ERROR: manifest for swr.cn-lflt-1.enncloud.cn/multica/base:1.26 not found
```

**解决**：先运行 `./scripts/build-base.sh` 构建并推送基础镜像

### 问题：Go 依赖更新后构建失败

**解决**：更新依赖后，重新运行 `./scripts/build-base.sh` 更新基础镜像

## 监控和维护

### 查看基础镜像信息

```bash
docker inspect swr.cn-lflt-1.enncloud.cn/multica/base:1.26
```

### 测试基础镜像

```bash
docker run --rm swr.cn-lflt-1.enncloud.cn/multica/base:1.26 sh -c "go version && git --version"
```

### 清理旧镜像

```bash
# 查看镜像
docker images | grep multica/base

# 删除旧版本
docker rmi swr.cn-lflt-1.enncloud.cn/multica/base:1.25
```
