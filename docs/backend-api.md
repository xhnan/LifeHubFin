# 应用版本更新 API - 接口文档

## 接口概览

| 接口 | 方法 | 说明 |
|------|------|------|
| 检查版本更新 | GET | 客户端检查是否有新版本 |
| 快速发布版本 | POST | 管理端上传 APK 并发布 |

---

## 1. 检查版本更新

### 接口信息
- **地址**: `GET /app/app-version/check`
- **说明**: 客户端调用，检查是否有新版本可用

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| versionCode | Integer | 是 | - | 当前应用的版本号 |
| platform | String | 否 | android | 平台类型（android/ios） |

### 响应示例

**有新版本时**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "hasUpdate": true,
    "versionCode": 10002,
    "versionName": "1.0.2",
    "fileUrl": "http://120.78.0.54:9000/lifehub/app-v10002-1740900000000.apk",
    "fileSize": 15728640,
    "fileMd5": "ABC123...",
    "updateLog": "1. 修复登录bug\n2. 优化首页加载速度\n3. 新增记账功能",
    "isForce": 0,
    "platform": "android"
  }
}
```

**无新版本时**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "hasUpdate": false,
    "versionCode": 10001,
    "versionName": "1.0.1",
    "fileUrl": "http://120.78.0.54:9000/lifehub/app-v10001-1740800000000.apk",
    "fileSize": 15728640,
    "fileMd5": "DEF456...",
    "updateLog": "初始版本",
    "isForce": 0,
    "platform": "android"
  }
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| hasUpdate | Boolean | 是否有新版本可用 |
| versionCode | Integer | 最新版本号 |
| versionName | String | 版本名称（如 1.0.2） |
| fileUrl | String | APK 下载地址 |
| fileSize | Long | 文件大小（字节） |
| fileMd5 | String | 文件 MD5 校验值 |
| updateLog | String | 更新日志（换行符分隔） |
| isForce | Integer | 是否强制更新（0 否 1 是） |
| platform | String | 平台类型 |

---

## 2. 快速发布新版本

### 接口信息
- **地址**: `POST /sys/app-version/quick-publish`
- **Content-Type**: `multipart/form-data`
- **说明**: 上传 APK 文件并自动禁用该平台的所有旧版本

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| versionCode | Integer | 是 | - | 版本号（整数，如：10001） |
| versionName | String | 是 | - | 版本名称（如：1.0.1） |
| file | File | 是 | - | APK 安装包文件 |
| updateLog | String | 否 | - | 更新日志/版本说明 |
| isForce | Integer | 否 | 0 | 是否强制更新（0 否 1 是） |
| platform | String | 否 | android | 平台类型（android/ios） |

### 响应示例
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "versionCode": 10002,
    "versionName": "1.0.2",
    "fileUrl": "http://120.78.0.54:9000/lifehub/app-v10002-1740900000000.apk",
    "fileSize": 15728640,
    "fileMd5": "ABC123...",
    "updateLog": "修复bug，优化性能",
    "isForce": 0,
    "platform": "android",
    "status": 1,
    "createdAt": "2026-03-02T14:00:00",
    "updatedAt": "2026-03-02T14:00:00"
  }
}
```

### cURL 示例
```bash
curl -X POST http://your-domain.com/sys/app-version/quick-publish \
  -F "versionCode=10002" \
  -F "versionName=1.0.2" \
  -F "file=@app-release.apk" \
  -F "updateLog=修复bug，优化性能" \
  -F "isForce=0" \
  -F "platform=android"
```

---

## 前端集成要点

### 1. 版本号配置
前端需要在 `src/config/version.ts` 中配置：
```typescript
export const APP_VERSION = '1.0.0';      // 版本名称
export const APP_VERSION_CODE = 10000;   // 版本代码（整数）
```

### 2. 调用检查接口
```typescript
const params = new URLSearchParams({
  versionCode: APP_VERSION_CODE.toString(),
  platform: 'android',
});

const response = await authFetch<VersionCheckResponse>(
  `/app/app-version/check?${params.toString()}`
);

if (response.hasUpdate) {
  // 显示更新弹窗
  // 根据 isForce 判断是否强制更新
  // 使用 fileUrl 下载 APK
}
```

### 3. 下载和安装 APK
- 使用返回的 `fileUrl` 下载文件
- 下载完成后校验 `fileMd5`
- 使用 `react-native-apk-install` 安装

### 4. 更新日志处理
`updateLog` 是换行符分隔的字符串，需要按 `\n` 分割显示：
```typescript
const logs = updateLog.split('\n').filter(log => log.trim());
```

---

## 完整流程

### 发布流程
1. 构建 APK: `cd android && ./gradlew assembleRelease`
2. 上传到管理端: 使用 `quick-publish` 接口
3. 服务端自动: 计算文件大小、MD5，禁用旧版本

### 更新流程
1. 应用启动时调用 `check` 接口
2. 后端比较 `versionCode` 判断是否有更新
3. 有更新时返回新版本信息和下载链接
4. 客户端下载并安装 APK

---

## 版本号规范

### versionCode 计算规则
```
versionCode = 主版本 * 10000 + 次版本 * 100 + 补丁

示例：
1.0.0 → 10000
1.0.1 → 10001
1.1.0 → 10100
2.0.0 → 20000
```

### versionName 格式
- 格式：`主版本.次版本.补丁`
- 示例：`1.0.0`、`1.0.1`、`2.0.0`

---

## 数据库参考

```sql
CREATE TABLE app_version (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  version_code INT NOT NULL COMMENT '版本号',
  version_name VARCHAR(20) NOT NULL COMMENT '版本名称',
  file_url VARCHAR(500) NOT NULL COMMENT 'APK下载地址',
  file_size BIGINT COMMENT '文件大小（字节）',
  file_md5 VARCHAR(32) COMMENT '文件MD5',
  update_log TEXT COMMENT '更新日志',
  is_force INT DEFAULT 0 COMMENT '是否强制更新',
  platform VARCHAR(10) DEFAULT 'android',
  status INT DEFAULT 1 COMMENT '状态（0禁用 1启用）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_platform_version (platform, version_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应用版本表';
```
