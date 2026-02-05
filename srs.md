# Software Requirements Specification (SRS) – AI-Powered Image Editor Web App

## 1. Introduction

### 1.1 Purpose

Tài liệu này xác định các yêu cầu cho ứng dụng chỉnh sửa ảnh trên trình duyệt, kết hợp giao diện kéo thả kiểu Canva và sức mạnh của AI. Ứng dụng tập trung vào tính đơn giản: **không cần đăng nhập**, dữ liệu được quản lý theo dạng dự án (Project-based) và lưu trữ trực tiếp trên hệ thống tệp tin (File System) của server để đảm bảo tính di động và toàn vẹn của dữ liệu.

### 1.2 Scope – MVP

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

### 1.3 Definitions & Acronyms

- **Canvas**: Không gian làm việc chính, quản lý các đối tượng theo lớp (layers).
- **Project Folder**: Thư mục riêng biệt trên server chứa `index.json`, `preview.png` và thư mục `assets/`.
- **Assets**: Các tài nguyên hình ảnh được sử dụng trong dự án (không sử dụng link bên ngoài).
- **Fabric.js**: Thư viện chính điều khiển các tương tác trên Canvas.

## 2. Overall Description

### 2.1 Product Perspective

Một công cụ gọn nhẹ, khởi động tức thì, cho phép người dùng kết hợp ảnh cá nhân và ảnh AI tạo ra thành một thiết kế hoàn chỉnh. Khác với các web-app thông thường, ứng dụng này hoạt động như một "File-based Tool", nơi mỗi thiết kế là một thực thể độc lập trên ổ đĩa.

### 2.2 User Classes

Người dùng phổ thông, nhà sáng tạo nội dung mạng xã hội cần công cụ nhanh, không rào cản đăng ký.

### 2.3 Operating Environment

- **Frontend**: React (Vite), Tailwind CSS, Fabric.js.
- **Backend**: Node.js (Express), quản lý file qua `fs-extra`.
- **AI Integration**: Google Gemini API (Image Generation).
- **Storage**: Hệ thống tệp tin cục bộ (Server-side storage). Không sử dụng Database truyền thống.

### 2.4 Constraints & Assumptions

- Ảnh tạo từ AI phải được tải về server ngay lập tức để tránh hết hạn liên kết.
- Người dùng được giả định là có kết nối internet để gọi API AI.
- Mọi dữ liệu dự án sẽ mất nếu thư mục `storage` trên server bị xóa (cần cơ chế export ZIP để người dùng tự lưu trữ).

## 3. Specific Requirements

### 3.1 Functional Requirements

#### 3.1.1 Project Management (New)

- **FR1.1**: Tạo dự án mới (Khởi tạo thư mục với ID duy nhất).
- **FR1.2**: Hiển thị danh sách dự án hiện có trên server kèm ảnh Preview.
- **FR1.3**: Tự động lưu (Auto-save) trạng thái Canvas vào `index.json` sau mỗi hành động chỉnh sửa.
- **FR1.4**: Xóa dự án (Xóa toàn bộ thư mục vật lý).

#### 3.1.2 Canvas & Editing (Canva-style)

- **FR2.1**: Thêm ảnh từ máy tính hoặc dán (Paste) từ clipboard.
- **FR2.2**: Chèn văn bản tương tác (i-Text) cho phép gõ trực tiếp trên Canvas.
- **FR2.3**: Chèn các hình khối cơ bản (Rectangle, Circle, Triangle).
- **FR2.4**: Thao tác đối tượng: Di chuyển, Co dãn (giữ tỉ lệ), Xoay, Thay đổi thứ tự lớp (Z-index).
- **FR2.5**: Chức năng Undo/Redo (tối thiểu 15 bước trong phiên làm việc).

#### 3.1.3 AI Integration

- **FR3.1**: Nhận Prompt từ người dùng và gọi Gemini API.
- **FR3.2**: **Asset Localization**: Backend tự động tải ảnh từ API về thư mục `assets/` của dự án trước khi hiển thị lên Canvas.
- **FR3.3**: Lưu trữ Metadata của AI (Prompt) vào thuộc tính của ảnh trên Canvas.

#### 3.1.4 Import / Export

- **FR4.1**: Xuất thiết kế hiện tại thành file ảnh (PNG/JPG).
- **FR4.2**: Xuất toàn bộ dự án thành file `.zip` (bao gồm JSON và tất cả Assets).
- **FR4.3**: Nhập dự án từ file `.zip` để tiếp tục chỉnh sửa.

### 3.2 Non-Functional Requirements

- **NFR1 (Performance)**: Phản hồi các thao tác kéo thả trên Canvas dưới 16ms (60fps).
- **NFR2 (Reliability)**: Đảm bảo không có "Broken Image" bằng cách lưu trữ mọi ảnh cục bộ.
- **NFR3 (UX)**: Giao diện Sidebar/Toolbar tối giản, không gây choáng ngợp cho người mới.
- **NFR4 (Privacy)**: Không thu thập dữ liệu cá nhân, không cookie theo dõi.