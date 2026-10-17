# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_25_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "mot-so-lenh-lam-viec-voi-xau-ki-tu-bai-25-tin10"
title_vi = "Bài 25. Một số lệnh làm việc với xâu kí tự"
title_en = "Lesson 25. Some commands for working with strings"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- tìm xâu con trong xâu bằng toán tử **`in`** và lệnh **`find()`**, kể cả dạng `find(s1, k)`;\n- dùng **`split()`** để tách xâu thành danh sách các từ và **`join()`** để nối danh sách thành xâu;\n- viết chương trình nhập nhiều số trên một dòng, chuẩn hóa dấu cách, tách họ và tên;\n- tìm số lớn nhất, nhỏ nhất và đếm số lần xuất hiện của xâu con.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- find a substring with the **`in`** operator and the **`find()`** command, including the form `find(s1, k)`;\n- use **`split()`** to break a string into a list of words and **`join()`** to join a list into a string;\n- write programs that read several numbers on one line, normalise spaces, and separate surnames from given names;\n- find the largest and smallest numbers and count occurrences of a substring.",
    ),
    T(
        "### 1. Xâu con và lệnh tìm vị trí xâu con\n\nCho `c = \"Trường Sơn\"` và `m = \"Bước chân trên dải Trường Sơn\"`. Xâu `c` có là xâu con của `m` không, và ở vị trí nào?\n\n- **Toán tử `in`:** `s1 in s2` là `True` khi `s1` là xâu con của `s2`. Ví dụ `\"010\" in \"001100\"` là `False`.\n- **Lệnh `find()`:** `s2.find(s1)` trả về **vị trí đầu tiên** (chỉ số, tính từ 0) của `s1` trong `s2`; nếu `s1` **không** có trong `s2` thì trả về **`-1`**.\n- **Dạng mở rộng:** `s2.find(s1, k)` tìm `s1` trong `s2` **từ vị trí `k` trở đi**, không thấy thì trả về `-1`. Ví dụ `\"ababababab\".find(\"ab\", 4)` là `4`.\n\nXâu rỗng `\"\"` là xâu con của mọi xâu: `\"\" in \"0123\"` là `True` và `\"abcde\".find(\"\")` là `0`.\n\nLưu ý: vì `\"Bước chân trên dải \"` có 19 kí tự nên `m.find(c)` bằng `19`.",
        "### 1. Substrings and finding their position\n\nLet `c = \"Trường Sơn\"` and `m = \"Bước chân trên dải Trường Sơn\"`. Is `c` a substring of `m`, and where?\n\n- **The `in` operator:** `s1 in s2` is `True` when `s1` is a substring of `s2`. For example `\"010\" in \"001100\"` is `False`.\n- **The `find()` command:** `s2.find(s1)` returns the **first position** (index, counted from 0) of `s1` in `s2`; if `s1` is **not** in `s2` it returns **`-1`**.\n- **Extended form:** `s2.find(s1, k)` looks for `s1` in `s2` **from position `k` on**, returning `-1` if not found. For example `\"ababababab\".find(\"ab\", 4)` is `4`.\n\nThe empty string `\"\"` is a substring of every string: `\"\" in \"0123\"` is `True` and `\"abcde\".find(\"\")` is `0`.\n\nNote: since `\"Bước chân trên dải \"` has 19 characters, `m.find(c)` equals `19`.",
    ),
    trace_block(
        sim("in và find() tìm xâu con", "in and find() locate a substring", "find() cho vị trí đầu tiên, hoặc −1 khi không có; find(s1, k) bắt đầu tìm từ vị trí k.", "find() gives the first position, or −1 when absent; find(s1, k) starts searching at position k."),
        """m = "Bước chân trên dải Trường Sơn"
c = "Trường Sơn"
print(c in m)
print(m.find(c))
print(m.find("Huế"))
print("ababababab".find("ab", 4))""",
    ),
    T(
        "### 2. Một số lệnh thường dùng với xâu kí tự\n\n- **`s.split()`** tách xâu `s` thành **danh sách các từ**, bỏ qua mọi dấu cách thừa. Ví dụ `\" Hà Nội Việt Nam \".split()` cho `['Hà', 'Nội', 'Việt', 'Nam']`, có 4 phần tử. Có thể cho kí tự ngăn cách: `s.split(\",\")` tách theo dấu phẩy.\n- **`\" \".join(ds)`** **nối** các xâu trong danh sách `ds` thành một xâu, đặt xâu `\" \"` giữa hai phần tử liền nhau.\n\nPhối hợp hai lệnh: `\" \".join(s.split())` làm giữa các từ chỉ còn **một dấu cách**.\n\n**Ví dụ:** đổi các dấu phẩy trong `\"gà,vịt,chó,lợn,ngựa,cá\"` thành dấu cách: tách bằng `split(\",\")` được 6 từ, rồi nối lại bằng `\" \".join(...)`.",
        "### 2. Some commonly used string commands\n\n- **`s.split()`** breaks the string `s` into a **list of words**, ignoring any extra spaces. For example `\" Hà Nội Việt Nam \".split()` gives `['Hà', 'Nội', 'Việt', 'Nam']`, 4 elements. A separator can be given: `s.split(\",\")` splits at commas.\n- **`\" \".join(ds)`** **joins** the strings of the list `ds` into one string, putting the string `\" \"` between neighbouring elements.\n\nUsing both: `\" \".join(s.split())` leaves **a single space** between words.\n\n**Example:** to change the commas in `\"gà,vịt,chó,lợn,ngựa,cá\"` into spaces: split with `split(\",\")` to get 6 words, then join with `\" \".join(...)`.",
    ),
    trace_block(
        sim("split() và join()", "split() and join()", "split() bỏ dấu cách thừa và tạo danh sách; join() nối lại bằng đúng một dấu cách.", "split() drops extra spaces and builds a list; join() joins them back with exactly one space."),
        """s = "  Hà   Nội  Việt Nam "
ds = s.split()
print(ds, len(ds))
print(" ".join(ds))
t = "gà,vịt,chó,lợn,ngựa,cá"
print(" ".join(t.split(",")))""",
    ),
    T(
        "### 3. Thực hành\n\n**Nhiệm vụ 1.** Nhập nhiều số nguyên trên **một dòng**, cách nhau bởi dấu cách. Thông báo số lượng số đã nhập và in các số thành hàng ngang. Dùng `split()` tách, rồi `int()` đổi từng từ thành số.\n\n**Nhiệm vụ 2.** Nhập một xâu có thể có nhiều dấu cách giữa các từ; chỉnh để giữa các từ chỉ còn một dấu cách: `\" \".join(s.split())`.\n\n**Nhiệm vụ 3.** Nhập `n`, rồi họ tên của `n` học sinh; in danh sách thành hai cột: **tên** (từ cuối) và **họ đệm** (các từ còn lại).",
        "### 3. Practice\n\n**Task 1.** Enter several integers on **one line**, separated by spaces. Report how many numbers were entered and print them on one line. Use `split()` to separate them, then `int()` to convert each word to a number.\n\n**Task 2.** Enter a string that may have many spaces between words; fix it so only one space remains between words: `\" \".join(s.split())`.\n\n**Task 3.** Enter `n`, then the full names of `n` students; print the list in two columns: the **given name** (last word) and the **family and middle names** (the other words).",
    ),
    trace_block(
        sim("Nhiệm vụ 1: nhập nhiều số trên một dòng", "Task 1: several numbers on one line", "split() tách dòng nhập thành các xâu; int() đổi từng xâu thành số rồi thêm vào danh sách A.", "split() breaks the input line into strings; int() converts each to a number which is appended to the list A."),
        """s = input("Nhập các số cách nhau bởi dấu cách: ")
A = []
for x in s.split():
    A.append(int(x))
print("Số lượng:", len(A))
for x in A:
    print(x, end=" ")""",
        ["4 8 15 16 23"],
    ),
    trace_block(
        sim("Nhiệm vụ 2: chỉ giữ một dấu cách giữa các từ", "Task 2: keep a single space between words", "split() bỏ các dấu cách thừa, join() nối lại bằng một dấu cách.", "split() drops extra spaces and join() joins with a single space."),
        """s = input("Nhập một xâu: ")
kq = " ".join(s.split())
print(kq)""",
        ["  Tin   học    10  "],
    ),
    trace_block(
        sim("Nhiệm vụ 3: tên và họ đệm — nhập 2 học sinh", "Task 3: given name and family name — enter 2 students", "Từ cuối của danh sách từ là tên; các từ còn lại nối lại thành họ đệm.", "The last word of the word list is the given name; the remaining words are joined into the family and middle names."),
        """n = int(input("Số học sinh: "))
for i in range(n):
    ho_ten = input("Họ và tên: ")
    ds = ho_ten.split()
    ten = ds[len(ds) - 1]
    del ds[len(ds) - 1]
    ho_dem = " ".join(ds)
    print(ten, "|", ho_dem)""",
        ["2", "Nguyễn Hòa Bình", "Lê Văn  An"],
    ),
    T(
        "### 4. Vận dụng\n\n**Vận dụng 1.** Nhập `n` số nguyên cách nhau bởi dấu cách; in danh sách trên một hàng, số **lớn nhất** và **chỉ số** của nó, số **nhỏ nhất** và chỉ số của nó. Lưu **chỉ số** của số lớn nhất, nhỏ nhất rồi cập nhật khi gặp số lớn hơn, nhỏ hơn.\n\n**Vận dụng 2.** Cho xâu `S` và xâu con `sub`. Đếm số lần `sub` xuất hiện trong `S`, **cho phép chồng lấn**. Dùng `find()` lặp lại: tìm vị trí `k`, tăng đếm, rồi tìm tiếp từ `k + 1`. Với `S = \"1212133212143212\"` và `sub = \"121\"`, `sub` xuất hiện tại các chỉ số 0, 2 và 8, nên có **3 lần** (hai lần đầu chồng lấn nhau).",
        "### 4. Application\n\n**Application 1.** Enter `n` integers separated by spaces; print the list on one line, the **largest** number and its **index**, the **smallest** number and its index. Keep the **index** of the largest and smallest and update them when a larger or smaller number appears.\n\n**Application 2.** Given a string `S` and a substring `sub`, count how many times `sub` occurs in `S`, **allowing overlaps**. Use `find()` repeatedly: find the position `k`, increase the count, then search again from `k + 1`. For `S = \"1212133212143212\"` and `sub = \"121\"`, `sub` occurs at indexes 0, 2 and 8, so there are **3 occurrences** (the first two overlap).",
    ),
    trace_block(
        sim("Vận dụng 1: số lớn nhất, nhỏ nhất và chỉ số", "Application 1: largest, smallest and their indexes", "vt_max và vt_min lưu chỉ số; chỉ cập nhật khi gặp số lớn hơn hoặc nhỏ hơn hẳn nên giữ vị trí đầu tiên.", "vt_max and vt_min store indexes; they update only on a strictly larger or smaller number so the first position is kept."),
        """A = []
for x in input("Nhập các số: ").split():
    A.append(int(x))
vt_max = 0
vt_min = 0
for i in range(len(A)):
    if A[i] > A[vt_max]:
        vt_max = i
    if A[i] < A[vt_min]:
        vt_min = i
print(A)
print("Lớn nhất:", A[vt_max], "chỉ số", vt_max)
print("Nhỏ nhất:", A[vt_min], "chỉ số", vt_min)""",
        ["4 9 -3 7 9 -3"],
    ),
    trace_block(
        sim("Vận dụng 2: đếm xâu con có chồng lấn", "Application 2: counting overlapping substrings", "Mỗi lần tìm thấy ở vị trí k thì tìm tiếp từ k + 1; ba lần tìm thấy tại 0, 2, 8 rồi find trả về −1.", "After each find at position k, search again from k + 1; three finds at 0, 2, 8 and then find returns −1."),
        """S = "1212133212143212"
sub = "121"
dem = 0
k = S.find(sub)
while k != -1:
    dem = dem + 1
    k = S.find(sub, k + 1)
print("Số lần xuất hiện:", dem)""",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| `s1 in s2` | `True` nếu `s1` là xâu con của `s2` |\n| `s2.find(s1)` | vị trí đầu tiên của `s1`, hoặc `-1` |\n| `s2.find(s1, k)` | tìm từ vị trí `k` trở đi |\n| `s.split()` | tách xâu thành danh sách các từ, bỏ dấu cách thừa |\n| `\" \".join(ds)` | nối danh sách thành xâu, ngăn cách bằng một dấu cách |\n| `\" \".join(s.split())` | chuẩn hóa còn một dấu cách giữa các từ |\n\n**Tự kiểm tra:** `\"Trường Sơn\".find(\"Sơn\", 4)` bằng bao nhiêu? (đáp án: `7`). `len(\" Hà Nội Việt Nam \".split())` bằng bao nhiêu? (đáp án: `4`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| `s1 in s2` | `True` if `s1` is a substring of `s2` |\n| `s2.find(s1)` | first position of `s1`, or `-1` |\n| `s2.find(s1, k)` | search from position `k` on |\n| `s.split()` | break a string into a list of words, dropping extra spaces |\n| `\" \".join(ds)` | join a list into a string separated by one space |\n| `\" \".join(s.split())` | normalise to one space between words |\n\n**Self-check:** what is `\"Trường Sơn\".find(\"Sơn\", 4)`? (answer: `7`). What is `len(\" Hà Nội Việt Nam \".split())`? (answer: `4`).",
    ),
]

