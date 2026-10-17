# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_22_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "kieu-du-lieu-danh-sach-bai-22-tin10"
title_vi = "Bài 22. Kiểu dữ liệu danh sách"
title_en = "Lesson 22. The list data type"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nêu được **kiểu dữ liệu danh sách** (`list`), khởi tạo danh sách và truy cập từng phần tử bằng **chỉ số**;\n- thay đổi, xóa phần tử và ghép danh sách;\n- **duyệt** các phần tử của danh sách bằng lệnh `for` kết hợp `range(len(...))`;\n- dùng phương thức **`append()`** để thêm phần tử và viết chương trình nhập, xử lí danh sách.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- explain the **list data type** (`list`), create a list and access each element by its **index**;\n- change and delete elements and join lists;\n- **traverse** the elements of a list with `for` and `range(len(...))`;\n- use the **`append()`** method to add elements and write programs that read and process lists.",
    ),
    T(
        "### 1. Kiểu dữ liệu danh sách\n\nTrong thực tế ta thường gặp danh sách: danh sách học sinh được khen thưởng, bảng điểm của lớp 10A3, các khoản thu chi của thủ quỹ... Python lưu chúng bằng kiểu **danh sách** (`list`).\n\n**Khởi tạo:**\n\n```python\n<tên list> = [<v1>, <v2>, ..., <vn>]\n```\n\nCác giá trị có thể thuộc **kiểu khác nhau**, ví dụ `A = [1, 0, \"One\", 9, 15, \"Two\", True, False]`. Danh sách rỗng là `[]`.\n\n**Truy cập và thay đổi** từng phần tử qua **chỉ số**: `<danh sách>[<chỉ số>]`.\n\n- Chỉ số **bắt đầu từ 0** đến `len(A) - 1`, trong đó `len(A)` là độ dài danh sách. Dùng chỉ số ngoài khoảng đó báo lỗi **IndexError**.\n- Với danh sách `A` trên: `A[0]` là `1`, `A[2]` là `\"One\"`, `A[7]` là `False`, còn `A[len(A)]` (tức `A[8]`) báo lỗi chỉ số.\n- Gán `A[1] = 20` đổi phần tử có chỉ số 1.\n- **Xóa** phần tử: `del A[0]`.\n- **Ghép** danh sách bằng `+`: `A = A + [10]` thêm 10 vào cuối, `A = [100] + A` thêm 100 vào đầu. `A[1] * 25` là tích của phần tử thứ hai với 25.",
        "### 1. The list data type\n\nIn real life we meet lists often: students receiving awards, the score table of class 10A3, a treasurer's income and expenses... Python stores them in the **list** type (`list`).\n\n**Creating:**\n\n```python\n<list name> = [<v1>, <v2>, ..., <vn>]\n```\n\nThe values can be of **different types**, for example `A = [1, 0, \"One\", 9, 15, \"Two\", True, False]`. The empty list is `[]`.\n\n**Access and change** each element by its **index**: `<list>[<index>]`.\n\n- The index **starts at 0** and goes to `len(A) - 1`, where `len(A)` is the length of the list. An index outside that range raises an **IndexError**.\n- For the list `A` above: `A[0]` is `1`, `A[2]` is `\"One\"`, `A[7]` is `False`, while `A[len(A)]` (that is `A[8]`) raises an index error.\n- The assignment `A[1] = 20` changes the element at index 1.\n- **Delete** an element: `del A[0]`.\n- **Join** lists with `+`: `A = A + [10]` adds 10 at the end, `A = [100] + A` adds 100 at the front. `A[1] * 25` is the second element times 25.",
    ),
    trace_block(
        sim("Khởi tạo danh sách và truy cập theo chỉ số", "Creating a list and accessing by index", "Chỉ số đi từ 0 đến 7; A[len(A)] = A[8] vượt quá nên báo IndexError.", "Indexes go from 0 to 7; A[len(A)] = A[8] is out of range so it raises an IndexError."),
        """A = [1, 0, "One", 9, 15, "Two", True, False]
print(len(A))
print(A[0], A[2], A[7])
print(A[len(A)])""",
    ),
    trace_block(
        sim("Thay đổi, ghép và xóa phần tử", "Changing, joining and deleting elements", "Theo dõi danh sách A sau mỗi lệnh: gán A[1], ghép ở cuối, ghép ở đầu, xóa phần tử đầu.", "Follow the list A after each command: assign A[1], join at the end, join at the front, delete the first element."),
        """A = [5, 8, 2]
A[1] = 20
A = A + [10]
A = [100] + A
del A[0]
tich = A[1] * 25
print(A, tich)""",
    ),
    T(
        "### 2. Duyệt các phần tử của danh sách\n\n**Duyệt** là lần lượt xét từng phần tử. Ta dùng lệnh `for` với vùng giá trị `range(len(A))` để biến chạy `i` nhận các chỉ số `0, 1, ..., len(A) - 1`, rồi truy cập `A[i]`:\n\n```python\nfor i in range(len(A)):\n    <xử lí A[i]>\n```\n\nĐể duyệt **một phần** của danh sách, đổi vùng giá trị, ví dụ `range(2, 5)` xét các phần tử có chỉ số 2, 3, 4.\n\nKết hợp với `if` ta có thể **tính tổng**, **đếm** hoặc **lọc** các phần tử thỏa điều kiện, ví dụ tính tổng và đếm các số dương, hay in các số chẵn của danh sách.",
        "### 2. Traversing the elements of a list\n\nTo **traverse** is to look at each element in turn. We use `for` with `range(len(A))` so that the loop variable `i` takes the indexes `0, 1, ..., len(A) - 1`, then access `A[i]`:\n\n```python\nfor i in range(len(A)):\n    <process A[i]>\n```\n\nTo traverse **part** of a list, change the range, for example `range(2, 5)` visits the elements with indexes 2, 3, 4.\n\nWith `if` we can **sum**, **count** or **filter** the elements that meet a condition, for example the sum and count of positive numbers, or printing the even numbers of the list.",
    ),
    trace_block(
        sim("Duyệt và in từng phần tử", "Traversing and printing each element", "Biến i chạy từ 0 đến len(A) − 1; mỗi lần in A[i].", "The variable i runs from 0 to len(A) − 1; each time A[i] is printed."),
        """A = [4, -2, 7, 0, -9, 5]
for i in range(len(A)):
    print(A[i], end=" ")""",
    ),
    trace_block(
        sim("Duyệt một phần: chỉ số 2, 3, 4", "Traversing part of a list: indexes 2, 3, 4", "range(2, 5) chỉ xét ba phần tử có chỉ số 2, 3, 4.", "range(2, 5) visits only the three elements with indexes 2, 3, 4."),
        """A = [4, -2, 7, 0, -9, 5]
for i in range(2, 5):
    print("A[", i, "] =", A[i])""",
    ),
    trace_block(
        sim("Tổng và số lượng các số dương", "Sum and count of the positive numbers", "Chỉ những A[i] > 0 mới được cộng vào S và tính vào dem.", "Only the A[i] > 0 are added to S and counted in dem."),
        """A = [3, -1, 4, 0, -5, 9]
S = 0
dem = 0
for i in range(len(A)):
    if A[i] > 0:
        S = S + A[i]
        dem = dem + 1
print("Tổng các số dương:", S)
print("Số các số dương:", dem)""",
    ),
    trace_block(
        sim("In các số chẵn của danh sách", "Printing the even numbers of a list", "Điều kiện A[i] % 2 == 0 chọn ra 12, 8, 10.", "The condition A[i] % 2 == 0 picks 12, 8, 10."),
        """A = [12, 7, 8, 3, 10, 5]
for i in range(len(A)):
    if A[i] % 2 == 0:
        print(A[i], end=" ")""",
    ),
    T(
        "### 3. Thêm phần tử vào danh sách\n\nPython có các lệnh dành riêng cho danh sách, gọi là **phương thức**, viết theo dạng:\n\n```python\n<danh sách>.<phương thức>(...)\n```\n\nLệnh thêm phần tử vào **cuối** danh sách là **`<danh sách>.append(<giá trị>)`**. Mỗi lần gọi `append()`, độ dài danh sách **tăng thêm 1**.\n\nCách thường dùng để nhập dữ liệu: tạo danh sách rỗng `A = []`, rồi dùng vòng lặp vừa nhập vừa `append()`.",
        "### 3. Adding elements to a list\n\nPython has commands made for lists, called **methods**, written as:\n\n```python\n<list>.<method>(...)\n```\n\nThe command that adds an element at the **end** of a list is **`<list>.append(<value>)`**. Each call to `append()` **increases the length by 1**.\n\nA common way to read data: create an empty list `A = []`, then use a loop that reads a value and `append()`s it.",
    ),
    trace_block(
        sim("Thêm phần tử bằng append()", "Adding elements with append()", "Mỗi lệnh append() thêm một phần tử vào cuối và làm len(A) tăng 1.", "Each append() adds one element at the end and makes len(A) grow by 1."),
        """A = [2, 10]
A.append(1)
print(len(A))
A.append(0)
A.append(100)
print(A, len(A))""",
    ),
    T(
        "### 4. Thực hành: nhập dữ liệu cho danh sách\n\n**Nhiệm vụ 1.** Nhập số `n`, rồi nhập tên `n` bạn trong lớp và in danh sách tên, mỗi tên trên một dòng.\n\n**Nhiệm vụ 2.** Nhập một dãy số. Tính tổng, trung bình và in dãy trên một hàng ngang. Trung bình bằng tổng chia số phần tử: `S / n`.",
        "### 4. Practice: reading data into a list\n\n**Task 1.** Enter a number `n`, then the names of `n` classmates, and print the list of names, one name per line.\n\n**Task 2.** Enter a sequence of numbers. Compute the sum and the average and print the sequence on one line. The average is the sum divided by the count: `S / n`.",
    ),
    trace_block(
        sim("Nhiệm vụ 1: nhập tên các bạn — nhập 3 tên", "Task 1: entering names — enter 3 names", "Danh sách ds bắt đầu rỗng; mỗi lần lặp nhập một tên và append(); sau đó duyệt in từng tên.", "The list ds starts empty; each repetition reads a name and appends it; then the list is traversed to print each name."),
        """n = int(input("Số bạn: "))
ds = []
for i in range(n):
    ten = input("Tên bạn: ")
    ds.append(ten)
for i in range(len(ds)):
    print(ds[i])""",
        ["3", "An", "Bình", "Chi"],
    ),
    trace_block(
        sim("Nhiệm vụ 2: tổng và trung bình của dãy số", "Task 2: sum and average of a sequence", "Nhập 4 số vào danh sách A, rồi duyệt A để cộng và in; trung bình = S / n.", "Read 4 numbers into the list A, then traverse A to add and print; average = S / n."),
        """n = int(input("Số phần tử: "))
A = []
for i in range(n):
    x = int(input("Nhập số: "))
    A.append(x)
S = 0
for i in range(n):
    S = S + A[i]
    print(A[i], end=" ")
print()
print("Tổng:", S)
print("Trung bình:", S / n)""",
        ["4", "8", "6", "7", "9"],
    ),
    T(
        "### 5. Luyện tập và vận dụng\n\n**Luyện tập.** Xóa phần tử cuối của danh sách: `del A[len(A) - 1]`. Thêm `x` vào đầu danh sách: `A = [x] + A`.\n\n**Vận dụng 1.** Nhập số tự nhiên `n` và tạo danh sách các **ước thực sự** của `n` (ước nhỏ hơn `n`). Với `n = 12` được `[1, 2, 3, 4, 6]`.\n\n**Vận dụng 2.** Nhập số tự nhiên `n` và tạo danh sách các **chữ số** của `n`. Lấy chữ số cuối bằng `n % 10`, bỏ nó đi bằng `n // 10`, và đặt chữ số vừa lấy vào **đầu** danh sách bằng `[chu_so] + ds`.\n\n**Vận dụng 3.** Nhập `n` hộ gia đình vào hai danh sách: họ tên chủ hộ và thu nhập tương ứng; sau đó in từng hộ và thu nhập trung bình.",
        "### 5. Practice and application\n\n**Practice.** Delete the last element of a list: `del A[len(A) - 1]`. Add `x` at the front: `A = [x] + A`.\n\n**Application 1.** Enter a natural number `n` and build the list of its **proper divisors** (divisors smaller than `n`). For `n = 12` the result is `[1, 2, 3, 4, 6]`.\n\n**Application 2.** Enter a natural number `n` and build the list of its **digits**. Take the last digit with `n % 10`, drop it with `n // 10`, and put the digit at the **front** of the list with `[digit] + ds`.\n\n**Application 3.** Enter `n` households into two lists: the household head's name and the matching income; then print each household and the average income.",
    ),
    trace_block(
        sim("Vận dụng 1: danh sách các ước thực sự — nhập 12", "Application 1: list of proper divisors — enter 12", "Duyệt k từ 1 đến n − 1; mỗi ước của n được thêm vào danh sách ds bằng append().", "Traverse k from 1 to n − 1; each divisor of n is added to the list ds with append()."),
        """n = int(input("Nhập n: "))
ds = []
for k in range(1, n):
    if n % k == 0:
        ds.append(k)
print(ds)""",
        ["12"],
    ),
    trace_block(
        sim("Vận dụng 2: danh sách các chữ số — nhập 4072", "Application 2: list of digits — enter 4072", "Mỗi lần lấy chữ số cuối n % 10 đặt vào đầu danh sách, rồi n // 10 bỏ chữ số đó đi.", "Each time the last digit n % 10 is put at the front of the list and n // 10 drops that digit."),
        """n = int(input("Nhập n: "))
ds = []
while n > 0:
    ds = [n % 10] + ds
    n = n // 10
print(ds)""",
        ["4072"],
    ),
    trace_block(
        sim("Vận dụng 3: hai danh sách tên và thu nhập", "Application 3: two lists of names and incomes", "Hai danh sách ten và thu_nhap song song: phần tử cùng chỉ số i nói về cùng một hộ.", "The two parallel lists ten and thu_nhap: elements with the same index i describe the same household."),
        """n = int(input("Số hộ: "))
ten = []
thu_nhap = []
for i in range(n):
    ten.append(input("Họ tên chủ hộ: "))
    thu_nhap.append(int(input("Thu nhập (triệu đồng): ")))
tong = 0
for i in range(n):
    print(ten[i], thu_nhap[i])
    tong = tong + thu_nhap[i]
print("Thu nhập trung bình:", tong / n)""",
        ["3", "Lan", "12", "Nam", "9", "Hoa", "15"],
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Khởi tạo | `A = [v1, v2, ..., vn]`, danh sách rỗng `[]` |\n| Chỉ số | từ `0` đến `len(A) - 1`; vượt quá báo IndexError |\n| Đổi / xóa | `A[i] = giá_trị`, `del A[i]` |\n| Ghép | `A + B`, ví dụ `[100] + A` thêm vào đầu |\n| Duyệt | `for i in range(len(A)):` rồi dùng `A[i]` |\n| Thêm cuối | `A.append(x)`, độ dài tăng 1 |\n\n**Tự kiểm tra:** với `A = [1, 0, \"One\", 9, 15, \"Two\", True, False]`, `A[2]` là gì? (đáp án: `\"One\"`). Sau `A = [2, 10]`, `A.append(1)`, `A.append(0)` thì `A` bằng gì? (đáp án: `[2, 10, 1, 0]`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Creating | `A = [v1, v2, ..., vn]`, the empty list `[]` |\n| Index | from `0` to `len(A) - 1`; beyond that raises IndexError |\n| Change / delete | `A[i] = value`, `del A[i]` |\n| Join | `A + B`, for example `[100] + A` adds at the front |\n| Traverse | `for i in range(len(A)):` then use `A[i]` |\n| Add at the end | `A.append(x)`, the length grows by 1 |\n\n**Self-check:** with `A = [1, 0, \"One\", 9, 15, \"Two\", True, False]`, what is `A[2]`? (answer: `\"One\"`). After `A = [2, 10]`, `A.append(1)`, `A.append(0)`, what is `A`? (answer: `[2, 10, 1, 0]`).",
    ),
]

