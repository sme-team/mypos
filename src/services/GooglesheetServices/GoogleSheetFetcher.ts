import { defaultAxios, handleAxiosError } from '../ServicesConfig/axiosConfig';
import * as XLSX from 'xlsx';
import {createModuleLogger, AppModules} from '../../logger';

const logger = createModuleLogger(AppModules.GOOGLE_SHEET_FETCHER);

// Interface cho input params
interface FetchOptions {
  link: string; // URL Google Sheets public
  sheets?: string[]; // Mảng tên sheets cụ thể (optional)
  timeout?: number; // Timeout cho request (ms)
  retries?: number; // Số lần retry khi fail
}

// Interface cho output data của một sheet
interface SheetData {
  [key: string]: any; // Object động dựa trên headers
}

// Interface cho kết quả tổng thể
interface FetchResult {
  success: boolean;
  sheetId: string;
  totalSheets: number;
  data: { [sheetName: string]: SheetData[] };
  summary: { [sheetName: string]: number };
  timestamp: string;
  error?: string; // Optional cho lỗi
}

// Interface cho progress callback
interface ProgressCallback {
  (progress: { loaded: number; total: number; percent: number }): void;
}

class GoogleSheetFetcher {
  private readonly defaultTimeout: number = 30000; // 30s
  private readonly defaultRetries: number = 3;

  constructor() { }

  // Method private: Trích xuất Sheet ID từ URL (pure function)
  private extractSheetId(url: string): string {
    // Support nhiều format URL của Google Sheets
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /docs\.google\.com\/.*\/([a-zA-Z0-9-_]{20,})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    throw new Error('Invalid Google Sheets URL. Please provide a valid public Google Sheets link.');
  }

