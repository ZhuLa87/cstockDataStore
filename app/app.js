const Log = require("./utils/log.js");
const FetchStock = require("./utils/fetchStock.js");
const Database = require("./utils/database.js");

require("dotenv").config();

class App {
    static async start() {
        try {
            // 顯示目前的日誌級別
            Log.showLogLevel();

            Log.info("開始獲取股票資料");
            const result = await FetchStock.getStock();
            if (!result || result instanceof Error) {
                Log.error(`獲取股票資料失敗: ${result?.message || "未知錯誤"}`);
                return false;
            }

            // 從結果中解析資料
            const { data: stockData } = result;

            // 檢查取得的資料
            if (!Array.isArray(stockData) || stockData.length === 0) {
                Log.error("取得的股票資料無效或為空");
                return false;
            }

            Log.info(`成功取得 ${stockData.length} 筆股票資料`);

            // 獲取已上市公司股票代碼
            Log.info("開始獲取已上市公司股票代碼");
            const listedStockCodes = await FetchStock.getListedStockCodes();
            if (!listedStockCodes || listedStockCodes.length === 0) {
                Log.error("獲取上市公司股票代碼失敗");
                return false;
            }

            // 過濾股票資料
            Log.info("開始過濾股票資料");
            const filteredStockData = FetchStock.filterStocks(
                stockData,
                listedStockCodes
            );
            if (filteredStockData.length === 0) {
                Log.warn("過濾後沒有符合條件的股票資料");
                return false;
            }

            Log.info("開始儲存股票資料");
            // 先測試資料庫連線
            const isConnected = await Database.testConnection();
            if (!isConnected) {
                Log.error("無法連線至資料庫，請檢查您的資料庫設定及連線狀態");
                return false;
            }

            // 檢查資料庫是否已初始化
            const isInitialized = await Database.checkDB();
            if (!isInitialized) {
                Log.info("資料庫尚未初始化，執行初始化操作");
                // 初始化資料庫
                const initResult = await Database.initDB();
                if (!initResult) {
                    Log.error("資料庫初始化失敗");
                    return false;
                }
                Log.info("資料庫初始化成功");
            } else {
                Log.info("資料庫已初始化，跳過初始化步驟");
            }

            // 使用目前日期作為 useDate
            const useDate = new Date().toISOString().split("T")[0];
            const storeResult = await Database.storeStockData(
                filteredStockData,
                useDate
            );

            if (storeResult) {
                Log.info("股票資料儲存成功。");
                return true;
            } else {
                Log.warn("部分股票資料儲存失敗，請檢查日誌了解詳情");
                return false;
            }
        } catch (error) {
            Log.error(`應用程式錯誤: ${error.message}`);
            Log.error(error.stack);
            return false;
        }
    }
}

// 使用 async 立即執行函式來正確處理非同步操作
(async function () {
    try {
        Log.timer("應用程式執行時間");
        const result = await App.start();
        const executionTime = Log.timer("應用程式執行時間");
        Log.info(`應用程式執行完成，共耗時 ${executionTime / 1000} 秒`);

        // 關閉資料庫連線池
        await Database.closePool();

        // 明確結束程式，使用適當的退出碼
        process.exit(result ? 0 : 1);
    } catch (error) {
        Log.error(`程式執行失敗: ${error.message}`);
        // 嘗試關閉資料庫連線池，即使有錯誤
        try {
            await Database.closePool();
        } catch (e) {
            // 忽略關閉連線池時的錯誤
        }
        process.exit(1);
    }
})();
