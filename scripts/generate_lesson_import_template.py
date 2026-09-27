"""Write the Word template the lesson Studio offers for "Import Word / PDF".

Run: python scripts/generate_lesson_import_template.py
The parser is frontend/features/content-import/lessonDocument.ts; keep the markers in sync.
"""
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend" / "public" / "templates" / "scipal-lesson-template.docx"

PARAGRAPHS = [
    "SCIPAL-LESSON-V1",
    "# Dòng bắt đầu bằng # là ghi chú, SciPal bỏ qua. Giữ nguyên dòng đầu tiên.",
    "# Môn, lớp và chủ đề đã chọn khi tạo bài trong Studio; ở đây chỉ cần tiêu đề và nội dung.",
    "# Các khối theo đúng thứ tự sẽ hiển thị. Xóa khối không dùng, chép thêm khối khi cần.",
    "# Khối có sẵn: [THEORY], [CODE:python], [CODE:cpp], [CODE:javascript], [FORMULA],",
    "# [INTERACTIVE:algorithm-sim | function-graph | geometry-3d | experiment | bio-diagram],",
    "# [QUIZ:mã-câu-hỏi], [TERM:mã-thuật-ngữ], [RESOURCE:mã-tài-nguyên] (mã là UUID trong SciPal).",
    "# Có thể để trống en: rồi bổ sung tiếng Anh trong Studio trước khi gửi duyệt.",
    "# Trong [THEORY], muốn xuống đoạn mới thì để trống một dòng; hỗ trợ **đậm**, danh sách - ...",
    "title_vi: Tìm kiếm nhị phân",
    "title_en: Binary search",
    "",
    "[THEORY]",
    "vi: Tìm kiếm nhị phân chỉ dùng được khi danh sách **đã sắp xếp**.",
    "Mỗi bước so sánh với phần tử ở giữa và bỏ đi một nửa danh sách.",
    "en: Binary search only works on a **sorted** list.",
    "Each step compares with the middle element and discards half of the list.",
    "",
    "[CODE:python]",
    "def binary_search(a, x):",
    "    lo, hi = 0, len(a) - 1",
    "    while lo <= hi:",
    "        mid = (lo + hi) // 2",
    "        if a[mid] == x:",
    "            return mid",
    "        if a[mid] < x:",
    "            lo = mid + 1",
    "        else:",
    "            hi = mid - 1",
    "    return -1",
    "",
    "[FORMULA]",
    "katex: T(n) = O(\\log n)",
    "caption_vi: Số bước tăng theo logarit của n",
    "caption_en: The number of steps grows with log n",
    "",
    "[INTERACTIVE:algorithm-sim]",
    "heading_vi: Mô phỏng tìm kiếm nhị phân",
    "heading_en: Binary search simulation",
    "offline: true",
    'config_json: {"algorithm": "binary-search"}',
]


def paragraph(text: str) -> str:
    if not text:
        return "<w:p/>"
    return f'<w:p><w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    body = "".join(paragraph(line) for line in PARAGRAPHS)
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f'<w:body>{body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/>'
        "</w:sectPr></w:body></w:document>"
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )
    relationships = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="word/document.xml"/>'
        "</Relationships>"
    )
    with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", content_types)
        docx.writestr("_rels/.rels", relationships)
        docx.writestr("word/document.xml", document)
    print(OUTPUT)


if __name__ == "__main__":
    main()
