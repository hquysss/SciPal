# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_23_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "mot-so-lenh-lam-viec-voi-du-lieu-danh-sach-bai-23-tin10"
title_vi = "Bài 23. Một số lệnh làm việc với dữ liệu danh sách"
title_en = "Lesson 23. Some commands for working with list data"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- dùng **toán tử `in`** để kiểm tra một giá trị có nằm trong danh sách và để duyệt danh sách bằng `for`;\n- dùng các phương thức **`append()`**, **`insert()`**, **`remove()`**, **`clear()`** để thêm, chèn, xóa phần tử;\n- biết lệnh nào có thể gây lỗi và tránh xóa phần tử sai cách trong khi duyệt;\n- viết chương trình giải các bài toán nhỏ trên danh sách.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- use the **`in` operator** to test whether a value is in a list and to traverse a list with `for`;\n- use the methods **`append()`**, **`insert()`**, **`remove()`**, **`clear()`** to add, insert and delete elements;\n- know which command can raise an error and avoid deleting elements the wrong way while traversing;\n- write programs for small problems on lists.",
    ),
    T(
        "### 1. Duyệt danh sách với toán tử `in`\n\nToán tử **`in`** kiểm tra một phần tử có nằm trong danh sách hay không, kết quả là `True` hoặc `False`:\n\n```python\n<giá trị> in <danh sách>\n```\n\nVí dụ với `A = [\"0\", \"1\", \"01\", \"10\"]`:\n\n- `\"01\" in A` là `True`;\n- `1 in A` là `False` vì `1` là số nguyên, còn các phần tử của `A` là xâu.\n\nCũng nhờ `in`, ta duyệt từng phần tử **trực tiếp**, không cần `range()`:\n\n```python\nfor x in A:\n    <xử lí x>\n```\n\nBiến `x` lần lượt nhận từng phần tử của `A`. Trong `for i in range(10):` từ khóa `in` chính là toán tử này: `i` lần lượt nhận từng giá trị trong vùng `range(10)`.",
        "### 1. Traversing a list with the `in` operator\n\nThe **`in`** operator tests whether an element is in a list; the result is `True` or `False`:\n\n```python\n<value> in <list>\n```\n\nExample with `A = [\"0\", \"1\", \"01\", \"10\"]`:\n\n- `\"01\" in A` is `True`;\n- `1 in A` is `False` because `1` is an integer while the elements of `A` are strings.\n\nThanks to `in`, we can traverse each element **directly**, without `range()`:\n\n```python\nfor x in A:\n    <process x>\n```\n\nThe variable `x` takes each element of `A` in turn. In `for i in range(10):` the keyword `in` is this same operator: `i` takes each value of `range(10)` in turn.",
    ),
    trace_block(
        sim("Toán tử in và duyệt trực tiếp", "The in operator and direct traversal", "1 in A sai vì kiểu khác nhau, \"01\" in A đúng; for x in A cho x lần lượt nhận từng phần tử.", "1 in A is false because the types differ, \"01\" in A is true; for x in A gives x each element in turn."),
        """A = ["0", "1", "01", "10"]
print(1 in A)
print("01" in A)
for x in A:
    print(x, end=" ")""",
    ),
    T(
        "### 2. Một số lệnh làm việc với danh sách\n\n| Lệnh | Tác dụng | Lỗi? |\n|---|---|---|\n| `A.append(x)` | thêm `x` vào **cuối** danh sách | không |\n| `A.insert(k, x)` | **chèn** `x` vào vị trí (chỉ số) `k` | không |\n| `A.remove(x)` | xóa phần tử **đầu tiên** có giá trị `x` | **có** nếu `x` không có trong `A` |\n| `A.clear()` | xóa **toàn bộ** phần tử của `A` | không |\n\nVí dụ: `A = [1, 4, 10, 0]` sau `A.insert(3, 5)` thành `[1, 4, 10, 5, 0]`. Khi `A` rỗng, `A.append(1)` và `A.insert(0, 1)` có tác dụng giống nhau.\n\nĐể tránh lỗi của `remove()`, kiểm tra trước bằng `in`:\n\n```python\nif 10 in A:\n    A.remove(10)\n```",
        "### 2. Some commands for working with lists\n\n| Command | Effect | Error? |\n|---|---|---|\n| `A.append(x)` | adds `x` at the **end** | no |\n| `A.insert(k, x)` | **inserts** `x` at position (index) `k` | no |\n| `A.remove(x)` | deletes the **first** element equal to `x` | **yes** if `x` is not in `A` |\n| `A.clear()` | deletes **all** elements of `A` | no |\n\nExample: `A = [1, 4, 10, 0]` becomes `[1, 4, 10, 5, 0]` after `A.insert(3, 5)`. When `A` is empty, `A.append(1)` and `A.insert(0, 1)` have the same effect.\n\nTo avoid the error of `remove()`, test first with `in`:\n\n```python\nif 10 in A:\n    A.remove(10)\n```",
    ),
    trace_block(
        sim("append, insert, remove và clear", "append, insert, remove and clear", "Theo dõi A sau mỗi lệnh: insert chèn vào đúng chỉ số, remove xóa phần tử 10 đầu tiên, clear làm A rỗng.", "Follow A after each command: insert places at the exact index, remove deletes the first 10, clear empties A."),
        """A = [1, 4, 10, 0]
A.append(7)
A.insert(3, 5)
if 10 in A:
    A.remove(10)
print(A)
A.clear()
print(A)""",
    ),
    trace_block(
        sim("remove() báo lỗi khi không có phần tử", "remove() raises an error when the element is missing", "Danh sách không có số 9 nên A.remove(9) báo ValueError; phải kiểm tra bằng in trước.", "The list has no 9, so A.remove(9) raises a ValueError; test with in first."),
        """A = [1, 2, 3]
A.remove(2)
print(A)
A.remove(9)""",
    ),
    T(
        "### 3. Thực hành\n\n**Nhiệm vụ 1.** Nhập `n` rồi nhập tên `n` học sinh; in danh sách theo thứ tự **ngược** với thứ tự nhập. Muốn tên nhập sau được in trước, dùng `insert(0, ten)` để chèn mỗi tên vào **đầu** danh sách.\n\n**Nhiệm vụ 2.** Cho dãy số `A`, xóa các phần tử có giá trị nhỏ hơn 0. Chú ý: dùng `for i in range(len(A))` rồi `del A[i]` là **sai**, vì mỗi lần xóa, danh sách ngắn đi và các phần tử dồn về trước, nên chỉ số `i` sẽ bỏ sót phần tử hoặc vượt quá độ dài. Cách đúng: dùng `while`, chỉ tăng `i` khi **không** xóa.\n\n**Nhiệm vụ 3.** Tìm **vị trí đầu tiên** trong `A` có ba số hạng liên tiếp là `1, 2, 3`. Nếu tìm thấy thì báo vị trí, nếu không thì báo \"Không tìm thấy mẫu\".",
        "### 3. Practice\n\n**Task 1.** Enter `n` and then the names of `n` students; print the list in the **reverse** of the input order. To print later names first, use `insert(0, ten)` to put each name at the **front** of the list.\n\n**Task 2.** Given a sequence `A`, delete the elements smaller than 0. Careful: using `for i in range(len(A))` with `del A[i]` is **wrong**, because after each deletion the list gets shorter and elements shift forward, so the index `i` skips elements or goes beyond the length. The correct way: use `while` and increase `i` only when **nothing** is deleted.\n\n**Task 3.** Find the **first position** in `A` where three consecutive terms are `1, 2, 3`. If found, report the position; otherwise report \"Không tìm thấy mẫu\" (pattern not found).",
    ),
    trace_block(
        sim("Nhiệm vụ 1: in ngược thứ tự nhập — nhập 3 tên", "Task 1: print in reverse input order — enter 3 names", "Mỗi tên mới được insert(0, ten) vào đầu danh sách nên danh sách cuối cùng đảo ngược thứ tự nhập.", "Each new name is inserted with insert(0, ten) at the front, so the final list reverses the input order."),
        """n = int(input("Số học sinh: "))
ds = []
for i in range(n):
    ten = input("Tên: ")
    ds.insert(0, ten)
for i in range(len(ds)):
    print(ds[i])""",
        ["3", "An", "Bình", "Chi"],
    ),
    trace_block(
        sim("Nhiệm vụ 2: cách SAI khi xóa trong lúc duyệt", "Task 2: the WRONG way to delete while traversing", "Sau mỗi del danh sách ngắn đi, nên cuối cùng A[i] vượt quá chỉ số và báo IndexError.", "After each del the list gets shorter, so in the end A[i] goes out of range and raises an IndexError."),
        """A = [3, -1, -2, 5, -7, 0]
for i in range(len(A)):
    if A[i] < 0:
        del A[i]
print(A)""",
    ),
    trace_block(
        sim("Nhiệm vụ 2: cách ĐÚNG bằng while", "Task 2: the RIGHT way with while", "Chỉ tăng i khi A[i] không bị xóa; kết quả [3, 5, 0].", "i grows only when A[i] is not deleted; the result is [3, 5, 0]."),
        """A = [3, -1, -2, 5, -7, 0]
i = 0
while i < len(A):
    if A[i] < 0:
        del A[i]
    else:
        i = i + 1
print(A)""",
    ),
    trace_block(
        sim("Nhiệm vụ 3: tìm mẫu 1, 2, 3", "Task 3: finding the pattern 1, 2, 3", "Duyệt i đến len(A) − 3; ghi lại vị trí đầu tiên mà ba số liên tiếp là 1, 2, 3.", "Traverse i up to len(A) − 3; record the first position where three consecutive terms are 1, 2, 3."),
        """A = [4, 1, 2, 3, 5, 1, 2, 3]
vi_tri = -1
for i in range(len(A) - 2):
    if A[i] == 1 and A[i + 1] == 2 and A[i + 2] == 3 and vi_tri == -1:
        vi_tri = i
if vi_tri == -1:
    print("Không tìm thấy mẫu")
else:
    print("Tìm thấy tại vị trí", vi_tri)""",
    ),
    T(
        "### 4. Luyện tập và vận dụng\n\n**Luyện tập 1.** Với `A = [1, 2, 2, 3, 4, 5, 5]`, chèn số 1 ngay sau giá trị 1 đầu dãy: `A.insert(1, 1)`.\n\n**Luyện tập 2.** Cho dãy `A` có `n` phần tử, xóa phần tử **chính giữa**: nếu `n` lẻ xóa một phần tử ở chỉ số `n // 2`; nếu `n` chẵn xóa hai phần tử ở chỉ số `n // 2` và `n // 2 - 1` (xóa chỉ số lớn hơn trước để không làm lệch chỉ số còn lại).\n\n**Vận dụng 1.** Nhập `n`, tạo dãy `A` gồm `n` số tự nhiên chẵn đầu tiên `0, 2, 4, ...`.\n\n**Vận dụng 2.** Dãy **Fibonacci**: $F_0 = 0$, $F_1 = 1$, $F_n = F_{n-1} + F_{n-2}$ với $n \\geq 2$. Nhập `n`, tạo dãy `A` gồm `n` số hạng đầu. Dùng lệnh gán đồng thời `a, b = b, a + b`.\n\n**Bài làm thêm.** Đếm số phần tử lớn hơn 0 của `A`; tạo danh sách `B` chỉ gồm các số chẵn của `A`; chèn xâu \"Số âm\" vào ngay sau phần tử nhỏ hơn 0 đầu tiên của `[1, 2, -5, 5, 8, -8]`.",
        "### 4. Practice and application\n\n**Practice 1.** With `A = [1, 2, 2, 3, 4, 5, 5]`, insert a 1 right after the first 1: `A.insert(1, 1)`.\n\n**Practice 2.** Given a sequence `A` of `n` elements, delete the **middle** element(s): if `n` is odd delete one element at index `n // 2`; if `n` is even delete two elements at indexes `n // 2` and `n // 2 - 1` (delete the larger index first so the other index stays valid).\n\n**Application 1.** Enter `n` and build the sequence `A` of the first `n` even natural numbers `0, 2, 4, ...`.\n\n**Application 2.** The **Fibonacci** sequence: $F_0 = 0$, $F_1 = 1$, $F_n = F_{n-1} + F_{n-2}$ for $n \\geq 2$. Enter `n` and build the sequence `A` of the first `n` terms. Use the simultaneous assignment `a, b = b, a + b`.\n\n**Extra exercises.** Count the elements of `A` greater than 0; build a list `B` of only the even numbers of `A`; insert the string \"Số âm\" (negative number) right after the first element smaller than 0 in `[1, 2, -5, 5, 8, -8]`.",
    ),
    trace_block(
        sim("Luyện tập 2: xóa phần tử giữa — n = 5 (lẻ)", "Practice 2: delete the middle — n = 5 (odd)", "n lẻ nên chỉ xóa một phần tử ở chỉ số n // 2 = 2.", "n is odd so only one element at index n // 2 = 2 is deleted."),
        """n = int(input("Nhập n: "))
A = []
for i in range(n):
    A.append(i + 1)
if n % 2 == 1:
    del A[n // 2]
else:
    del A[n // 2]
    del A[n // 2 - 1]
print(A)""",
        ["5"],
    ),
    trace_block(
        sim("Luyện tập 2: xóa phần tử giữa — n = 6 (chẵn)", "Practice 2: delete the middle — n = 6 (even)", "n chẵn nên xóa hai phần tử ở chỉ số 3 rồi 2; kết quả [1, 2, 5, 6].", "n is even so two elements at indexes 3 and then 2 are deleted; the result is [1, 2, 5, 6]."),
        """n = int(input("Nhập n: "))
A = []
for i in range(n):
    A.append(i + 1)
if n % 2 == 1:
    del A[n // 2]
else:
    del A[n // 2]
    del A[n // 2 - 1]
print(A)""",
        ["6"],
    ),
    trace_block(
        sim("Vận dụng 1: n số chẵn đầu tiên — nhập 5", "Application 1: the first n even numbers — enter 5", "Số chẵn thứ i là 2 * i; mỗi lần lặp append vào A.", "The i-th even number is 2 * i; each repetition appends it to A."),
        """n = int(input("Nhập n: "))
A = []
for i in range(n):
    A.append(2 * i)
print(A)""",
        ["5"],
    ),
    trace_block(
        sim("Vận dụng 2: dãy Fibonacci — nhập 8", "Application 2: the Fibonacci sequence — enter 8", "Mỗi lần lặp thêm a vào A rồi cập nhật (a, b) = (b, a + b).", "Each repetition appends a to A and then updates (a, b) = (b, a + b)."),
        """n = int(input("Nhập n: "))
A = []
a, b = 0, 1
for i in range(n):
    A.append(a)
    a, b = b, a + b
print(A)""",
        ["8"],
    ),
    trace_block(
        sim("Bài làm thêm: đếm số dương và lọc số chẵn", "Extra: counting positives and filtering evens", "Một vòng for vừa đếm các số lớn hơn 0 vừa thêm các số chẵn vào danh sách B.", "One for loop counts the numbers greater than 0 and appends the even numbers to the list B."),
        """A = [3, -4, 8, 0, 7, -2, 6]
dem = 0
B = []
for x in A:
    if x > 0:
        dem = dem + 1
    if x % 2 == 0:
        B.append(x)
print("Số phần tử lớn hơn 0:", dem)
print("Các số chẵn:", B)""",
    ),
    trace_block(
        sim("Bài làm thêm: chèn \"Số âm\" sau số âm đầu tiên", "Extra: insert \"Số âm\" after the first negative number", "Tìm chỉ số i của số âm đầu tiên rồi chèn xâu vào vị trí i + 1.", "Find the index i of the first negative number and insert the string at position i + 1."),
        """A = [1, 2, -5, 5, 8, -8]
i = 0
while i < len(A) and A[i] >= 0:
    i = i + 1
if i < len(A):
    A.insert(i + 1, "Số âm")
print(A)""",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| `x in A` | `True` nếu `x` có trong `A`, ngược lại `False` |\n| `for x in A:` | duyệt trực tiếp từng phần tử, không cần `range()` |\n| `A.append(x)` | thêm vào cuối |\n| `A.insert(k, x)` | chèn `x` vào chỉ số `k` |\n| `A.remove(x)` | xóa `x` đầu tiên; **lỗi** nếu không có |\n| `A.clear()` | xóa hết |\n| Xóa khi duyệt | dùng `while`, chỉ tăng `i` khi không xóa |\n\n**Tự kiểm tra:** sau `A = [1, 4, 10, 0]` và `A.insert(3, 5)` thì `A` bằng gì? (đáp án: `[1, 4, 10, 5, 0]`). Hai số hạng đầu của Fibonacci và 6 số hạng đầu là gì? (đáp án: `0, 1` và `0, 1, 1, 2, 3, 5`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| `x in A` | `True` if `x` is in `A`, otherwise `False` |\n| `for x in A:` | traverse each element directly, no `range()` needed |\n| `A.append(x)` | add at the end |\n| `A.insert(k, x)` | insert `x` at index `k` |\n| `A.remove(x)` | delete the first `x`; **error** if missing |\n| `A.clear()` | delete everything |\n| Deleting while traversing | use `while`, increase `i` only when nothing is deleted |\n\n**Self-check:** after `A = [1, 4, 10, 0]` and `A.insert(3, 5)`, what is `A`? (answer: `[1, 4, 10, 5, 0]`). What are the first two Fibonacci terms and the first 6 terms? (answer: `0, 1` and `0, 1, 1, 2, 3, 5`).",
    ),
]