questions = [
    mc("tin10-b25-mc-01", 1, "Biểu thức \"\" in \"0123\" (xâu rỗng) cho giá trị gì?", "What is the value of \"\" in \"0123\" (the empty string)?",
       "Xâu rỗng là xâu con của mọi xâu nên kết quả là True.", "The empty string is a substring of every string so the result is True.", "C",
       ("False", "False"), ("Báo lỗi", "An error"), ("True", "True"), ("None", "None")),
    mc("tin10-b25-mc-02", 1, "Lệnh \"abcde\".find(\"\") trả lại giá trị gì?", "What does \"abcde\".find(\"\") return?",
       "Xâu rỗng được tìm thấy ngay từ vị trí đầu tiên nên find trả về 0.", "The empty string is found right at the first position so find returns 0.", "A",
       ("0", "0"), ("-1", "-1"), ("1", "1"), ("Báo lỗi", "An error")),
    mc("tin10-b25-mc-03", 1, "Phương thức nào trả về vị trí đầu tiên của xâu con trong một xâu?", "Which method returns the first position of a substring in a string?",
       "find() cho vị trí đầu tiên của xâu con hoặc -1; split() tách xâu, join() nối xâu, len() cho độ dài.", "find() gives the first position of the substring or -1; split() breaks a string, join() joins, len() gives the length.", "D",
       ("split()", "split()"), ("join()", "join()"), ("len()", "len()"), ("find()", "find()")),
    mc("tin10-b25-mc-04", 2, "Lệnh \"0123456789\".find(\"012abc\") trả lại giá trị gì?", "What does \"0123456789\".find(\"012abc\") return?",
       "\"012abc\" không phải xâu con của \"0123456789\" nên find trả về -1.", "\"012abc\" is not a substring of \"0123456789\" so find returns -1.", "B",
       ("0", "0"), ("-1", "-1"), ("3", "3"), ("Báo lỗi", "An error")),
    mc("tin10-b25-mc-05", 2, "Biểu thức len(\" Hà Nội Việt Nam \".split()) bằng bao nhiêu?", "What is len(\" Hà Nội Việt Nam \".split())?",
       "split() bỏ dấu cách thừa và cho 4 từ: Hà, Nội, Việt, Nam.", "split() drops the extra spaces and gives 4 words: Hà, Nội, Việt, Nam.", "A",
       ("4", "4"), ("0", "0"), ("7", "7"), ("8", "8")),
    mc("tin10-b25-mc-06", 2, "Lệnh \"Trường Sơn\".find(\"Sơn\", 4) trả lại giá trị gì?", "What does \"Trường Sơn\".find(\"Sơn\", 4) return?",
       "\"Trường \" có 7 kí tự (kể cả dấu cách) nên \"Sơn\" bắt đầu ở chỉ số 7.", "\"Trường \" has 7 characters (space included) so \"Sơn\" starts at index 7.", "C",
       ("5", "5"), ("6", "6"), ("7", "7"), ("8", "8")),
    mc("tin10-b25-mc-07", 2, "Lệnh \"ababababab\".find(\"ab\", 4) trả lại giá trị gì?", "What does \"ababababab\".find(\"ab\", 4) return?",
       "Tìm từ chỉ số 4: tại chỉ số 4 đã có \"ab\" nên kết quả là 4.", "Searching from index 4: there is already \"ab\" at index 4 so the result is 4.", "B",
       ("2", "2"), ("4", "4"), ("6", "6"), ("-1", "-1")),
    mc("tin10-b25-mc-08", 2, "Biểu thức \"010\" in \"001100\" cho giá trị gì?", "What is the value of \"010\" in \"001100\"?",
       "Trong 001100 không có ba kí tự liên tiếp 0-1-0 nên kết quả là False.", "001100 has no three consecutive characters 0-1-0 so the result is False.", "D",
       ("True", "True"), ("-1", "-1"), ("Báo lỗi", "An error"), ("False", "False")),
    mc("tin10-b25-mc-09", 2, "Lệnh \" \".join([\"Tin\", \"học\", \"10\"]) cho kết quả nào?", "What does \" \".join([\"Tin\", \"học\", \"10\"]) give?",
       "join() nối các phần tử và đặt một dấu cách giữa chúng: \"Tin học 10\".", "join() joins the elements with a space between them: \"Tin học 10\".", "A",
       ("\"Tin học 10\"", "\"Tin học 10\""), ("\"Tinhọc10\"", "\"Tinhọc10\""), ("[\"Tin học 10\"]", "[\"Tin học 10\"]"), ("\"Tin, học, 10\"", "\"Tin, học, 10\"")),
    mc("tin10-b25-mc-10", 2, "Với s = \"gà,vịt,chó,lợn,ngựa,cá\", len(s.split(\",\")) bằng bao nhiêu?", "With s = \"gà,vịt,chó,lợn,ngựa,cá\", what is len(s.split(\",\"))?",
       "Tách theo dấu phẩy được 6 từ: gà, vịt, chó, lợn, ngựa, cá.", "Splitting at commas gives 6 words: gà, vịt, chó, lợn, ngựa, cá.", "C",
       ("5", "5"), ("7", "7"), ("6", "6"), ("1", "1")),
    mc("tin10-b25-mc-11", 2, "Với ds = \"Nguyễn Hòa Bình\".split(), biểu thức ds[len(ds) - 1] là gì?", "With ds = \"Nguyễn Hòa Bình\".split(), what is ds[len(ds) - 1]?",
       "ds có 3 phần tử; chỉ số len(ds) - 1 = 2 là từ cuối \"Bình\".", "ds has 3 elements; the index len(ds) - 1 = 2 is the last word \"Bình\".", "D",
       ("\"Nguyễn\"", "\"Nguyễn\""), ("\"Hòa\"", "\"Hòa\""), ("\"Hòa Bình\"", "\"Hòa Bình\""), ("\"Bình\"", "\"Bình\"")),
    mc("tin10-b25-mc-12", 3, "Với S = \"1212133212143212\" và sub = \"121\", số lần sub xuất hiện (cho phép chồng lấn) là bao nhiêu?", "With S = \"1212133212143212\" and sub = \"121\", how many times does sub occur (overlaps allowed)?",
       "sub xuất hiện tại các chỉ số 0, 2 và 8, tức 3 lần.", "sub occurs at indexes 0, 2 and 8, that is 3 times.", "B",
       ("2", "2"), ("3", "3"), ("4", "4"), ("5", "5")),
]

