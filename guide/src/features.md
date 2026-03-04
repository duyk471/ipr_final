# Các tính năng AI và Hệ thống

Dự án này tích hợp các tính năng AI hiện đại nhất hiện nay.

## Yêu cầu chức năng (Functional Requirements)

### 1. Quản lý dự án

- Tạo dự án mới (Khởi tạo thư mục với ID duy nhất).
- Hiển thị danh sách dự án hiện có trên server kèm ảnh Preview.
- Tự động lưu (Auto-save) trạng thái Canvas vào `index.json` sau mỗi hành động chỉnh sửa.
- Xóa dự án (Xóa toàn bộ thư mục vật lý).

### 2. Trình soạn thảo Canvas

- Thêm ảnh từ máy tính hoặc dán (Paste) từ clipboard.
- Chèn văn bản tương tác (i-Text) cho phép gõ trực tiếp trên Canvas.
- Chèn các hình khối cơ bản (Rectangle, Circle, Triangle).
- Thao tác đối tượng: Di chuyển, Co dãn (giữ tỉ lệ), Xoay, Thay đổi thứ tự lớp (Z-index).
- Chức năng Undo/Redo (tối thiểu 15 bước trong phiên làm việc).

### 3. Tích hợp AI (AI Features)

#### Trợ lý Thiết kế AI (AI Assist)

- Sử dụng **Gemini 2.0 Flash (Multimodal)** để "nhìn" thấy bản thiết kế hiện tại của người dùng.
- AI sẽ gợi ý các cải thiện về bố cục, màu sắc và font chữ.
- Chế độ **"Apply Improvements"** cho phép AI tự động cập nhật JSON của Canvas.

#### Tạo ảnh bằng AI (AI Design)

- Người dùng nhập mô tả văn bản (Prompt).
- Backend gửi yêu cầu đến **Hugging Face Router**.
- Backend tự động tải ảnh từ API về thư mục `assets/` của dự án trước khi hiển thị lên Canvas.
- Metadata của AI (Prompt) được lưu trữ vào thuộc tính của ảnh trên Canvas.
- Có tính năng **Tách nền tự động** (Alpha Channel) sau khi tạo ảnh AI.

### 4. Nhập / Xuất (Import / Export)

- Xuất thiết kế hiện tại thành file ảnh (PNG/JPG).
- Xuất toàn bộ dự án thành file `.zip` (bao gồm JSON và tất cả Assets).
- Nhập dự án từ file `.zip` để tiếp tục chỉnh sửa.
