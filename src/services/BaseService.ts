import { SQLiteDAO, QueryTable } from '../database/SQLiteDAO';
import DatabaseManager from '../database/DBManagers';

export interface WhereClause {
    name: string;
    value: any;
    operator?: string;
}

export interface OrderByClause {
    name: string;
    order?: 'ASC' | 'DESC';
}

export interface LimitOffset {
    limit?: number;
    offset?: number;
}

export interface ServiceStatus {
    schemaName: string;
    isOpened: boolean;
    isInitialized: boolean;
    hasDao: boolean;
}

export interface HealthCheckResult {
    healthy: boolean;
    schemaName: string;
    recordCount?: number;
    error?: string;
    timestamp: string;
}

export interface FindOptions {
    orderBy?: OrderByClause[];
    limit?: number;
    offset?: number;
    columns?: string[];
}

export type ErrorHandler = (error: Error) => void;
export type EventHandler = (data: any) => void;

export class BaseService {
    protected schemaName: string;
    protected tableName: string;
    protected dao: SQLiteDAO | null = null;
    protected isOpened: boolean = false;
    protected isInitialized: boolean = false;
    protected errorHandlers: Map<string, ErrorHandler> = new Map();
    protected eventListeners: Map<string, EventHandler[]> = new Map();
    protected primaryKeyFields: string[] = ['id'];
    private cache: Map<string, any> = new Map();
    private reconnectHandler: (dao: SQLiteDAO) => void;

    constructor(schemaName: string, tableName?: string) {
        this.schemaName = schemaName;
        this.tableName = tableName || schemaName;
        console.log(
            `[BaseService][constructor] Creating service for schema: ${schemaName}, table: ${this.tableName}`,
        );

        //-----------------------------------
        // Đăng ký listener để update DAO khi database reconnect
        this.reconnectHandler = (newDao: SQLiteDAO) => {
            console.log(
                `[BaseService][reconnectHandler] Updating DAO for schema: ${schemaName}`,
            );
            this.dao = newDao;
            console.log(
                `[BaseService][reconnectHandler] DAO updated successfully for schema: ${schemaName}`,
            );
        };

        DatabaseManager.onDatabaseReconnect(schemaName, this.reconnectHandler);
        console.log(
            `[BaseService][constructor] Reconnect listener registered for schema: ${schemaName}`,
        );
        //-----------------------------------

        this.bindMethods();
    }

    private bindMethods(): void {
        console.log(
            `[BaseService][bindMethods] Binding methods for schema: ${this.schemaName}`,
        );
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
        methods.forEach(method => {
            if (
                typeof (this as any)[method] === 'function' &&
                method !== 'constructor'
            ) {
                (this as any)[method] = (this as any)[method].bind(this);
            }
        });
        console.log(
            `[BaseService][bindMethods] Methods bound successfully for schema: ${this.schemaName}`,
        );
    }

    setPrimaryKeyFields(fields: string[]): this {
        console.log(
            `[BaseService][setPrimaryKeyFields] Setting primary key fields for schema: ${this.schemaName
            }, fields: ${JSON.stringify(fields)}`,
        );
        this.primaryKeyFields = fields;
        return this;
    }

    async init(): Promise<this> {
        console.log(
            `[BaseService][init] Initializing service for schema: ${this.schemaName}, table: ${this.tableName}`,
        );
        try {
            if (this.isInitialized) {
                console.log(
                    `[BaseService][init] Service already initialized for schema: ${this.schemaName}`,
                );
                return this;
            }
            this.dao = (await DatabaseManager.getLazyLoading(
                this.schemaName,
            )) as SQLiteDAO;
            console.log(
                `[BaseService][init] DAO obtained successfully for schema: ${this.schemaName}`,
            );
            if (!this.dao) {
                throw new Error(
                    `Failed to initialize DAO for schema: ${this.schemaName}`,
                );
            }
            if (!this.dao.isConnected()) {
                await this.dao.connect();
            }
            this.isOpened = true;
            this.isInitialized = true;
            this._emit('initialized', { schemaName: this.schemaName });
            console.log(
                `[BaseService][init] Service initialized successfully for schema: ${this.schemaName}`,
            );
            return this;
        } catch (error) {
            console.error(
                `[BaseService][init] Error initializing schema ${this.schemaName}:`,
                (error as Error).stack,
            );
            this._handleError('INIT_ERROR', error as Error);
            throw error;
        }
    }

