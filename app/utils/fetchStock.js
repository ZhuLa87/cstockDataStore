const axios = require("axios");
const Log = require("./log.js");

class FetchStock {
    static async getStock() {
        try {
            const response = await axios.get(
                "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL",
                {
                    headers: {
                        accept: "application/json",  // 修改為預期的 JSON 格式
                        "If-Modified-Since": "Mon, 26 Jul 1997 05:00:00 GMT",
                        "Cache-Control": "no-cache",
                        Pragma: "no-cache",
                    },
                    timeout: 10000,
                }
            );
            const data = response.data;

            // 獲取 last-modified 標頭
            const lastModified = response.headers['last-modified'];
            Log.info(`API 回應 last-modified: ${lastModified}`);

            // 檢查取得的資料是否為預期格式
            if (!Array.isArray(data)) {
                Log.warn("API 回傳的資料不是陣列格式");
                return { data: [], lastModified };
            }

            return { data, lastModified };
        } catch (error) {
            Log.error(`獲取股票資料失敗: ${error.message}`);
            return error;
        }
    }
    
    // 新增獲取已上市公司股票代碼的方法
    static async getListedStockCodes() {
        try {
            const response = await axios.get(
                "https://openapi.twse.com.tw/v1/company/applylistingLocal",
                {
                    headers: {
                        accept: "application/json",
                        "If-Modified-Since": "Mon, 26 Jul 1997 05:00:00 GMT",
                        "Cache-Control": "no-cache",
                        Pragma: "no-cache",
                    },
                    timeout: 10000,
                }
            );
            const data = response.data;

            // 檢查取得的資料是否為預期格式
            if (!Array.isArray(data)) {
                Log.warn("API 回傳的上市公司資料不是陣列格式");
                return [];
            }

            // 從資料中提取股票代碼
            const listedStockCodes = data.map(item => item.Company);
            Log.info(`成功獲取 ${listedStockCodes.length} 個上市公司股票代碼`);
            return listedStockCodes;
        } catch (error) {
            Log.error(`獲取上市公司股票代碼失敗: ${error.message}`);
            return [];
        }
    }
    
    // 過濾股票資料，只保留已上市公司的股票
    static filterStocks(stockData, listedStockCodes) {
        if (!Array.isArray(stockData) || !Array.isArray(listedStockCodes)) {
            Log.error("過濾股票資料失敗：輸入資料格式不正確");
            return [];
        }

        // 過濾出只在已上市的股票代碼中的資料
        const filteredStocks = stockData.filter(stock => {
            const stockCode = stock.Code || stock.code;
            return listedStockCodes.includes(stockCode);
        });

        Log.info(`過濾前總數: ${stockData.length} 筆，過濾後剩餘 ${filteredStocks.length} 筆股票資料`);
        return filteredStocks;
    }
}

module.exports = FetchStock;
