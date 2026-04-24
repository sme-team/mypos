import { UniversalDAO, QueryTable } from '@dqcai/sqlite';
import DatabaseManager from '../database/DBManagers';
import { createModuleLogger, AppModules } from '../logger';

const logger = createModuleLogger(AppModules.APP_BASE_SERVICE);

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

// Re-export QueryTable for backward compat
export type { QueryTable };

export class BaseService {
    protected schemaName: string;
    protected tableName: string;
    protected dao: UniversalDAO | null = null;
    protected isOpened: boolean = false;
    protected isInitialized: boolean = false;
    protected errorHandlers: Map<string, ErrorHandler> = new Map();
    protected eventListeners: Map<string, EventHandler[]> = new Map();
    protected primaryKeyFields: string[] = ['id'];
    private reconnectHandler: (dao: UniversalDAO) => void;

    constructor(schemaName: string, tableName?: string) {
        this.schemaName = schemaName;
        this.tableName = tableName || schemaName;

        this.reconnectHandler = (newDao: UniversalDAO) => {
            logger.debug(`[${this.tableName}] DAO updated after reconnect`);
            this.dao = newDao;
        };

        DatabaseManager.onDatabaseReconnect(schemaName, this.reconnectHandler);
        this.bindMethods();
    }

    private bindMethods(): void {
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
        methods.forEach(method => {
            if (
                typeof (this as any)[method] === 'function' &&
                method !== 'constructor'
            ) {
                (this as any)[method] = (this as any)[method].bind(this);
            }
        });
    }

    setPrimaryKeyFields(fields: string[]): this {
        this.primaryKeyFields = fields;
        return this;
    }

    async init(): Promise<this> {
        try {
            if (this.isInitialized) return this;
            logger.debug(`[${this.tableName}] init — acquiring DAO`);
            this.dao = await DatabaseManager.getLazyLoading(this.schemaName);
            if (!this.dao) {
                throw new Error(`Failed to initialize DAO for schema: ${this.schemaName}`);
            }
            if (!this.dao.isConnectionOpen()) {
                await this.dao.connect();
            }
            this.isOpened = true;
            this.isInitialized = true;
            this._emit('initialized', { schemaName: this.schemaName });
            logger.debug(`[${this.tableName}] init — ready`);
            return this;
        } catch (error) {
            logger.error(`[${this.tableName}] init failed`, { error: (error as Error).message });
            this._handleError('INIT_ERROR', error as Error);
            throw error;
        }
    }

    protected buildSelectTable(
        conditions: Record<string, any> = {},
        options: FindOptions = {},
    ): QueryTable {
        const queryTable: QueryTable = {
            name: this.tableName,
            cols: [],
            wheres: [],
            orderbys: options.orderBy || [],
            limitOffset: {},
        };

        if (options.columns && options.columns.length > 0) {
            queryTable.cols = options.columns.map(name => ({ name }));
        }

        if (conditions && Object.keys(conditions).length > 0) {
            queryTable.wheres = Object.entries(conditions).map(([key, value]) => ({
                name: key,
                value,
                operator: '=',
            }));
        }

        if (options.limit !== undefined) {
            queryTable.limitOffset!.limit = options.limit;
        }
        if (options.offset !== undefined) {
            queryTable.limitOffset!.offset = options.offset;
        }

        return queryTable;
    }

    protected buildDataTable(data: Record<string, any>): QueryTable {
        return this.dao!.convertJsonToQueryTable(
            this.tableName,
            data,
            this.primaryKeyFields,
        );
    }

    async findAll(
        conditions: Record<string, any> = {},
        options: FindOptions = {},
    ): Promise<any[]> {
        await this._ensureInitialized();
        try {
            const queryTable = this.buildSelectTable(conditions, options);
            const result = await this.dao!.selectAll(queryTable);
            logger.trace(`[${this.tableName}] findAll — ${result.length} rows`, { conditions });
            this._emit('dataFetched', { operation: 'findAll', count: result.length });
            return result;
        } catch (error) {
            logger.error(`[${this.tableName}] findAll failed`, { conditions, error: (error as Error).message });
            this._handleError('FIND_ALL_ERROR', error as Error);
            throw error;
        }
    }

    async findById(id: string | number): Promise<any> {
        await this._ensureInitialized();
        try {
            if (!id) throw new Error('ID is required');
            const conditions = { [this.primaryKeyFields[0]]: id };
            const queryTable = this.buildSelectTable(conditions);
            const result = await this.dao!.select(queryTable);
            logger.trace(`[${this.tableName}] findById — id=${id} found=${!!result}`);
            this._emit('dataFetched', { operation: 'findById', id });
            return result;
        } catch (error) {
            logger.error(`[${this.tableName}] findById failed`, { id, error: (error as Error).message });
            this._handleError('FIND_BY_ID_ERROR', error as Error);
            throw error;
        }
    }

