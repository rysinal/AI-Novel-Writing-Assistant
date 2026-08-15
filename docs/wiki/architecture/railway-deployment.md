# Railway 部署边界

## Background

Web 版需要同时运行前端、API、后台任务、PostgreSQL 和 Qdrant。模型密钥及创作数据由 Prisma 存储，生成图片可以写入 S3。Redis 目前不在运行契约中。

## Decision

- Web 与 API 构建为一个容器，由 Express 提供 API 和前端静态资源，避免跨域和两个公网入口。
- 复用现有 PostgreSQL 实例时，必须创建独立 database 和 login role，不能写入其他应用的 database 或 schema。
- 生成图片使用 S3，并通过 `IMAGE_STORAGE_S3_PREFIX` 隔离对象路径。
- RAG 使用独立 Qdrant Service，数据目录 `/qdrant/storage` 必须挂载 Railway Volume。
- 应用和 Qdrant 都只运行一个副本。后台 worker、watchdog 与任务恢复尚未验证跨实例抢占。
- `/api/health` 仅用于 Railway readiness；其余页面和 API 必须通过 Basic Auth。

## Service topology

```text
public -> ai-novel -> PostgreSQL (private, independent database/role)
                  -> Qdrant (private, persistent volume)
                  -> S3 bucket (independent ai-novel/ prefix)
```

## Required application variables

- `DATABASE_URL`
- `HOST=0.0.0.0`
- `AI_NOVEL_AUTH_USERNAME`
- `AI_NOVEL_AUTH_PASSWORD`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `IMAGE_STORAGE_DRIVER=s3`
- `IMAGE_STORAGE_S3_ENDPOINT`
- `IMAGE_STORAGE_S3_REGION`
- `IMAGE_STORAGE_S3_BUCKET`
- `IMAGE_STORAGE_S3_PREFIX=ai-novel`
- `IMAGE_STORAGE_S3_ACCESS_KEY_ID`
- `IMAGE_STORAGE_S3_SECRET_ACCESS_KEY`
- `IMAGE_STORAGE_S3_FORCE_PATH_STYLE=true`

PostgreSQL migrations run as the Railway pre-deploy command. A failed migration blocks the new release before application traffic is switched.