    protected buildSelectTable(
        conditions: Record<string, any> = {},
        options: FindOptions = {},
    ): QueryTable {
        console.log(
            `[BaseService][buildSelectTable] Building select query for schema: ${this.schemaName
            }, conditions: ${JSON.stringify(conditions)}, options: ${JSON.stringify(
                options,
            )}`,
        );
        const queryTable: QueryTable = {
            name: this.tableName,
            cols: [],
            wheres: [],
            orderbys: options.orderBy || [],
            limitOffset: {},
        };

        if (options.columns && options.columns.length > 0) {
            queryTable.cols = options.columns.map(name => ({ name }));
            console.log(
                `[BaseService][buildSelectTable] Selected columns: ${JSON.stringify(
                    options.columns,
                )}`,
            );
        }

        if (conditions && Object.keys(conditions).length > 0) {
            queryTable.wheres = Object.entries(conditions).map(([key, value]) => ({
                name: key,
                value,
                operator: '=',
            }));
            console.log(
                `[BaseService][buildSelectTable] Where conditions: ${JSON.stringify(
                    queryTable.wheres,
                )}`,
            );
        }

        if (options.limit !== undefined) {
            queryTable.limitOffset!.limit = options.limit;
            console.log(
                `[BaseService][buildSelectTable] Limit set: ${options.limit}`,
            );
        }
        if (options.offset !== undefined) {
            queryTable.limitOffset!.offset = options.offset;
            console.log(
                `[BaseService][buildSelectTable] Offset set: ${options.offset}`,
            );
        }

        console.log(
            `[BaseService][buildSelectTable] Query table built: ${JSON.stringify(
                queryTable,
            )}`,
        );
        return queryTable;
    }

    protected buildDataTable(data: Record<string, any>): QueryTable {
        console.log(
            `[BaseService][buildDataTable] Building data table for schema: ${this.schemaName
            }, data: ${JSON.stringify(data)}`,
        );
        const queryTable = this.dao!.convertJsonToQueryTable(
            this.tableName,
            data,
            this.primaryKeyFields,
        );
        console.log(
            `[BaseService][buildDataTable] Data table built: ${JSON.stringify(
                queryTable,
            )}`,
        );
        return queryTable;
    }

    async findAll(
        conditions: Record<string, any> = {},
        options: FindOptions = {},
    ): Promise<any[]> {
        console.log(
            `[BaseService][findAll] Finding all records for schema: ${this.schemaName
            }, conditions: ${JSON.stringify(conditions)}, options: ${JSON.stringify(
                options,
            )}`,
        );
        await this._ensureInitialized();
        try {
            const queryTable = this.buildSelectTable(conditions, options);
            const result = await this.dao!.selectAll(queryTable);
            console.log(
                `[BaseService][findAll] Found ${result.length} records for schema: ${this.schemaName}`,
            );
            this._emit('dataFetched', { operation: 'findAll', count: result.length });
            return result;
        } catch (error) {
            console.error(
                `[BaseService][findAll] Error in findAll for schema ${this.schemaName}:`,
                (error as Error).stack,
            );
            this._handleError('FIND_ALL_ERROR', error as Error);
            throw error;
        }
    }

    async findById(id: string | number): Promise<any> {
        console.log(
            `[BaseService][findById] Finding record by ID: ${id} for schema: ${this.schemaName}`,
        );
        await this._ensureInitialized();
        try {
            if (!id) {
                throw new Error('ID is required');
            }

            const conditions = { [this.primaryKeyFields[0]]: id };
            const queryTable = this.buildSelectTable(conditions);
            const result = await this.dao!.select(queryTable);
            console.log(
                `[BaseService][findById] Record found: ${JSON.stringify(result)}`,
            );
            this._emit('dataFetched', { operation: 'findById', id });
            return result;
        } catch (error) {
            console.error(
                `[BaseService][findById] Error finding by ID ${id} for schema ${this.schemaName}:`,
                (error as Error).stack,
            );
            this._handleError('FIND_BY_ID_ERROR', error as Error);
            throw error;
        }
    }

    async findFirst(conditions: Record<string, any> = {}): Promise<any> {
        console.log(
            `[BaseService][findFirst] Finding first record for schema: ${this.schemaName
            }, conditions: ${JSON.stringify(conditions)}`,
        );
        await this._ensureInitialized();
        try {
            const queryTable = this.buildSelectTable(conditions);
            const result = await this.dao!.select(queryTable);
            console.log(
                `[BaseService][findFirst] First record found: ${JSON.stringify(
                    result,
                )}`,
            );
            this._emit('dataFetched', { operation: 'findFirst' });
            return result;
        } catch (error) {
            console.error(
                `[BaseService][findFirst] Error in findFirst for schema ${this.schemaName}:`,
                (error as Error).stack,
            );
            this._handleError('FIND_FIRST_ERROR', error as Error);
            throw error;
        }
    }

