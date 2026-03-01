# Dự án

## Cấu trúc thư mục của một dự án

Mỗi một dự án sẽ được lưu tại `storage/projects/[project-id]/`.

Mỗi khi người dùng nhấn "Tạo dự án mới", hệ thống sẽ tạo một thư mục mang ID duy nhất (UUID). Toàn bộ dữ liệu của thiết kế đó sẽ nằm trọn trong thư mục này.

```text
/storage/projects/7ba2-4f1a-9b3c-88e2/   # [project-id]
├── index.json                          # File quan trọng nhất: Chứa trạng thái Canvas
├── preview.png                         # Ảnh thumbnail chụp màn hình thiết kế để hiển thị ở Dashboard
└── assets/                             # Thư mục chứa tài nguyên vật lý
    ├── ai_1707123456.png               # Ảnh tạo từ Gemini
    ├── upload_user_avatar.jpg          # Ảnh người dùng tải lên
    ├── paste_1707123480.png            # Ảnh từ clipboard
    └── shape_mask.svg                  # Các file vector/mask (nếu có)
```

## Cấu trúc file `index.json`

File này được thiết kế để tương thích tốt nhất với **Fabric.js** (sử dụng phương thức `canvas.toJSON()` và `canvas.loadFromJSON()`), đồng thời bổ sung các Metadata cần thiết cho AI và quản lý ứng dụng.

```json
{
  "version": "1.0",
  "projectInfo": {
    "id": "7ba2-4f1a-9b3c-88e2",
    "name": "Meme Mèo Cute ngày Tết",
    "createdAt": "2026-02-05T08:00:00Z",
    "updatedAt": "2026-02-05T10:30:00Z",
    "previewUrl": "preview.png"
  },
  "canvas": {
    "width": 1080,
    "height": 1080,
    "backgroundColor": "#ffffff",
    "backgroundImage": null,
    "zoom": 1,
    "viewportTransform": [1, 0, 0, 1, 0, 0]
  },
  "layers": [
    {
      "id": "item_001",
      "type": "image",
      "version": "5.3.0",
      "originX": "left",
      "originY": "top",
      "left": 100,
      "top": 150,
      "width": 512,
      "height": 512,
      "scaleX": 0.8,
      "scaleY": 0.8,
      "angle": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "visible": true,
      "selectable": true,
      "src": "assets/ai_1707123456.png",
      "metadata": {
        "source": "gemini-ai",
        "prompt": "a cute orange cat wearing traditional Vietnamese Ao Dai, 3d render",
        "alt": "AI generated cat"
      }
    },
    {
      "id": "item_002",
      "type": "i-text",
      "version": "5.3.0",
      "originX": "left",
      "originY": "top",
      "left": 300,
      "top": 700,
      "width": 400,
      "height": 50,
      "scaleX": 1.5,
      "scaleY": 1.5,
      "angle": -5,
      "text": "CHÚC MỪNG NĂM MỚI",
      "fontSize": 48,
      "fontWeight": "bold",
      "fontFamily": "Inter",
      "fill": "#ff0000",
      "textAlign": "center",
      "charSpacing": 0,
      "lineHeight": 1.16,
      "styles": {}
    },
    {
      "id": "item_003",
      "type": "rect",
      "left": 50,
      "top": 50,
      "width": 100,
      "height": 100,
      "fill": "rgba(255, 255, 0, 0.5)",
      "stroke": "#000000",
      "strokeWidth": 2,
      "rx": 10,
      "ry": 10
    }
  ],
  "history": {
    "undoStack": [],
    "redoStack": []
  }
}
```

## Các thành phần quan trọng

1.  **`src: "assets/..."` (Đường dẫn tương đối):**

    - **Lưu ý cực kỳ quan trọng:** Không bao giờ lưu link tuyệt đối (ví dụ `http://localhost:5000/...`) vào file JSON.
    - Việc dùng đường dẫn tương đối giúp bạn có thể di chuyển thư mục dự án đi bất cứ đâu (máy chủ khác, máy cá nhân) mà không bị hỏng ảnh. Frontend sẽ tự nối thêm `BASE_URL` khi render.

2.  **`metadata` cho AI:**

    - Lưu lại `prompt` gốc giúp người dùng có thể xem lại họ đã nhập gì để tạo ra bức ảnh đó (giống tính năng "Info" trên Canva/Midjourney).

3.  **`i-text` (Interactive Text):**

    - Đây là kiểu dữ liệu của Fabric.js cho phép người dùng click trực tiếp vào chữ trên canvas để sửa nội dung (giống hệt Canva).

4.  **`preview.png`:**

    - Mỗi lần người dùng nhấn "Save", Backend sẽ nhận một file ảnh chụp lại Canvas và ghi đè vào file `preview.png` này. Mục đích là để hiển thị danh sách dự án ở trang chủ một cách nhanh chóng mà không cần phải load toàn bộ Fabric.js để vẽ lại từng layer.

5.  **`viewportTransform`:**
    - Lưu lại vị trí người dùng đang zoom hoặc pan (trượt) màn hình, giúp khi họ mở lại, trạng thái nhìn y hệt lúc họ tắt đi.

## Danh sách các tính năng khác cho dự án (Để làm sau)

Tích hợp thêm tính năng **"Lịch sử chỉnh sửa" (Undo/Redo)** lưu vào file luôn hay chỉ lưu trong bộ nhớ tạm khi đang mở tab thôi? (Thường thì Canva chỉ lưu trong phiên làm việc hiện tại).
