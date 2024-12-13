# Upload to OBS

这是一个用于将本地包上传到OBS（Open Build Service）的GitHub Actions工作流。

## 作者

- Elysia

## 功能

该工作流允许您将本地包上传到OBS。它支持配置各种参数，如是否移除旧的源文件、OBS包名、项目名、用户名、密码、实例URL和本地包目录。

## 配置

### 标识

- 图标: `heart`
- 颜色: `red`

### 输入参数

#### `remove-old-sources`

- **描述**: 是否从OBS包中移除旧的源文件。
- **类型**: Boolean
- **必需**: 是
- **默认值**: `true`

#### `obs-package-name`

- **描述**: OBS包的名称。
- **类型**: String
- **必需**: 是

#### `obs-project-name`

- **描述**: OBS项目的名称。
- **类型**: String
- **必需**: 是

#### `obs-user-name`

- **描述**: OBS的用户名。
- **类型**: String
- **必需**: 是

#### `obs-password`

- **描述**: OBS的密码。
- **类型**: String
- **必需**: 是

#### `obs-instance-url`

- **描述**: OBS实例的URL。
- **类型**: String
- **必需**: 是
- **默认值**: `https://api.opensuse.org`

#### `local-package-dir`

- **描述**: 本地包的目录。
- **类型**: String
- **必需**: 是

## 使用方法

1. 在您的GitHub仓库中创建一个`.github/workflows`目录（如果尚未创建）。
2. 在该目录中创建一个新的YAML文件，例如`upload-to-obs.yml`。
3. 将以下内容复制到新创建的YAML文件中：

```yaml
- name: Upload to OBS
  uses: LingmoOS/action-upload-to-obs@0.0.3
  with:
    remove-old-sources: true
    obs-package-name: 'xxx'
    obs-project-name: 'home:xxx:xxx'
    obs-user-name: ${{ secrets.OBS_USERNAME }}
    obs-password: ${{ secrets.OBS_PASSWORD }}
    obs-instance-url: 'https://api.opensuse.org'
    local-package-dir: './debian-deb-output'
```

4. 根据您的需求修改输入参数的值。
5. 提交并推送更改到您的GitHub仓库。

## 注意事项

- 请确保您的GitHub仓库具有访问OBS实例的权限。
- 确保本地包目录中包含有效的包文件。

## 贡献

如果您有任何改进意见或想要贡献代码，请随时提交Pull Request或创建Issue。

## 许可证

该工作流遵循MIT许可证。请查看LICENSE文件了解更多信息。
