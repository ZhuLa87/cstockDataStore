# CStockDataStore - 台股每日收盤資料收集系統

## 目錄

-   [專案簡介](#專案簡介)
-   [功能特點](#功能特點)
-   [系統需求](#系統需求)
-   [安裝與設置](#安裝與設置)
-   [使用範例](#使用範例)
-   [資料來源](#資料來源)
-   [資料表結構](#資料表結構)

## 專案簡介

CStockDataStore 是一個用來收集和分析台灣股市每日收盤資料的系統。本系統通過串接公開 API 獲取股票數據，並將其存儲到本地資料庫中，方便後續的數據分析和應用。

## 功能特點

-   抓取每日股票收盤價格
-   過濾只保留已上市的公司股票資料
-   自動化排程每日更新資料
-   提供基本的資料查詢功能

## 系統需求

-   Node.js v20.15.1 或更高版本
-   MariaDB 11.4.4 或更高版本
-   Ubuntu 22 作業系統

## 安裝與設置

### 安裝步驟

1. 複製專案到本地

```
git clone https://github.com/ZhuLa87/cstockDataStore.git
cd cstockDataStore
```

2. 安裝依賴套件

```
pnpm install
```

3. 設定 crontab 服務讓程式在每天 14:00 自動執行

```
./setupCron.sh
```

### 配置環境變數

複製 .env.example, 變更名稱為 .env 並編輯

```
cp .env.example .env
vi .env
```

環境變數說明：

-   `LOG_LEVEL`: 日誌記錄等級 (DEBUG, INFO, ERROR 等)
-   `DB_HOST`: 資料庫主機
-   `DB_PORT`: 資料庫連線埠
-   `DB_ROOT_PASSWORD`: 資料庫 Root 密碼 (docker-compose 使用)
-   `DB_NAME`: 資料庫名稱
-   `DB_USER`: 資料庫使用者名稱
-   `DB_PASSWORD`: 資料庫使用者密碼

## 使用範例

### 手動執行資料收集

```
./run.sh
```

## 資料來源

本系統使用台灣證券交易所獲取股票資料。參考文件：

-   [爬取台股每日資訊](https://www.pcschool.com.tw/blog/it/python-stock)

## 資料表結構

### 股票資訊資料表 (stock_info)

| 欄位名稱   | 資料類型     | 描述           |
| ---------- | ------------ | -------------- |
| id         | INT          | 主鍵，自動遞增 |
| stock_code | VARCHAR(10)  | 股票代碼       |
| stock_name | VARCHAR(100) | 股票名稱       |

### 歷史收盤價格資料表 (stock_history_price)

| 欄位名稱    | 資料類型      | 描述                          |
| ----------- | ------------- | ----------------------------- |
| id          | INT           | 主鍵，自動遞增                |
| stock_id    | INT           | 外鍵，對應 `stock_info` 的 id |
| date        | DATE          | 日期                          |
| close_price | DECIMAL(10,2) | 收盤價格                      |
