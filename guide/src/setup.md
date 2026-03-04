# Hướng dẫn cài đặt

Để bắt đầu với dự án, hãy làm theo các bước bên dưới.

## Yêu cầu hệ thống

- **Node.js**: Phiên bản 14 trở lên.
- **npm**: Thư viện quản lý gói mặc định.
- **API Key**: Gemini API Key và HuggingFace API Key.

## Các bước thực hiện

1. **Cài đặt cho Backend**:
   - `cd backend`
   - `npm install`
2. **Cài đặt cho Frontend**:
   - `cd frontend`
   - `npm install`
3. **Cấu hình biến môi trường**:
   - Tạo tệp `backend/.env`.
   - Thêm `GEMINI_API_KEY` và `HUGGINGFACE_API_KEY`.
4. **Chạy ứng dụng**:
   - Backend: `npm run dev` bên trong thư mục `backend`.
   - Frontend: `npm run dev` bên trong thư mục `frontend`.

Truy cập ứng dụng tại `http://localhost:5173`.