truefalse = [
    tf("tin10-b25-tf-01", 2, "Xét lệnh find() và toán tử in.", "Consider find() and the in operator.",
       "find() trả về -1 nếu không có; find(s1, k) tìm từ vị trí k; \"abc\".find(\"\") là 0; vị trí của \"Trường Sơn\" trong câu là 19.", "find() returns -1 if absent; find(s1, k) searches from position k; \"abc\".find(\"\") is 0; the position of \"Trường Sơn\" in the sentence is 19.",
       ("s2.find(s1) trả về -1 khi s1 không nằm trong s2.", "s2.find(s1) returns -1 when s1 is not in s2.", True),
       ("s2.find(s1, k) tìm s1 trong s2 từ vị trí k trở đi.", "s2.find(s1, k) looks for s1 in s2 from position k on.", True),
       ("\"abc\".find(\"\") trả về -1.", "\"abc\".find(\"\") returns -1.", False),
       ("\"Bước chân trên dải Trường Sơn\".find(\"Trường Sơn\") bằng 20.", "\"Bước chân trên dải Trường Sơn\".find(\"Trường Sơn\") equals 20.", False)),
    tf("tin10-b25-tf-02", 2, "Xét split() và join().", "Consider split() and join().",
       "split() tạo danh sách từ và bỏ dấu cách thừa; join() nối danh sách thành xâu; len(\" Hà Nội Việt Nam \".split()) là 4.", "split() builds a list of words and drops extra spaces; join() joins a list into a string; len(\" Hà Nội Việt Nam \".split()) is 4.",
       ("split() tách một xâu thành danh sách các từ.", "split() breaks a string into a list of words.", True),
       ("join() nối các phần tử của danh sách thành một xâu.", "join() joins the elements of a list into a string.", True),
       ("split() giữ lại các phần tử rỗng do dấu cách thừa.", "split() keeps the empty elements caused by extra spaces.", False),
       ("len(\" Hà Nội Việt Nam \".split()) bằng 4.", "len(\" Hà Nội Việt Nam \".split()) equals 4.", True)),
    tf("tin10-b25-tf-03", 2, "Xét các chương trình thực hành.", "Consider the practice programs.",
       "\" \".join(s.split()) chuẩn hóa dấu cách; input().split() cho các xâu cần int(); ds[len(ds) - 1] là từ cuối; \"010\" không có trong \"001100\".", "\" \".join(s.split()) normalises spaces; input().split() gives strings that need int(); ds[len(ds) - 1] is the last word; \"010\" is not in \"001100\".",
       ("\" \".join(s.split()) làm giữa các từ chỉ còn một dấu cách.", "\" \".join(s.split()) leaves one space between words.", True),
       ("Nhập \"4 8 15\" rồi input().split() cho ngay danh sách các số nguyên.", "Entering \"4 8 15\" and input().split() gives a list of integers right away.", False),
       ("ds[len(ds) - 1] là từ cuối cùng của danh sách ds.", "ds[len(ds) - 1] is the last word of the list ds.", True),
       ("\"010\" in \"001100\" có giá trị True.", "\"010\" in \"001100\" is True.", False)),
    tf("tin10-b25-tf-04", 3, "Đếm xâu con chồng lấn: S = \"1212133212143212\", sub = \"121\".", "Counting overlapping substrings: S = \"1212133212143212\", sub = \"121\".",
       "sub xuất hiện tại 0, 2, 8 (3 lần); tìm tiếp từ k + 1 mới cho phép chồng lấn và làm vòng lặp tiến lên.", "sub occurs at 0, 2, 8 (3 times); searching again from k + 1 allows overlaps and moves the loop forward.",
       ("sub xuất hiện tại các chỉ số 0, 2 và 8.", "sub occurs at indexes 0, 2 and 8.", True),
       ("Số lần sub xuất hiện là 3.", "The number of occurrences of sub is 3.", True),
       ("Tìm tiếp bằng S.find(sub, k + 1) cho phép tính cả các lần chồng lấn.", "Searching again with S.find(sub, k + 1) also counts overlapping occurrences.", True),
       ("Số lần sub xuất hiện là 4.", "The number of occurrences of sub is 4.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
