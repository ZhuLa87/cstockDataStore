# CStock - 台股每日收盤資料收集系統

## 專案簡介

CStock 是一個用來收集和分析台灣股市每日收盤資料的系統。本系統通過串接公開 API 獲取股票數據，並將其存儲到本地資料庫中，方便後續的數據分析和應用。

## 功能特點

- 自動抓取每日股票收盤價格
- 支持數據持久化儲存
- 提供基本的數據查詢功能
- 過濾只保留已上市的公司股票資料

## 安裝與設置


### 安裝步驟

```
git clone xxx
pnpm i
```

### 配置環境變數
複製 .env.example, 變更名稱為 .env
```
cp .env.example .env
vi .env
```

## 使用範例

```
pnpm start
```

## 資料庫設計

### 資料表結構

#### 股票基本資料表 (stocks)

| 欄位名稱   | 資料類型     | 描述               |
| ---------- | ------------ | ------------------ |
| id         | INTEGER      | 主鍵               |
| stock_code | VARCHAR(10)  | 股票代碼，建立索引 |
| stock_name | VARCHAR(100) | 股票名稱           |

#### 每日收盤資料表 (daily_prices)

| 欄位名稱          | 資料類型       | 描述                     |
| ----------------- | -------------- | ------------------------ |
| id                | INTEGER        | 主鍵                     |
| stock_id          | INTEGER        | 外鍵，關聯股票基本資料表 |
| date              | DATE           | 交易日期，建立索引       |
| close_price       | DECIMAL(10, 2) | 收盤價                   |

## 使用之證交所 API 接口說明

### 上市個股日收盤價及月平均價

#### 請求資訊

- **URL**: `https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL`
- **方法**: GET
- **參數**: 無

#### 回應格式

- **狀態碼**: 200 OK
- **回應格式**: JSON

#### 回應範例

```json
[
	{
		"Code": "0050",
		"Name": "元大台灣50",
		"ClosingPrice": "128.85",
		"MonthlyAveragePrice": "127.43"
	},
	{
		"Code": "2330",
		"Name": "台積電",
		"ClosingPrice": "573.00",
		"MonthlyAveragePrice": "570.86"
	}
]
```

#### 回應標頭

connection: keep-alive
content-disposition: attachment;filename=STOCK_DAY_AVG_ALL.json
content-encoding: gzip
content-type: application/json
date: Wed, 26 Mar 2025 10:55:24 GMT
etag: W/"67e31e2b-2a569c"
last-modified: Tue, 25 Mar 2025 21:20:43 GMT
server: nginx
transfer-encoding: chunked

### 申請上市之本國公司

#### 請求資訊

- **URL**: `https://openapi.twse.com.tw/v1/company/applylistingLocal`
- **方法**: GET
- **參數**: 無

#### 回應格式

- **狀態碼**: 200 OK
- **回應格式**: JSON

#### 回應範例

```json
[
    {
        "Code":"1",
        "Company":"7721",
        "ApplicationDate":"微程式",
        "Chairman":"1140221",
        "AmountofCapital ":"吳騰彥",
        "CommitteeDate":"500578",
        "ApprovedDate":"",
        "AgreementDate":"",
        "ListingDate":"",
        "ApprovedListingDate":"",
        "Underwriter":"富邦",
        "UnderwritingPrice":"",
        "Note":"科技事業"
    },
    {
        "Code":"2",
        "Company":"6589",
        "ApplicationDate":"台康生技",
        "Chairman":"1131227",
        "AmountofCapital ":"劉理成",
        "CommitteeDate":"3062161",
        "ApprovedDate":"",
        "AgreementDate":"1140218",
        "ListingDate":"1140226",
        "ApprovedListingDate":"",
        "Underwriter":"凱基",
        "UnderwritingPrice":"",
        "Note":"櫃轉市、科技事業"
    }
]
```


