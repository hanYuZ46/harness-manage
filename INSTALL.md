# harness-manager 安装指南

## 快速安装

```bash
# 一键安装 CLI
curl -fsSL https://raw.githubusercontent.com/hanYuZ46/harness-manage/main/scripts/install.sh | bash
```

## 配置

### 1. 配置服务器地址

```bash
# 配置指向你的本地服务器 (内网 IP)
harness-manager config set server_url https://harness-manager.dev.ennew.com
harness-manager config set app_url https://harness-manager-web.dev.ennew.com
```

### 2. 登录

```bash
# 使用 token 登录
harness-manager login --token mul_*********
```

### 3. 启动 Daemon

```bash
# 启动 daemon 服务 (本地 Agent 调度器)
harness-manager daemon start --device-name "hanjianchun"
```

### 4. 检查状态

```bash
# 查看 daemon 运行状态
harness-manager daemon status
```

---

## 完整的一键安装脚本

你可以把下面的内容保存为 `setup.sh`，发给需要安装的人：

```bash
#!/bin/bash
set -e

echo "========================================"
echo "  harness-manager 安装脚本"
echo "========================================"
echo ""

# 1. 安装 CLI
echo "==> 安装 harness-manager CLI..."
curl -fsSL https://raw.githubusercontent.com/hanYuZ46/harness-manage/main/scripts/install.sh | bash

echo ""
echo "==> CLI 安装完成！"
echo ""

# 2. 配置服务器地址
echo "==> 配置服务器地址..."
harness-manager config set server_url https://harness-manager.dev.ennew.com
harness-manager config set app_url https://harness-manager-web.dev.ennew.com

echo ""
echo "==> 服务器地址配置完成！"
echo ""

# 3. 提示用户登录
echo "========================================"
echo "  下一步：登录并启动 daemon"
echo "========================================"
echo ""
echo "1. 使用 token 登录:"
echo "   harness-manager login --token mul_*********"
echo ""
echo "2. 启动 daemon:"
echo "   harness-manager daemon start --device-name \"你的设备名\""
echo ""
echo "3. 检查状态:"
echo "   harness-manager daemon status"
echo ""
```

使用方法：
```bash
# 保存脚本
curl -fsSL https://raw.githubusercontent.com/hanYuZ46/harness-manage/main/scripts/setup.sh -o setup.sh

# 添加执行权限
chmod +x setup.sh

# 运行安装
./setup.sh
```

---

## 常见问题

### CLI 安装成功但 `harness-manager` 命令找不到

```bash
# 检查 multica 命令是否存在
which multica

# 如果存在，手动创建别名
ln -s /usr/local/bin/multica /usr/local/bin/harness-manager
```

### Daemon 启动失败

```bash
# 检查是否已登录
harness-manager config get

# 重新登录
harness-manager login --token mul_*********
```

### 查看日志

```bash
# 查看 daemon 日志
harness-manager daemon logs
```

### 停止 daemon

```bash
harness-manager daemon stop
```

---

## 仓库地址

- 安装脚本：https://github.com/hanYuZ46/harness-manage
- 主项目：https://gitlab.enncloud.cn/ng-icome/icome-enn-memory-group/multica
