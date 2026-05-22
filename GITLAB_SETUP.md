# GitLab 权限配置指南

## 1. 分支保护规则 (Protected Branches)

### 设置步骤：
1. 打开项目页面：https://gitlab.enncloud.cn/moss/harness/harness-cli
2. 进入 **Settings** → **Repository**
3. 展开 **Protected branches**
4. 添加保护规则：

| Branch | Allowed to merge | Allowed to push |
|--------|------------------|-----------------|
| `main` | Maintainers | Maintainers |
| `v*` (tags) | Maintainers | Maintainers |

### 推荐配置：
- ✅ **Prevent pushing tags** - 禁止直接推送标签
- ✅ **Prevent force push** - 禁止强制推送
- ✅ **Allowed to push**: Maintainers (只有管理员可以推送)

---

## 2. CI/CD 变量配置

### 添加 GitLab Token：
1. 进入 **Settings** → **CI/CD**
2. 展开 **Variables**
3. 添加变量：

| Key | Value | Type | Protected | Masked |
|-----|-------|------|-----------|--------|
| `GITLAB_TOKEN` | `<你的 token>` | Variable | ✅ | ✅ |

### Token 权限要求：
- `api` - 访问 API 创建 releases
- `write_repository` - 推送代码

---

## 3. 成员权限管理

### 角色说明：
| 角色 | 权限 |
|------|------|
| **Guest** | 查看代码、issue |
| **Reporter** | 查看 CI/CD、下载 artifacts |
| **Developer** | 创建分支、MR、运行 pipeline |
| **Maintainer** | 推送保护分支、管理成员 |
| **Owner** | 删除项目、转移项目 |

### 推荐设置：
- 普通开发者：**Developer**
- 项目负责人：**Maintainer**
- 外部贡献者：**Guest** (只能查看)

---

## 4. 安装脚本使用

### 从 GitLab 安装（推荐内网用户）：
```bash
# 方式 1: 直接安装
curl -fsSL https://gitlab.enncloud.cn/moss/harness/harness-cli/-/raw/main/scripts/install-gitlab.sh | bash

# 方式 2: 指定版本
curl -fsSL https://gitlab.enncloud.cn/moss/harness/harness-cli/-/raw/v0.2.7/scripts/install-gitlab.sh | bash
```

### 配置服务器：
```bash
harness config set server_url https://harness-manager.dev.ennew.com
harness config set app_url https://harness-manager-web.dev.ennew.com
harness login --token <your-token>
harness daemon start --device-name "my-machine"
```

---

## 5. 安全建议

### 安装脚本安全：
1. ✅ 安装到用户目录 `~/.local/bin`（无需 sudo）
2. ✅ 从 GitLab releases 下载（有校验和）
3. ⚠️ 建议添加 SHA256 验证

### Token 安全：
1. ✅ 使用 Protected CI/CD 变量
2. ✅ 设置 Masked 防止日志泄露
3. ✅ 定期轮换 token

### 代码审查：
1. ✅ 所有 MR 需要至少 1 人审核
2. ✅ 启用 MR 审批规则
3. ✅ 禁止直接 push 到 main

---

## 6. 故障排查

### 问题：安装脚本报 404
**原因**: GitLab releases 还没有上传 binaries
**解决**: 等待 CI/CD pipeline 完成，或手动上传

### 问题：CI/CD pipeline 失败
**检查**:
1. GitLab Runner 是否可用
2. `GITLAB_TOKEN` 变量是否配置
3. Go 版本是否正确

### 问题：权限不足
**解决**: 联系项目 Maintainer 添加你的账号

---

## 7. 与 GitHub 同步

如果需要同时发布到 GitHub 和 GitLab：

```bash
# 推送到两个远程
git push github main
git push origin main  # GitLab

git push github v0.2.7
git push origin v0.2.7
```

或者在 `.gitlab-ci.yml` 中添加 GitHub mirror 步骤。