  // Method private: Tải file XLSX từ Google Sheets với retry logic
  private async downloadExcelFile(
    sheetId: string,
    timeout: number = this.defaultTimeout,
    retries: number = this.defaultRetries,
    onProgress?: ProgressCallback
  ): Promise<ArrayBuffer> {
    const downloadUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    logger.debug(`Downloading Excel file from: ${downloadUrl}`);

    let lastError: Error;
    // Clone axios instance để customize responseType
    const axiosInstance = defaultAxios; // Sử dụng instance chung

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.debug(`Download attempt ${attempt}/${retries}`);

        const response = await axiosInstance.get(downloadUrl, {
          responseType: 'arraybuffer', // Customize ở đây
          timeout,
          onDownloadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress({ loaded: progressEvent.loaded, total: progressEvent.total, percent });
            }
          },
        });

        // Kiểm tra response validity
        if (!response.data || response.data.byteLength === 0) {
          throw new Error('Downloaded file is empty');
        }

        // Kiểm tra content type nếu có
        const contentType = response.headers['content-type'];
        if (contentType && !contentType.includes('spreadsheet') && !contentType.includes('excel')) {
          logger.warn('Content type may not be Excel format', { contentType });
        }

        logger.info(`Successfully downloaded ${response.data.byteLength} bytes on attempt ${attempt}`);
        return response.data;

      } catch (error) {
        lastError = error as Error;
        const standardizedError = handleAxiosError(error); // Chuẩn hóa lỗi
        logger.warn(`Download attempt ${attempt} failed`, { error: standardizedError.message });

        // Nếu không phải lần cuối, đợi trước khi retry
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          logger.debug(`Waiting ${delay}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    // throw handleAxiosError(lastError); // Throw lỗi chuẩn hóa
    throw new Error(`Failed to download after ${retries} attempts. Last error: ${lastError!.message}`);
  }

  // Method private: Validate và clean headers
  private cleanHeaders(headers: any[]): string[] {
    return headers.map((header, headerIndex) => {
      if (header == null || header === '') {
        return `Column_${headerIndex + 1}`;
      }

      const cleanHeader = String(header).trim()
        .replace(/[\n\r\t]/g, ' ') // Replace line breaks with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[^\w\s-_.]/g, ''); // Remove special characters except common ones

      return cleanHeader || `Column_${headerIndex + 1}`;
    });
  }

  // Method private: Xử lý dữ liệu từ một sheet (optimized)
  private processSheetData(worksheet: XLSX.WorkSheet, sheetName: string): SheetData[] {
    try {
      logger.debug(`Processing sheet: ${sheetName}`);

      // Sử dụng header: 1 để lấy raw array, nhưng sau đó map đúng tên cột
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        blankrows: false,
      });

      logger.debug(`Raw data has ${rawData.length} rows`, { sheetName });

      if (rawData.length < 2) {
        logger.warn(`Sheet ${sheetName} has insufficient rows`);
        return [];
      }

      // Lấy và clean headers từ dòng đầu tiên
      let headers: string[] = this.cleanHeaders(rawData[0] || []);
      logger.debug('Headers found', { sheetName, headers: headers.slice(0, 8) });

      if (headers.length === 0) return [];

      // ✅ CẢI TIẾN: Tìm dòng bắt đầu dữ liệu (skip metadata) - LOGIC MỚI
      let dataStartIndex = 1;
      const metadataKeywords = [
        // English (cũ)
        'mã định danh', 'uuid', 'tự sinh', 'khóa chính',
        'kiểu dữ liệu', 'varchar', 'mô tả',
        // ✅ Thêm: tiếng Việt mô tả cột
        'mã ', 'họ và tên', 'số ', 'tên ',   // prefix mô tả
        'fk →', 'fk->', 'null =',            // ghi chú FK
        'integer', 'decimal', 'boolean',     // thêm kiểu dữ liệu
        'timestamp', 'text', 'primary key',
      ];

      for (let i = 1; i < Math.min(10, rawData.length); i++) {
        const firstCell = String(rawData[i][0] || '').trim().toLowerCase();

        // ✅ Fix: kiểm tra NHIỀU cell trong row, không chỉ cell đầu
        const rowAsString = rawData[i]
          .slice(0, 5)
          .map(c => String(c || '').toLowerCase())
          .join(' ');

        const isMetadata = metadataKeywords.some(k => firstCell.includes(k))
          || /^(mã |họ |số |tên |ngày )/.test(firstCell)  // prefix VN phổ biến
          || rowAsString.includes('fk →')
          || rowAsString.includes('fk->')
          || rowAsString.includes('varchar');

        if (isMetadata) {
          dataStartIndex = i + 1;
          logger.trace(`Skipping metadata row ${i}: "${firstCell.slice(0, 40)}"`);
        } else if (rawData[i].some(cell => String(cell || '').trim() !== '')) {
          break;
        }
      }

      logger.debug(`Data starts from row ${dataStartIndex + 1}`, { sheetName });

      // Xử lý thành object với key = header thực tế
      const jsonData: SheetData[] = [];
      for (let i = dataStartIndex; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const rowObject: SheetData = {};
        let hasValidData = false;

        for (let j = 0; j < headers.length; j++) {
          const header = headers[j];
          if (!header) continue;

          let value: any = j < row.length ? row[j] : null;

          if (value !== null && value !== '') {
            const strVal = String(value).trim();

            // Giữ nguyên boolean vì seeder cần biết true/false
            if (strVal.toLowerCase() === 'true') value = true;
            else if (strVal.toLowerCase() === 'false') value = false;
            // Tất cả còn lại giữ nguyên string — seeder tự xử lý
            else value = strVal;

            hasValidData = true;
          }

          rowObject[header] = value;
        }

        if (hasValidData) {
          jsonData.push(rowObject);
        }
      }

      logger.info(`Processed ${jsonData.length} rows from sheet ${sheetName}`);
      return jsonData;
    } catch (error) {
      logger.error(`Error processing sheet ${sheetName}`, { error: (error as Error).message });
      return [];
    }
  }

  // Method public: Fetch specific sheets
  public async fetchSheets(options: FetchOptions, onProgress?: ProgressCallback): Promise<FetchResult> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!options.link || typeof options.link !== 'string') {
        throw new Error('Invalid link provided');
      }

      const sheetId = this.extractSheetId(options.link);
      logger.debug(`Extracted Sheet ID: ${sheetId}`);

      const timeout = options.timeout || this.defaultTimeout;
      const retries = options.retries || this.defaultRetries;

      // Download Excel file
      const excelBuffer = await this.downloadExcelFile(sheetId, timeout, retries, onProgress);

      // Read workbook
      const workbook = XLSX.read(excelBuffer, {
        type: 'array',
        cellDates: true, // Auto parse dates
        cellNF: false, // Don't format numbers
        cellText: false, // Don't convert to text
      });

      const availableSheets = workbook.SheetNames;
      logger.debug(`Workbook contains ${availableSheets.length} sheets`, { sheets: availableSheets });

      if (availableSheets.length === 0) {
        throw new Error('No sheets found in the workbook');
      }

      // Determine which sheets to process
      const sheetsToProcess = options.sheets && options.sheets.length > 0
        ? options.sheets.filter(sheet => availableSheets.includes(sheet))
        : availableSheets;

      if (sheetsToProcess.length === 0) {
        throw new Error('No valid sheets found to process');
      }

      logger.info(`Processing ${sheetsToProcess.length} sheets`, { sheets: sheetsToProcess });

      // Process each sheet
      const result: { [sheetName: string]: SheetData[] } = {};

      for (const sheetName of sheetsToProcess) {
        try {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) {
            logger.warn(`Sheet "${sheetName}" not found in workbook`);
            result[sheetName] = [];
            continue;
          }

          const data = this.processSheetData(worksheet, sheetName);
          result[sheetName] = data;

        } catch (error) {
          logger.error(`Error processing sheet "${sheetName}"`, { error: (error as Error).message });
          result[sheetName] = [];
        }
      }

      // Generate summary
      const summary: { [sheetName: string]: number } = {};
      let totalRecords = 0;

      Object.keys(result).forEach(sheetName => {
        const count = result[sheetName].length;
        summary[sheetName] = count;
        totalRecords += count;
      });

      const processingTime = Date.now() - startTime;
      logger.info(`Fetch completed`, { processingTime, totalRecords, summary });

      return {
        success: true,
        sheetId,
        totalSheets: Object.keys(result).length,
        data: result,
        summary,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`Fetch failed after ${processingTime}ms`, { error: (error as Error).message });

      return {
        success: false,
        sheetId: '',
        totalSheets: 0,
        data: {},
        summary: {},
        timestamp: new Date().toISOString(),
        error: (error as Error).message || 'Failed to fetch Google Sheets data',
      };
    }
  }

  // Method public: Fetch all sheets (legacy compatibility)
  public async fetchAllSheets(options: FetchOptions): Promise<FetchResult> {
    return this.fetchSheets(options);
  }

  // Method public: Validate URL without fetching
  public validateUrl(url: string): boolean {
    try {
      this.extractSheetId(url);
      return true;
    } catch {
      return false;
    }
  }

  // Method public: Get available sheets names only
  public async getSheetNames(url: string): Promise<string[]> {
    try {
      const sheetId = this.extractSheetId(url);
      const excelBuffer = await this.downloadExcelFile(sheetId);
      const workbook = XLSX.read(excelBuffer, { type: 'array' });
      return workbook.SheetNames;
    } catch (error) {
      logger.error('Failed to get sheet names', { error: (error as Error).message });
      return [];
    }
  }
}

export default GoogleSheetFetcher;
export type { FetchOptions, SheetData, FetchResult, ProgressCallback };