    async findFirst(conditions: Record<string, any> = {}): Promise<any> {
        await this._ensureInitialized();
        try {
            const queryTable = this.buildSelectTable(conditions);
            const result = await this.dao!.select(queryTable);
            logger.trace(`[${this.tableName}] findFirst — found=${!!result}`, { conditions });
            this._emit('dataFetched', { operation: 'findFirst' });
            return result;
        } catch (error) {
            logger.error(`[${this.tableName}] findFirst failed`, { conditions, error: (error as Error).message });
            this._handleError('FIND_FIRST_ERROR', error as Error);
            throw error;
        }
    }

    async create(data: Record<string, any>): Promise<any> {
        await this._ensureInitialized();
        await this._ensureValidConnection();
        try {
            this._validateData(data);
            const queryTable = this.buildDataTable(data);
            await this.dao!.insert(queryTable);

            let result = data;
            if (data[this.primaryKeyFields[0]]) {
                result = await this.findById(data[this.primaryKeyFields[0]]);
            }

            logger.debug(`[${this.tableName}] create — id=${data[this.primaryKeyFields[0]]}`);
            this._emit('dataCreated', { operation: 'create', data: result });
            return result;
        } catch (error) {
            logger.error(`[${this.tableName}] create failed`, { error: (error as Error).message });
            this._handleError('CREATE_ERROR', error as Error);
            throw error;
        }
    }

    async update(
        id: string | number | undefined,
        data: Record<string, any>,
    ): Promise<any> {
        await this._ensureInitialized();
        try {
            if (!id) throw new Error('ID is required for update');
            this._validateData(data);

            const updateData = { ...data, [this.primaryKeyFields[0]]: id };
            const queryTable = this.buildDataTable(updateData);
            await this.dao!.update(queryTable);

            const result = await this.findById(id);
            logger.debug(`[${this.tableName}] update — id=${id}`);
            this._emit('dataUpdated', { operation: 'update', id, data: result });
            return result;
        } catch (error) {
            logger.error(`[${this.tableName}] update failed`, { id, error: (error as Error).message });
            this._handleError('UPDATE_ERROR', error as Error);
            throw error;
        }
    }

    async delete(id: string | number): Promise<boolean> {
        await this._ensureInitialized();
        try {
            if (!id) throw new Error('ID is required for delete');
            const conditions = { [this.primaryKeyFields[0]]: id };
            const queryTable = this.buildSelectTable(conditions);
            await this.dao!.delete(queryTable);
            logger.debug(`[${this.tableName}] delete — id=${id}`);
            this._emit('dataDeleted', { operation: 'delete', id });
            return true;
        } catch (error) {
            logger.error(`[${this.tableName}] delete failed`, { id, error: (error as Error).message });
            this._handleError('DELETE_ERROR', error as Error);
            throw error;
        }
    }

    async bulkCreate(dataArray: Record<string, any>[]): Promise<any[]> {
        await this._ensureInitialized();
        try {
            if (!Array.isArray(dataArray) || dataArray.length === 0) {
                throw new Error('Data must be a non-empty array');
            }

            logger.debug(`[${this.tableName}] bulkCreate — ${dataArray.length} rows`);
            const results: any[] = [];
            await this.executeTransaction(async () => {
                for (const data of dataArray) {
                    this._validateData(data);
                    const queryTable = this.buildDataTable(data);
                    await this.dao!.insert(queryTable);
                    results.push(data);
                }
            });

            logger.info(`[${this.tableName}] bulkCreate — completed ${results.length} rows`);
            this._emit('dataBulkCreated', { operation: 'bulkCreate', count: results.length });
            return results;
        } catch (error) {
            logger.error(`[${this.tableName}] bulkCreate failed`, { count: dataArray.length, error: (error as Error).message });
            this._handleError('BULK_CREATE_ERROR', error as Error);
            throw error;
        }
    }

    async count(conditions: Record<string, any> = {}): Promise<number> {
        await this._ensureInitialized();
        try {
            const queryTable = this.buildSelectTable(conditions, {
                columns: ['COUNT(*) as count'],
            });
            const result = await this.dao!.select(queryTable);
            return result.count || 0;
        } catch (error) {
            logger.error(`[${this.tableName}] count failed`, { conditions, error: (error as Error).message });
            this._handleError('COUNT_ERROR', error as Error);
            throw error;
        }
    }

