// adapters/ReactNativeAdapter.ts
import {BaseAdapter} from '@dqcai/sqlite';
import SQLite from 'react-native-sqlite-storage';
import {Platform} from 'react-native';
import {createModuleLogger, AppModules} from '../../logger';
const logger = createModuleLogger(AppModules.DATABASE_ADAPTER);

// Cấu hình SQLite
SQLite.DEBUG(false);
SQLite.enablePromise(true);

export class ReactNativeAdapter extends BaseAdapter {
  async isSupported(): Promise<boolean> {
    // Kiểm tra xem có đang chạy trong môi trường React Native không
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  async connect(dbPath: string): Promise<any> {
    try {
      // Tạo kết nối đến database
      // React Native SQLite sẽ tự động tạo file database nếu chưa tồn tại
      const database = await SQLite.openDatabase({
        name: dbPath,
        location: 'default', // Sử dụng vị trí mặc định
      });
      logger.debug(
        AppModules.REACTNATIVE_ADAPTER,
        `Connected to database: ${dbPath}`,
        database,
      );

      return new ReactNativeConnection(database);
    } catch (error) {
      logger.error(
        AppModules.REACTNATIVE_ADAPTER,
        `Failed to connect to database: ${dbPath}`,
        error,
      );
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }
}

class ReactNativeConnection {
  // private logger = createModuleLogger(AppModules.REACTNATIVE_ADAPTER);

  constructor(private db: SQLite.SQLiteDatabase) {}

  async execute(sql: string, params: any[] = []): Promise<any> {
    try {
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

      if (isSelect) {
        // Xử lý câu lệnh SELECT
        const results = await this.db.executeSql(sql, params);
        const rows: any[] = [];

        if (results && results.length > 0) {
          const result = results[0];
          logger.debug(
            AppModules.REACTNATIVE_ADAPTER,
            `SQL SELECT result:`,
            result,
          );
          // Chuyển đổi ResultSet thành array
          for (let i = 0; i < result.rows.length; i++) {
            rows.push(result.rows.item(i));
          }
          logger.debug(
            AppModules.REACTNATIVE_ADAPTER,
            `SQL SELECT rows:`,
            rows,
          );
        }

        return {
          rows: rows,
          rowsAffected: 0,
        };
      } else {
        // Xử lý các câu lệnh INSERT, UPDATE, DELETE, CREATE, etc.
        const results = await this.db.executeSql(sql, params);

        if (results && results.length > 0) {
          const result = results[0];
          logger.debug(
            AppModules.REACTNATIVE_ADAPTER,
            `SQL execution result:`,
            result,
          );
          return {
            rows: result.rows?.raw() || [],
            rowsAffected: result.rowsAffected || 0,
            lastInsertRowId: result.insertId || undefined,
          };
        }

        return {
          rows: [],
          rowsAffected: 0,
        };
      }
    } catch (error) {
      logger.error(
        AppModules.REACTNATIVE_ADAPTER,
        `SQL execution failed`,
        error,
      );
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.db.close();
    } catch (error) {
      logger.error(AppModules.REACTNATIVE_ADAPTER, `Close Error:`, error);
      throw error;
    }
  }

  // Phương thức bổ sung để thực hiện transaction
  async transaction(fn: (tx: any) => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        async tx => {
          try {
            await fn(new ReactNativeTransaction(tx));
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        error => {
          reject(error);
        },
      );
    });
  }
}

// Class hỗ trợ cho transaction
class ReactNativeTransaction {
  constructor(private tx: any) {}

  async executeSql(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.tx.executeSql(
        sql,
        params,
        (tx: any, results: any) => {
          const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

          if (isSelect) {
            const rows: any[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              rows.push(results.rows.item(i));
            }
            resolve({
              rows: rows,
              rowsAffected: 0,
            });
          } else {
            resolve({
              rows: [],
              rowsAffected: results.rowsAffected || 0,
              lastInsertRowId: results.insertId || undefined,
            });
          }
        },
        (tx: any, error: any) => {
          reject(error);
        },
      );
    });
  }
}
