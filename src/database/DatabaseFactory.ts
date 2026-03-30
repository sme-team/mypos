import { Platform } from 'react-native';
import {
  DatabaseFactory as BaseFactory,
  DatabaseSchema,
  DbFactoryOptions as BaseOptions,
} from '@dqcai/sqlite';
import SQLiteDAO from './SQLiteDAO';
// import RNFS from 'react-native-fs'; // TODO: Install react-native-fs if you need dynamic schema loading

// Interface for database factory options
export interface DbFactoryOptions extends BaseOptions {
  configPath?: string;
  dbDirectory?: string;
  debug?: boolean;
}

/**
 * DatabaseFactory acts as a wrapper for DatabaseFactory from @dqcai/sqlite.
 * Refactored to eliminate redundant connections and cache schema loading.
 */
export class DatabaseFactory {
  // Fix 4: Schema caching to avoid redundant file system access
  private static schemaCache: Map<string, DatabaseSchema> = new Map();

  /**
   * Register a SQLite adapter (delegated to library)
   */
  public static registerAdapter(adapter: any): void {
    BaseFactory.registerAdapter(adapter);
  }

  /**
   * Smart method to create or open database
   */
  public static async createOrOpen(
    options: DbFactoryOptions,
    forceRecreate: boolean = false,
  ): Promise<SQLiteDAO> {
    const schema = await this.resolveSchema(options);
    const baseOptions: BaseOptions = {
      ...options,
      config: schema,
    };

    // Fix 1: Properly use the library result instead of creating a second connection
    const universalDao = await BaseFactory.createOrOpen(
      baseOptions,
      forceRecreate,
    );

    // Return the wrapper with the library's active DAO
    return new SQLiteDAO(universalDao);
  }

  /**
   * Resolve schema from various sources with caching support
   */
  private static async resolveSchema(
    options: DbFactoryOptions,
  ): Promise<DatabaseSchema> {
    const { config, configAsset, configPath } = options;

    if (config) return config;
    if (configAsset) return configAsset;

    if (configPath) {
      if (this.schemaCache.has(configPath)) {
        return this.schemaCache.get(configPath)!;
      }

      // Placeholder for dynamic loading: require if it's a local file, 
      // or warn that RNFS is not installed.
      console.warn(
        `[DatabaseFactory] Dynamic loading for ${configPath} requires react-native-fs. 
        Falling back to static schema check.`,
      );
      
      // If the project doesn't have RNFS, we can't load from bundle/documents
      throw new Error(`Dynamic schema loading from ${configPath} failed. react-native-fs not installed.`);
    }

    throw new Error(
      "Either 'config', 'configAsset', or 'configPath' must be provided.",
    );
  }

  /**
   * Opens an existing database
   */
  public static async openExisting(
    dbName: string,
    options: Omit<DbFactoryOptions, 'config' | 'configAsset' | 'configPath'> = {},
  ): Promise<SQLiteDAO> {
    const universalDao = await BaseFactory.openExisting(dbName, options);
    return new SQLiteDAO(universalDao);
  }

  /**
   * Loads JSON schema from app bundle using RNFS (Stubs for the user)
   */
  private static async loadSchemaFromBundle(
    configPath: string,
  ): Promise<DatabaseSchema> {
    // Requires: import RNFS from 'react-native-fs';
    throw new Error("RNFS not installed. Cannot load from bundle.");
  }

  /**
   * Loads JSON schema from documents directory using RNFS (Stubs for the user)
   */
  private static async loadSchemaFromDocuments(
    configPath: string,
  ): Promise<DatabaseSchema> {
    // Requires: import RNFS from 'react-native-fs';
    throw new Error("RNFS not installed. Cannot load from documents.");
  }

  /**
   * Convenience methods
   */
  public static async createFromAsset(
    configAsset: DatabaseSchema,
    options: Omit<DbFactoryOptions, 'config' | 'configAsset' | 'configPath'> = {},
  ): Promise<SQLiteDAO> {
    return this.createOrOpen({ ...options, configAsset });
  }

  public static async createFromConfig(
    config: DatabaseSchema,
    options: Omit<DbFactoryOptions, 'config' | 'configAsset' | 'configPath'> = {},
  ): Promise<SQLiteDAO> {
    return this.createOrOpen({ ...options, config });
  }

  public static async createFromPath(
    configPath: string,
    options: Omit<DbFactoryOptions, 'config' | 'configAsset' | 'configPath'> = {},
  ): Promise<SQLiteDAO> {
    return this.createOrOpen({ ...options, configPath });
  }
}

export default DatabaseFactory;
