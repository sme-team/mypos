import {BaseService, FindOptions} from '../../BaseService';

// ─── Types & Interfaces ──────────────────────────────────────────────────────

export type CategoryApplyTo = 'all' | 'pos' | 'hostel' | 'hotel' | 'booking';
export type CategoryStatus = 'active' | 'inactive';
export type SyncStatus = 'local' | 'synced' | 'conflict' | 'pending_sync';

export interface Category {
  id: string;
  store_id: string;
  parent_id: string | null;
  category_code: string | null;
  name: string;
  icon: string | null;
  color_code: string | null;
  apply_to: CategoryApplyTo;
  sort_order: number;
  status: CategoryStatus;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

export type CreateCategoryInput = {
  store_id: string;
  name: string;
  parent_id?: string | null;
  category_code?: string | null;
  icon?: string | null;
  color_code?: string | null;
  apply_to?: CategoryApplyTo;
  sort_order?: number;
  status?: CategoryStatus;
};

export type UpdateCategoryInput = Partial<
  Omit<CreateCategoryInput, 'store_id'>
> & {
  sync_status?: SyncStatus;
  updated_at?: string;
  deleted_at?: string | null;
};

export interface CategoryFindOptions extends FindOptions {
  includeDeleted?: boolean;
}

// ─── CategoryService ─────────────────────────────────────────────────────────

/**
 * CategoryService – ORM-style service cho bảng `categories`.
 *
 * Kế thừa BaseService (schemaName = 'mypos', tableName = 'categories').
 * Toàn bộ truy vấn sử dụng các method ORM của BaseService, không dùng raw SQL.
 *
 * @example
 * const svc = await CategoryService.getInstance();
 * const roots = await svc.findRootCategories('store-uuid');
 */
export class CategoryService extends BaseService {
  private static instance: CategoryService | null = null;

  constructor() {
    super('mypos', 'categories');
  }

  // ─── Singleton ─────────────────────────────────────────────────────────────

  /**
   * Lấy instance singleton đã được khởi tạo.
   */
  public static async getInstance(): Promise<CategoryService> {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
      await CategoryService.instance.init();
    }
    return CategoryService.instance;
  }

  public static resetInstance(): void {
    CategoryService.instance = null;
  }

  // ─── Helpers nội bộ ───────────────────────────────────────────────────────

  private now(): string {
    return new Date().toISOString();
  }

  /**
   * Sinh ID cat1, cat2, cat3, ...
   * Query toàn bộ store để tìm số thứ tự lớn nhất hiện có, rồi tăng lên 1.
   */
  private async generateId(storeId: string): Promise<string> {
    const rows = (await this.findAll({store_id: storeId}, {
      includeDeleted: true,
    } as CategoryFindOptions)) as Category[];

    const max = rows.reduce((acc, r) => {
      const match = r.id.match(/^cat-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > acc ? num : acc;
      }
      return acc;
    }, 0);

    return `cat-${max + 1}`;
  }

