const mariadb = require("mariadb");
const Log = require("./log.js");
require("dotenv").config();

const pool = mariadb.createPool({
	host: process.env.DB_HOST || "localhost",
	port: process.env.DB_PORT || 3306,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	connectionLimit: 5,
	connectTimeout: 15000, // 增加連線逾時時間
	acquireTimeout: 10000, // 增加連線獲取逾時時間
});

class Database {
	// 測試資料庫連線
	static async testConnection() {
		let conn;
		try {
			Log.info("測試資料庫連線中");
			conn = await pool.getConnection();
			Log.info("資料庫連線成功！");
			return true;
		} catch (error) {
			Log.error(`資料庫連線測試失敗: ${error.message}`);
			if (error.code === "ECONNREFUSED") {
				Log.error(
					`無法連線至資料庫伺服器 ${process.env.DB_HOST}:${process.env.DB_PORT}，請確認伺服器是否運行中`
				);
			} else if (error.code === "ER_ACCESS_DENIED_ERROR") {
				Log.error(
					"資料庫使用者名稱或密碼不正確，請檢查您的環境變數設定"
				);
			} else if (error.code === "ER_BAD_DB_ERROR") {
				Log.error(
					`資料庫 '${process.env.DB_NAME}' 不存在，請先建立此資料庫`
				);
			}
			return false;
		} finally {
			if (conn) conn.release();
		}
	}

	// 初始化資料庫
	static async initDB() {
		let conn;
		try {
			Log.info("開始初始化資料庫");
			conn = await pool.getConnection();

			// 建立股票基本資訊表
			await conn.query(`
				CREATE TABLE IF NOT EXISTS stock_info (
                    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主鍵',
                    stock_code VARCHAR(10) NOT NULL COMMENT '股票代碼',
                    stock_name VARCHAR(100) NOT NULL COMMENT '股票名稱',
                    INDEX idx_stock_code (stock_code)
                );
			`);

			// 建立每日收盤價表（不包含月平均價）
			await conn.query(`
				CREATE TABLE IF NOT EXISTS stock_history_price (
                    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主鍵',
                    stock_id INT NOT NULL COMMENT '股票ID',
                    date DATE NOT NULL COMMENT '日期',
                    close_price DECIMAL(10,2) NOT NULL COMMENT '收盤價',
                    FOREIGN KEY (stock_id) REFERENCES stock_info(id),
                    INDEX idx_stock_id_date (stock_id, date)
                );
			`);

			Log.info("資料庫初始化完成");
			return true;
		} catch (error) {
			Log.error(`資料庫初始化錯誤: ${error.message}`);
			return false;
		} finally {
			if (conn) conn.release();
		}
	}

	// 檢查資料庫是否已初始化
	static async checkDB() {
		let conn;
		try {
			conn = await pool.getConnection();

			// 檢查股票表是否存在
			const stocksTable = await conn.query(`
				SELECT 1 FROM information_schema.tables
				WHERE table_schema = DATABASE() AND table_name = 'stock_info'
			`);

			// 檢查每日價格表是否存在
			const pricesTable = await conn.query(`
				SELECT 1 FROM information_schema.tables
				WHERE table_schema = DATABASE() AND table_name = 'stock_history_price'
			`);

			return stocksTable.length > 0 && pricesTable.length > 0;
		} catch (error) {
			Log.error(`檢查資料庫時發生錯誤: ${error.message}`);
			return false;
		} finally {
			if (conn) conn.release();
		}
	}

    // 將股票資料儲存至資料庫
	static async storeStockData(stockData, tradeDate) {
		let conn;
		try {
			Log.info(`開始存儲 ${stockData.length} 筆股票資料，交易日期: ${tradeDate}`);
			conn = await pool.getConnection();

			// 開始事務
			await conn.beginTransaction();

			let successCount = 0;
			let errorCount = 0;

			for (const stock of stockData) {
				try {
					// 檢查股票是否已存在於 stock_info 表中
					const stockExists = await conn.query(
						`SELECT id FROM stock_info WHERE stock_code = ?`,
						[stock.stockCode]
					);

					let stockId;

					if (stockExists.length === 0) {
						// 新增股票資訊
						const insertResult = await conn.query(
							`INSERT INTO stock_info (stock_code, stock_name) VALUES (?, ?)`,
							[stock.stockCode, stock.stockName]
						);
						stockId = insertResult.insertId;
						Log.debug(`新增股票資訊: ${stock.stockCode} - ${stock.stockName}`);
					} else {
						stockId = stockExists[0].id;
						// 更新股票名稱（以防名稱有變更）
						await conn.query(
							`UPDATE stock_info SET stock_name = ? WHERE id = ?`,
							[stock.stockName, stockId]
						);
					}

					// 處理無收盤價的情況
					let closePrice = stock.closingPrice;
					if (closePrice === '--' || closePrice === '' || closePrice === null || closePrice === undefined) {
						closePrice = -1;
						Log.debug(`股票 ${stock.stockCode} 無收盤價，設定為 -1`);
					}

					// 檢查股票價格是否已存在
					const priceExists = await conn.query(
						`SELECT id FROM stock_history_price WHERE stock_id = ? AND date = ?`,
						[stockId, tradeDate]
					);

					if (priceExists.length === 0) {
						// 新增股票價格
						await conn.query(
							`INSERT INTO stock_history_price (stock_id, date, close_price) VALUES (?, ?, ?)`,
							[stockId, tradeDate, closePrice]
						);
					} else {
						// 更新股票價格
						await conn.query(
							`UPDATE stock_history_price SET close_price = ? WHERE stock_id = ? AND date = ?`,
							[closePrice, stockId, tradeDate]
						);
					}

					successCount++;
				} catch (stockError) {
					Log.error(`處理股票 ${stock.stockCode} 資料時發生錯誤: ${stockError.message}`);
					errorCount++;
				}
			}

			// 提交事務
			await conn.commit();

			Log.info(`股票資料儲存完成: 成功 ${successCount} 筆, 失敗 ${errorCount} 筆`);
			return successCount > 0;
		} catch (error) {
			if (conn) {
				await conn.rollback();
			}
			Log.error(`儲存股票資料時發生錯誤: ${error.message}`);
			return false;
		} finally {
			if (conn) conn.release();
		}
	}

	// 新增關閉連線池的方法
	static async closePool() {
		try {
			Log.info("正在關閉資料庫連線池...");
			if (pool) {
				await pool.end();
				Log.info("資料庫連線池已成功關閉");
			}
			return true;
		} catch (error) {
			Log.error(`關閉資料庫連線池時發生錯誤: ${error.message}`);
			return false;
		}
	}
}

module.exports = Database;
