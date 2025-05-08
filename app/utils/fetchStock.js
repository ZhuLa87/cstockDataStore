const axios = require("axios");
const Log = require("./log.js");
const iconv = require("iconv-lite");
const csvParser = require("csv-parser");
const { format } = require("date-fns");

class FetchStock {
    static async getStock() {
        try {
            // 取得目前日期並格式化為 useDate 格式 (YYYYMMDD)
            let useDate = format(new Date(), "yyyyMMdd");

            const url = `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=csv&date=${useDate}&type=ALLBUT0999`;

            const response = await axios.get(url, {
                responseType: "arraybuffer",
            });

            // 將 ms950 編碼的資料轉換為 UTF-8
            const decodedData = iconv.decode(response.data, "ms950");

            // 解析 CSV 資料
            const rows = decodedData.split("\n").map((row) => row.split(","));

            // 找到每日收盤行情的起始位置
            const startIndex = rows.findIndex(
                (row) => row[0] && row[0].includes("每日收盤行情")
            );
            if (startIndex === -1) {
                Log.warn("未找到每日收盤行情的起始位置");
                return { data: [] };
            }

            // 提取每日收盤行情的資料
            const stockData = [];
            for (let i = startIndex + 2; i < rows.length; i++) {
                const row = rows[i];
                if (!row[0] || row[0].startsWith("備註")) break; // 遇到備註或空行結束

                const stockCode = row[0].replace(/="|"/g, "").trim(); // 去除可能的=" 和 "
                const stockName = row[1]?.replace(/="|"/g, "").trim(); // 去除引號
                const closingPrice = row[8]?.replace(/="|"/g, "").trim(); // 去除引號

                if (stockCode && stockName && closingPrice) {
                    stockData.push({
                        stockCode,
                        stockName,
                        closingPrice,
                    });
                }
            }

            Log.info(`成功提取 ${stockData.length} 筆每日收盤行情資料`);
            return { data: stockData };
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
            const listedStockCodes = data.map((item) => item.Company);
            Log.info(`成功獲取 ${listedStockCodes.length} 個上市公司股票代碼`);
            return listedStockCodes;
        } catch (error) {
            Log.error(`獲取上市公司股票代碼失敗: ${error.message}`);
            return [];
        }
    }

    // 過濾股票資料
    static filterStocks(stockData, listedStockCodes) {
        if (!Array.isArray(stockData) || !Array.isArray(listedStockCodes)) {
            Log.error("過濾股票資料失敗：輸入資料格式不正確");
            return [];
        }

        // 過濾出只在已上市的股票代碼中的資料
        const filteredStocks = stockData.filter((stock) => {
            const stockCode = stock.stockCode || stock.code;
            return listedStockCodes.includes(stockCode);
        });

        Log.info(
            `過濾前總數: ${stockData.length} 筆，過濾後剩餘 ${filteredStocks.length} 筆股票資料`
        );
        return filteredStocks;
    }
}

module.exports = FetchStock;