  /**
   * Lọc bỏ các record đã soft-delete (deleted_at != null).
   * Cần thiết vì BaseService không hỗ trợ IS NULL trong where clause.
   */
  private excludeDeleted(rows: Category[]): Category[] {
    return rows.filter(r => !r.deleted_at);
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────

  /**
   * Tự động sinh UUID, set timestamp, sync_status = 'local'.
   */
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const now = this.now();
    const data: Category = {
      id: await this.generateId(input.store_id),
      store_id: input.store_id,
      parent_id: input.parent_id ?? null,
      category_code: input.category_code ?? null,
      name: input.name,
      icon: input.icon ?? null,
      color_code: input.color_code ?? null,
      apply_to: input.apply_to ?? 'all',
      sort_order: input.sort_order ?? 0,
      status: input.status ?? 'active',
      sync_status: 'local',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    return this.create(data) as Promise<Category>;
  }

  /**
   * Bulk tạo nhiều danh mục trong một transaction.
   */
  async bulkCreateCategories(
    inputs: CreateCategoryInput[],
  ): Promise<Category[]> {
    const now = this.now();
    const dataArray: Category[] = [];

    // Sinh ID tuần tự, tránh race condition
    for (const input of inputs) {
      dataArray.push({
        id: await this.generateId(input.store_id),
        store_id: input.store_id,
        parent_id: input.parent_id ?? null,
        category_code: input.category_code ?? null,
        name: input.name,
        icon: input.icon ?? null,
        color_code: input.color_code ?? null,
        apply_to: input.apply_to ?? 'all',
        sort_order: input.sort_order ?? 0,
        status: input.status ?? 'active',
        sync_status: 'local',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    }

    return this.bulkCreate(dataArray) as Promise<Category[]>;
  }

  // ─── READ ─────────────────────────────────────────────────────────────────

  /**
   * Lấy tất cả danh mục của một store.
   * Mặc định loại trừ soft-deleted, trừ khi includeDeleted = true.
   */
  async findByStore(
    storeId: string,
    options: CategoryFindOptions = {},
  ): Promise<Category[]> {
    const rows = (await this.findAll(
      {store_id: storeId},
      options,
    )) as Category[];
    return options.includeDeleted ? rows : this.excludeDeleted(rows);
  }

  /**
   * Lấy danh mục theo ID. Trả null nếu không tồn tại hoặc đã soft-delete.
   */
  async findCategoryById(id: string): Promise<Category | null> {
    const result = (await this.findById(id)) as Category | null;
    if (!result || result.deleted_at) return null;
    return result;
  }

  /**
   * Tìm danh mục theo category_code trong store.
   */
  async findByCode(
    storeId: string,
    categoryCode: string,
  ): Promise<Category | null> {
    const result = (await this.findFirst({
      store_id: storeId,
      category_code: categoryCode,
    })) as Category | null;
    if (!result || result.deleted_at) return null;
    return result;
  }

  /**
   * Lấy tất cả danh mục gốc (parent_id = null) của store.
   * BaseService không hỗ trợ IS NULL trong where, filter ở tầng JS.
   */
  async findRootCategories(
    storeId: string,
    options: CategoryFindOptions = {},
  ): Promise<Category[]> {
    const rows = await this.findByStore(storeId, options);
    return rows.filter(r => !r.parent_id);
  }

  /**
   * Lấy danh mục con trực tiếp (1 cấp) của một danh mục cha.
   */
  async findChildren(
    parentId: string,
    storeId: string,
    options: CategoryFindOptions = {},
  ): Promise<Category[]> {
    const rows = (await this.findAll(
      {store_id: storeId, parent_id: parentId},
      options,
    )) as Category[];
    return options.includeDeleted ? rows : this.excludeDeleted(rows);
  }

  /**
   * Lấy toàn bộ cây danh mục của store (đệ quy ở tầng JS).
   * Chỉ query 1 lần, xây dựng cây trong bộ nhớ.
   */
  async findCategoryTree(storeId: string): Promise<CategoryWithChildren[]> {
    const all = await this.findByStore(storeId, {
      orderBy: [{name: 'sort_order', order: 'ASC'}],
    });

    const map = new Map<string, CategoryWithChildren>();
    all.forEach(c => map.set(c.id, {...c, children: []}));

    const roots: CategoryWithChildren[] = [];
    map.forEach(node => {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * Lấy danh sách phẳng tất cả hậu duệ (mọi cấp) của một danh mục.
   */
  async findDescendants(
    categoryId: string,
    storeId: string,
  ): Promise<Category[]> {
    const tree = await this.findCategoryTree(storeId);
    const results: Category[] = [];

    const collect = (nodes: CategoryWithChildren[]) => {
      for (const node of nodes) {
        if (node.id === categoryId) {
          this.collectAllNodes(node.children ?? [], results);
          return;
        }
        if (node.children?.length) collect(node.children);
      }
    };
    collect(tree);
    return results;
  }

  private collectAllNodes(
    nodes: CategoryWithChildren[],
    acc: Category[],
  ): void {
    for (const node of nodes) {
      const {children, ...category} = node;
      acc.push(category as Category);
      if (children?.length) this.collectAllNodes(children, acc);
    }
  }

  /**
   * Lấy danh mục theo apply_to trong store.
   */
  async findByApplyTo(
    storeId: string,
    applyTo: CategoryApplyTo,
    options: CategoryFindOptions = {},
  ): Promise<Category[]> {
    const rows = (await this.findAll(
      {store_id: storeId, apply_to: applyTo},
      options,
    )) as Category[];
    return options.includeDeleted ? rows : this.excludeDeleted(rows);
  }

  /**
   * Lấy danh mục theo status trong store.
   */
  async findByStatus(
    storeId: string,
    status: CategoryStatus,
    options: CategoryFindOptions = {},
  ): Promise<Category[]> {
    const rows = (await this.findAll(
      {store_id: storeId, status},
      options,
    )) as Category[];
    return options.includeDeleted ? rows : this.excludeDeleted(rows);
  }

  /**
   * Lấy danh mục theo sync_status – phục vụ quá trình đồng bộ.
   */
  async findBySyncStatus(
    storeId: string,
    syncStatus: SyncStatus,
  ): Promise<Category[]> {
    const rows = (await this.findAll({
      store_id: storeId,
      sync_status: syncStatus,
    })) as Category[];
    return this.excludeDeleted(rows);
  }

  /**
   * Tìm kiếm danh mục theo tên (filter JS, không phân biệt hoa thường).
   */
  async searchByName(storeId: string, keyword: string): Promise<Category[]> {
    const rows = await this.findByStore(storeId);
    const lower = keyword.toLowerCase();
    return rows.filter(r => r.name.toLowerCase().includes(lower));
  }

  /**
   * Lấy danh mục hiển thị trên POS:
   * apply_to IN ('all', 'pos') AND status = 'active'.
   * Query 2 nhóm song song rồi gộp + dedup ở JS.
   */
  async findActiveForPOS(storeId: string): Promise<Category[]> {
    const [allGroup, posGroup] = await Promise.all([
      this.findAll(
        {store_id: storeId, apply_to: 'all', status: 'active'},
        {orderBy: [{name: 'sort_order', order: 'ASC'}]},
      ) as Promise<Category[]>,
      this.findAll(
        {store_id: storeId, apply_to: 'pos', status: 'active'},
        {orderBy: [{name: 'sort_order', order: 'ASC'}]},
      ) as Promise<Category[]>,
    ]);

    const seen = new Set<string>();
    return [...allGroup, ...posGroup].filter(r => {
      if (r.deleted_at || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }

  /**
   * Đếm số danh mục con trực tiếp của một category.
   */
  async countChildren(parentId: string, storeId: string): Promise<number> {
    const children = await this.findChildren(parentId, storeId);
    return children.length;
  }

  /**
   * Số lượng danh mục active trong store.
   */
  async countActive(storeId: string): Promise<number> {
    return this.count({store_id: storeId, status: 'active'});
  }

  /**
   * Kiểm tra category_code có bị trùng trong store chưa.
   * excludeId dùng khi update để loại trừ chính record đó.
   */
  async isCodeDuplicated(
    storeId: string,
    categoryCode: string,
    excludeId?: string,
  ): Promise<boolean> {
    const rows = (await this.findAll({
      store_id: storeId,
      category_code: categoryCode,
    })) as Category[];

    return this.excludeDeleted(rows).some(r => r.id !== excludeId);
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  /**
   * Cập nhật thông tin danh mục.
   * Tự động set updated_at và sync_status = 'pending_sync'.
   */
  async updateCategory(
    id: string,
    input: UpdateCategoryInput,
  ): Promise<Category> {
    const data: UpdateCategoryInput = {
      ...input,
      updated_at: this.now(),
      sync_status: input.sync_status ?? 'pending_sync',
    };
    return this.update(id, data) as Promise<Category>;
  }

  /**
   * Đổi trạng thái active / inactive.
   */
  async setStatus(id: string, status: CategoryStatus): Promise<Category> {
    return this.updateCategory(id, {status});
  }

  /**
   * Đánh dấu đã sync thành công.
   */
  async markSynced(id: string): Promise<Category> {
    return this.updateCategory(id, {sync_status: 'synced'});
  }

  /**
   * Cập nhật sort_order hàng loạt trong một transaction.
   */
  async reorder(
    orders: Array<{id: string; sort_order: number}>,
  ): Promise<void> {
    await this.executeTransaction(async () => {
      for (const {id, sort_order} of orders) {
        await this.update(id, {
          sort_order,
          updated_at: this.now(),
          sync_status: 'pending_sync',
        });
      }
    });
  }

  /**
   * Chuyển category sang danh mục cha mới (null = lên gốc).
   */
  async moveCategory(
    id: string,
    newParentId: string | null,
  ): Promise<Category> {
    return this.updateCategory(id, {parent_id: newParentId});
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────

  /**
   * Soft delete: set deleted_at, status = 'inactive'.
   */
  async softDelete(id: string): Promise<Category> {
    return this.updateCategory(id, {
      deleted_at: this.now(),
      status: 'inactive',
    });
  }

  /**
   * Hard delete: xoá vĩnh viễn khỏi DB.
   */
  async hardDelete(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Soft delete danh mục cha và toàn bộ cây con (đệ quy) trong một transaction.
   */
  async softDeleteWithChildren(id: string, storeId: string): Promise<void> {
    const descendants = await this.findDescendants(id, storeId);
    const deletedAt = this.now();

    await this.executeTransaction(async () => {
      for (const child of descendants) {
        await this.update(child.id, {
          deleted_at: deletedAt,
          status: 'inactive',
          updated_at: deletedAt,
          sync_status: 'pending_sync',
        });
      }
      await this.update(id, {
        deleted_at: deletedAt,
        status: 'inactive',
        updated_at: deletedAt,
        sync_status: 'pending_sync',
      });
    });
  }

  // ─── UPSERT / SYNC ────────────────────────────────────────────────────────

  /**
   * Upsert: update nếu đã tồn tại theo id, create nếu chưa có.
   * Dùng khi import / đồng bộ dữ liệu từ server.
   */
  async upsert(data: Category): Promise<Category> {
    const existing = await this.findCategoryById(data.id);
    if (existing) {
      const {id, created_at, store_id, ...rest} = data;
      return this.updateCategory(id, rest as UpdateCategoryInput);
    }
    return this.create(data) as Promise<Category>;
  }

  /**
   * Bulk upsert trong một transaction – dùng cho sync từ server xuống.
   */
  async bulkUpsert(rows: Category[]): Promise<void> {
    await this.executeTransaction(async () => {
      for (const row of rows) {
        await this.upsert(row);
      }
    });
  }
}

export default CategoryService;