    async create(data: Record<string, any>): Promise<any> {
        console.log(
            `[BaseService][create] Creating record for schema: ${this.schemaName
            }, data: ${JSON.stringify(data)}`,
        );
        await this._ensureInitialized();
        await this.ensureValidConnection(); // Kiểm tra connection trước khi thực hiện

        try {
            this._validateData(data);
            const queryTable = this.buildDataTable(data);
            await this.dao!.insert(queryTable);

            let result = data;
            if (data[this.primaryKeyFields[0]]) {
                result = await this.findById(data[this.primaryKeyFields[0]]);
                console.log(
                    `[BaseService][create] Created record retrieved: ${JSON.stringify(
                        result,
                    )}`,
                );
            }

            this._emit('dataCreated', { operation: 'create', data: result });
            console.log(
                `[BaseService][create] Record created successfully for schema: ${this.schemaName}`,
            );
            return result;
        } catch (error) {
            console.error(
                `[BaseService][create] Error creating record for schema ${this.schemaName}:`,
                (error as Error).stack,
            );
            this._handleError('CREATE_ERROR', error as Error);
            throw error;
        }
    }

    async update(
        id: string | number | undefined,
        data: Record<string, any>,
    ): Promise<any> {
        console.log(
            `[BaseService][update] Updating record with ID: ${id} for schema: ${this.schemaName
            }, data: ${JSON.stringify(data)}`,
        );
        await this._ensureInitialized();
        try {
            if (!id) {
                throw new Error('ID is required for update');
            }
            this._validateData(data);

            const updateData = {
                ...data,
                [this.primaryKeyFields[0]]: id,
            };

            const queryTable = this.buildDataTable(updateData);
            await this.dao!.update(queryTable);

            const result = await this.findById(id);
            console.log(
                `[BaseService][update] Updated record retrieved: ${JSON.stringify(
                    result,
                )}`,
            );
            this._emit('dataUpdated', { operation: 'update', id, data: result });
            console.log(
                `[BaseService][update] Record updated successfully for schema: ${this.schemaName}`,
            );
            return result;
        } catch (error) {
            console.error(
                `[BaseService][update] Error updating record with ID ${id} for schema ${this.schemaName}:`,
                (error as Error).stack,
            );
            this._handleError('UPDATE_ERROR', error as Error);
            throw error;
        }
    }

    async delete(id: string | number): Promise<boolean> {
        console.log(
            `[BaseService][delete] Deleting record with ID: ${id} for schema: ${this.schemaName}`,
        );
        await this._ensureInitialized();
        try {
            if (!id) {
                throw new Error('ID is required for delete');
            }

            const conditions = { [this.primaryKeyFields[0]]: id };
            const queryTable = this.buildSelectTable(conditions);

            await this.dao!.delete(queryTable);
            this._emit('dataDeleted', { operation: 'delete', id });
            console.log(
                `[BaseService][delete] Record deleted successfully for schema: ${this.schemaName}`,
            );
            return true;
        } catch (error) {
            console.error(
                `[BaseService][delete] Error deleting record with ID ${id} for schema ${this.schemaName}:`,
                (error as Error).stack,
            );
            this._handleError('DELETE_ERROR', error as Error);
            throw error;
        }
    }

    async bulkCreate(dataArray: Record<string, any>[]): Promise<any[]> {
        console.log(
            `[BaseService][bulkCreate] Bulk creating ${dataArray.length} records for schema: ${this.schemaName}`,
        );
        await this._ensureInitialized();
        try {
            if (!Array.isArray(dataArray) || dataArray.length === 0) {
                throw new Error('Data must be a non-empty array');
            }

            const results: any[] = [];

            await this.executeTransaction(async () => {
                for (const data of dataArray) {
                    console.log(
                        `[BaseService][bulkCreate] Processing record: ${JSON.stringify(
                            data,
                        )}`,
                    );
                    this._validateData(data);
                    const queryTable = this.buildDataTable(data);
                    await this.dao!.insert(queryTable);
                    results.push(data);
                }
            });

            console.log(
                `[BaseService][bulkCreate] Bulk created ${results.length} records for schema: ${this.schemaName}`,
            );
            this._emit('dataBulkCreated', {
                operation: 'bulkCreate',
                count: results.length,
            });
            return results;
        } catch (error) {
            console.error(
                `[BaseService][bulkCreate] Error in bulkCreate for schema ${this.schemaName}:`,
                (error as Error).stack,
            );
            this._handleError('BULK_CREATE_ERROR', error as Error);
            throw error;
        }
    }

