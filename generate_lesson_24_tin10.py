# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_24_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "xau-ki-tu-bai-24-tin10"
title_vi = "Bài 24. Xâu kí tự"
title_en = "Lesson 24. Strings"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nêu được **xâu kí tự** là dãy các kí tự Unicode và truy cập từng kí tự qua **chỉ số**;\n- phân biệt xâu với danh sách: **không thể thay đổi** từng kí tự của xâu;\n- **duyệt** các kí tự của xâu bằng lệnh `for` (hai cách) và dùng **toán tử `in`** để kiểm tra xâu con;\n- viết chương trình xử lí xâu: kiểm tra xâu con, đếm, chèn xâu.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- explain that a **string** is a sequence of Unicode characters and access each character by its **index**;\n- tell strings from lists: you **cannot change** a single character of a string;\n- **traverse** the characters of a string with `for` (two ways) and use the **`in` operator** to test for a substring;\n- write programs that process strings: test a substring, count, insert a string.",
    ),
    T(
        "### 1. Xâu là một dãy các kí tự\n\n**Xâu kí tự** trong Python là một **dãy các kí tự Unicode** (chữ, số, dấu câu, kể cả chữ có dấu tiếng Việt), viết giữa cặp dấu nháy. Ví dụ `\"123&*()+-ABC\"`, `\"Tây Nguyên\"` là xâu hợp lệ, còn `11111111 = 256` thì không.\n\n- Mỗi kí tự truy cập qua **chỉ số** từ `0` đến `len(s) - 1`, giống như danh sách: `s[0]` là kí tự đầu tiên.\n- `len(s)` cho **độ dài** xâu, tính cả dấu cách. Ví dụ `len(\"Tây Nguyên\")` là `10`, `len(\"123&*()+-ABC\")` là `12`, `len(\"1010110&0101001\")` là `15`.\n\n**Giống nhau:** xâu và danh sách đều là dãy, đánh chỉ số từ 0, duyệt được từng phần tử.\n\n**Khác nhau:** có thể đổi giá trị từng phần tử của danh sách (`A[0] = 5`), nhưng **không thể thay đổi từng kí tự của xâu**; gán `s[0] = \"x\"` báo lỗi **TypeError**.",
        "### 1. A string is a sequence of characters\n\nA **string** in Python is a **sequence of Unicode characters** (letters, digits, punctuation, even accented Vietnamese letters) written between quotation marks. For example `\"123&*()+-ABC\"` and `\"Tây Nguyên\"` are valid strings, while `11111111 = 256` is not.\n\n- Each character is accessed by its **index** from `0` to `len(s) - 1`, like a list: `s[0]` is the first character.\n- `len(s)` gives the **length** of the string, spaces included. For example `len(\"Tây Nguyên\")` is `10`, `len(\"123&*()+-ABC\")` is `12`, `len(\"1010110&0101001\")` is `15`.\n\n**Alike:** strings and lists are both sequences, indexed from 0, and can be traversed element by element.\n\n**Different:** you can change a list element (`A[0] = 5`), but you **cannot change a single character of a string**; assigning `s[0] = \"x\"` raises a **TypeError**.",
    ),
    trace_block(
        sim("Độ dài và chỉ số của xâu", "Length and index of a string", "len() đếm cả dấu cách; chỉ số đi từ 0 đến len(s) − 1.", "len() counts spaces too; the index runs from 0 to len(s) − 1."),
        """s = "Tây Nguyên"
print(len(s))
print(s[0])
print(s[4])
print(s[len(s) - 1])""",
    ),
    trace_block(
        sim("Không thể đổi kí tự của xâu", "A character of a string cannot be changed", "Danh sách A cho phép gán A[0]; còn xâu s báo TypeError khi gán s[0].", "The list A allows assigning A[0]; the string s raises a TypeError when assigning s[0]."),
        """A = ["a", "b", "c"]
A[0] = "x"
print(A)
s = "abc"
s[0] = "x"
print(s)""",
    ),
    T(
        "### 2. Lệnh duyệt kí tự của xâu\n\nCó **hai cách** duyệt từng kí tự của xâu `s` bằng `for`:\n\n```python\n# Cách 1: theo chỉ số\nfor i in range(len(s)):\n    <xử lí s[i]>\n\n# Cách 2: theo từng kí tự\nfor ch in s:\n    <xử lí ch>\n```\n\nỞ cách 2, biến `ch` lần lượt được gán các kí tự của `s` từ đầu đến cuối.\n\n**Toán tử `in` với xâu:** nếu `s1`, `s2` là hai xâu thì `s1 in s2` là `True` khi `s1` là **xâu con** của `s2` (nằm liền nhau trong `s2`).\n\nVí dụ với `s1 = \"abc\"`, `s2 = \"ababcabca\"`: `s1 in s2` là `True`, `s1 + s1 in s2` (tức `\"abcabc\"`) là `True`, `\"abcabca\" in s2` là `True`, còn `\"abc123\" in s2` là `False`.",
        "### 2. Traversing the characters of a string\n\nThere are **two ways** to traverse each character of a string `s` with `for`:\n\n```python\n# Way 1: by index\nfor i in range(len(s)):\n    <process s[i]>\n\n# Way 2: by character\nfor ch in s:\n    <process ch>\n```\n\nIn way 2 the variable `ch` is assigned the characters of `s` from first to last.\n\n**The `in` operator with strings:** if `s1`, `s2` are two strings then `s1 in s2` is `True` when `s1` is a **substring** of `s2` (consecutive characters of `s2`).\n\nExample with `s1 = \"abc\"`, `s2 = \"ababcabca\"`: `s1 in s2` is `True`, `s1 + s1 in s2` (that is `\"abcabc\"`) is `True`, `\"abcabca\" in s2` is `True`, while `\"abc123\" in s2` is `False`.",
    ),
    trace_block(
        sim("Chọn các chữ số lẻ của xâu", "Picking the odd digits of a string", "Biến ch lần lượt nhận từng kí tự của s; chỉ chữ số lẻ được nối vào skq: kết quả \"173\".", "The variable ch takes each character of s in turn; only the odd digits are joined to skq: the result is \"173\"."),
        """s = "10473"
skq = ""
for ch in s:
    if ch in "13579":
        skq = skq + ch
print(skq)""",
    ),
    trace_block(
        sim("Toán tử in kiểm tra xâu con", "The in operator tests for a substring", "s1 in s2 đúng khi s1 nằm liền nhau trong s2.", "s1 in s2 is true when s1 appears consecutively in s2."),
        """s1 = "abc"
s2 = "ababcabca"
print(s1 in s2)
print(s1 + s1 in s2)
print("abcabca" in s2)
print("abc123" in s2)""",
    ),
    T(
        "### 3. Thực hành\n\n**Nhiệm vụ 1.** Nhập số học sinh `n`, rồi nhập họ tên từng học sinh và lưu vào một **danh sách**; in danh sách, mỗi họ tên một dòng.\n\n**Nhiệm vụ 2.** Nhập xâu `S` từ bàn phím và kiểm tra `S` có chứa xâu con `\"10\"` không. Có hai cách:\n\n- **Cách 1:** duyệt theo chỉ số, xét hai kí tự liên tiếp `S[i]` và `S[i + 1]`;\n- **Cách 2 (nhanh nhất):** dùng toán tử `in`: `\"10\" in S`.",
        "### 3. Practice\n\n**Task 1.** Enter the number of students `n`, then each student's full name, and store them in a **list**; print the list, one name per line.\n\n**Task 2.** Enter a string `S` and check whether `S` contains the substring `\"10\"`. There are two ways:\n\n- **Way 1:** traverse by index and look at two consecutive characters `S[i]` and `S[i + 1]`;\n- **Way 2 (fastest):** use the `in` operator: `\"10\" in S`.",
    ),
    trace_block(
        sim("Nhiệm vụ 1: nhập danh sách họ tên — 3 học sinh", "Task 1: entering a list of names — 3 students", "Mỗi họ tên là một xâu được append vào danh sách ds, rồi duyệt in từng tên.", "Each full name is a string appended to the list ds, then the list is traversed to print each name."),
        """n = int(input("Số học sinh: "))
ds = []
for i in range(n):
    ten = input("Họ và tên: ")
    ds.append(ten)
for ten in ds:
    print(ten)""",
        ["3", "Nguyễn Hòa Bình", "Trần Thu Hương", "Lê Văn An"],
    ),
    trace_block(
        sim("Nhiệm vụ 2, cách 1: duyệt theo chỉ số — nhập 3210", "Task 2, way 1: traverse by index — enter 3210", "Xét từng cặp kí tự liên tiếp; cặp cuối \"1\", \"0\" thỏa điều kiện nên co = True.", "Check each pair of consecutive characters; the last pair \"1\", \"0\" matches so co = True."),
        """S = input("Nhập xâu S: ")
co = False
for i in range(len(S) - 1):
    if S[i] == "1" and S[i + 1] == "0":
        co = True
if co:
    print("S có chứa xâu con 10")
else:
    print("S không chứa xâu con 10")""",
        ["3210"],
    ),
    trace_block(
        sim("Nhiệm vụ 2, cách 2: toán tử in — nhập 3120", "Task 2, way 2: the in operator — enter 3120", "Chỉ một biểu thức \"10\" in S thay cho cả vòng lặp; 3120 không chứa \"10\".", "A single expression \"10\" in S replaces the whole loop; 3120 does not contain \"10\"."),
        """S = input("Nhập xâu S: ")
if "10" in S:
    print("S có chứa xâu con 10")
else:
    print("S không chứa xâu con 10")""",
        ["3120"],
    ),
    T(
        "### 4. Luyện tập và vận dụng\n\n**Luyện tập 1.** Cho xâu `S`, tạo xâu `S1` gồm ba kí tự đầu: `S1 = S[0] + S[1] + S[2]`.\n\n**Luyện tập 2.** Kiểm tra xâu `S` có chứa chữ số không; thông báo \"S có chứa chữ số\" hoặc \"S không chứa chữ số nào\". Duyệt từng kí tự `ch` và kiểm tra `ch in \"0123456789\"`.\n\n**Vận dụng 1.** Cho hai xâu `s1`, `s2`. Chèn `s1` vào giữa `s2`, tại vị trí `len(s2) // 2`, rồi in kết quả. Vì không đổi được kí tự của xâu, ta **tạo xâu mới** bằng cách nối dần từng kí tự.\n\n**Vận dụng 2.** Nhập số học sinh và họ tên từng bạn; đếm trong danh sách có bao nhiêu bạn tên \"Hương\" (dùng toán tử `in` để kiểm tra xâu con).",
        "### 4. Practice and application\n\n**Practice 1.** Given a string `S`, build the string `S1` of its first three characters: `S1 = S[0] + S[1] + S[2]`.\n\n**Practice 2.** Check whether the string `S` contains a digit; report \"S có chứa chữ số\" (S contains a digit) or \"S không chứa chữ số nào\" (S contains no digit). Traverse each character `ch` and test `ch in \"0123456789\"`.\n\n**Application 1.** Given two strings `s1`, `s2`, insert `s1` into the middle of `s2`, at position `len(s2) // 2`, and print the result. Since a string's characters cannot be changed, we **build a new string** by joining characters one by one.\n\n**Application 2.** Enter the number of students and each student's full name; count how many students in the list are named \"Hương\" (use the `in` operator to test for a substring).",
    ),
    trace_block(
        sim("Luyện tập 1: ba kí tự đầu của xâu", "Practice 1: the first three characters of a string", "S[0], S[1], S[2] được nối bằng dấu + thành xâu mới S1.", "S[0], S[1], S[2] are joined with + into the new string S1."),
        """S = "Python"
S1 = S[0] + S[1] + S[2]
print(S1)""",
    ),
    trace_block(
        sim("Luyện tập 2: xâu có chứa chữ số — nhập Lop10A", "Practice 2: does the string contain a digit — enter Lop10A", "Gặp kí tự \"1\" thì biến co_so đổi thành True.", "On the character \"1\" the variable co_so becomes True."),
        """S = input("Nhập xâu S: ")
co_so = False
for ch in S:
    if ch in "0123456789":
        co_so = True
if co_so:
    print("S có chứa chữ số")
else:
    print("S không chứa chữ số nào")""",
        ["Lop10A"],
    ),
    trace_block(
        sim("Luyện tập 2: xâu có chứa chữ số — nhập Tin hoc", "Practice 2: does the string contain a digit — enter Tin hoc", "Không kí tự nào là chữ số nên co_so vẫn là False.", "No character is a digit so co_so stays False."),
        """S = input("Nhập xâu S: ")
co_so = False
for ch in S:
    if ch in "0123456789":
        co_so = True
if co_so:
    print("S có chứa chữ số")
else:
    print("S không chứa chữ số nào")""",
        ["Tin hoc"],
    ),
    trace_block(
        sim("Vận dụng 1: chèn s1 vào giữa s2", "Application 1: insert s1 into the middle of s2", "Khi i bằng k = len(s2) // 2 thì nối s1 trước kí tự s2[i]; kết quả \"abcXYZdef\".", "When i equals k = len(s2) // 2, s1 is joined before the character s2[i]; the result is \"abcXYZdef\"."),
        """s1 = "XYZ"
s2 = "abcdef"
k = len(s2) // 2
kq = ""
for i in range(len(s2)):
    if i == k:
        kq = kq + s1
    kq = kq + s2[i]
print(kq)""",
    ),
    trace_block(
        sim("Vận dụng 2: đếm các bạn tên Hương — nhập 4 họ tên", "Application 2: counting students named Hương — enter 4 names", "\"Hương\" in ten là True với hai họ tên, nên dem = 2.", "\"Hương\" in ten is True for two names, so dem = 2."),
        """n = int(input("Số học sinh: "))
dem = 0
for i in range(n):
    ten = input("Họ và tên: ")
    if "Hương" in ten:
        dem = dem + 1
print("Số bạn tên Hương:", dem)""",
        ["4", "Nguyễn Thu Hương", "Trần Văn An", "Lê Hương", "Phạm Minh"],
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Xâu kí tự | dãy các kí tự Unicode, viết giữa dấu nháy |\n| Chỉ số | `s[0]` đến `s[len(s) - 1]` |\n| `len(s)` | độ dài xâu, tính cả dấu cách |\n| Không đổi được | `s[0] = \"x\"` báo TypeError; muốn đổi phải tạo xâu mới |\n| Duyệt xâu | `for i in range(len(s))` hoặc `for ch in s` |\n| Xâu con | `s1 in s2` cho `True` hoặc `False` |\n\n**Tự kiểm tra:** `len(\"Thời khóa biểu\")` bằng bao nhiêu? (đáp án: `14`). `\"abc123\" in \"ababcabca\"` là gì? (đáp án: `False`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| String | a sequence of Unicode characters written between quotation marks |\n| Index | `s[0]` to `s[len(s) - 1]` |\n| `len(s)` | length of the string, spaces included |\n| Cannot be changed | `s[0] = \"x\"` raises TypeError; to change, build a new string |\n| Traverse | `for i in range(len(s))` or `for ch in s` |\n| Substring | `s1 in s2` gives `True` or `False` |\n\n**Self-check:** what is `len(\"Thời khóa biểu\")`? (answer: `14`). What is `\"abc123\" in \"ababcabca\"`? (answer: `False`).",
    ),
]

