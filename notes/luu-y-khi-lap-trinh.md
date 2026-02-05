# Lưu ý trong quá trình lập trình

## Thông tin thêm về dự án chưa được sắp xếp

### File System Structure

```text
/storage/projects/[project-id]/
  ├── index.json       # Trạng thái Canvas & Metadata
  ├── preview.png      # Ảnh đại diện dự án
  └── assets/          # Tất cả tệp ảnh (.png, .jpg, .svg)
```

### Local Image Reference

Mọi thuộc tính `src` trong `index.json` phải sử dụng đường dẫn tương đối (Relative Path) dạng `assets/filename.png` để đảm bảo tính portable.

Bản SRS này đã sẵn sàng để bạn chuyển cho AI bắt đầu viết code từng Module. Bạn có muốn bắt đầu với **Module quản lý Project trên Backend** trước không?

## Trong quá trình lập trình

1.  _Cấu hình Static Server:_ Trong `index.js` của Backend, cần cấu hình để truy cập được các file trong `storage`:
    `app.use('/storage', express.static(path.join(__dirname, 'storage')));`
2.  _Fabric.js và Image Loading:_ Khi load lại dự án từ `index.json`, cần đảm bảo các đường dẫn ảnh được cập nhật đúng với URL của server (ví dụ: `http://localhost:5000/storage/projects/id/assets/img.png`).
3.  _Tạo Preview:_ Mỗi khi người dùng nhấn "Save" hoặc tự động save, hãy yêu cầu Fabric.js xuất ra một chuỗi Base64 (`canvas.toDataURL()`), sau đó Backend sẽ lưu chuỗi này thành file `preview.png`.