    async count(conditions: Record<string, any> = {}): Promise<number> {
        console.log(
            `[BaseService][count] Counting records for schema: ${this.schemaName
            }, conditions: ${JSON.stringify(conditions)}`,
        );
        await this._ensureInitialized();
        try {
            const queryTable = this.buildSelectTable(conditions, {
                columns: ['COUNT(*) as count'],
            });
            const result = await this.dao!.select(queryTable);
            console.log(`[BaseService][count] Count result: ${result.count || 0}`);
            return result.count || 0;
        } catch (error) {
            console.error(
                `[BaseService][count] Error counting records for schema ${this.schemaName}:`,
                (error as Error).stack,
            );
            this._handleError('COUNT_ERROR', error as Error);
            throw error;
        }
    }

    async executeTransaction(callback: () => Promise<any>): Promise<any> {
        console.log(
            `[BaseService][executeTransaction] Starting transaction for schema: ${this.schemaName}`,
        );
        await this._ensureInitialized();
        try {
            await this.dao!.beginTransaction();
            const result = await callback();
            await this.dao!.commitTransaction();
            console.log(
                `[BaseService][executeTransaction] Transaction committed successfully for schema: ${this.schemaName}`,
            );
            this._emit('transactionCompleted', { operation: 'transaction' });
            return result;
        } catch (error) {
            console.error(
                `[BaseService][executeTransaction] Error in transaction for schema ${this.schemaName}:`,
                (error as Error).stack,
            );
            try {
                await this.dao!.rollbackTransaction();
                console.log(
                    `[BaseService][executeTransaction] Transaction rolled back for schema: ${this.schemaName}`,
                );
            } catch (rollbackError) {
                console.error(
                    `[BaseService][executeTransaction] Error rolling back transaction for schema ${this.schemaName}:`,
                    (rollbackError as Error).stack,
                );
                this._handleError('ROLLBACK_ERROR', rollbackError as Error);
            }
            this._handleError('TRANSACTION_ERROR', error as Error);
            throw error;
        }
    }

    async getAll(
        conditions: Record<string, any> = {},
        options: FindOptions = {},
    ): Promise<any[]> {
        console.log(
            `[BaseService][getAll] Calling findAll for schema: ${this.schemaName}`,
        );
        return this.findAll(conditions, options);
    }

    async getById(id: string | number): Promise<any> {
        console.log(
            `[BaseService][getById] Calling findById for schema: ${this.schemaName}, ID: ${id}`,
        );
        return this.findById(id);
    }

    async getFirst(conditions: Record<string, any> = {}): Promise<any> {
        console.log(
            `[BaseService][getFirst] Calling findFirst for schema: ${this.schemaName}`,
        );
        return this.findFirst(conditions);
    }

    on(event: string, handler: EventHandler): this {
        console.log(
            `[BaseService][on] Registering event handler for event: ${event}, schema: ${this.schemaName}`,
        );
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(handler);
        return this;
    }

