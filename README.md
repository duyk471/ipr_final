# Dự án IPR cuối kì

Đây là thông tin cơ bản về dự án:

- Nếu muốn đọc thêm cấu trúc một Project của ứng dụng, hãy đọc: [Cấu trúc một dự án](project.md)
- Nếu muốn đọc bản SRS (Software Requirements Specification), hãy đọc: [Bản SRS của dự án](srs.md)

## 1. Kiến trúc tổng thể (Tech Stack)

- *Frontend:*
  - *Framework:* React (Vite)
  - *Styling:* Tailwind CSS
  - *Canvas Engine:* *Fabric.js* - Quản lý các đối tượng (ảnh, text, hình khối).
  - *State Management:* Zustand (Nhẹ hơn Redux, phù hợp để quản lý trạng thái Canvas).
  - *Icons:* Lucide React.
- *Backend:*
  - *Runtime:* Node.js (Express.js).
  - *File Handling:* `fs-extra` (Mở rộng của module `fs` giúp thao tác thư mục dễ dàng hơn).
  - *Image Processing:* `sharp` (Để tạo ảnh preview/thumbnail tự động).
  - *Upload:* `multer` (Xử lý ảnh người dùng tải lên).
- *AI Integration:*
  - *API:* Google Gemini SDK (`@google/generative-ai`). Chưa thống nhất hoàn toàn về vấn đề này
  - *Flow:* Backend gọi Gemini -> Tải ảnh từ URL của Gemini về -> Lưu vào folder `assets/` cục bộ -> Trả về đường dẫn nội bộ cho Frontend.
- *Storage:*
  - Hệ thống thư mục phân cấp trên Server/Máy host.

## 2. Cấu trúc thư mục (Project Structure)

```text
ai-image-editor/
├── backend/
│   ├── storage/                # Nơi lưu trữ toàn bộ dữ liệu dự án
│   │   └── projects/
│   │       └── [project-id]/   # Thư mục riêng cho từng dự án
│   │           ├── index.json  # Cấu trúc Canvas (vị trí, layer, metadata)
│   │           ├── preview.png # Ảnh chụp nhanh giao diện để hiển thị ở list
│   │           └── assets/     # Chứa tất cả ảnh (upload, AI gen, pasted)
│   ├── src/
│   │   ├── controllers/        # Logic: projectController, aiController
│   │   ├── routes/             # Định nghĩa các API endpoints
│   │   ├── services/           # Logic gọi Gemini, xử lý File System
│   │   ├── middleware/         # Xử lý lỗi, static file serving
│   │   └── index.js            # Khởi tạo server Express
│   ├── .env                    # Chứa GEMINI_API_KEY, PORT
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor/         # Fabric Canvas, Toolbar, Sidebar
│   │   │   ├── Dashboard/      # Project List, Create New Project
│   │   │   └── UI/             # Button, Modal, Input (Tailwind)
│   │   ├── hooks/              # useFabricCanvas (Custom hook quản lý Fabric)
│   │   ├── store/              # Zustand store (canvasState, currentProject)
│   │   └── services/           # Axios calls đến Backend
│   ├── public/                 # Static assets của frontend
│   ├── tailwind.config.js
│   └── package.json
└── docker-compose.yml          # (Tùy chọn) Để đóng gói cả app chạy ở bất cứ đâu
```

## 3. Danh sách API Endpoints

Vì lưu bằng File System, các API sẽ tập trung vào việc đọc/ghi tệp:

### A. Quản lý dự án (Project Management)

1.  *GET `/api/projects`*: Quét thư mục `storage/projects/` để lấy danh sách tất cả dự án (trả về tên, ID, và ảnh preview).
2.  *POST `/api/projects`*: Tạo thư mục dự án mới với một file `index.json` mặc định.
3.  *GET `/api/projects/:id`*: Đọc file `index.json` của dự án cụ thể.
4.  *PUT `/api/projects/:id`*: Ghi đè dữ liệu Canvas mới vào `index.json` (Auto-save).
5.  *DELETE `/api/projects/:id`*: Xóa toàn bộ thư mục của dự án đó.
6.  *POST `/api/projects/:id/export`*: Nén toàn bộ thư mục dự án thành file `.zip` để tải về máy.

### B. Xử lý hình ảnh & Assets

7.  *POST `/api/projects/:id/assets/upload`*: Nhận file ảnh người dùng upload -> Lưu vào `projects/:id/assets/` -> Trả về path.
8.  *POST `/api/projects/:id/assets/pasted`*: Nhận dữ liệu Base64 (từ lệnh Paste) -> Chuyển thành file `.png` -> Lưu vào `assets/`.
9.  *GET `/api/assets/:projectId/:filename`*: API trung gian (hoặc Static route) để lấy ảnh hiển thị lên Canvas mà không bị lỗi CORS.

### C. AI Generation (Gemini)

*POST `/api/ai/generate`*:

- Nhận: `prompt`, `projectId`.
- Xử lý: Gọi Gemini API -> Nhận URL ảnh -> *Tải ảnh về* lưu vào `projects/:projectId/assets/` với tên file `ai_[timestamp].png`.
- Trả về: Đường dẫn tệp tin vừa lưu để Frontend add vào Fabric.js.