questions = [
    mc("tin10-b22-mc-01", 1, "Dòng lệnh nào khởi tạo một danh sách (list) trong Python?", "Which line creates a list in Python?",
       "Danh sách được viết giữa dấu ngoặc vuông [ ]; các dạng còn lại không phải cú pháp list.", "A list is written between square brackets [ ]; the others are not list syntax.", "D",
       ("ds = (1, 2, 3)", "ds = (1, 2, 3)"), ("ds = {1, 2, 3}", "ds = {1, 2, 3}"), ("ds = <1, 2, 3>", "ds = <1, 2, 3>"), ("ds = [1, 2, 3]", "ds = [1, 2, 3]")),
    mc("tin10-b22-mc-02", 1, "Trong Python, phần tử đầu tiên của danh sách có chỉ số bao nhiêu?", "In Python, what is the index of the first element of a list?",
       "Chỉ số của danh sách bắt đầu từ 0.", "List indexes start at 0.", "A",
       ("0", "0"), ("1", "1"), ("-1", "-1"), ("Tùy từng danh sách", "It depends on the list")),
    mc("tin10-b22-mc-03", 1, "Với A = [1, 0, \"One\", 9, 15, \"Two\", True, False], len(A) bằng bao nhiêu?", "With A = [1, 0, \"One\", 9, 15, \"Two\", True, False], what is len(A)?",
       "Danh sách có 8 phần tử nên len(A) bằng 8.", "The list has 8 elements, so len(A) is 8.", "C",
       ("7", "7"), ("9", "9"), ("8", "8"), ("6", "6")),
    mc("tin10-b22-mc-04", 2, "Với A = [1, 0, \"One\", 9, 15, \"Two\", True, False], A[2] có giá trị gì?", "With A = [1, 0, \"One\", 9, 15, \"Two\", True, False], what is A[2]?",
       "Chỉ số 2 là phần tử thứ ba, có giá trị \"One\".", "Index 2 is the third element, with the value \"One\".", "B",
       ("0", "0"), ("\"One\"", "\"One\""), ("9", "9"), ("1", "1")),
    mc("tin10-b22-mc-05", 2, "Với danh sách A trên (8 phần tử), lệnh A[len(A)] cho kết quả gì?", "For the list A above (8 elements), what does A[len(A)] give?",
       "len(A) bằng 8 nhưng chỉ số lớn nhất là 7, nên A[8] báo lỗi chỉ số (IndexError).", "len(A) is 8 but the largest index is 7, so A[8] raises an index error (IndexError).", "B",
       ("False", "False"), ("Lỗi chỉ số IndexError", "An IndexError"), ("None", "None"), ("1", "1")),
    mc("tin10-b22-mc-06", 2, "Danh sách có n phần tử thì các chỉ số hợp lệ là gì?", "A list has n elements; which indexes are valid?",
       "Chỉ số hợp lệ chạy từ 0 đến n - 1.", "Valid indexes run from 0 to n - 1.", "D",
       ("Từ 1 đến n", "From 1 to n"), ("Từ 0 đến n", "From 0 to n"), ("Từ 1 đến n - 1", "From 1 to n - 1"), ("Từ 0 đến n - 1", "From 0 to n - 1")),
    mc("tin10-b22-mc-07", 2, "Với A = [5, 8, 2], sau lệnh A = A + [10] thì A bằng gì?", "With A = [5, 8, 2], what is A after A = A + [10]?",
       "Phép + ghép danh sách, thêm 10 vào cuối: [5, 8, 2, 10].", "The + joins lists and adds 10 at the end: [5, 8, 2, 10].", "A",
       ("[5, 8, 2, 10]", "[5, 8, 2, 10]"), ("[10, 5, 8, 2]", "[10, 5, 8, 2]"), ("[15, 18, 12]", "[15, 18, 12]"), ("[5, 8, 12]", "[5, 8, 12]")),
    mc("tin10-b22-mc-08", 2, "Với A = [5, 8, 2], sau lệnh del A[0] thì A bằng gì?", "With A = [5, 8, 2], what is A after del A[0]?",
       "del A[0] xóa phần tử đầu tiên là 5, còn [8, 2].", "del A[0] deletes the first element, 5, leaving [8, 2].", "C",
       ("[5, 8]", "[5, 8]"), ("[0, 8, 2]", "[0, 8, 2]"), ("[8, 2]", "[8, 2]"), ("[2]", "[2]")),
    mc("tin10-b22-mc-09", 2, "Với A = [5, 8], sau lệnh A = [100] + A thì A bằng gì?", "With A = [5, 8], what is A after A = [100] + A?",
       "[100] + A đặt 100 vào đầu danh sách: [100, 5, 8].", "[100] + A puts 100 at the front: [100, 5, 8].", "D",
       ("[5, 8, 100]", "[5, 8, 100]"), ("[105, 8]", "[105, 8]"), ("[5, 100, 8]", "[5, 100, 8]"), ("[100, 5, 8]", "[100, 5, 8]")),
    mc("tin10-b22-mc-10", 2, "Sau A = [2, 10], A.append(1), A.append(0) thì A bằng gì?", "After A = [2, 10], A.append(1), A.append(0), what is A?",
       "append() thêm phần tử vào cuối danh sách theo thứ tự gọi lệnh: [2, 10, 1, 0].", "append() adds elements at the end in call order: [2, 10, 1, 0].", "B",
       ("[0, 1, 2, 10]", "[0, 1, 2, 10]"), ("[2, 10, 1, 0]", "[2, 10, 1, 0]"), ("[1, 0, 2, 10]", "[1, 0, 2, 10]"), ("[2, 10]", "[2, 10]")),
    mc("tin10-b22-mc-11", 2, "A = [3, -1, 4, 0, -5, 9]. Tổng các số dương trong A bằng bao nhiêu?", "A = [3, -1, 4, 0, -5, 9]. What is the sum of the positive numbers in A?",
       "Các số dương là 3, 4, 9; tổng bằng 16 (số 0 không dương).", "The positive numbers are 3, 4, 9; the sum is 16 (0 is not positive).", "A",
       ("16", "16"), ("10", "10"), ("21", "21"), ("19", "19")),
    mc("tin10-b22-mc-12", 3, "Nhập 4072 vào chương trình: ds = []; while n > 0: ds = [n % 10] + ds; n = n // 10. ds bằng gì?", "Enter 4072 into: ds = []; while n > 0: ds = [n % 10] + ds; n = n // 10. What is ds?",
       "Các chữ số lấy lần lượt 2, 7, 0, 4, mỗi chữ số mới đặt vào đầu danh sách nên ds = [4, 0, 7, 2].", "The digits are taken as 2, 7, 0, 4 and each new one goes to the front, so ds = [4, 0, 7, 2].", "C",
       ("[2, 7, 0, 4]", "[2, 7, 0, 4]"), ("[4072]", "[4072]"), ("[4, 0, 7, 2]", "[4, 0, 7, 2]"), ("[4, 7, 2]", "[4, 7, 2]")),
]

