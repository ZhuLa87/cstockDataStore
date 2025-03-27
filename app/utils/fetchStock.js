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
}

module.exports = FetchStock;
