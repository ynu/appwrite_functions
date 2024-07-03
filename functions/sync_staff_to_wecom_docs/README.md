# sync_staff_to_wecom_docs

这是一个 `appwrite` 的云函数，用来同步/更新人员信息至腾讯文档的智能表格

## 如何本地运行/调试

1. `git clone git@github.com:liudonghua123/appwrite_functions.git`
2. `cd functions/sync_staff_to_wecom_docs`
3. `npm install`
4. `copy .env.sample .env && vim .env`
5. `npm start`

## 如何部署云函数

1. `npm install -g appwrite-cli` # 本地部署需要使用的cli工具 https://appwrite.io/docs/tooling/command-line/installation
2. `cd <root_directory_which_include_appwrite.json>`
3. `appwrite login`
4. `appwrite deploy function [--functionId 6673e0bb577143683a7b]`

## 相关配置说明

### 环境变量

本云函数依赖于一些环境变量，详情请查看 [.env.sample](.env.sample)

注意事项：

- 本地运行/调试模式需要额外配置 `APPWRITE_API_KEY`
- 注意这些环境变量部署在 `appwrite` 云端时需要导入进去

### 云函数

本云函数需要配合 `appwrite` 中的云数据库，云数据中需要有一个 collection 用来保存 dep 与 doc/sheet 的对应关系，其中

| 字段名称 | 字段长度 | 是否必须 | 备注 |
|:--------:|:--------:|:--------:|:----:|
|  dep_id  |     100    |     是    |   部门ID  |
|   docid  |     100    |     否    |   文档ID，如果为空则会新创建智能表格文档，云函数会自动更新此字段  |
| sheet_id |     100    |     否    |   表格SheetID，如果为空则会新创建Sheet，云函数会自动更新此字段  |
| dep_name |     256    |     否    |   部门名称，云函数会自动更新此字段  |

### TODOs

- [ ] evaluate/change the runtime from node to bun for [running typescript directly](https://bun.sh/docs/runtime/typescript).
- [ ] refact the code to make it more readable.
- [ ] add tests