questions = [
    mc("tin10-b23-mc-01", 1, "Toán tử in trong biểu thức x in A dùng để làm gì?", "What is the in operator in the expression x in A used for?",
       "Toán tử in kiểm tra x có nằm trong danh sách A hay không, cho True hoặc False.", "The in operator tests whether x is in the list A and gives True or False.", "A",
       ("Kiểm tra x có nằm trong danh sách A hay không", "Test whether x is in the list A"), ("Thêm x vào danh sách A", "Add x to the list A"), ("Xóa x khỏi danh sách A", "Remove x from the list A"), ("Đếm số phần tử của A", "Count the elements of A")),
    mc("tin10-b23-mc-02", 1, "Lệnh nào thêm phần tử x vào cuối danh sách a?", "Which command adds the element x at the end of the list a?",
       "Phương thức append() thêm phần tử vào cuối danh sách; add() và insert(x) (thiếu chỉ số) không phải cách đúng.", "The append() method adds an element at the end; add() and insert(x) (no index) are not correct.", "C",
       ("a.insert(x)", "a.insert(x)"), ("a.add(x)", "a.add(x)"), ("a.append(x)", "a.append(x)"), ("a.clear(x)", "a.clear(x)")),
    mc("tin10-b23-mc-03", 1, "Lệnh A.clear() có tác dụng gì?", "What does the command A.clear() do?",
       "clear() xóa toàn bộ phần tử, danh sách trở thành rỗng và lệnh không bao giờ gây lỗi.", "clear() deletes all elements; the list becomes empty and the command never raises an error.", "B",
       ("Xóa phần tử đầu tiên", "Deletes the first element"), ("Xóa toàn bộ phần tử của danh sách", "Deletes all elements of the list"), ("Xóa phần tử cuối cùng", "Deletes the last element"), ("Xóa danh sách A khỏi chương trình và báo lỗi nếu dùng lại", "Deletes the name A from the program")),
    mc("tin10-b23-mc-04", 1, "Với a = [1, 3, 5, 7], len(a) cho kết quả là gì?", "With a = [1, 3, 5, 7], what does len(a) give?",
       "Danh sách có 4 phần tử nên len(a) bằng 4.", "The list has 4 elements, so len(a) is 4.", "D",
       ("3", "3"), ("5", "5"), ("7", "7"), ("4", "4")),
    mc("tin10-b23-mc-05", 2, "Lệnh a.remove(x) có tác dụng gì?", "What does the command a.remove(x) do?",
       "remove(x) xóa phần tử đầu tiên có giá trị bằng x; nếu x không có trong danh sách thì báo lỗi.", "remove(x) deletes the first element equal to x; if x is not in the list it raises an error.", "C",
       ("Xóa tất cả phần tử của danh sách", "Deletes all elements of the list"), ("Xóa phần tử ở vị trí x", "Deletes the element at position x"), ("Xóa phần tử đầu tiên có giá trị bằng x", "Deletes the first element equal to x"), ("Xóa phần tử cuối cùng", "Deletes the last element")),
    mc("tin10-b23-mc-06", 2, "Với A = [\"0\", \"1\", \"01\", \"10\"], biểu thức 1 in A cho giá trị gì?", "With A = [\"0\", \"1\", \"01\", \"10\"], what is the value of 1 in A?",
       "1 là số nguyên còn các phần tử của A là xâu, nên 1 không nằm trong A: False.", "1 is an integer while the elements of A are strings, so 1 is not in A: False.", "A",
       ("False", "False"), ("True", "True"), ("Báo lỗi", "An error"), ("1", "1")),
    mc("tin10-b23-mc-07", 2, "Với A = [\"0\", \"1\", \"01\", \"10\"], biểu thức \"01\" in A cho giá trị gì?", "With A = [\"0\", \"1\", \"01\", \"10\"], what is the value of \"01\" in A?",
       "Xâu \"01\" là một phần tử của A nên kết quả là True.", "The string \"01\" is an element of A so the result is True.", "D",
       ("False", "False"), ("Báo lỗi", "An error"), ("2", "2"), ("True", "True")),
    mc("tin10-b23-mc-08", 2, "Danh sách A trước và sau là [1, 4, 10, 0] và [1, 4, 10, 5, 0]. Lệnh nào đã được dùng?", "The list A before and after is [1, 4, 10, 0] and [1, 4, 10, 5, 0]. Which command was used?",
       "Số 5 nằm ở chỉ số 3 trong danh sách mới, nên lệnh là A.insert(3, 5).", "The 5 is at index 3 in the new list, so the command is A.insert(3, 5).", "B",
       ("A.append(5)", "A.append(5)"), ("A.insert(3, 5)", "A.insert(3, 5)"), ("A.insert(5, 3)", "A.insert(5, 3)"), ("A.remove(5)", "A.remove(5)")),
    mc("tin10-b23-mc-09", 2, "Với A rỗng, lệnh nào cho kết quả giống A.append(1)?", "With A empty, which command gives the same result as A.append(1)?",
       "Khi A rỗng, chèn 1 vào chỉ số 0 cũng đưa 1 vào danh sách như append: A.insert(0, 1).", "When A is empty, inserting 1 at index 0 also puts 1 in the list like append: A.insert(0, 1).", "A",
       ("A.insert(0, 1)", "A.insert(0, 1)"), ("A.insert(1, 0)", "A.insert(1, 0)"), ("A.remove(1)", "A.remove(1)"), ("A.clear()", "A.clear()")),
    mc("tin10-b23-mc-10", 2, "Với A = [4, 7, 4], sau A.remove(4) thì A bằng gì?", "With A = [4, 7, 4], what is A after A.remove(4)?",
       "remove(4) chỉ xóa phần tử 4 đầu tiên, còn lại [7, 4].", "remove(4) only deletes the first 4, leaving [7, 4].", "C",
       ("[7]", "[7]"), ("[4, 7]", "[4, 7]"), ("[7, 4]", "[7, 4]"), ("[4, 7, 4]", "[4, 7, 4]")),
    mc("tin10-b23-mc-11", 2, "Với A = [1, 2, 3], lệnh nào báo lỗi?", "With A = [1, 2, 3], which command raises an error?",
       "A.remove(9) báo ValueError vì 9 không có trong A; các lệnh còn lại không gây lỗi.", "A.remove(9) raises a ValueError because 9 is not in A; the other commands raise no error.", "D",
       ("A.append(9)", "A.append(9)"), ("A.insert(0, 9)", "A.insert(0, 9)"), ("A.clear()", "A.clear()"), ("A.remove(9)", "A.remove(9)")),
    mc("tin10-b23-mc-12", 3, "Nhập n = 8 vào chương trình Fibonacci: A = []; a, b = 0, 1; lặp n lần: A.append(a); a, b = b, a + b. A bằng gì?", "Enter n = 8 in the Fibonacci program: A = []; a, b = 0, 1; repeat n times: A.append(a); a, b = b, a + b. What is A?",
       "Các số hạng là 0, 1, 1, 2, 3, 5, 8, 13: mỗi số bằng tổng hai số liền trước.", "The terms are 0, 1, 1, 2, 3, 5, 8, 13: each is the sum of the previous two.", "B",
       ("[1, 1, 2, 3, 5, 8, 13, 21]", "[1, 1, 2, 3, 5, 8, 13, 21]"), ("[0, 1, 1, 2, 3, 5, 8, 13]", "[0, 1, 1, 2, 3, 5, 8, 13]"), ("[0, 1, 2, 3, 5, 8, 13, 21]", "[0, 1, 2, 3, 5, 8, 13, 21]"), ("[0, 1, 1, 2, 3, 5, 8]", "[0, 1, 1, 2, 3, 5, 8]")),
]

