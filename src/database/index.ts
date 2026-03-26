import { DatabaseSchema } from '@dqcai/sqlite';
import { DatabaseFactory, DatabaseManager } from '@dqcai/sqlite';

import { ReactNativeAdapter } from './configs/ReactNativeAdapter';
import { createModuleLogger, AppModules } from '../logger';

// ─── Import các schema ───────────────────────────────────────────
import { coreSchema } from './configs/Core.schema';
import { posSchema } from './configs/Pos.schema';
import { residentSchema } from './configs/Resident.schema';
import { bookingSchema } from './configs/Booking.schema';

const logger = createModuleLogger(AppModules.DATABASE);

// ─── Export từng schema ─────────────────────────────
export { coreSchema } from './configs/Core.schema';
export { posSchema } from './configs/Pos.schema';
export { residentSchema } from './configs/Resident.schema';
export { bookingSchema } from './configs/Booking.schema';

// ─── Registry tổng hợp ────────────────────────────────────────────────────────
export const onePosEcosystemSchemas: Record<string, DatabaseSchema> = {
    core: coreSchema,
    pos: posSchema,
    resident: residentSchema,
    booking: bookingSchema,
};

// ─── Cấu hình Roles – DB cần thiết theo từng vai trò ─────────────────────────
export const ONE_POS_ROLES = [
    {
        roleName: 'super_admin',
        description: 'Quản trị toàn hệ thống',
        requiredDatabases: ['core', 'pos', 'resident', 'booking'],
        priority: 1,
    },
    {
        roleName: 'admin',
        description: 'Quản trị cửa hàng',
        requiredDatabases: ['core', 'pos', 'resident', 'booking'],
        priority: 2,
    },
    {
        roleName: 'manager',
        description: 'Quản lý cửa hàng',
        requiredDatabases: ['core', 'pos', 'resident', 'booking'],
        priority: 3,
    },
    {
        roleName: 'receptionist',
        description: 'Lễ tân / nhân viên booking',
        requiredDatabases: ['core', 'pos', 'booking'],
        optionalDatabases: ['resident'],
        priority: 4,
    },
    {
        roleName: 'cashier',
        description: 'Thu ngân POS',
        requiredDatabases: ['core', 'pos'],
        optionalDatabases: ['booking'],
        priority: 5,
    },
    {
        roleName: 'accountant',
        description: 'Kế toán',
        requiredDatabases: ['core', 'pos', 'resident'],
        priority: 6,
    },
    {
        roleName: 'staff',
        description: 'Nhân viên',
        requiredDatabases: ['core', 'pos'],
        optionalDatabases: ['booking'],
        priority: 7,
    },
    {
        roleName: 'viewer',
        description: 'Xem báo cáo',
        requiredDatabases: ['core', 'pos'],
        priority: 8,
    },
];

// ─── Map ngành nghề → DB cần thiết ───────────────────────────────────────────
export const INDUSTRY_DB_MAP: Record<string, string[]> = {
    cafe: ['core', 'pos'],
    restaurant: ['core', 'pos', 'booking'],
    bakery: ['core', 'pos'],
    grocery: ['core', 'pos'],
    hostel: ['core', 'pos', 'resident'],
    hotel: ['core', 'pos', 'resident', 'booking'],
    spa: ['core', 'pos', 'booking'],
    clinic: ['core', 'pos', 'booking'],
    sport: ['core', 'pos', 'booking'],
    karaoke: ['core', 'pos', 'booking'],
    coworking: ['core', 'pos', 'booking'],
    education: ['core', 'pos', 'booking'],
    rental: ['core', 'pos', 'booking'],
};

// ─── Khởi tạo Database (từ file thứ 2) ────────────────────────────────────────
/**
 * Initializes the official myPOS database.
 * This should be called at the start of the application.
 */
export const initDatabase = async (): Promise<void> => {
    try {
        logger.info('Initializing official myPOS database...');

        // 1. Register the adapter
        DatabaseFactory.registerAdapter(new ReactNativeAdapter());

        // 2. Register schemas
        DatabaseManager.registerSchemas(onePosEcosystemSchemas);

        // 3. Open the databases
        await DatabaseManager.ensureDatabaseConnection('core');
        await DatabaseManager.ensureDatabaseConnection('pos');
        await DatabaseManager.ensureDatabaseConnection('booking');
        await DatabaseManager.ensureDatabaseConnection('resident');

        logger.info('Official myPOS database initialized successfully.');
    } catch (error) {
        logger.error('Failed to initialize official myPOS database:', error);
        throw error;
    }
};

/**
 * Convenience getter for the core database connection.
 */
export const getCoreDB = () => DatabaseManager.get('core');

// ─── Default export (giữ nguyên như file đầu tiên) ────────────────────────────
export default onePosEcosystemSchemas;