# MiniSubConvert

使用 SubStore 作为核心的订阅转换,支持部署到 CloudFlare Worker

## 支持的平台 (Target)

| 平台 | Parameter Keys |
| :--- | :--- |
| **Quantumult X** | `qx`, `QX`, `QuantumultX` |
| **Surge** | `surge`, `Surge`, `SurgeMac` |
| **Loon** | `Loon` |
| **Clash** | `Clash` |
| **Clash Meta / Mihomo** | `meta`, `clashmeta`, `clash.meta`, `Clash.Meta`, `ClashMeta`, `mihomo`, `Mihomo` |
| **Stash** | `stash`, `Stash` |
| **Shadowrocket** | `shadowrocket`, `Shadowrocket`, `ShadowRocket` |
| **Surfboard** | `surfboard`, `Surfboard` |
| **Sing-box** | `singbox`, `sing-box` |
| **Egern** | `egern`, `Egern` |
| **V2Ray** | `v2`, `v2ray`, `V2Ray` |
| **URI** | `uri`, `URI` |
| **JSON** | `json`, `JSON` |

## 部署 

### Worker

1.  **Fork 本仓库**：点击右上角的 `Fork` 按钮，将仓库复制到你的 GitHub 账户下。

2.  **设置 GitHub Secrets**：进入你 Fork 后的仓库，依次点击 **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**，添加以下环境变量：

    | Secret 名称 | 说明 |
    | :--- | :--- |
    | `SECRET` | 自定义访问密钥（例如 `my-secret-token`） |
    | `CLOUDFLARE_API_TOKEN` | Cloudflare API Token（需具有 Workers 编辑权限） |
    | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |

3.  **手动运行 Action**：进入 **Actions** 标签页，选择 `Deploy Worker` 工作流，点击 **Run workflow** 按钮执行部署。

接口遵循以下格式：

```
GET <WORKER_DOMAIN>/<SECRET>/sub?target=<TARGET>&url=<URLS>
```

*注意：`<SECRET>` 对应 Worker 环境变量中设置的 `SECRET` 值。*

参数说明

- **target**: 目标平台格式（请参考上方支持列表）。
- **url**: 原始订阅链接。
    - **多订阅合并**：如果需要合并多个订阅，请使用竖线 `|` 分隔链接。
    - **URL 编码**：最终拼接后的字符串必须进行 **URL Encode** 编码。

请求示例 

假设：
- Worker 域名: `example.workers.dev`
- `SECRET`: `129438`
- 目标平台: `mihomo`
- 原始订阅:
    1. `https://example.com/sub1`
    2. `https://example.com/sub2`

**步骤：**

1.  **拼接**: `https://example.com/sub1|https://example.com/sub2`
2.  **编码**: `https%3A%2F%2Fexample.com%2Fsub1%7Chttps%3A%2F%2Fexample.com%2Fsub2`
3.  **最终 URL**:

```
https://example.workers.dev/129438/sub?target=mihomo&url=https%3A%2F%2Fexample.com%2Fsub1%7Chttps%3A%2F%2Fexample.com%2Fsub2
```

### Docker

```bash
docker run -d \
    --name minisubconvert \
    -p 3000:3000 \
    -e SECRET=minisubconvert \
    bestrui/minisubconvert
```