    off(event: string, handler: EventHandler): this {
        console.log(
            `[BaseService][off] Removing event handler for event: ${event}, schema: ${this.schemaName}`,
        );
        const handlers = this.eventListeners.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
                console.log(
                    `[BaseService][off] Event handler removed for event: ${event}`,
                );
            }
        }
        return this;
    }

    protected _emit(event: string, data: any): void {
        console.log(
            `[BaseService][_emit] Emitting event: ${event}, data: ${JSON.stringify(
                data,
            )}`,
        );
        const handlers = this.eventListeners.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(
                        `[BaseService][_emit] Error in event handler for ${event}:`,
                        error,
                    );
                }
            });
        }
    }

    setErrorHandler(errorType: string, handler: ErrorHandler): this {
        console.log(
            `[BaseService][setErrorHandler] Setting error handler for errorType: ${errorType}, schema: ${this.schemaName}`,
        );
        this.errorHandlers.set(errorType, handler);
        return this;
    }

    protected _handleError(errorType: string, error: Error): void {
        console.error(
            `[BaseService][_handleError] Handling error for schema: ${this.schemaName}, errorType: ${errorType}, error: ${error.message}`,
        );
        const handler = this.errorHandlers.get(errorType);
        if (handler) {
            try {
                handler(error);
            } catch (handlerError) {
                console.error(
                    `[BaseService][_handleError] Error in error handler for ${errorType}:`,
                    handlerError,
                );
            }
        }
        this._emit('error', { errorType, error });
    }

    protected _validateData(data: any): void {
        console.log(
            `[BaseService][_validateData] Validating data for schema: ${this.schemaName
            }, data: ${JSON.stringify(data)}`,
        );
        if (!data || typeof data !== 'object') {
            throw new Error('Data must be a valid object');
        }
    }

    protected async _ensureInitialized(): Promise<void> {
        console.log(
            `[BaseService][_ensureInitialized] Checking initialization for schema: ${this.schemaName}`,
        );
        if (!this.isInitialized) {
            await this.init();
            console.log(
                `[BaseService][_ensureInitialized] Initialization completed for schema: ${this.schemaName}`,
            );
        }
    }

    async getDatabaseInfo(): Promise<any> {
        console.log(
            `[BaseService][getDatabaseInfo] Retrieving database info for schema: ${this.schemaName}`,
        );
        await this._ensureInitialized();
        const info = await this.dao!.getDatabaseInfo();
        console.log(
            `[BaseService][getDatabaseInfo] Database info retrieved: ${JSON.stringify(
                info,
            )}`,
        );
        return info;
    }

    async getTableInfo(): Promise<any[]> {
        console.log(
            `[BaseService][getTableInfo] Retrieving table info for schema: ${this.schemaName}, table: ${this.tableName}`,
        );
        await this._ensureInitialized();
        const info = await this.dao!.getTableInfo(this.tableName);
        console.log(
            `[BaseService][getTableInfo] Table info retrieved: ${JSON.stringify(
                info,
            )}`,
        );
        return info;
    }

    async close(): Promise<boolean> {
        console.log(
            `[BaseService][close] Closing service for schema: ${this.schemaName}`,
        );
        try {
            if (this.dao) {
                await this.dao.close();
                console.log(
                    `[BaseService][close] DAO closed successfully for schema: ${this.schemaName}`,
                );
            }

            this.isOpened = false;
            this.isInitialized = false;
            this.eventListeners.clear();
            this.errorHandlers.clear();
            this._emit('closed', { schemaName: this.schemaName });
            console.log(
                `[BaseService][close] Service closed successfully for schema: ${this.schemaName}`,
            );
            return true;
        } catch (error) {
            console.error(
                `[BaseService][close] Error closing service for schema ${this.schemaName}:`,
                (error as Error).stack,
            );
            this._handleError('CLOSE_ERROR', error as Error);
            throw error;
        }
    }

    // Thêm method để cleanup khi service bị destroy
    public destroy(): void {
        console.log(
            `[BaseService][destroy] Destroying service for schema: ${this.schemaName}`,
        );

        // Hủy đăng ký listener
        DatabaseManager.offDatabaseReconnect(
            this.schemaName,
            this.reconnectHandler,
        );

        console.log(
            `[BaseService][destroy] Service destroyed for schema: ${this.schemaName}`,
        );
    }

    // Fix 6: Thêm method để kiểm tra và refresh connection nếu cần
    private async ensureValidConnection(): Promise<void> {
        try {
            const isConnected = this.dao?.isConnected();
            if (!isConnected) {
                console.warn(
                    `[BaseService][ensureValidConnection] Connection invalid for schema ${this.schemaName}, refreshing`,
                );
                this.dao = DatabaseManager.get(this.schemaName);
            }
        } catch (error) {
            console.warn(
                `[BaseService][ensureValidConnection] Error checking connection for schema ${this.schemaName}, refreshing:`,
                error,
            );
            this.dao = DatabaseManager.get(this.schemaName);
        }
    }

    getStatus(): ServiceStatus {
        console.log(
            `[BaseService][getStatus] Retrieving status for schema: ${this.schemaName}`,
        );
        const status = {
            schemaName: this.schemaName,
            isOpened: this.isOpened,
            isInitialized: this.isInitialized,
            hasDao: !!this.dao,
        };
        console.log(`[BaseService][getStatus] Status: ${JSON.stringify(status)}`);
        return status;
    }

    async healthCheck(): Promise<HealthCheckResult> {
        console.log(
            `[BaseService][healthCheck] Performing health check for schema: ${this.schemaName}`,
        );
        try {
            await this._ensureInitialized();
            const count = await this.count();
            const result = {
                healthy: true,
                schemaName: this.schemaName,
                recordCount: count,
                timestamp: new Date().toISOString(),
            };
            console.log(
                `[BaseService][healthCheck] Health check passed: ${JSON.stringify(
                    result,
                )}`,
            );
            return result;
        } catch (error) {
            const result = {
                healthy: false,
                schemaName: this.schemaName,
                error: (error as Error).message,
                timestamp: new Date().toISOString(),
            };
            console.error(
                `[BaseService][healthCheck] Health check failed: ${JSON.stringify(
                    result,
                )}`,
            );
            return result;
        }
    }
}
