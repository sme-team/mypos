// import cấu hình logger cho ứng dụng
import {
  LoggerConfigBuilder,
  createModuleLogger,
  CommonLoggerConfig,
} from '@dqcai/logger';
// Import các thành phần logger cần thiết cho sqlite
import {SQLiteModules} from '@dqcai/sqlite';

const AppModules = {
  ...SQLiteModules,
  API_CLIENT: 'api-client',
  BOOKING: 'booking',
  TOKEN_MANAGER: 'token-manager',
  STORE_WRAPPER: 'store-wrapper',
  AUTH_STORE: 'auth-store',
  TOKEN_STORE: 'token-store',
  USER_STORE: 'user-store',
  AXIOS_CONFIG: 'axios-config',
  APP_STATE: 'app-state',
  MODAL_MANAGER: 'modal-manager',
  INITIALIZATION: 'initialization',
  SETUP_DATABASE: 'setup-database',
  SETUP_USER_PROFILE: 'setup-user-profile',
  SIDE_BAR: 'side-bar',
  MAIN_SCREEN: 'main-screen',
  CONFIG_SERVICE: 'config-service',
  HOME_SCREEN: 'home-screen',
  INITIALIZATION_SCREEN: 'initialization_screen',
  SETUP_DATABASE_SCREEN: 'setup-database-screen',
  LOGIN_SCREEN: 'login-screen',
  SERVICE_MANAGER: 'service-manager',
  DATABASE_ADAPTER: 'database-adapter',
  DATABASE_INIT: 'database-init',
  DATABASE_CONTENT: 'database-content',
  DATABASE_CONFIG: 'database-config',
  PHOTO_CONTENT: 'photo-content',
  PHOTO_SERVICE: 'photo-service',
  IMAGE_VIEW_MODAL: 'image-view-modal',
  SERVER_RUNING: 'server-runing',
  SERVER_ROUTE: 'server-route',
  GOOGLE_AUTH_ROUTE: 'google-auth-route',
  GOOGLE_SHEET_FETCHER: 'google-sheet-fetcher',
  ARTICLE_METRICS_SERVICE: 'article-metrics-service',
  GOOGLE_SHEET_TO_JSON: 'google-sheet-to-json',
  ARTICLE_SERVICE: 'article-service',
  ARTICLE_ROUTE: 'article-route',
  ARTICLE_COMMENTS_SERVICE: 'article-comments-service',
  ARTICLE_COMMENTS_ROUTE: 'article-comments-route',
  ARTICLE_REACTIONS_SERVICE: 'article-reactions-service',
  ARTICLE_REACTIONS_ROUTE: 'article-reactions-route',
  ADMIN_SERVICE: 'admin-service',
  USER_SERVICE: 'user-service',
  STORE_SERVICE: 'store-service',
  ENTERPRISE_SERVICE: 'enterprise-service',
  SESSION_SERVICE: 'session-service',
  SETTINGS_SERVICE: 'settings-service',
  AUTH_SERVICE: 'auth-service',
  GOOGLE_AUTH_SERVICE: 'google-auth-service',
  NAVIGATION_SERVICE: 'navigation-service',
  USE_MODAL: 'use-modal',
  USE_INITIALIZATION: 'use-initialization',
  USE_SETUP_DATABASE: 'use-setup-database',
  USE_SETUP_USER_PROFILE: 'use-setup-user-profile',
  USE_MAIN_SCREEN: 'use-main-screen',
  USE_SIDE_BAR: 'use-side-bar',
  USE_HOME_SCREEN: 'use-home-screen',
  USE_SERVICE_MANAGER: 'use-service-manager',
  USE_DATABASE_ADAPTER: 'use-database-adapter',
  USE_DATABASE_INIT: 'use-database-init',
  USE_DATABASE_CONTENT: 'use-database-content',
  USE_DATABASE_CONFIG: 'use-database-config',
  USE_PHOTO_CONTENT: 'use-photo-content',
  USE_IMAGE_VIEW_MODAL: 'use-image-view-modal',
  USE_SERVER_RUNING: 'use-server-runing',
  USE_SERVER_ROUTE: 'use-server-route',
  USE_GOOGLE_AUTH_ROUTE: 'use-google-auth-route',
  USE_ARTICLE_METRICS_SERVICE: 'use-article-metrics-service',
  USE_ARTICLE_SERVICE: 'use-article-service',
  USE_ARTICLE_ROUTE: 'use-article-route',
  USE_ARTICLE_COMMENTS_SERVICE: 'use-article-comments-service',
  USE_ARTICLE_COMMENTS_ROUTE: 'use-article-comments-route',
  USE_ARTICLE_REACTIONS_SERVICE: 'use-article-reactions-service',
  USE_ARTICLE_REACTIONS_ROUTE: 'use-article-reactions-route',
  USE_LOGIN: 'use-login',
};

const config = new LoggerConfigBuilder()
  .setEnabled(true) // cho phép show log toàn bộ
  .setDefaultLevel('trace') // mặt định là phun ra các lỗi
  // debug cho các module được khai báo ở đây
  // .addModule(AppModules.SIDE_BAR, false) // hide sidebar all
  // .addModule(AppModules.MAIN_SCREEN, true, ['warn', 'error'], ['console'])
  .addModule(SQLiteModules.UNIVERSAL_DAO, false)
  .addModule(SQLiteModules.DATABASE_FACTORY, false)
  .addModule(SQLiteModules.DATABASE_MANAGER, false)
  .addModule(SQLiteModules.BASE_SERVICE, false)
  .build();

CommonLoggerConfig.updateConfiguration(config);
export {createModuleLogger, AppModules};

/**
// Cách dùng cơ bản là import và dùng logger.trace/debug/infor/error thay cho console.log/debug/warn/error
import { createModuleLogger, AppModules } from "@/configs/logger";

const logger = createModuleLogger(AppModules.MIDDLEWARE);
logger.trace("Middleware importing...");
 */