truefalse = [
    tf("tin10-b22-tf-01", 1, "Xét kiểu dữ liệu danh sách.", "Consider the list data type.",
       "Phần tử danh sách có thể khác kiểu; chỉ số bắt đầu từ 0 đến len(A) - 1; chỉ số len(A) không hợp lệ.", "List elements can have different types; indexes run from 0 to len(A) - 1; the index len(A) is not valid.",
       ("Các phần tử trong một danh sách có thể có kiểu dữ liệu khác nhau.", "Elements in one list can have different data types.", True),
       ("Chỉ số của danh sách bắt đầu từ 1.", "List indexes start at 1.", False),
       ("Chỉ số hợp lệ của danh sách A chạy từ 0 đến len(A) - 1.", "The valid indexes of a list A run from 0 to len(A) - 1.", True),
       ("A[len(A)] là phần tử cuối cùng của danh sách A.", "A[len(A)] is the last element of the list A.", False)),
    tf("tin10-b22-tf-02", 2, "Cho A = [1, 0, \"One\", 9, 15, \"Two\", True, False].", "Given A = [1, 0, \"One\", 9, 15, \"Two\", True, False].",
       "A[0] = 1, A[2] = \"One\", A[7] = False; A[8] vượt quá chỉ số nên báo lỗi.", "A[0] = 1, A[2] = \"One\", A[7] = False; A[8] is out of range so it raises an error.",
       ("A[0] có giá trị 1.", "A[0] has the value 1.", True),
       ("A[2] có giá trị \"One\".", "A[2] has the value \"One\".", True),
       ("A[7] có giá trị True.", "A[7] has the value True.", False),
       ("A[8] báo lỗi chỉ số.", "A[8] raises an index error.", True)),
    tf("tin10-b22-tf-03", 2, "Xét các lệnh làm việc với danh sách.", "Consider the commands that work on lists.",
       "append() thêm vào cuối, [100] + A thêm vào đầu, del A[0] xóa phần tử đầu; append() làm độ dài tăng 1.", "append() adds at the end, [100] + A adds at the front, del A[0] deletes the first element; append() grows the length by 1.",
       ("A.append(x) thêm x vào đầu danh sách.", "A.append(x) adds x at the front of the list.", False),
       ("del A[0] xóa phần tử đầu tiên của danh sách.", "del A[0] deletes the first element of the list.", True),
       ("A = [100] + A thêm số 100 vào đầu danh sách.", "A = [100] + A adds the number 100 at the front of the list.", True),
       ("Mỗi lệnh append() làm độ dài danh sách tăng thêm 1.", "Each append() grows the list length by 1.", True)),
    tf("tin10-b22-tf-04", 2, "Xét việc duyệt danh sách A = [3, -1, 4, 0, -5, 9].", "Consider traversing the list A = [3, -1, 4, 0, -5, 9].",
       "for i in range(len(A)) cho i từ 0 đến len(A) - 1; có 3 số dương là 3, 4, 9 với tổng 16.", "for i in range(len(A)) gives i from 0 to len(A) - 1; there are 3 positive numbers 3, 4, 9 with sum 16.",
       ("Có thể duyệt danh sách bằng for i in range(len(A)).", "A list can be traversed with for i in range(len(A)).", True),
       ("range(len(A)) cho i các giá trị từ 1 đến len(A).", "range(len(A)) gives i the values 1 to len(A).", False),
       ("Tổng các số dương của A bằng 16.", "The sum of the positive numbers of A is 16.", True),
       ("Trong A có 4 số dương.", "A has 4 positive numbers.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
