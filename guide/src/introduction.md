# Giới thiệu dự án

**AI Image Editor** là một ứng dụng thiết kế đồ họa trực tuyến mạnh mẽ được tích hợp các công nghệ AI tiên tiến như Google Gemini và Hugging Face.

## Mục tiêu dự án

Tài liệu này xác định các yêu cầu cho ứng dụng chỉnh sửa ảnh trên trình duyệt, kết hợp giao diện kéo thả kiểu Canva và sức mạnh của AI. Ứng dụng tập trung vào tính đơn giản: **không cần đăng nhập**, dữ liệu được quản lý theo dạng dự án (Project-based) và lưu trữ trực tiếp trên hệ thống tệp tin (File System) của server để đảm bảo tính di động và toàn vẹn của dữ liệu.

## Phạm vi MVP (Minimum Viable Product)

**Trong phạm vi (In scope):**

- Trình chỉnh sửa Canvas tương tác (kéo thả, thay đổi kích thước, xoay vật thể) sử dụng Fabric.js.
- Tạo ảnh từ văn bản (Text-to-Image) qua Gemini API; ảnh tạo ra được tự động tải về và lưu trữ cục bộ trong thư mục dự án.
- Hỗ trợ tải lên hình ảnh cá nhân và dán ảnh từ Clipboard (Paste).
- Quản lý danh sách dự án gần đây (lưu trữ trên server-side file system).
- Xuất thiết kế ra định dạng hình ảnh (PNG/JPG) hoặc nén toàn bộ thư mục dự án thành file ZIP.
- Hoàn toàn miễn phí và ẩn danh.

**Ngoài phạm vi (Out of scope):**

- Hệ thống tài khoản người dùng và phân quyền.
- Thay thế nền, đổi quần áo hoặc các chỉnh sửa pixel nâng cao khác.
- Lưu trữ đám mây công cộng (Cloud sync) hoặc chia sẻ link cộng tác.

## Các công nghệ cốt lõi

- **Frontend**: React, Fabric.js, Zustand.
- **Backend**: Node.js, Express, Sharp.
- **AI**: Gemini 2.0 Flash, Flux.1, Stable Diffusion XL.
