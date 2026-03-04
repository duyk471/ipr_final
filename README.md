# AI Image Editor

- 📖 **[Kiến trúc hệ thống](ARCHITECTURE.md)**
- 📋 **[SRS](srs.md)**: yêu cầu phần mềm.

## 1. Tính năng chính (Key Features)

- **Canvas Editor Chuyên Nghiệp**: Hỗ trợ Text, Hình khối (Shape), Ảnh, Undo/Redo, Layering (Fabric.js).
- **AI Image Generation**: Tạo ảnh nghệ thuật từ văn bản (Hugging Face - Flux/SDXL).
- **Auto Background Removal**: Tách nền ảnh AI tự động bằng thư viện `sharp`.
- **AI Design Assistant**:
  - Review bản thiết kế và đưa ra 3 lời khuyên cải thiện (Gemini 2.0 Flash).
  - Tự động áp dụng cải thiện (Auto-fix) trực tiếp lên Canvas.
- **Quản lý Dự án**: Lưu trữ cục bộ (Local Storage System), xem danh sách dự án với Thumbnail.
- **Import/Export**: Xuất dự án ra file `.zip` và nhập ngược lại vào hệ thống một cách dễ dàng.

## 2. Kiến trúc & Công nghệ (Tech Stack)

### Frontend

- **Framework**: React (Vite)
- **Styling**: Vanilla CSS & Tailwind CSS
- **Canvas Engine**: Fabric.js (v7.x)
- **State Management**: Zustand
- **Icons**: Lucide React

### Backend

- **Runtime**: Node.js (Express.js)
- **File System**: `fs-extra` (Quản lý dự án theo cấu trúc folder)
- **Xử lý ảnh**: `sharp` (Tách nền, tạo preview)
- **AI SDK**: `@google/generative-ai` (Gemini API)
- **ZIP Handling**: `archiver`, `adm-zip`

## 3. Cấu trúc thư mục (Project Structure)

```text
ai-image-editor/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Xử lý logic AI, Project, Assets
│   │   ├── routes/         # Định nghĩa API endpoints
│   │   ├── services/       # Storage logic & AI integration
│   │   └── index.js        # Khởi tạo server (Port 5000)
│   ├── storage/            # Nơi lưu trữ thực tế các dự án
│   └── .env                # Chứa API Keys (Gemini & HuggingFace)
├── frontend/
│   ├── src/
│   │   ├── components/     # Editor, Sidebar, Dashboard components
│   │   ├── pages/          # Dashboard & Editor pages
│   │   └── store/          # Zustand store cho Canvas & API
│   └── index.html
└── README.md
```

## 4. Hướng dẫn cài đặt (Setup Guide)

### Bước 1: Clone dự án và cài đặt dependencies

**Cài đặt cho Backend:**

```bash
cd backend
npm install
```

**Cài đặt cho Frontend:**

```bash
cd frontend
npm install
```

### Bước 2: Cấu hình biến môi trường (.env)

Tạo file `.env` bên trong thư mục `backend/` với nội dung sau:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

*Lưu ý: Bạn cần có API Key từ Google AI Studio và Hugging Face để sử dụng các tính năng AI.*

### Bước 3: Chạy ứng dụng

Bạn cần chạy đồng thời cả Backend và Frontend.

**Chạy Backend (Port 5000):**

```bash
cd backend
npm run dev
```

**Chạy Frontend (Thường là Port 5173):**

```bash
cd frontend
npm run dev
```

Sau khi chạy cả hai, hãy truy cập vào địa chỉ URL hiển thị ở terminal (ví dụ: `http://localhost:5173`).

## 5. Cấu trúc một dự án (Project Storage)

Mỗi dự án được lưu tại `backend/storage/projects/[uuid]/`:

- `index.json`: Chứa metadata, thông tin canvas và danh sách layers (JSON).
- `preview.png`: Thumbnail của dự án hiển thị ở Dashboard.
- `assets/`: Thư mục lưu trữ các hình ảnh được tải lên hoặc tạo ra bởi AI.

## 6. Lưu ý quan trọng

- Khi Import dự án từ file `.zip`, hệ thống sẽ tự động ánh xạ (remap) lại các đường dẫn ảnh để đảm bảo ảnh hiển thị đúng ngay cả khi Project ID thay đổi.
- Tính năng **AI Assist** yêu cầu ảnh chụp màn hình Canvas và JSON state để Gemini có thể phân tích chính xác nhất.

## 7. Build Documentation

Chạy lệnh sau

```bash
cd guide/ && mdbook build
```
