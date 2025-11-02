# 💰 myPOS — Open Source Point of Sale

> 🧾 **Nền tảng bán hàng mã nguồn mở** cho mọi cá nhân, hộ kinh doanh và doanh nghiệp nhỏ.  
> Dễ dùng, miễn phí hoàn toàn, không phụ thuộc Internet hay máy chủ trung gian.

---

## 🌟 Featured Highlights

- 💻 Chạy trực tiếp trên **máy tính, điện thoại hoặc máy tính bảng**
- 🧠 Quản lý sản phẩm, khách hàng, hóa đơn, tồn kho và thu chi
- 🔌 Không cần Internet, hoạt động **offline-first**
- 💸 Miễn phí hoàn toàn — không giới hạn người dùng
- 📱 Dùng được trên **Windows / Android / iOS / macOS**
- 🧩 Mã nguồn mở, dễ mở rộng và tích hợp
- 🧮 Đồng bộ dữ liệu nội bộ hoặc qua đám mây tùy chọn
- 🌍 Hỗ trợ nhiều ngôn ngữ, ưu tiên tiếng Việt
- 🧾 Tích hợp thanh toán (QR, ví điện tử, ngân hàng) trong các bản mở rộng

---

## 🎯 Mục tiêu dự án

- Hỗ trợ **mọi cá nhân hoặc nhóm khởi nghiệp** nhanh chóng có hệ thống bán hàng số hóa.  
- Giúp **doanh nghiệp nhỏ** tiết kiệm chi phí phần mềm, tự vận hành hiệu quả.  
- Xây dựng **cộng đồng phát triển mở**, đóng góp cải tiến và chia sẻ kiến thức quản lý.  

---

## 🧱 Cấu trúc dự án

mypos/
├── apps/
│ ├── desktop/ # Ứng dụng POS chạy trên Electron
│ ├── mobile/ # Ứng dụng React Native
│ └── web/ # Giao diện web (Next.js)
├── backend/ # Fastify API server
├── database/ # SQLite / PostgreSQL schema
├── docs/ # Tài liệu hướng dẫn
└── .github/
├── workflows/ # CI/CD pipelines
└── ISSUE_TEMPLATE/


---

## ⚙️ Công nghệ sử dụng

| Thành phần | Công nghệ |
|-------------|------------|
| Frontend | React / React Native / Next.js |
| Backend | Node.js (Fastify) |
| Database | SQLite (offline) / PostgreSQL (cloud option) |
| CI/CD | GitHub Actions |
| License | GNU License |

---

## 🧠 Tính năng cốt lõi (Core Features)

| Nhóm | Mô tả |
|------|-------|
| 🛒 **Bán hàng** | Giao diện đơn giản, thao tác nhanh, tạo hóa đơn ngay |
| 🧾 **Quản lý sản phẩm** | Danh mục, tồn kho, đơn giá, barcode |
| 👥 **Khách hàng & Nhà cung cấp** | Quản lý lịch sử giao dịch, công nợ |
| 💰 **Thu chi & Báo cáo** | Doanh thu, chi phí, lợi nhuận, thống kê theo ngày |
| ☁️ **Đồng bộ dữ liệu** | Tùy chọn kết nối giữa nhiều thiết bị |
| 🔐 **Bảo mật dữ liệu cá nhân** | Mã hóa nội bộ, lưu trữ riêng tư |

---

## 🧩 Đóng góp (Contributing)

1. Fork repository  
2. Tạo branch: `feature/ten-tinh-nang`  
3. Commit thay đổi  
4. Gửi Pull Request để được review  

Xem thêm tại [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 💬 Cộng đồng

- 🗣️ **Discussions:** nơi trao đổi, hỏi đáp và đề xuất tính năng  
- 🐞 **Issues:** báo lỗi hoặc yêu cầu cải tiến  
- 🌟 **Contributors:** được ghi nhận tự động qua CI khi merge PR

---

## 📜 License

Phát hành theo [GNU License](LICENSE).

---

> ❤️ myPOS được tạo ra **cho cộng đồng** — vì mọi người xứng đáng có công cụ kinh doanh tự do và công bằng.
