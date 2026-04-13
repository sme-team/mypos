import { DatabaseSchema } from '@dqcai/sqlite';
import DatabaseFactory from './DatabaseFactory';
import DatabaseManager from './DBManagers';

import { ReactNativeAdapter } from './configs/ReactNativeAdapter';
import { createModuleLogger, AppModules } from '../logger';

// ─── Import schema chính ─────────────────────────────────────────
import { posSchema as MyPOS } from './configs/MyPOS';

const logger = createModuleLogger(AppModules.DATABASE);

// ─── Export schema ───────────────────────────────────────────────
export { posSchema as MyPOS } from './configs/MyPOS';

// ─── Registry schemas ────────────────────────────────────────────
export const onePosEcosystemSchemas: Record<string, DatabaseSchema> = {
  pos: MyPOS,
};

// ─── Roles trong hệ thống ───────────────────────────────────────
export const ONE_POS_ROLES = [
  {
    roleName: 'super_admin',
    description: 'Quản trị toàn hệ thống',
    requiredDatabases: ['pos'],
    priority: 1,
  },
  {
    roleName: 'admin',
    description: 'Quản trị cửa hàng',
    requiredDatabases: ['pos'],
    priority: 2,
  },
  {
    roleName: 'manager',
    description: 'Quản lý cửa hàng',
    requiredDatabases: ['pos'],
    priority: 3,
  },
  {
    roleName: 'staff',
    description: 'Nhân viên',
    requiredDatabases: ['pos'],
    priority: 4,
  },
  {
    roleName: 'viewer',
    description: 'Chỉ xem báo cáo',
    requiredDatabases: ['pos'],
    priority: 5,
  },
];

// ─── Khởi tạo database ───────────────────────────────────────────
/**
 * Khởi tạo database myPOS
 * Gọi hàm này khi app start
 */
export const initDatabase = async (): Promise<void> => {
  try {
    logger.info('Initializing myPOS database via optimized wrappers...');

    // 1. Register global adapter
    DatabaseFactory.registerAdapter(new ReactNativeAdapter());

    // 2. Initialize manager and register default schemas
    await DatabaseManager.init();

    // 3. Register system roles
    DatabaseManager.registerRoles(ONE_POS_ROLES);

    // 4. Ensure the primary 'pos' connection
    await DatabaseManager.ensureDatabaseConnection('pos');

    logger.info('POS database initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize myPOS database:', error);
    throw error;
  }
};

/**
 * Helper lấy DB connection
 * Trả về wrapper từ cache hoặc lazily tạo mới
 */
export const getPosDB = () => DatabaseManager.get('pos');

// ─── Default export ─────────────────────────────────────────────
export default onePosEcosystemSchemas;
