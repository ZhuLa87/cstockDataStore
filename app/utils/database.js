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

	// 將股票日資料儲存至資料庫
	static async storeStockDay(stockCode, stockName, closePrice, tradeDate) {
		let conn;
		try {
			conn = await pool.getConnection();

			// 首先檢查股票是否已存在於股票表中
			const stockResult = await conn.query(
				"SELECT id FROM stocks WHERE stock_code = ?",
				[stockCode]
			);

			let stockId;
			if (stockResult.length === 0) {
				 // 若股票不存在，插入新的股票記錄
				const insertStock = await conn.query(
					"INSERT INTO stocks (stock_code, stock_name) VALUES (?, ?)",
					[stockCode, stockName]
				);
				stockId = insertStock.insertId;
			} else {
				 // 若股票存在，更新名稱
				stockId = stockResult[0].id;
				await conn.query(
					"UPDATE stocks SET stock_name = ? WHERE id = ?",
					[stockName, stockId]
				);
			}

			 // 插入每日價格資料，使用傳入的交易日期或當天日期
			if (!tradeDate) {
				tradeDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
				Log.warn(`未提供交易日期，使用當前日期: ${tradeDate}`);
			}

			await conn.query(
				"INSERT INTO daily_prices (stock_id, date, close_price) VALUES (?, ?, ?)",
				[stockId, tradeDate, closePrice]
			);

			return true;
		} catch (error) {
			Log.error(`儲存股票日資料時發生錯誤: ${error.message}`);
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
				CREATE TABLE IF NOT EXISTS stocks (
					id INT AUTO_INCREMENT PRIMARY KEY,
					stock_code VARCHAR(10) NOT NULL,
					stock_name VARCHAR(100) NOT NULL,
					INDEX idx_stock_code (stock_code)
				)
			`);

			// 建立每日收盤價表（不包含月平均價）
			await conn.query(`
				CREATE TABLE IF NOT EXISTS daily_prices (
					id INT AUTO_INCREMENT PRIMARY KEY,
					stock_id INT NOT NULL,
					date DATE NOT NULL,
					close_price DECIMAL(10,2) NOT NULL,
					INDEX idx_date (date),
					FOREIGN KEY (stock_id) REFERENCES stocks(id)
				)
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
				WHERE table_schema = DATABASE() AND table_name = 'stocks'
			`);

			// 檢查每日價格表是否存在
			const pricesTable = await conn.query(`
				SELECT 1 FROM information_schema.tables
				WHERE table_schema = DATABASE() AND table_name = 'daily_prices'
			`);

			return stocksTable.length > 0 && pricesTable.length > 0;
		} catch (error) {
			Log.error(`檢查資料庫時發生錯誤: ${error.message}`);
			return false;
		} finally {
			if (conn) conn.release();
		}
	}

	static async storeData(rawData, lastModified) {
		let conn;
		try {
			conn = await pool.getConnection();

			// 開始交易
			await conn.beginTransaction();

			// 檢查資料是否為陣列
			if (!Array.isArray(rawData)) {
				Log.error("資料格式錯誤：預期為陣列");
				return false;
			}

			// 解析 last-modified 標頭，將 GMT 時間轉換為 GMT+8
			let tradeDate;
			if (lastModified) {
				const lastModifiedDate = new Date(lastModified);
				// 調整到 GMT+8
				lastModifiedDate.setHours(lastModifiedDate.getHours() + 8);
				tradeDate = lastModifiedDate.toISOString().split('T')[0]; // YYYY-MM-DD
				Log.info(`使用交易日期: ${tradeDate} (GMT+8)`);
			} else {
				// 如果沒有 last-modified，使用當前日期作為備用
				tradeDate = new Date().toISOString().split('T')[0];
				Log.warn(`未提供 last-modified 標頭，使用當前日期: ${tradeDate}`);
			}

			let successCount = 0;
			let errorCount = 0;

			// 批次處理設定
			const batchSize = 1000;  // 每批處理的數量
			const totalBatches = Math.ceil(rawData.length / batchSize);

			// 分批處理資料
			for (let i = 0; i < totalBatches; i++) {
				const start = i * batchSize;
				const end = Math.min((i + 1) * batchSize, rawData.length);
				const currentBatch = rawData.slice(start, end);

				const batchSuccessCount = await this.processBatch(conn, currentBatch, tradeDate);

				successCount += batchSuccessCount;
				errorCount += (currentBatch.length - batchSuccessCount);

				// 每5批提交一次交易，避免交易過大
				if ((i + 1) % 5 === 0 && i < totalBatches - 1) {
					await conn.commit();
					Log.info(`已提交部分交易 (${end}/${rawData.length})`);
					await conn.beginTransaction();  // 啟動新的交易
				}
			}

			// 提交剩餘交易
			await conn.commit();
			Log.info(`資料儲存完成：成功 ${successCount} 筆，失敗 ${errorCount} 筆`);
			return successCount > 0;
		} catch (error) {
			// 發生錯誤時回滾交易
			if (conn) await conn.rollback();
			Log.error(`儲存資料時發生錯誤: ${error.message}`);
			return false;
		} finally {
			if (conn) conn.release();
		}
	}

	// 新增批次處理方法
	static async processBatch(conn, batchData, tradeDate) {
		let successCount = 0;

		try {
			// 先收集所有的股票代碼，以便批量查詢
			const stockCodes = batchData.map(item => item.Code || item.code).filter(Boolean);

			// 批量查詢已存在的股票
			const stocksQuery = await conn.query(
				"SELECT id, stock_code FROM stocks WHERE stock_code IN (?)",
				[stockCodes]
			);

			// 建立代碼到ID的映射
			const stockIdMap = {};
			stocksQuery.forEach(row => {
				stockIdMap[row.stock_code] = row.id;
			});

			// 準備批量插入新股票的資料
			const newStocks = [];
			const stockUpdates = [];
			const priceInserts = [];

			// 處理每一筆股票資料
			for (const item of batchData) {
				try {
					const stockCode = item.Code || item.code;
					const stockName = item.Name || item.name;
					const closePrice = parseFloat(item.ClosingPrice || item.closingPrice || 0);

					// 資料檢查
					if (!stockCode || !stockName) {
						continue;
					}

					let stockId = stockIdMap[stockCode];

					if (!stockId) {
						// 需要插入新的股票
						newStocks.push([stockCode, stockName]);
					} else {
						// 需要更新的股票
						stockUpdates.push([stockName, stockId]);
					}

					// 為每筆股票準備價格資料，稍後再填充 stockId
					priceInserts.push({
						stockCode,
						closePrice,
						stockId  // 對於新插入的股票，這個值稍後會更新
					});

					successCount++;
				} catch (e) {
					Log.error(`處理個股資料時發生錯誤: ${e.message}`);
				}
			}

			// 批量插入新股票
			if (newStocks.length > 0) {
				const insertResult = await conn.batch(
					"INSERT INTO stocks (stock_code, stock_name) VALUES (?, ?)",
					newStocks
				);

				// 查詢新插入股票的ID
				const newStockCodes = newStocks.map(s => s[0]);
				const newStockQuery = await conn.query(
					"SELECT id, stock_code FROM stocks WHERE stock_code IN (?)",
					[newStockCodes]
				);

				// 更新映射
				newStockQuery.forEach(row => {
					stockIdMap[row.stock_code] = row.id;
				});
			}

			// 批量更新股票名稱
			if (stockUpdates.length > 0) {
				await conn.batch(
					"UPDATE stocks SET stock_name = ? WHERE id = ?",
					stockUpdates
				);
			}

			// 準備價格資料的批量插入，填充 stockId
			const finalPriceInserts = [];
			for (const item of priceInserts) {
				const stockId = stockIdMap[item.stockCode];
				if (stockId) {
					finalPriceInserts.push([stockId, tradeDate, item.closePrice]);
				}
			}

			// 批量插入價格資料
			if (finalPriceInserts.length > 0) {
				await conn.batch(
					"INSERT INTO daily_prices (stock_id, date, close_price) VALUES (?, ?, ?)",
					finalPriceInserts
				);
			}
		} catch (error) {
			Log.error(`批次處理時發生錯誤: ${error.message}`);
			throw error;  // 將錯誤向上拋出，讓主函數處理事務
		}

		return successCount;
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