questions = [
    mc("tin10-b24-mc-01", 1, "Xâu kí tự trong Python là gì?", "What is a string in Python?",
       "Xâu kí tự là dãy các kí tự thuộc bảng mã Unicode, không chỉ gồm kí tự ASCII.", "A string is a sequence of characters from the Unicode table, not only ASCII characters.", "D",
       ("Xâu chỉ gồm các kí tự ASCII", "A string of only ASCII characters"), ("Xâu gồm kí tự ASCII và vài kí tự tiếng Việt", "A string of ASCII characters and a few Vietnamese characters"), ("Xâu chỉ gồm các chữ số", "A string of only digits"), ("Dãy các kí tự Unicode", "A sequence of Unicode characters")),
    mc("tin10-b24-mc-02", 1, "Với s = \"Thời khóa biểu\", len(s) bằng bao nhiêu?", "With s = \"Thời khóa biểu\", what is len(s)?",
       "Ba từ mỗi từ 4 chữ cái và hai dấu cách: 4 + 1 + 4 + 1 + 4 = 14.", "Three words of 4 letters each and two spaces: 4 + 1 + 4 + 1 + 4 = 14.", "B",
       ("12", "12"), ("14", "14"), ("3", "3"), ("17", "17")),
    mc("tin10-b24-mc-03", 1, "Với s = \"Python\", s[0] là kí tự nào?", "With s = \"Python\", which character is s[0]?",
       "Chỉ số của xâu bắt đầu từ 0 nên s[0] là kí tự đầu tiên \"P\".", "String indexes start at 0 so s[0] is the first character \"P\".", "A",
       ("\"P\"", "\"P\""), ("\"y\"", "\"y\""), ("\"n\"", "\"n\""), ("Báo lỗi", "An error")),
    mc("tin10-b24-mc-04", 2, "Điểm khác nhau chính giữa xâu và danh sách là gì?", "What is the main difference between a string and a list?",
       "Có thể thay đổi giá trị từng phần tử của danh sách nhưng không thể thay đổi từng kí tự của xâu.", "You can change each element of a list but not each character of a string.", "C",
       ("Xâu không có chỉ số", "Strings have no index"), ("Danh sách không duyệt được bằng for", "Lists cannot be traversed with for"), ("Không thể thay đổi từng kí tự của xâu", "A single character of a string cannot be changed"), ("Xâu không có độ dài", "Strings have no length")),
    mc("tin10-b24-mc-05", 2, "Lệnh s = \"abc\" rồi s[0] = \"x\" cho kết quả gì?", "What does s = \"abc\" followed by s[0] = \"x\" give?",
       "Xâu không cho phép gán lại từng kí tự nên Python báo TypeError.", "A string does not allow assigning one character, so Python raises a TypeError.", "C",
       ("s trở thành \"xbc\"", "s becomes \"xbc\""), ("s trở thành \"x\"", "s becomes \"x\""), ("Báo lỗi TypeError", "A TypeError"), ("s không đổi và không báo lỗi", "s is unchanged with no error")),
    mc("tin10-b24-mc-06", 2, "Biểu thức lôgic nào sau đây cho giá trị True?", "Which logical expression has the value True?",
       "\"01\" nằm liền nhau trong \"10101\" nên True; các xâu con kia không xuất hiện trong xâu dài.", "\"01\" appears consecutively in \"10101\" so True; the other substrings do not appear in the long strings.", "D",
       ("\"10110\" in \"111000101\"", "\"10110\" in \"111000101\""), ("\"acbab\" in \"bacbcabcabcb\"", "\"acbab\" in \"bacbcabcabcb\""), ("\"125\" in \"0123456789\"", "\"125\" in \"0123456789\""), ("\"01\" in \"10101\"", "\"01\" in \"10101\"")),
    mc("tin10-b24-mc-07", 2, "Sau s = \"10473\", skq = \"\", for ch in s: if ch in \"13579\": skq = skq + ch thì skq bằng gì?", "After s = \"10473\", skq = \"\", for ch in s: if ch in \"13579\": skq = skq + ch, what is skq?",
       "Các chữ số lẻ của s theo thứ tự là 1, 7, 3 nên skq = \"173\".", "The odd digits of s in order are 1, 7, 3 so skq = \"173\".", "B",
       ("\"04\"", "\"04\""), ("\"173\"", "\"173\""), ("\"10473\"", "\"10473\""), ("\"\"", "\"\"")),
    mc("tin10-b24-mc-08", 2, "Với s2 = \"ababcabca\", biểu thức \"abcabc\" in s2 có giá trị gì?", "With s2 = \"ababcabca\", what is \"abcabc\" in s2?",
       "Từ chỉ số 2 của s2 có \"abcabc\" (a-b-c-a-b-c) nên giá trị là True.", "From index 2 of s2 there is \"abcabc\" (a-b-c-a-b-c) so the value is True.", "A",
       ("True", "True"), ("False", "False"), ("Báo lỗi", "An error"), ("6", "6")),
    mc("tin10-b24-mc-09", 2, "Với s2 = \"ababcabca\", biểu thức \"abc123\" in s2 có giá trị gì?", "With s2 = \"ababcabca\", what is \"abc123\" in s2?",
       "s2 không chứa các kí tự 1, 2, 3 nên \"abc123\" không phải xâu con: False.", "s2 has no characters 1, 2, 3 so \"abc123\" is not a substring: False.", "D",
       ("True", "True"), ("6", "6"), ("Báo lỗi", "An error"), ("False", "False")),
    mc("tin10-b24-mc-10", 2, "Xâu \"123&*()+-ABC\" có độ dài bằng bao nhiêu?", "How long is the string \"123&*()+-ABC\"?",
       "Đếm: 1, 2, 3, &, *, (, ), +, -, A, B, C là 12 kí tự.", "Counting: 1, 2, 3, &, *, (, ), +, -, A, B, C gives 12 characters.", "A",
       ("12", "12"), ("10", "10"), ("9", "9"), ("15", "15")),
    mc("tin10-b24-mc-11", 2, "Xâu \"1010110&0101001\" có độ dài bằng bao nhiêu?", "How long is the string \"1010110&0101001\"?",
       "Hai dãy 7 chữ số và một kí tự & ở giữa: 7 + 1 + 7 = 15.", "Two runs of 7 digits and one & in the middle: 7 + 1 + 7 = 15.", "B",
       ("14", "14"), ("15", "15"), ("16", "16"), ("8", "8")),
    mc("tin10-b24-mc-12", 3, "Chèn s1 = \"XYZ\" vào s2 = \"abcdef\" tại vị trí len(s2) // 2 được xâu nào?", "Which string results from inserting s1 = \"XYZ\" into s2 = \"abcdef\" at position len(s2) // 2?",
       "len(s2) // 2 = 3 nên s1 được chèn trước kí tự có chỉ số 3 (\"d\"): \"abc\" + \"XYZ\" + \"def\".", "len(s2) // 2 = 3 so s1 goes before the character at index 3 (\"d\"): \"abc\" + \"XYZ\" + \"def\".", "C",
       ("\"XYZabcdef\"", "\"XYZabcdef\""), ("\"abXYZcdef\"", "\"abXYZcdef\""), ("\"abcXYZdef\"", "\"abcXYZdef\""), ("\"abcdefXYZ\"", "\"abcdefXYZ\"")),
]

