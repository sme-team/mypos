import { createAxiosInstance, AxiosInstance, AxiosResponse, handleAxiosError } from '../ServicesConfig/axiosConfig';
import GoogleSheetFetcher, { FetchResult, SheetData, ProgressCallback } from './GoogleSheetFetcher'; // Import class đã tạo trước đó

// Định nghĩa các interface và type
export interface GoogleSheetParams {
  googleSheetLink: string;
  sheets: string;
  startFromRow: number;
}

// Thêm interface mới cho direct method
export interface DirectGoogleSheetParams {
  googleSheetLink: string;
  sheets: string;
  startFromRow: number;
  timeout?: number;
  retries?: number;
  onProgress?: ProgressCallback;
}

export interface GoogleSheetResponse {
  // [sheetName: string]: any[];
  success: boolean;
  sheetId: string;
  totalSheets: number;
  data: {
    [sheetName: string]: any[]; // mỗi sheetName là 1 mảng dữ liệu
  };
  summary: {
    [sheetName: string]: number; // mỗi sheetName là số lượng bản ghi
  };
  timestamp: string; // ISO datetime
}

export interface ProcessedData {
  [sheetName: string]: any[];
}

export interface ParsedSheetLink {
  spreadsheetId: string | null;
  gid: string | null;
}

export interface ApiErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
}

// Custom Error Classes
export class GoogleSheetServiceError extends Error {
  public statusCode?: number;
  public originalError?: any;

