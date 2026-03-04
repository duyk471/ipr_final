# Hướng dẫn lấy API Key

Ứng dụng yêu cầu hai loại API Key để hoạt động đầy đủ các tính năng AI.

## 1. Google Gemini API Key

Dùng cho tính năng **AI Design Assistant** (Phân tích thiết kế và gợi ý cải thiện).

### Các bước lấy key

1. Truy cập [Google AI Studio](https://aistudio.google.com/).
2. Đăng nhập bằng tài khoản Google của bạn.
3. Nhấn vào nút **"Get API key"** ở cột bên trái.
4. Chọn **"Create API key in new project"**.
5. Sao chép đoạn mã (key) vừa tạo.

---

## 2. Hugging Face API Key

Dùng cho tính năng **AI Image Generation** (Tạo ảnh từ văn bản).

### Các bước lấy key

1. Truy cập [Hugging Face Settings](https://huggingface.co/settings/tokens).
2. Đăng nhập hoặc tạo tài khoản mới.
3. Nhấn vào nút **"New token"**.
4. Đặt tên cho token (ví dụ: `AI-Editor-Project`).
5. Chọn loại (Type) là **"Read"**.
6. Nhấn **"Generate a token"** và sao chép đoạn mã.

---

## 3. Cấu hình vào ứng dụng

1. Mở thư mục `backend/` trong dự án.
2. Tìm tệp `.env` (nếu chưa có, hãy tạo mới từ tệp `.env.example` hoặc tạo tệp trống).
3. Dán các key vào đúng vị trí:

```env
GEMINI_API_KEY=AIzaSy... (Dán key Gemini vào đây)
HUGGINGFACE_API_KEY=hf_... (Dán key Hugging Face vào đây)
```

1. Khởi động lại server backend để áp dụng thay đổi.
