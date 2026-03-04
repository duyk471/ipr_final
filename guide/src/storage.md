# Quản lý lưu trữ

Chúng tôi sử dụng tệp vật lý cho việc lưu trữ, giúp cho việc quản lý dự án linh hoạt và hiệu quả nhất.

## Cấu trúc lưu trữ

Mỗi tệp dự án (Project) sẽ có cấu trúc folder như sau:

- `index.json`: Dữ liệu JSON lưu toàn bộ trạng thái của Canvas.
- `preview.png`: Hình ảnh preview hiển thị ở trang chủ Dashboard.
- `assets/`: Folder lưu trữ thực tế tất cả ảnh (ảnh upload, ảnh từ clipboard, ảnh sinh bằng AI).

## Tính năng Import/Export

- **Export**: Nén toàn bộ folder dự án thành file `.zip`.
- **Import**: Giải nén file `.zip` vào thư mục storage của hệ thống.
- **Lưu ý**: Hệ thống đã được lập trình để **tự động sửa lỗi UUID** của dự án khi người dùng import. Các tệp ảnh sẽ được ánh xạ lại một cách thông minh bằng **Regular Expression** vào một project ID mới.

## Resilience (Khả năng phục hồi)

Dự án được tích hợp tính năng **Auto-cleaning** khi mở dự án. Nếu một tệp ảnh bị mất hoặc đường dẫn sai hỏng, Canvas sẽ tự động bỏ qua layer đó và cập nhật lại `index.json` để bảo vệ ứng dụng không bị crash.
