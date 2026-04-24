import {
  DatabaseFactory,
  DatabaseManager as BaseManager,
  ServiceManager,
  DatabaseSchema,
} from '@dqcai/sqlite';
import DatabaseManager from './DBManagers';
import { ReactNativeAdapter } from './configs/ReactNativeAdapter';
import { createModuleLogger, AppModules } from '../logger';
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

// ─── Danh sách bảng trong schema pos ────────────────────────────
const POS_TABLES = [
  'categories',
  'units',
  'products',
  'product_variants',
  'prices',
  'customers',
  'bill_cycles',
  'bills',
  'bill_details',
  'payments',
  'contracts',
  'contract_members',
  'receivables',
  'residents',
  'import_logs',
];

// ─── Khởi tạo database ───────────────────────────────────────────
/**
 * Luồng khởi tạo chuẩn theo @dqcai/sqlite:
 *  1. registerAdapter  → đăng ký platform adapter (ReactNative / NodeJS)
 *  2. registerSchemas  → đăng ký JSON schema định nghĩa bảng
 *  3. init             → setup AppState listener
 *  4. registerRoles    → quyền truy cập theo role
 *  5. ensureConnection → mở kết nối 'pos' database
 *  6. ServiceManager   → đăng ký tất cả services — cổng duy nhất cho CRUD
 */
export const initDatabase = async (): Promise<void> => {
  try {
    logger.info('Initializing myPOS database...');

    // Bước 1: Đăng ký platform adapter — mọi I/O SQLite đi qua đây
    DatabaseFactory.registerAdapter(new ReactNativeAdapter());

    // Bước 2: Đăng ký JSON schema — thư viện tự tạo bảng, không cần CREATE TABLE thủ công
    BaseManager.registerSchemas(onePosEcosystemSchemas);

    // Bước 3: Setup lifecycle listeners (AppState)
    await DatabaseManager.init();

    // Bước 4: Đăng ký system roles
    DatabaseManager.registerRoles(ONE_POS_ROLES);

    // Bước 5: Mở kết nối chính
    await DatabaseManager.ensureDatabaseConnection('pos');

    // Bước 6: Đăng ký toàn bộ services qua ServiceManager
    // Từ đây tất cả CRUD phải đi qua ServiceManager.getService() hoặc BaseService
    const sm = ServiceManager.getInstance();
    sm.registerServices(
      POS_TABLES.map(tableName => ({ schemaName: 'pos', tableName })),
    );

    logger.info('POS database initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize myPOS database:', error);
    throw error;
  }
};

/**
 * Lấy UniversalDAO của 'pos' database.
 * Dùng cho QueryBuilder trong các service phức tạp.
 */
export const getPosDB = () => DatabaseManager.get('pos');

// ─── Default export ─────────────────────────────────────────────
export default onePosEcosystemSchemas;