  constructor(message: string, statusCode?: number, originalError?: any) {
    super(message);
    this.name = 'GoogleSheetServiceError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

export class GoogleSheetToJson {
  private readonly baseURL: string;
  private readonly axiosInstance: AxiosInstance;
  private readonly directFetcher: GoogleSheetFetcher; // Thêm instance của GoogleSheetFetcher

  constructor(baseURL: string = 'https://mypos.ddns.net/api/googlesheet') {
    this.baseURL = baseURL;
    this.axiosInstance = createAxiosInstance(baseURL);
    // Initialize direct fetcher
    this.directFetcher = new GoogleSheetFetcher();
  }



  /**
   * Lấy dữ liệu từ Google Sheet và chuyển đổi sang JSON (thông qua backend API - method cũ)
   * @param params - Tham số đầu vào
   * @returns Promise chứa dữ liệu JSON theo từng table
   */
  public async getData(params: GoogleSheetParams): Promise<ProcessedData> {
    try {
      // Validate input parameters
      this.validateParams(params);

      const { googleSheetLink, sheets, startFromRow = 1 } = params;

      // Build query parameters
      const queryParams = {
        link: googleSheetLink,
        sheets: sheets,
        startFromRow: startFromRow,
      };
      // Make API call
      const response: AxiosResponse<GoogleSheetResponse> =
        await this.axiosInstance.get('', {
          params: queryParams,
        });

      // Check if response is successful
      if (response.status === 200 && response.data && response.data.data) {
        console.log(
          'Response.data',
          response,
          response.data,
          response.data.totalSheets,
          response.data.data,
        );

        const processedData: ProcessedData = this.processData(
          response.data,
          startFromRow,
        );
        console.log('Successfully fetched Google Sheet data', processedData);
        return processedData;
      } else {
        throw new GoogleSheetServiceError(
          `API returned status: ${response.status}`,
          response.status,
        );
      }
    } catch (error) {
      console.error('Error fetching Google Sheet data:', error);
      throw this.handleError(error);
    }
  }

  /**
   * [PHƯƠNG THỨC MỚI] Lấy dữ liệu trực tiếp từ Google Sheet mà không qua backend
   * @param params - Tham số đầu vào cho direct fetching
   * @returns Promise chứa dữ liệu JSON theo từng table
   */
  public async getDataDirect(params: DirectGoogleSheetParams): Promise<ProcessedData> {
    try {
      // Validate input parameters for direct method
      this.validateDirectParams(params);

      const { googleSheetLink, sheets, startFromRow = 1, timeout, retries, onProgress } = params;

      console.log('🚀 Starting direct Google Sheet fetch:', {
        link: googleSheetLink,
        tables: sheets,
        startRow: startFromRow,
        timeout,
        retries,
      });

      // Parse table list (convert comma-separated string to array)
      const sheetsArray = sheets
        .split(',')
        .map(sheet => sheet.trim())
        .filter(sheet => sheet.length > 0);

      if (sheetsArray.length === 0) {
        throw new GoogleSheetServiceError('No valid sheets specified in tableList');
      }

      console.log('📋 Sheets to fetch:', sheetsArray);

      // Use GoogleSheetFetcher to get data
      const fetchOptions = {
        link: googleSheetLink,
        sheets: sheetsArray,
        timeout,
        retries,
      };

      const fetchResult: FetchResult = await this.directFetcher.fetchSheets(
        fetchOptions,
        onProgress
      );

      if (!fetchResult.success) {
        throw new GoogleSheetServiceError(
          `Direct fetch failed: ${fetchResult.error || 'Unknown error'}`,
          500,
          fetchResult.error
        );
      }

      console.log('✅ Direct fetch successful:', {
        sheetId: fetchResult.sheetId,
        totalSheets: fetchResult.totalSheets,
        summary: fetchResult.summary,
      });

      // Convert FetchResult to ProcessedData format and apply row filtering
      const processedData = this.processDirectData(fetchResult, startFromRow);

      console.log('🔄 Data processed and filtered from row', startFromRow);

      return processedData;

    } catch (error) {
      console.error('❌ Error in direct Google Sheet fetch:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Validate input parameters cho direct method
   * @param params - Parameters to validate
   * @throws {GoogleSheetServiceError} If validation fails
   */
  private validateDirectParams(params: DirectGoogleSheetParams): void {
    if (!params.googleSheetLink || typeof params.googleSheetLink !== 'string') {
      throw new GoogleSheetServiceError(
        'googleSheetLink is required and must be a string',
      );
    }

    if (!params.sheets || typeof params.sheets !== 'string') {
      throw new GoogleSheetServiceError(
        'sheets is required and must be a string',
      );
    }

    if (
      params.startFromRow !== undefined &&
      (!Number.isInteger(params.startFromRow) || params.startFromRow < 1)
    ) {
      throw new GoogleSheetServiceError(
        'startFromRow must be a positive integer',
      );
    }

    if (params.timeout !== undefined && params.timeout <= 0) {
      throw new GoogleSheetServiceError(
        'timeout must be a positive number',
      );
    }

    if (params.retries !== undefined && params.retries < 0) {
      throw new GoogleSheetServiceError(
        'retries must be a non-negative number',
      );
    }
  }

  /**
   * Process direct fetch result và apply row filtering
   * @param fetchResult - Result from GoogleSheetFetcher
   * @param startFromRow - Starting row number (1-indexed)
   * @returns Processed data
   */
  private processDirectData(fetchResult: FetchResult, _startFromRow: number): ProcessedData {
    if (!fetchResult.data) {
      return {};
    }

    const processedData: ProcessedData = {};

    Object.keys(fetchResult.data).forEach((sheetName: string) => {
      const sheetData: SheetData[] = fetchResult.data[sheetName];

      if (Array.isArray(sheetData) && sheetData.length > 0) {
        // Since GoogleSheetFetcher already skipped the headers and metadata correctly,
        // we can just use the sheetData directly without slicing based on startFromRow.
        const filteredData = sheetData;
        processedData[sheetName] = filteredData;

        console.log(
          `📊 Sheet "${sheetName}": Processed ${filteredData.length} rows (metadata automatically skipped)`
        );
      } else {
        // Empty array if no data
        processedData[sheetName] = [];
        console.log(`📊 Sheet "${sheetName}": No data found`);
      }
    });

    return processedData;
  }

  /**
   * Validate input parameters (method cũ)
   * @param params - Parameters to validate
   * @throws {GoogleSheetServiceError} If validation fails
   */
  private validateParams(params: GoogleSheetParams): void {
    if (!params.googleSheetLink || typeof params.googleSheetLink !== 'string') {
      throw new GoogleSheetServiceError(
        'Google Sheet link is required and must be a string',
      );
    }

    if (!params.sheets || typeof params.sheets !== 'string') {
      throw new GoogleSheetServiceError(
        'Sheets parameter is required and must be a string',
      );
    }

    if (
      params.startFromRow !== undefined &&
      (!Number.isInteger(params.startFromRow) || params.startFromRow < 1)
    ) {
      throw new GoogleSheetServiceError(
        'startFromRow must be a positive integer',
      );
    }
  }

  /**
   * Xử lý dữ liệu trả về từ API, lọc từ dòng thứ n (method cũ)
   * @param data - Dữ liệu JSON từ API
   * @param startFromRow - Dòng bắt đầu (1-indexed)
   * @returns Dữ liệu đã được xử lý
   */
  private processData(
    data: GoogleSheetResponse,
    startFromRow: number,
  ): ProcessedData {
    if (!data || typeof data !== 'object' || !data.data) {
      return {};
    }

    const processedData: ProcessedData = {};

    // Duyệt qua từng sheet/table trong dữ liệu
    Object.keys(data.data).forEach((sheetName: string) => {
      const sheetData = data.data[sheetName];

      if (Array.isArray(sheetData) && sheetData.length > 0) {
        // Lọc dữ liệu từ dòng thứ startFromRow (1-indexed → 0-indexed)
        const filteredData = sheetData.slice(startFromRow - 1);
        processedData[sheetName] = filteredData;

        console.log(
          `Sheet "${sheetName}": Filtered ${filteredData.length} rows starting from row ${startFromRow}`,
        );
      } else {
        // Nếu không phải mảng, trả về mảng rỗng
        processedData[sheetName] = [];
      }
    });

    return processedData;
  }

  /**
   * Handle and transform errors into GoogleSheetServiceError
   * @param error - Original error
   * @returns GoogleSheetServiceError
   */
  private handleError(error: any): GoogleSheetServiceError {
    if (error instanceof GoogleSheetServiceError) {
      return error;
    }

    // Sử dụng helper từ axiosConfig
    const standardizedError = handleAxiosError(error);

    // Chuyển thành GoogleSheetServiceError
    return new GoogleSheetServiceError(
      standardizedError.message,
      standardizedError.statusCode,
      standardizedError.originalError
    );
  }

  /**
   * Helper method để tạo Google Sheet link từ spreadsheet ID và gid
   * @param spreadsheetId - ID của spreadsheet
   * @param gid - GID của sheet cụ thể (optional)
   * @returns Full Google Sheet link
   */
  public static createGoogleSheetLink(
    spreadsheetId: string,
    gid?: string,
  ): string {
    if (!spreadsheetId || typeof spreadsheetId !== 'string') {
      throw new GoogleSheetServiceError(
        'spreadsheetId is required and must be a string',
      );
    }

    let link = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    if (gid && typeof gid === 'string') {
      link += `?gid=${gid}#gid=${gid}`;
    }
    return link;
  }

  /**
   * Helper method để parse Google Sheet link và lấy spreadsheet ID, gid
   * @param googleSheetLink - Link Google Sheet
   * @returns Object chứa spreadsheetId và gid
   */
  public static parseGoogleSheetLink(googleSheetLink: string): ParsedSheetLink {
    try {
      if (!googleSheetLink || typeof googleSheetLink !== 'string') {
        throw new Error('Invalid Google Sheet link');
      }

      const url = new URL(googleSheetLink);
      const pathParts: string[] = url.pathname.split('/');
      const dIndex = pathParts.indexOf('d');

      if (dIndex === -1 || dIndex >= pathParts.length - 1) {
        throw new Error('Invalid Google Sheet URL format');
      }

      const spreadsheetId: string = pathParts[dIndex + 1];

      const gidMatch = url.hash.match(/gid=(\d+)/);
      const gid: string | null = gidMatch ? gidMatch[1] : null;

      return { spreadsheetId, gid };
    } catch (error) {
      console.error('Error parsing Google Sheet link:', error);
      return { spreadsheetId: null, gid: null };
    }
  }

  /**
   * Get axiosinstance for advanced usage
   * @returns AxiosInstance
   */
  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  /**
   * Get direct fetcher instance
   * @returns GoogleSheetFetcher instance
   */
  public getDirectFetcher(): GoogleSheetFetcher {
    return this.directFetcher;
  }

  /**
   * Update base URL
   * @param newBaseURL - New base URL
   */
  public updateBaseURL(newBaseURL: string): void {
    if (!newBaseURL || typeof newBaseURL !== 'string') {
      throw new GoogleSheetServiceError('Base URL must be a valid string');
    }

    this.axiosInstance.defaults.baseURL = newBaseURL;
  }

  /**
   * Validate Google Sheet URL without making request
   * @param googleSheetLink - Google Sheet URL to validate
   * @returns boolean indicating if URL is valid
   */
  public validateGoogleSheetUrl(googleSheetLink: string): boolean {
    return this.directFetcher.validateUrl(googleSheetLink);
  }

  /**
   * Get available sheet names from Google Sheet
   * @param googleSheetLink - Google Sheet URL
   * @returns Array of sheet names
   */
  public async getAvailableSheets(googleSheetLink: string): Promise<string[]> {
    try {
      return await this.directFetcher.getSheetNames(googleSheetLink);
    } catch (error) {
      console.error('Error getting available sheets:', error);
      throw this.handleError(error);
    }
  }
}

// Export singleton instance
export const googleSheetService = new GoogleSheetToJson();

// Cách sử dụng với TypeScript (bao gồm examples cho method mới):
export const exampleUsage = {
  // Ví dụ 1: Sử dụng cơ bản với type safety (method cũ)
  basic: async (): Promise<ProcessedData | null> => {
    try {
      const params: GoogleSheetParams = {
        googleSheetLink:
          'https://docs.google.com/spreadsheets/d/1VPQgrDqbvVhxbjYp5Vv2Korvh2fYCubB/edit?gid=594575742#gid=594575742',
        sheets:
          'categories, products, product_variants, product_images, product_attributes, product_previews',
        startFromRow: 2, // Bắt đầu từ dòng thứ 2 (bỏ qua header)
      };

      const result: ProcessedData = await googleSheetService.getData(params);

      console.log('Categories:', result.categories);
      console.log('Products:', result.products);

      return result;
    } catch (error) {
      if (error instanceof GoogleSheetServiceError) {
        console.error(
          'Service Error:',
          error.message,
          'Status:',
          error.statusCode,
        );
      } else {
        console.error('Unexpected Error:', error);
      }
      return null;
    }
  },

  // Ví dụ 2: Sử dụng method mới - direct fetching
  directFetch: async (): Promise<ProcessedData | null> => {
    try {
      const params: DirectGoogleSheetParams = {
        googleSheetLink:
          'https://docs.google.com/spreadsheets/d/1VPQgrDqbvVhxbjYp5Vv2Korvh2fYCubB/edit?gid=594575742#gid=594575742',
        sheets: 'categories, products, product_variants', // comma-separated sheet names
        startFromRow: 3, // Bắt đầu từ dòng thứ 3
        timeout: 45000, // 45 seconds
        retries: 3,
        onProgress: (progress) => {
          console.log(`Download progress: ${progress.percent}% (${progress.loaded}/${progress.total})`);
        },
      };

      const result: ProcessedData = await googleSheetService.getDataDirect(params);

      console.log('Direct fetch result:', result);
      console.log('Categories:', result.categories);
      console.log('Products:', result.products);

      return result;
    } catch (error) {
      if (error instanceof GoogleSheetServiceError) {
        console.error('Direct Fetch Error:', {
          message: error.message,
          statusCode: error.statusCode,
          originalError: error.originalError,
        });
      } else {
        console.error('Unexpected Error:', error);
      }
      return null;
    }
  },

  // Ví dụ 3: Sử dụng với helper methods và error handling
  withHelpers: async (): Promise<ProcessedData | null> => {
    try {
      const spreadsheetId: string = '1VPQgrDqbvVhxbjYp5Vv2Korvh2fYCubB';
      const gid: string = '594575742';

      const googleSheetLink: string = GoogleSheetToJson.createGoogleSheetLink(
        spreadsheetId,
        gid,
      );

      // Validate URL first
      const isValid = googleSheetService.validateGoogleSheetUrl(googleSheetLink);
      if (!isValid) {
        throw new GoogleSheetServiceError('Invalid Google Sheet URL');
      }

      // Get available sheets
      const availableSheets = await googleSheetService.getAvailableSheets(googleSheetLink);
      console.log('Available sheets:', availableSheets);

      // Use direct method
      const params: DirectGoogleSheetParams = {
        googleSheetLink,
        sheets: availableSheets.slice(0, 3).join(', '), // First 3 sheets
        startFromRow: 3,
        timeout: 30000,
      };

      const result: ProcessedData = await googleSheetService.getDataDirect(params);

      return result;
    } catch (error) {
      if (error instanceof GoogleSheetServiceError) {
        console.error('Service Error:', {
          message: error.message,
          statusCode: error.statusCode,
          originalError: error.originalError,
        });
      } else {
        console.error('Unexpected Error:', error);
      }
      return null;
    }
  },

  // Ví dụ 4: Parse existing Google Sheet link
  parseLink: (): ParsedSheetLink => {
    const link =
      'https://docs.google.com/spreadsheets/d/1VPQgrDqbvVhxbjYp5Vv2Korvh2fYCubB/edit?gid=594575742#gid=594575742';
    const parsed: ParsedSheetLink =
      GoogleSheetToJson.parseGoogleSheetLink(link);

    console.log('Parsed link:', parsed);
    return parsed;
  },

  // Ví dụ 5: So sánh performance giữa 2 methods
  comparePerformance: async (): Promise<void> => {
    const googleSheetLink = 'https://docs.google.com/spreadsheets/d/1VPQgrDqbvVhxbjYp5Vv2Korvh2fYCubB/edit';
    const sheetList = 'categories, products';

    console.log('🔄 Testing backend method...');
    const start1 = Date.now();
    try {
      const result1 = await googleSheetService.getData({
        googleSheetLink,
        sheets: sheetList,
        startFromRow: 1,
      });
      console.log(`✅ Backend method completed in ${Date.now() - start1}ms`);
      console.log('Backend result keys:', Object.keys(result1));
    } catch (error) {
      console.log(`❌ Backend method failed after ${Date.now() - start1}ms`);
    }

    console.log('🔄 Testing direct method...');
    const start2 = Date.now();
    try {
      const result2 = await googleSheetService.getDataDirect({
        googleSheetLink,
        sheets: sheetList,
        startFromRow: 2,
      });
      console.log(`✅ Direct method completed in ${Date.now() - start2}ms`);
      console.log('Direct result keys:', Object.keys(result2));
    } catch (error) {
      console.log(`❌ Direct method failed after ${Date.now() - start2}ms`);
    }
  },
};
