# Kiến trúc hệ thống AI Image Editor

Tài liệu này giải thích cách thức hoạt động bên trong của ứng dụng, giúp các nhà phát triển mới hiểu rõ luồng dữ liệu và cách các thành phần tương tác với nhau.

---

## 1. Thiết kế tổng thể (Design Overview)

Ứng dụng được xây dựng theo mô hình **Client-Server** truyền thống, nhưng có đặc thù là xử lý đồ họa nặng ở phía Client (Frontend) và xử lý AI ở phía Server (Backend).

- **Frontend (React + Fabric.js)**: Đảm nhận việc vẽ, quản lý layer, tương tác người dùng và chụp ảnh màn hình canvas.
- **Backend (Node.js + Express)**: Đảm nhận việc lưu trữ file vật lý, gọi API AI (Gemini/HuggingFace) và xử lý hậu kỳ ảnh (Xóa nền bằng `sharp`).
- **Storage (Local File System)**: Toàn bộ dữ liệu dự án được lưu thành các thư mục riêng biệt thay vì sử dụng Database truyền thống. Điều này giúp dự án cực kỳ dễ dàng để di chuyển (Portable).

---

## 2. Luồng dữ liệu Canvas (Canvas State Flow)

### Lưu trữ (Saving)

1. Người dùng thực hiện thay đổi trên Canvas.
2. `FabricCanvas.jsx` sử dụng một `saveTimeout` (1 giây) để trì hoãn việc lưu (Debounce).
3. Khi hết thời gian, nó gọi `canvas.toObject(['id', 'metadata'])` để lấy JSON và `canvas.toDataURL()` để lấy ảnh Preview.
4. Dữ liệu này được gửi đến `api.put('/projects/:id')`.
5. Backend ghi dữ liệu vào `index.json` và lưu ảnh vào `preview.png`.

### Nạp lại (Loading)

1. Khi mở một dự án, Frontend gọi `GET /projects/:id`.
2. Backend trả về toàn bộ nội dung `index.json`.
3. Frontend sử dụng `canvas.loadFromJSON()` để khôi phục các layer.
4. **Lưu ý**: Hệ thống có cơ chế tự động lọc bỏ (Filter) các layer ảnh bị lỗi hoặc mất file vật lý để bảo vệ tính toàn vẹn của Canvas.

---

## 3. Tích hợp AI (AI Integration Flow)

### AI Image Generation

- **Backend**: Sử dụng hệ thống **Multi-Model Fallback** (Flux -> SDXL -> SD 1.5). Nếu một model của HuggingFace bị lỗi hoặc quá tải, hệ thống sẽ tự động chuyển sang model tiếp theo.
- **Hậu kỳ**: Nếu người dùng chọn "Transparent Background", Backend sẽ dùng `sharp` để thực hiện tách nền dựa trên màu trắng (Alpha channel) trước khi lưu ảnh vào đĩa.

### AI Design Assistant (Multimodal)

1. Frontend chụp ảnh màn hình Canvas hiện tại (Base64).
2. Gửi cả ảnh này và JSON state hiện tại sang Backend.
3. Backend gọi **Gemini 2.0 Flash** với một Prompt chuyên dụng yêu cầu đánh giá bố cục và màu sắc.
4. Gemini trả về 3 lời khuyên và một **Updated JSON**.
5. Người dùng nhấn "Apply", Frontend nạp Updated JSON này vào `loadFromJSON` của Fabric.js.

---

## 4. Quản lý File & Import/Export

- **Relative Paths**: Tất cả ảnh trong `index.json` đều được lưu dưới dạng đường dẫn tương đối để đảm bảo tính di động.
- **Project Import**: Khi giải nén một file `.zip`, Backend sẽ quét toàn bộ JSON để tìm các UUID cũ và thay thế bằng UUID mới của project hiện tại bằng **Regular Expression**.

---

## 5. Quy trình đóng góp (Contributing Guide)

Nếu bạn muốn đóng góp cho dự án này:

1. **Fork** dự án này về tài khoản của bạn.
2. **Clone** và chạy `npm install` ở cả 2 thư mục.
3. Tạo một **Branch** mới cho tính năng của bạn.
4. Đảm bảo code của bạn tuân thủ:
    - Sử dụng Functional Components và Hooks (React).
    - Zustand cho State Management thay vì Redux.
    - Các logic xử lý file nặng phải nằm ở `services/storageService.js` của Backend.
5. Tạo **Pull Request** kèm theo mô tả chi tiết các thay đổi.

---
Mọi thắc mắc về kiến trúc, vui lòng liên hệ đội ngũ phát triển chính.