truefalse = [
    tf("tin10-b24-tf-01", 1, "So sánh xâu kí tự và danh sách.", "Compare strings and lists.",
       "Xâu và danh sách đều đánh chỉ số từ 0; chỉ danh sách cho phép gán lại từng phần tử; xâu là dãy kí tự Unicode.", "Strings and lists are both indexed from 0; only lists allow assigning an element; a string is a sequence of Unicode characters.",
       ("Có thể truy cập từng kí tự của xâu bằng chỉ số bắt đầu từ 0.", "Each character of a string can be accessed by an index starting at 0.", True),
       ("Có thể gán s[0] = \"x\" cho một xâu s.", "You can assign s[0] = \"x\" to a string s.", False),
       ("Có thể gán A[0] = \"x\" cho một danh sách A.", "You can assign A[0] = \"x\" to a list A.", True),
       ("Xâu kí tự trong Python là dãy các kí tự Unicode.", "A string in Python is a sequence of Unicode characters.", True)),
    tf("tin10-b24-tf-02", 2, "Xét độ dài và tính hợp lệ của xâu.", "Consider the length and validity of strings.",
       "\"123&*()+-ABC\" hợp lệ với độ dài 12; 11111111 = 256 không phải xâu; \"Tây Nguyên\" dài 10; \"1010110&0101001\" dài 15.", "\"123&*()+-ABC\" is valid with length 12; 11111111 = 256 is not a string; \"Tây Nguyên\" has length 10; \"1010110&0101001\" has length 15.",
       ("\"123&*()+-ABC\" là một xâu hợp lệ.", "\"123&*()+-ABC\" is a valid string.", True),
       ("11111111 = 256 là một xâu hợp lệ.", "11111111 = 256 is a valid string.", False),
       ("\"Tây Nguyên\" có độ dài 10.", "\"Tây Nguyên\" has length 10.", True),
       ("\"1010110&0101001\" có độ dài 14.", "\"1010110&0101001\" has length 14.", False)),
    tf("tin10-b24-tf-03", 2, "Cho s1 = \"abc\", s2 = \"ababcabca\". Xét toán tử in.", "Given s1 = \"abc\", s2 = \"ababcabca\". Consider the in operator.",
       "s1 in s2 và s1 + s1 in s2 là True; \"abcabca\" cũng là xâu con của s2 (True); \"abc123\" thì không.", "s1 in s2 and s1 + s1 in s2 are True; \"abcabca\" is also a substring of s2 (True); \"abc123\" is not.",
       ("s1 in s2 có giá trị True.", "s1 in s2 is True.", True),
       ("s1 + s1 in s2 có giá trị True.", "s1 + s1 in s2 is True.", True),
       ("\"abc123\" in s2 có giá trị True.", "\"abc123\" in s2 is True.", False),
       ("\"abcabca\" in s2 có giá trị False.", "\"abcabca\" in s2 is False.", False)),
    tf("tin10-b24-tf-04", 2, "Xét các chương trình xử lí xâu.", "Consider the string-processing programs.",
       "for ch in s gán lần lượt từng kí tự; \"10473\" cho các chữ số lẻ \"173\"; kiểm tra xâu con dùng toán tử in; \"Hương\" nằm trong \"Nguyễn Thu Hương\".", "for ch in s assigns each character in turn; \"10473\" gives the odd digits \"173\"; substring tests use the in operator; \"Hương\" is in \"Nguyễn Thu Hương\".",
       ("Trong for ch in s, biến ch lần lượt nhận từng kí tự của s.", "In for ch in s, the variable ch takes each character of s in turn.", True),
       ("Các chữ số lẻ của xâu \"10473\" tạo thành xâu \"173\".", "The odd digits of the string \"10473\" form the string \"173\".", True),
       ("Để kiểm tra một xâu có là xâu con của xâu khác, có thể dùng toán tử in.", "To test whether one string is a substring of another, the in operator can be used.", True),
       ("\"Hương\" in \"Nguyễn Thu Hương\" có giá trị False.", "\"Hương\" in \"Nguyễn Thu Hương\" is False.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
