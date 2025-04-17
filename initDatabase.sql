CREATE TABLE IF NOT EXISTS stock_info (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主鍵',
    stock_code VARCHAR(10) NOT NULL COMMENT '股票代碼',
    stock_name VARCHAR(100) NOT NULL COMMENT '股票名稱',
    INDEX idx_stock_code (stock_code)
);

CREATE TABLE IF NOT EXISTS stock_history_price (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主鍵',
    stock_id INT NOT NULL COMMENT '股票ID',
    date DATE NOT NULL COMMENT '日期',
    close_price DECIMAL(10,2) NOT NULL COMMENT '收盤價',
    FOREIGN KEY (stock_id) REFERENCES stock_info(id),
    INDEX idx_stock_id_date (stock_id, date)
);