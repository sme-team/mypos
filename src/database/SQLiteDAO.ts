import {
  UniversalDAO,
  DatabaseSchema,
  ImportOptions,
  ImportResult,
  QueryTable,
  SQLiteRow,
  TypeMappingConfig,
  ColumnMapping,
} from '@dqcai/sqlite';

// Re-export type mappings for backward compatibility if needed
export type {
  DatabaseSchema as DatabaseSchemaWithTypeMapping,
  ImportOptions,
  ImportResult,
  QueryTable,
  ColumnMapping,
};

/**
 * SQLiteDAO acts as a wrapper for UniversalDAO from @dqcai/sqlite.
 * It provides a project-specific interface while delegating core logic to the library.
 * Flow: App -> SQLiteDAO -> UniversalDAO (@dqcai/sqlite) -> SQLite
 */
export class SQLiteDAO {
  private dao: UniversalDAO;

  /**
   * Refactored constructor: Accept an existing UniversalDAO instance.
   * No longer creates its own adapter or library-level DAO.
   */
  constructor(dao: UniversalDAO) {
    this.dao = dao;
  }

  // ===========================================
  // CONNECTION & TRANSACTION (Delegated)
  // ===========================================

  public async connect(): Promise<void> {
    return this.dao.connect();
  }

  public async close(): Promise<void> {
    return this.dao.close();
  }

  public isConnected(): boolean {
    return this.dao.isConnectionOpen();
  }

  public async beginTransaction(): Promise<void> {
    return this.dao.beginTransaction();
  }

  public async commitTransaction(): Promise<void> {
    return this.dao.commitTransaction();
  }

  public async rollbackTransaction(): Promise<void> {
    return this.dao.rollbackTransaction();
  }

  // ===========================================
  // SCHEMA & INFO (Delegated)
  // ===========================================

  public async initializeFromSchema(schema: DatabaseSchema): Promise<void> {
    return this.dao.initializeFromSchema(schema);
  }

  public async getDatabaseInfo(): Promise<any> {
    return this.dao.getDatabaseInfo();
  }

  public async getTableInfo(tableName: string): Promise<any[]> {
    return this.dao.getTableInfo(tableName);
  }

  public async getSchemaVersion(): Promise<string> {
    return this.dao.getSchemaVersion();
  }

  public async setSchemaVersion(version: string): Promise<void> {
    return this.dao.setSchemaVersion(version);
  }

  // ===========================================
  // CRUD OPERATIONS (Delegated)
  // ===========================================

  public async insert(insertTable: QueryTable): Promise<any> {
    return this.dao.insert(insertTable);
  }

  public async update(updateTable: QueryTable): Promise<any> {
    return this.dao.update(updateTable);
  }

  public async delete(deleteTable: QueryTable): Promise<any> {
    return this.dao.delete(deleteTable);
  }

  public async select(selectTable: QueryTable): Promise<SQLiteRow> {
    return this.dao.select(selectTable);
  }

  public async selectAll(selectTable: QueryTable): Promise<SQLiteRow[]> {
    return this.dao.selectAll(selectTable);
  }

  // ===========================================
  // RAW SQL (Delegated)
  // ===========================================

  public async runSql(sql: string, params: any[] = []): Promise<any> {
    return this.dao.execute(sql, params);
  }

  public async getRst(sql: string, params: any[] = []): Promise<SQLiteRow> {
    return this.dao.getRst(sql, params);
  }

  public async getRsts(sql: string, params: any[] = []): Promise<SQLiteRow[]> {
    return this.dao.getRsts(sql, params);
  }

  // ===========================================
  // UTILITIES (Delegated)
  // ===========================================

  public setTypeMappingConfig(config: TypeMappingConfig['type_mapping']): void {
    this.dao.setTypeMappingConfig(config);
  }

  public convertJsonToQueryTable(
    tableName: string,
    json: Record<string, any>,
    idFields: string[] = ['id'],
  ): QueryTable {
    return this.dao.convertJsonToQueryTable(tableName, json, idFields);
  }

  public async importData(options: ImportOptions): Promise<ImportResult> {
    return this.dao.importData(options);
  }

  // Helper to access the internal DAO if absolutely necessary
  public getInternalDAO(): UniversalDAO {
    return this.dao;
  }
}

export default SQLiteDAO;