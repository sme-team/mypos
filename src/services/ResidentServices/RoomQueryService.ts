import {Room, RoomStatus} from '../../screens/pos/types';

export const RoomQueryService = {
  // ─────────────────────────────────────────────────────────────────
  // 1.1 - Lấy tất cả phòng, nhóm theo tầng
  // ─────────────────────────────────────────────────────────────────

  async getRooms(storeId?: string): Promise<any[]> {
    try {
      const {getMyPosDB} = require('../../database/index');
      const db = getMyPosDB();

      const q = `
      SELECT 
        v.id AS variant_id,
        -- Tên phòng: ưu tiên variant_code (P.101), fallback về name
        COALESCE(NULLIF(TRIM(v.variant_code), ''), v.name) AS room_name,
        CAST(json_extract(v.attributes, '$.floor') AS INTEGER) AS floor,
        
        -- Trạng thái phòng
        CASE 
          WHEN v.status = 'inactive' THEN 'maintenance'
          WHEN c.id IS NOT NULL THEN 'occupied'
          ELSE 'available' 
        END AS room_status,
        
        cu.full_name AS current_tenant_name,
        c.id AS contract_id,
        c.end_date AS contract_end_date,
        c.start_date AS contract_start_date,
        v.attributes,

        -- === XỬ LÝ GIÁ: Ưu tiên price_list_name = 'default', fallback MIN(price) ===
        COALESCE(
          MAX(CASE WHEN pr.price_list_name = 'default' THEN pr.price END),
          MIN(pr.price),
          0
        ) AS current_price

      FROM product_variants v
      INNER JOIN products p 
        ON p.id = v.product_id 
        AND p.product_type = 'room'
        -- AND p.store_id = ?          -- bỏ comment nếu cần lọc theo store
        AND (p.deleted_at IS NULL OR p.deleted_at = '')

      LEFT JOIN prices pr 
        ON pr.variant_id = v.id 
        AND pr.status = 'active'
        AND (pr.effective_to IS NULL OR pr.effective_to = '')
        AND (pr.deleted_at IS NULL OR pr.deleted_at = '')

      LEFT JOIN contracts c 
        ON c.variant_id = v.id 
        AND c.status = 'active'
        AND (c.deleted_at IS NULL OR c.deleted_at = '')

      LEFT JOIN customers cu 
        ON cu.id = c.customer_id

      WHERE (v.deleted_at IS NULL OR v.deleted_at = '')

      -- GROUP BY để loại bỏ duplicate do join nhiều giá
      GROUP BY 
        v.id, 
        v.name, 
        v.variant_code,
        v.status, 
        v.attributes, 
        c.id, 
        c.end_date, 
        c.start_date, 
        cu.full_name

      ORDER BY 
        CASE 
          WHEN json_extract(v.attributes, '$.floor') IS NULL THEN 9999 
          ELSE CAST(json_extract(v.attributes, '$.floor') AS INTEGER) 
        END ASC,
        room_name ASC
    `;

      const result = await db.execute(q, []); // nếu mở store_id thì đổi thành [storeId]
      const rows: any[] = result?.rows || [];

      return rows.map(r => {
        // Parse attributes
        let attrs: any = {};
        try {
          attrs = JSON.parse(r.attributes || '{}');
        } catch {
          attrs = {};
        }

        // Xử lý trạng thái + màu sắc + tag
        let rStatus: RoomStatus = 'available';
        let rLabel = 'Sẵn sàng';
        let borderColor = '#4CAF50'; // xanh = trống
        let tag: string | undefined;
        let tagColor: string | undefined;

        if (r.room_status === 'occupied') {
          rStatus = 'occupied';
          rLabel = 'Đang ở';
          borderColor = '#FF6B6B'; // đỏ = có khách

          if (r.contract_end_date && r.contract_end_date !== '') {
            const dt = new Date(r.contract_end_date);
            const day = dt.getDate();
            const month = dt.getMonth() + 1;
            tag = `Hết hạn: ${day}/${month}`;
            tagColor = '#FF6B6B';
          }
        } else if (r.room_status === 'maintenance') {
          rStatus = 'cleaning';
          rLabel = 'Bảo trì';
          borderColor = '#FF9800'; // cam
          tagColor = '#FF9800';
        }

        return {
          id: r.variant_id,
          name: r.room_name,
          status: rStatus,
          label: rLabel,
          price: r.current_price, // ← giá đã xử lý ưu tiên default
          floor: r.floor ?? null,
          customer_name: r.current_tenant_name,
          contract_id: r.contract_id,
          end_date: r.contract_end_date,
          start_date: r.contract_start_date,

          // Thông tin từ attributes
          area: attrs.area ?? null,
          bed_type: attrs.bed ?? attrs.beds ?? null,
          view: attrs.view ?? null,
          wc: attrs.wc ?? null,

          // UI
          tag,
          tagColor,
          borderColor,
          contract_status: r.room_status === 'occupied' ? 'active' : 'inactive',
          metadata: r.attributes,
        };
      });
    } catch (err) {
      console.error('[RoomQueryService] getRooms error:', err);
      return [];
    }
  },
  // ─────────────────────────────────────────────────────────────────
  // 1.2 – Lấy danh sách phòng TRỐNG để đổi phòng
  // ─────────────────────────────────────────────────────────────────
  async getAvailableRooms(
    currentVariantId: string,
    storeId?: string,
  ): Promise<any[]> {
    try {
      const {getMyPosDB} = require('../../database/index');
      const db = getMyPosDB();

      const q = `
        SELECT
          v.id AS variant_id,

          COALESCE(
            NULLIF(TRIM(v.variant_code), ''),
            v.name
          ) AS room_name,

          CAST(json_extract(v.attributes, '$.floor') AS INTEGER) AS floor,
          COALESCE(pr.price, 0) AS price,
          json_extract(v.attributes, '$.area') AS area,
          COALESCE(
            json_extract(v.attributes, '$.bed'),
            json_extract(v.attributes, '$.beds')
          ) AS bed_type

        FROM product_variants v

        INNER JOIN products p
          ON  p.id           = v.product_id
          AND p.product_type = 'room'
          -- AND p.store_id     = ?
          AND (p.deleted_at IS NULL OR p.deleted_at = '')

        LEFT JOIN prices pr
          ON  pr.variant_id  = v.id
          AND pr.status      = 'active'
          AND (pr.effective_to IS NULL OR pr.effective_to = '')
          AND (pr.deleted_at  IS NULL OR pr.deleted_at  = '')

        LEFT JOIN contracts c
          ON  c.variant_id = v.id
          AND c.status     = 'active'
          AND (c.deleted_at IS NULL OR c.deleted_at = '')

        WHERE v.id    != ?
          AND v.status = 'active'
          AND c.id    IS NULL
          AND (v.deleted_at IS NULL OR v.deleted_at = '')

        ORDER BY
          CASE
            WHEN json_extract(v.attributes, '$.floor') IS NULL THEN 9999
            ELSE CAST(json_extract(v.attributes, '$.floor') AS INTEGER)
          END ASC,
          room_name ASC
      `;

      // const result = await db.execute(q, [storeId, currentVariantId]);
      const result = await db.execute(q, [currentVariantId]);
      return (
        result?.rows?.map((r: any) => ({
          id: r.variant_id,
          name: r.room_name,
          price: r.price,
          floor: r.floor,
          area: r.area,
          bed_type: r.bed_type,
          status: 'available',
        })) || []
      );
    } catch (err) {
      console.error('[RoomQueryService] getAvailableRooms error:', err);
      return [];
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // 1.3 – Lấy chi tiết 1 phòng đang có khách
  // ─────────────────────────────────────────────────────────────────
  async getRoomDetails(variantId: string): Promise<any> {
    try {
      const {getMyPosDB} = require('../../database/index');
      const db = getMyPosDB();

      const q = `
        SELECT
          v.id   AS variant_id,
          COALESCE(NULLIF(TRIM(v.variant_code), ''), v.name) AS room_name,
          CAST(json_extract(v.attributes, '$.floor') AS INTEGER) AS floor,
          json_extract(v.attributes, '$.area')    AS area,
          p.name AS category_name,

          c.id              AS contract_id,
          c.contract_number,
          c.start_date,
          c.end_date,
          c.rent_amount,
          c.electric_rate,
          c.water_rate,

          cu.full_name,
          cu.phone,
          cu.id_number,

          b.id               AS last_bill_id,
          b.total_amount,
          b.paid_amount,
          b.remaining_amount,
          b.bill_status,
          b.issued_at,

          -- Chỉ số điện/nước từ bill_details gần nhất
          MAX(CASE
            WHEN bd.line_description LIKE '%điện%'
              OR bd.line_description LIKE '%electric%'
            THEN bd.reading_from END) AS electric_reading_from,

          MAX(CASE
            WHEN bd.line_description LIKE '%điện%'
              OR bd.line_description LIKE '%electric%'
            THEN bd.reading_to   END) AS electric_reading_to,

          MAX(CASE
            WHEN bd.line_description LIKE '%nước%'
              OR bd.line_description LIKE '%water%'
            THEN bd.reading_from END) AS water_reading_from,

          MAX(CASE
            WHEN bd.line_description LIKE '%nước%'
              OR bd.line_description LIKE '%water%'
            THEN bd.reading_to   END) AS water_reading_to

        FROM product_variants v

        INNER JOIN products p
          ON p.id = v.product_id

        INNER JOIN contracts c
          ON  c.variant_id = v.id
          AND c.status     = 'active'
          AND (c.deleted_at IS NULL OR c.deleted_at = '')

        INNER JOIN contract_members cm
          ON  cm.contract_id = c.id
          AND cm.is_primary  IN (1, '1', 'true')
          AND (cm.deleted_at IS NULL OR cm.deleted_at = '')

        INNER JOIN customers cu
          ON cu.id = cm.customer_id

        -- Bill gần nhất của hợp đồng này
        LEFT JOIN (
          SELECT *
          FROM bills
          WHERE ref_type  = 'contract'
            AND (deleted_at IS NULL OR deleted_at = '')
          ORDER BY created_at DESC
          LIMIT 1
        ) b ON b.ref_id = c.id

        LEFT JOIN bill_details bd
          ON  bd.bill_id    = b.id
          AND (bd.deleted_at IS NULL OR bd.deleted_at = '')

        WHERE v.id = ?
          AND (v.deleted_at IS NULL OR v.deleted_at = '')

        GROUP BY v.id
      `;

      const result = await db.execute(q, [variantId]);

      if (!result?.rows?.length) return null;

      const r = result.rows[0];

      return {
        variant_id: r.variant_id,
        room_name: r.room_name,
        floor: r.floor,
        area: r.area,
        category_name: r.category_name,

        contract_id: r.contract_id,
        contract_number: r.contract_number,
        start_date: r.start_date,
        end_date: r.end_date,
        rent_amount: r.rent_amount,
        electric_rate: r.electric_rate,
        water_rate: r.water_rate,

        customer_name: r.full_name,
        customer_phone: r.phone,
        customer_id_number: r.id_number,

        last_bill_id: r.last_bill_id,
        total_amount: r.total_amount,
        paid_amount: r.paid_amount,
        remaining_amount: r.remaining_amount,
        bill_status: r.bill_status,
        issued_at: r.issued_at,

        // Chỉ số điện nước — lấy giá trị mới nhất (reading_to), fallback reading_from
        electric_index: r.electric_reading_to ?? r.electric_reading_from ?? 0,
        water_index: r.water_reading_to ?? r.water_reading_from ?? 0,
        electric_reading_from: r.electric_reading_from ?? 0,
        water_reading_from: r.water_reading_from ?? 0,
      };
    } catch (err) {
      console.error('[RoomQueryService] getRoomDetails error:', err);
      return null;
    }
  },
};