truefalse = [
    tf("tin10-b23-tf-01", 1, "Xét toán tử in.", "Consider the in operator.",
       "x in A cho True hoặc False; for x in A duyệt trực tiếp mà không cần range(); 1 in A sai vì A chứa các xâu.", "x in A gives True or False; for x in A traverses directly without range(); 1 in A is false because A holds strings.",
       ("x in A cho kết quả True hoặc False.", "x in A gives True or False.", True),
       ("Muốn duyệt danh sách bằng for thì bắt buộc dùng range().", "To traverse a list with for you must use range().", False),
       ("1 in [\"0\", \"1\", \"01\", \"10\"] có giá trị True.", "1 in [\"0\", \"1\", \"01\", \"10\"] is True.", False),
       ("\"01\" in [\"0\", \"1\", \"01\", \"10\"] có giá trị True.", "\"01\" in [\"0\", \"1\", \"01\", \"10\"] is True.", True)),
    tf("tin10-b23-tf-02", 2, "Xét các phương thức của danh sách.", "Consider the list methods.",
       "insert(k, x) chèn tại chỉ số k, clear() xóa hết, remove(x) lỗi nếu không có x; với A rỗng append(1) và insert(0, 1) như nhau.", "insert(k, x) inserts at index k, clear() deletes all, remove(x) raises an error if x is missing; for an empty A, append(1) and insert(0, 1) are the same.",
       ("A.insert(k, x) chèn x vào vị trí k của danh sách.", "A.insert(k, x) inserts x at position k of the list.", True),
       ("A.clear() xóa toàn bộ phần tử của danh sách.", "A.clear() deletes all elements of the list.", True),
       ("A.remove(x) không bao giờ gây lỗi.", "A.remove(x) never raises an error.", False),
       ("Khi A rỗng, A.append(1) và A.insert(0, 1) có tác dụng giống nhau.", "When A is empty, A.append(1) and A.insert(0, 1) have the same effect.", True)),
    tf("tin10-b23-tf-03", 2, "Xét các chương trình thực hành.", "Consider the practice programs.",
       "insert(3, 5) cho [1, 4, 10, 5, 0]; xóa trong for range(len(A)) dễ sai; insert(0, ten) đảo thứ tự; Fibonacci 5 số đầu là 0, 1, 1, 2, 3.", "insert(3, 5) gives [1, 4, 10, 5, 0]; deleting inside for range(len(A)) is error-prone; insert(0, ten) reverses the order; the first 5 Fibonacci terms are 0, 1, 1, 2, 3.",
       ("A = [1, 4, 10, 0] sau A.insert(3, 5) là [1, 4, 10, 5, 0].", "A = [1, 4, 10, 0] after A.insert(3, 5) is [1, 4, 10, 5, 0].", True),
       ("Dùng for i in range(len(A)) kèm del A[i] để xóa số âm luôn cho kết quả đúng.", "Using for i in range(len(A)) with del A[i] to delete negatives always gives the right result.", False),
       ("Chèn mỗi tên vào đầu danh sách bằng insert(0, ten) làm danh sách đảo ngược thứ tự nhập.", "Inserting each name at the front with insert(0, ten) reverses the input order.", True),
       ("Năm số hạng đầu của dãy Fibonacci là 0, 1, 2, 3, 5.", "The first five terms of the Fibonacci sequence are 0, 1, 2, 3, 5.", False)),
    tf("tin10-b23-tf-04", 3, "Xét A = [1, 2, -5, 5, 8, -8] và việc chèn xâu \"Số âm\" vào sau phần tử âm đầu tiên.", "Consider A = [1, 2, -5, 5, 8, -8] and inserting the string \"Số âm\" after the first negative element.",
       "Phần tử âm đầu tiên là -5 ở chỉ số 2; chèn sau nó là insert(3, ...); danh sách thành 7 phần tử; insert(2, ...) sẽ chèn trước -5.", "The first negative element is -5 at index 2; inserting after it is insert(3, ...); the list gets 7 elements; insert(2, ...) would insert before -5.",
       ("Phần tử âm đầu tiên của A là -5.", "The first negative element of A is -5.", True),
       ("Lệnh A.insert(3, \"Số âm\") chèn xâu ngay sau -5.", "The command A.insert(3, \"Số âm\") inserts the string right after -5.", True),
       ("Sau khi chèn, danh sách có 7 phần tử.", "After the insertion the list has 7 elements.", True),
       ("Lệnh A.insert(2, \"Số âm\") chèn xâu ngay sau -5.", "The command A.insert(2, \"Số âm\") inserts the string right after -5.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
