import { DatabaseSchema } from '@dqcai/sqlite';
import { DatabaseFactory, DatabaseManager } from '@dqcai/sqlite';

import { ReactNativeAdapter } from './configs/ReactNativeAdapter';
import { createModuleLogger, AppModules } from '../logger';

// ─── Import schema chính ─────────────────────────────────────────
import { posSchema as MyPOS } from './configs/MyPOS';

const logger = createModuleLogger(AppModules.DATABASE);

// ─── Export schema ───────────────────────────────────────────────
export { posSchema as MyPOS } from './configs/MyPOS';

// ─── Registry schemas ────────────────────────────────────────────
export const onePosEcosystemSchemas: Record<string, DatabaseSchema> = {
  mypos: MyPOS,
};

// ─── Roles trong hệ thống ───────────────────────────────────────
export const ONE_POS_ROLES = [
  {
    roleName: 'super_admin',
    description: 'Quản trị toàn hệ thống',
    requiredDatabases: ['mypos'],
    priority: 1,
  },
  {
    roleName: 'admin',
    description: 'Quản trị cửa hàng',
    requiredDatabases: ['mypos'],
    priority: 2,
  },
  {
    roleName: 'manager',
    description: 'Quản lý cửa hàng',
    requiredDatabases: ['mypos'],
    priority: 3,
  },
  {
    roleName: 'staff',
    description: 'Nhân viên',
    requiredDatabases: ['mypos'],
    priority: 4,
  },
  {
    roleName: 'viewer',
    description: 'Chỉ xem báo cáo',
    requiredDatabases: ['mypos'],
    priority: 5,
  },
];

// ─── Map ngành nghề → DB ─────────────────────────────────────────
export const INDUSTRY_DB_MAP: Record<string, string[]> = {
  cafe: ['mypos'],
  restaurant: ['mypos'],
  bakery: ['mypos'],
  grocery: ['mypos'],
  hostel: ['mypos'],
  hotel: ['mypos'],
  spa: ['mypos'],
  clinic: ['mypos'],
  sport: ['mypos'],
  karaoke: ['mypos'],
  coworking: ['mypos'],
  education: ['mypos'],
  rental: ['mypos'],
};

// ─── Khởi tạo database ───────────────────────────────────────────
/**
 * Khởi tạo database myPOS
 * Gọi hàm này khi app start
 */
export const initDatabase = async (): Promise<void> => {
  try {
    logger.info('Initializing myPOS database...');

    // 1. Register adapter
    DatabaseFactory.registerAdapter(new ReactNativeAdapter());

    // 2. Register schemas
    DatabaseManager.registerSchemas(onePosEcosystemSchemas);

    // 3. Open database
    await DatabaseManager.ensureDatabaseConnection('mypos');

    logger.info('myPOS database initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize myPOS database:', error);
    throw error;
  }
};

// ─── Helper lấy DB connection ───────────────────────────────────
export const getMyPosDB = () => DatabaseManager.get('mypos');

// ─── Default export ─────────────────────────────────────────────
export default onePosEcosystemSchemas;
