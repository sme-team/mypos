import {DatabaseManager} from '@dqcai/sqlite';
import {googleSheetService} from '../../services/GooglesheetServices/GoogleSheetToJson';
import {createModuleLogger, AppModules} from '../../logger';

const logger = createModuleLogger(AppModules.DATABASE);

export interface SeedResult {
  success: boolean;
  totalImported: number;
  totalFailed: number;
  errors: Array<{
    table: string;
    rowId: string | number;
    message: string;
  }>;
  summary: string;
}

export class DatabaseSeeder {
  /**
   * Làm sạch dữ liệu trước khi insert (xử lý null → giá trị mặc định)
   */
  private cleanData(tableName: string, dataArray: any[]): any[] {
    const metadataIds = [
      'varchar',
      'text',
      'int',
      'float',
      'decimal',
      'date',
      'datetime',
      'Mã danh mục',
      'Mô tả',
      'Kiểu dữ liệu',
      'Length',
      'Type',
      'uuid',
      'tự sinh',
    ];

    return dataArray
      .filter(row => {
        // Filter empty rows
        if (
          !row ||
          !Object.values(row).some(
            v => v !== null && v !== undefined && v !== '',
          )
        ) {
          return false;
        }
        // Filter metadata rows by ID
        if (
          row.id &&
          typeof row.id === 'string' &&
          metadataIds.includes(row.id.trim().toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .map((row, idx) => {
        const r: any = {};

        Object.keys(row).forEach(key => {
          let val = row[key];

          // Xóa khoảng trắng thừa và chuẩn hóa null
          if (val === null || val === undefined || String(val).trim() === '') {
            if (
              [
                'price',
                'amount',
                'rent_amount',
                'deposit_amount',
                'unit_price',
                'quantity',
                'cost_price',
                'tax_rate',
              ].includes(key)
            ) {
              r[key] = 0;
            } else if (
              key.includes('date') ||
              key === 'start_date' ||
              key === 'end_date' ||
              key === 'signed_date' ||
              key === 'due_date'
            ) {
              r[key] = '2024-01-01';
            } else if (key === 'status') {
              r[key] = 'active';
            } else if (
              key === 'name' ||
              key === 'short_name' ||
              key === 'description' ||
              key === 'line_description'
            ) {
              r[key] = `Unnamed_${tableName}_${idx + 1}`;
            } else {
              r[key] = null;
            }
          } else {
            // Convert sang số nếu là cột số
            if (
              [
                'price',
                'amount',
                'rent_amount',
                'deposit_amount',
                'unit_price',
                'quantity',
              ].includes(key)
            ) {
              r[key] = Number(val) || 0;
            } else if (typeof val === 'string') {
              r[key] = val.trim();
            } else {
              r[key] = val;
            }
          }
        });

        // Bổ sung thêm nếu thiếu trường quan trọng
        if (tableName === 'products' && !r.name)
          r.name = `Sản phẩm ${r.id || idx + 1}`;
        if (tableName === 'prices' && r.price === undefined) r.price = 0;
        if (tableName === 'contracts') {
          if (!r.start_date) r.start_date = '2024-01-01';
          if (r.rent_amount === undefined) r.rent_amount = 0;
        }

        return r;
      });
  }
  /**
   * Seed một bảng (đã được làm sạch dữ liệu)
   */
  private async seedTable(
    tableName: string,
    rawData: any[],
    errors: SeedResult['errors'],
  ): Promise<{success: number; failed: number}> {
    if (!rawData || rawData.length === 0) {
      logger.warn(`Không có dữ liệu cho bảng ${tableName}`);
      return {success: 0, failed: 0};
    }

    const cleanedData = this.cleanData(tableName, rawData);

    const db = DatabaseManager.get('mypos');
    if (!db) {
      logger.error(`Không kết nối được DB cho bảng ${tableName}`);
      return {success: 0, failed: 0};
    }

    let successCount = 0;
    let errorCount = 0;

    logger.info(
      `Bắt đầu seed bảng ${tableName} với ${cleanedData.length} dòng (sử dụng transaction)...`,
    );

    try {
      await db.transaction(async (tx: any) => {
        // Fix type issue
        for (const row of cleanedData) {
          try {
            const columns = Object.keys(row).filter(
              col => row[col] !== undefined && row[col] !== null,
            );
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map(col => row[col]);

            const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(
              ', ',
            )} ) VALUES (${placeholders})`;

            await tx.execute(sql, values);
            successCount++;
          } catch (rowErr: any) {
            errorCount++;
            const rowId = row.id || row.code || row.name || `row_${errorCount}`;
            errors.push({
              table: tableName,
              rowId,
              message: `${rowErr.message}`.substring(0, 200),
            });
            logger.warn(`Lỗi dòng ${rowId} bảng ${tableName}:`, rowErr.message);
          }
        }
      });

      logger.info(
        `✅ Bảng ${tableName}: ${successCount} OK, ${errorCount} lỗi`,
      );
    } catch (txErr: any) {
      logger.error(`❌ Transaction fail ${tableName}:`, txErr);
      return {success: 0, failed: cleanedData.length};
    }
    return {success: successCount, failed: errorCount};
  }

  /**
   * Hàm chính chạy seeding
   */
  public async seedRunner(
    sheetLink: string,
    strategy: 'overwrite' | 'merge' = 'merge',
  ): Promise<SeedResult> {
    const errors: SeedResult['errors'] = [];
    let totalImported = 0;
    let totalFailed = 0;

    try {
      logger.info('Bắt đầu quy trình fetch và seed dữ liệu...');

      // 1. Fetch từ Google Sheet
      const sheetList =
        'pos_categories,pos_units,pos_products,pos_product_variants,pos_prices,pos_customers,pos_bill_cycles,pos_bills,pos_bill_details,pos_payments,res_contracts,res_contract_members,pos_receivables,res_residents';

      const jsonData = await googleSheetService.getDataDirect({
        googleSheetLink: sheetLink,
        sheets: sheetList,
        startFromRow: 1, // Fetcher đã skip metadata
      });

      // 2. Thứ tự seeding theo Foreign Key
      const tablesOrder = [
        {sheet: 'pos_categories', table: 'categories'},
        {sheet: 'pos_units', table: 'units'},
        {sheet: 'pos_products', table: 'products'},
        {sheet: 'pos_product_variants', table: 'product_variants'},
        {sheet: 'pos_prices', table: 'prices'},
        {sheet: 'pos_customers', table: 'customers'},
        {sheet: 'pos_bill_cycles', table: 'bill_cycles'},
        {sheet: 'pos_bills', table: 'bills'},
        {sheet: 'pos_bill_details', table: 'bill_details'},
        {sheet: 'res_contracts', table: 'contracts'},
        {sheet: 'res_contract_members', table: 'contract_members'},
        {sheet: 'pos_receivables', table: 'receivables'},
        {sheet: 'pos_payments', table: 'payments'},
        {sheet: 'res_residents', table: 'residents'},
      ];

      // Xóa dữ liệu cũ nếu overwrite
      if (strategy === 'overwrite') {
        const reverseOrder = [...tablesOrder].reverse();
        const db = DatabaseManager.get('mypos');
        if (db) {
          logger.info('Strategy is overwrite, clearing existing data...');
          for (const config of reverseOrder) {
            try {
              await db.execute(`DELETE FROM ${config.table}`);
            } catch (err: any) {
              logger.warn(`Lỗi khi xoá bảng ${config.table}: ${err.message}`);
            }
          }
        }
      }

      // Seeding theo thứ tự
      for (const config of tablesOrder) {
        const data = jsonData[config.sheet];
        if (data && data.length > 0) {
          const tableResult = await this.seedTable(config.table, data, errors);
          totalImported += tableResult.success;
          totalFailed += tableResult.failed;
        } else {
          logger.warn(`Sheet ${config.sheet} không có dữ liệu để seed.`);
        }
      }

      const summary = `Import hoàn tất: ${totalImported} thành công, ${totalFailed} thất bại${
        errors.length > 0 ? ` (${errors.length} lỗi, xem chi tiết)` : ''
      }`;

      logger.info('🎉 ' + summary);

      // Ghi log import (update với stats mới)
      try {
        const db = DatabaseManager.get('mypos');
        if (db) {
          const insertLogSql = `
            INSERT INTO import_logs (store_id, source_url, record_count, strategy_used, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?)
          `;
          await db.execute(insertLogSql, [
            'STORE_1',
            sheetLink,
            totalImported,
            strategy,
            totalFailed === 0 ? 'success' : 'partial_success',
            errors.length > 0 ? JSON.stringify(errors.slice(0, 10)) : '',
          ]);
        }
      } catch (logErr) {
        logger.error('Failed to write import log:', logErr);
      }

      return {
        success: totalFailed === 0,
        totalImported,
        totalFailed,
        errors,
        summary,
      };
    } catch (error: any) {
      return {
        success: false,
        totalImported: 0,
        totalFailed: 0,
        errors: [
          {
            table: 'seedRunner',
            rowId: 'global',
            message: error.message || 'Unknown error',
          },
        ],
        summary: `Import thất bại: ${error.message || 'Unknown error'}`,
      };
    }
  }
}

export const databaseSeeder = new DatabaseSeeder();