    async executeTransaction(callback: () => Promise<any>): Promise<any> {
        await this._ensureInitialized();
        try {
            await this.dao!.beginTransaction();
            const result = await callback();
            await this.dao!.commitTransaction();
            logger.debug(`[${this.tableName}] transaction committed`);
            this._emit('transactionCompleted', { operation: 'transaction' });
            return result;
        } catch (error) {
            logger.warn(`[${this.tableName}] transaction failed — rolling back`, { error: (error as Error).message });
            try {
                await this.dao!.rollbackTransaction();
            } catch (rollbackError) {
                logger.error(`[${this.tableName}] rollback failed`, { error: (rollbackError as Error).message });
                this._handleError('ROLLBACK_ERROR', rollbackError as Error);
            }
            this._handleError('TRANSACTION_ERROR', error as Error);
            throw error;
        }
    }

    // Aliases for backward compatibility
    async getAll(conditions: Record<string, any> = {}, options: FindOptions = {}): Promise<any[]> {
        return this.findAll(conditions, options);
    }

    async getById(id: string | number): Promise<any> {
        return this.findById(id);
    }

    async getFirst(conditions: Record<string, any> = {}): Promise<any> {
        return this.findFirst(conditions);
    }

    on(event: string, handler: EventHandler): this {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(handler);
        return this;
    }

    off(event: string, handler: EventHandler): this {
        const handlers = this.eventListeners.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) handlers.splice(index, 1);
        }
        return this;
    }

    protected _emit(event: string, data: any): void {
        const handlers = this.eventListeners.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try { handler(data); } catch { /* noop */ }
            });
        }
    }

    setErrorHandler(errorType: string, handler: ErrorHandler): this {
        this.errorHandlers.set(errorType, handler);
        return this;
    }

    protected _handleError(errorType: string, error: Error): void {
        const handler = this.errorHandlers.get(errorType);
        if (handler) {
            try { handler(error); } catch { /* noop */ }
        }
        this._emit('error', { errorType, error });
    }

    protected _validateData(data: any): void {
        if (!data || typeof data !== 'object') {
            throw new Error('Data must be a valid object');
        }
    }

    protected async _ensureInitialized(): Promise<void> {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    private async _ensureValidConnection(): Promise<void> {
        try {
            if (!this.dao?.isConnectionOpen()) {
                logger.warn(`[${this.tableName}] connection lost — refreshing`);
                this.dao = DatabaseManager.get(this.schemaName);
            }
        } catch {
            logger.warn(`[${this.tableName}] error checking connection — refreshing`);
            this.dao = DatabaseManager.get(this.schemaName);
        }
    }

    async getDatabaseInfo(): Promise<any> {
        await this._ensureInitialized();
        return this.dao!.getDatabaseInfo();
    }

    async getTableInfo(): Promise<any[]> {
        await this._ensureInitialized();
        return this.dao!.getTableInfo(this.tableName);
    }

    async close(): Promise<boolean> {
        try {
            if (this.dao) await this.dao.close();
            this.isOpened = false;
            this.isInitialized = false;
            this.eventListeners.clear();
            this.errorHandlers.clear();
            logger.debug(`[${this.tableName}] closed`);
            this._emit('closed', { schemaName: this.schemaName });
            return true;
        } catch (error) {
            logger.error(`[${this.tableName}] close failed`, { error: (error as Error).message });
            this._handleError('CLOSE_ERROR', error as Error);
            throw error;
        }
    }

    public destroy(): void {
        logger.debug(`[${this.tableName}] destroy — removing reconnect listener`);
        DatabaseManager.offDatabaseReconnect(this.schemaName, this.reconnectHandler);
    }

    getStatus(): ServiceStatus {
        return {
            schemaName: this.schemaName,
            isOpened: this.isOpened,
            isInitialized: this.isInitialized,
            hasDao: !!this.dao,
        };
    }

    async healthCheck(): Promise<HealthCheckResult> {
        try {
            await this._ensureInitialized();
            const count = await this.count();
            logger.debug(`[${this.tableName}] healthCheck — ok, count=${count}`);
            return {
                healthy: true,
                schemaName: this.schemaName,
                recordCount: count,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            logger.warn(`[${this.tableName}] healthCheck — failed`, { error: (error as Error).message });
            return {
                healthy: false,
                schemaName: this.schemaName,
                error: (error as Error).message,
                timestamp: new Date().toISOString(),
            };
        }
    }
}
