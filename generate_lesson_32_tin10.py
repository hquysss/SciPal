# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_32_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "on-tap-lap-trinh-python-bai-32-tin10"
title_vi = "Bài 32. Ôn tập lập trình Python"
title_en = "Lesson 32. Python programming review"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


NGAY_HOP_LE = """st = input("Nhập ngày-tháng-năm: ")
ds = st.split("-")
ngay = int(ds[0])
thang = int(ds[1])
nam = int(ds[2])
if thang < 1 or thang > 12 or ngay < 1 or nam < 1:
    hop_le = False
else:
    if thang == 2:
        if nam % 400 == 0 or (nam % 4 == 0 and nam % 100 != 0):
            so_ngay = 29
        else:
            so_ngay = 28
    elif thang in [4, 6, 9, 11]:
        so_ngay = 30
    else:
        so_ngay = 31
    hop_le = ngay <= so_ngay
if hop_le:
    print("Hợp lệ")
else:
    print("Không hợp lệ")"""

blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- tóm tắt được toàn bộ kiến thức lập trình Python đã học: kiểu dữ liệu, lệnh gán, hàm có sẵn, `if`, vòng lặp, danh sách, xâu kí tự, hàm do người dùng viết;\n- viết chương trình hoàn chỉnh cho các bài toán thực tiễn, **liên môn**: tách họ tên, tính trọng lượng trên các hành tinh, kiểm tra ngày tháng hợp lệ;\n- dùng bộ dữ liệu test để phát hiện lỗi trong bài toán có nhiều điều kiện.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- summarise all the Python you have learned: data types, assignment, built-in functions, `if`, loops, lists, strings, user-defined functions;\n- write complete programs for real, **cross-subject** problems: splitting a full name, computing weight on other planets, checking that a date is valid;\n- use test data to find errors in a problem with many conditions.",
    ),
    T(
        "### 1. Hệ thống kiến thức lập trình Python\n\n| Nhóm kiến thức | Nội dung chính |\n|---|---|\n| Kiểu dữ liệu cơ bản | `int` số nguyên · `float` số thực · `bool` lôgic · `str` xâu kí tự |\n| Lệnh gán | `<biến> = <giá trị>`; gán nhiều biến cùng lúc: `x, y, z = 1, 2, 3` |\n| Một số hàm có sẵn | `int()`, `float()`, `bool()`, `str()`, `list()`, `eval()`, `divmod()`, `min()`, `max()`, `round()`, `ord()`, `chr()`, `abs()` |\n| Lệnh rẽ nhánh | `if điều kiện:` · `elif điều kiện:` · `else:` (các khối thụt vào) |\n| Lệnh lặp | `for biến in range(...):` · `while điều kiện:` |\n| Danh sách | `A = [1, 0, \"One\", 10.14, True]`; phương thức `append()`, `insert()`, `remove()`, `index()`, `count()` |\n| Xâu kí tự | `st = \"Thời khoá biểu\"`; phương thức `upper()`, `lower()`, `title()`, `split()`, `join()`, `find()` |\n| Hàm | `def tên_hàm(tham_số):` + các lệnh thụt vào; kết quả trả về bằng `return` |\n\nMột chương trình hoàn chỉnh thường có ba khâu: **nhập dữ liệu → xử lí → đưa kết quả**. Hãy chạy mô phỏng dưới đây để xem một chương trình gom nhiều nhóm kiến thức: hàm, danh sách, `for`, `if`.",
        "### 1. The Python programming knowledge map\n\n| Group | Main content |\n|---|---|\n| Basic data types | `int` integer · `float` real · `bool` logical · `str` string |\n| Assignment | `<variable> = <value>`; several at once: `x, y, z = 1, 2, 3` |\n| Built-in functions | `int()`, `float()`, `bool()`, `str()`, `list()`, `eval()`, `divmod()`, `min()`, `max()`, `round()`, `ord()`, `chr()`, `abs()` |\n| Branching | `if condition:` · `elif condition:` · `else:` (indented blocks) |\n| Loops | `for variable in range(...):` · `while condition:` |\n| Lists | `A = [1, 0, \"One\", 10.14, True]`; methods `append()`, `insert()`, `remove()`, `index()`, `count()` |\n| Strings | `st = \"Timetable\"`; methods `upper()`, `lower()`, `title()`, `split()`, `join()`, `find()` |\n| Functions | `def name(parameters):` + indented commands; the result is returned with `return` |\n\nA complete program usually has three stages: **input → processing → output**. Run the simulation below to see one program that combines many groups: a function, a list, `for`, `if`.",
    ),
    trace_block(
        sim("Ôn tập: hàm, danh sách, for và if", "Review: function, list, for and if", "Hàm chỉ cộng các số dương rồi chia cho số lượng; có nhánh dem == 0 để tránh chia cho 0.", "The function adds only the positive numbers and divides by their count; the dem == 0 branch avoids dividing by 0."),
        """def tb_duong(A):
    tong = 0
    dem = 0
    for x in A:
        if x > 0:
            tong = tong + x
            dem = dem + 1
    if dem == 0:
        return 0
    return tong / dem
A = [4, -2, 7, 0, 10]
print(tb_duong(A))""",
    ),
    T(
        "### 2. Nhiệm vụ 1: tách họ, đệm, tên\n\n**Đề bài.** Nhập họ tên đầy đủ, ví dụ `Nguyễn Thị Mai Hương`, rồi in riêng phần **tên**, **họ** và **tên đệm**.\n\n**Ý tưởng.** Dùng `split()` tách xâu thành danh sách các từ:\n\n- họ là từ **đầu** `ds[0]`;\n- tên là từ **cuối** `ds[-1]`;\n- tên đệm là các từ ở giữa `ds[1:-1]`, ghép lại bằng `\" \".join(...)`.\n\nVí dụ trên cho: họ `Nguyễn`, đệm `Thị Mai`, tên `Hương`.",
        "### 2. Task 1: splitting family, middle and given names\n\n**Problem.** Read a full name such as `Nguyễn Thị Mai Hương` and print the **given name**, the **family name** and the **middle name** separately.\n\n**Idea.** Use `split()` to turn the string into a list of words:\n\n- the family name is the **first** word `ds[0]`;\n- the given name is the **last** word `ds[-1]`;\n- the middle name is the words in between `ds[1:-1]`, joined with `\" \".join(...)`.\n\nThe example gives family name `Nguyễn`, middle name `Thị Mai`, given name `Hương`.",
    ),
    trace_block(
        sim("Tách họ tên Nguyễn Thị Mai Hương", "Splitting the name Nguyễn Thị Mai Hương", "split() cho danh sách 4 từ; ds[0] là họ, ds[-1] là tên, ds[1:-1] ghép lại thành tên đệm.", "split() gives a list of 4 words; ds[0] is the family name, ds[-1] the given name, ds[1:-1] joined is the middle name."),
        """ho_ten = input("Nhập họ và tên: ")
ds = ho_ten.split()
ho = ds[0]
ten = ds[-1]
dem = " ".join(ds[1:-1])
print("Họ:", ho)
print("Đệm:", dem)
print("Tên:", ten)""",
        ["Nguyễn Thị Mai Hương"],
    ),
    T(
        "### 3. Nhiệm vụ 2: trọng lượng trên các hành tinh\n\n**Đề bài.** Nhập trọng lượng của em trên Trái Đất (đơn vị N, Newton) và tính trọng lượng của em trên một hành tinh khác.\n\n**Kiến thức vật lí.** Trọng lượng `P = m × g`, trong đó `g` là gia tốc trọng trường nơi đo. Khối lượng `m` của em không đổi, nên trọng lượng tỉ lệ với `g`:\n\n`P_hành_tinh = P_Trái_Đất / g_Trái_Đất × g_hành_tinh`\n\n| Thiên thể | `g` gần đúng (m/s²) |\n|---|---|\n| Trái Đất | 9,8 |\n| Mặt Trăng | 1,62 |\n| Hoả tinh | 3,71 |\n| Kim tinh | 8,87 |\n| Thổ tinh | 10,44 |\n| Mộc tinh | 24,79 |\n| Mặt Trời | 274 |\n\nVí dụ em nặng `490 N` trên Trái Đất (khối lượng `50 kg`): trên Mặt Trăng chỉ `81 N`, trên Hoả tinh khoảng `185,5 N`.",
        "### 3. Task 2: weight on other planets\n\n**Problem.** Read your weight on Earth (in newtons, N) and compute your weight on another planet.\n\n**Physics.** Weight `P = m × g`, where `g` is the gravitational acceleration where you are. Your mass `m` does not change, so weight is proportional to `g`:\n\n`P_planet = P_Earth / g_Earth × g_planet`\n\n| Body | approximate `g` (m/s²) |\n|---|---|\n| Earth | 9.8 |\n| Moon | 1.62 |\n| Mars | 3.71 |\n| Venus | 8.87 |\n| Saturn | 10.44 |\n| Jupiter | 24.79 |\n| Sun | 274 |\n\nFor example if you weigh `490 N` on Earth (mass `50 kg`): only `81 N` on the Moon and about `185.5 N` on Mars.",
    ),
    trace_block(
        sim("Trọng lượng trên Mặt Trăng và Hoả tinh", "Weight on the Moon and Mars", "490 N chia cho g Trái Đất rồi nhân g từng nơi; round(…, 1) làm tròn một chữ số thập phân.", "490 N divided by Earth's g, times g of each place; round(…, 1) rounds to one decimal."),
        """p_td = float(input("Trọng lượng trên Trái Đất (N): "))
g_td = 9.8
g_trang = 1.62
g_hoa = 3.71
p_trang = p_td / g_td * g_trang
p_hoa = p_td / g_td * g_hoa
print("Trên Mặt Trăng:", round(p_trang, 1), "N")
print("Trên Hoả tinh:", round(p_hoa, 1), "N")""",
        ["490"],
    ),
    T(
        "### 4. Nhiệm vụ 3: kiểm tra ngày tháng hợp lệ\n\n**Đề bài.** Nhập ngày, tháng, năm theo khuôn dạng `08-02-2021`; chương trình báo bộ dữ liệu **hợp lệ** hay **không hợp lệ**.\n\nCần xét:\n\n- tháng phải từ 1 đến 12; ngày và năm phải lớn hơn 0;\n- tháng 4, 6, 9, 11 có **30** ngày; các tháng còn lại (trừ tháng 2) có **31** ngày;\n- tháng 2 có **29** ngày nếu là **năm nhuận** (chia hết cho 400, hoặc chia hết cho 4 mà không chia hết cho 100), ngược lại có **28** ngày.\n\nHai bộ test đáng thử: `08-02-2021` (hợp lệ) và `29-02-2021` (không hợp lệ vì 2021 không nhuận).",
        "### 4. Task 3: checking that a date is valid\n\n**Problem.** Read day, month and year in the form `08-02-2021`; the program says whether the data is **valid** or **invalid**.\n\nThings to check:\n\n- the month must be 1 to 12; day and year must be greater than 0;\n- months 4, 6, 9, 11 have **30** days; the other months (except February) have **31** days;\n- February has **29** days in a **leap year** (divisible by 400, or by 4 but not by 100), otherwise **28** days.\n\nTwo test sets worth trying: `08-02-2021` (valid) and `29-02-2021` (invalid, because 2021 is not leap).",
    ),
    trace_block(
        sim("08-02-2021: hợp lệ", "08-02-2021: valid", "Tháng 2 năm 2021 (không nhuận) có 28 ngày; ngày 8 không vượt quá 28 nên hợp lệ.", "February 2021 (not leap) has 28 days; day 8 does not exceed 28, so it is valid."),
        NGAY_HOP_LE,
        ["08-02-2021"],
    ),
    trace_block(
        sim("29-02-2021: không hợp lệ", "29-02-2021: invalid", "2021 không chia hết cho 4 nên tháng 2 chỉ có 28 ngày; ngày 29 vượt quá nên không hợp lệ.", "2021 is not divisible by 4 so February has only 28 days; day 29 exceeds it, so it is invalid."),
        NGAY_HOP_LE,
        ["29-02-2021"],
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Tách xâu | `split()` → danh sách các từ; `ds[0]` đầu, `ds[-1]` cuối, `ds[1:-1]` ở giữa |\n| Ghép xâu | `\" \".join(danh_sách)` |\n| Tỉ lệ vật lí | trọng lượng tỉ lệ với `g`; khối lượng không đổi |\n| Ngày hợp lệ | xét tháng, rồi số ngày tối đa của tháng (năm nhuận cho tháng 2) |\n| Kiểm thử | thử cả bộ hợp lệ lẫn bộ không hợp lệ, cả năm nhuận lẫn không nhuận |\n| Chương trình hoàn chỉnh | nhập dữ liệu → xử lí → đưa kết quả |\n\n**Tự kiểm tra:** `29-02-2100` hợp lệ hay không? (đáp án: không hợp lệ, vì 2100 chia hết cho 100 nhưng không chia hết cho 400 nên không nhuận). Một học sinh nặng 490 N trên Trái Đất sẽ nặng bao nhiêu N trên Mộc tinh? (đáp án: khoảng 1239,5 N).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Splitting strings | `split()` → list of words; `ds[0]` first, `ds[-1]` last, `ds[1:-1]` in between |\n| Joining strings | `\" \".join(list)` |\n| Physics ratio | weight is proportional to `g`; mass does not change |\n| Valid date | check the month, then the month's maximum days (leap year for February) |\n| Testing | try both valid and invalid sets, both leap and non-leap years |\n| A complete program | input → processing → output |\n\n**Self-check:** is `29-02-2100` valid? (answer: invalid, because 2100 is divisible by 100 but not by 400, so it is not leap). How many newtons does a student weighing 490 N on Earth weigh on Jupiter? (answer: about 1239.5 N).",
    ),
]

questions = [
    mc("tin10-b32-mc-01", 1, "Kiểu dữ liệu nào của Python dùng để lưu số thực?", "Which Python data type stores real numbers?",
       "float là kiểu số thực; int là số nguyên, bool là lôgic, str là xâu kí tự.", "float is the real-number type; int is integer, bool is logical, str is string.", "B",
       ("int", "int"), ("float", "float"), ("bool", "bool"), ("str", "str")),
    mc("tin10-b32-mc-02", 1, "Hàm nào đổi một xâu như \"15\" thành số nguyên?", "Which function turns a string such as \"15\" into an integer?",
       "int() chuyển xâu hoặc số thực thành số nguyên.", "int() converts a string or a real number to an integer.", "C",
       ("str()", "str()"), ("list()", "list()"), ("int()", "int()"), ("chr()", "chr()")),
    mc("tin10-b32-mc-03", 1, "Phương thức nào tách một xâu thành danh sách các từ?", "Which method splits a string into a list of words?",
       "split() tách xâu theo dấu cách (hoặc dấu cho trước) thành danh sách.", "split() breaks a string at spaces (or a given separator) into a list.", "D",
       ("upper()", "upper()"), ("join()", "join()"), ("find()", "find()"), ("split()", "split()")),
    mc("tin10-b32-mc-04", 1, "Từ khoá nào bắt đầu việc định nghĩa một hàm trong Python?", "Which keyword starts a function definition in Python?",
       "Hàm được định nghĩa bằng def tên_hàm(tham_số):.", "A function is defined with def name(parameters):.", "A",
       ("def", "def"), ("func", "func"), ("function", "function"), ("define", "define")),
    mc("tin10-b32-mc-05", 2, "Với ds = \"Nguyễn Thị Mai Hương\".split(), biểu thức ds[-1] có giá trị gì?", "With ds = \"Nguyễn Thị Mai Hương\".split(), what is ds[-1]?",
       "Chỉ số -1 là phần tử cuối của danh sách, tức Hương.", "Index -1 is the last element of the list, i.e. Hương.", "B",
       ("Nguyễn", "Nguyễn"), ("Hương", "Hương"), ("Mai", "Mai"), ("Thị", "Thị")),
    mc("tin10-b32-mc-06", 2, "Cho ds = [\"a\", \"b\", \"c\"]. Biểu thức \" \".join(ds) có giá trị gì?", "Given ds = [\"a\", \"b\", \"c\"], what is \" \".join(ds)?",
       "join ghép các phần tử, ngăn cách bằng dấu cách, được \"a b c\".", "join combines the elements separated by a space, giving \"a b c\".", "C",
       ("\"abc\"", "\"abc\""), ("[\"a b c\"]", "[\"a b c\"]"), ("\"a b c\"", "\"a b c\""), ("\"a,b,c\"", "\"a,b,c\"")),
    mc("tin10-b32-mc-07", 2, "Phương thức title() áp dụng cho xâu \"tin hoc\" cho kết quả nào?", "What does the title() method give for the string \"tin hoc\"?",
       "title() viết hoa chữ cái đầu của mỗi từ: \"Tin Hoc\".", "title() capitalises the first letter of each word: \"Tin Hoc\".", "D",
       ("\"TIN HOC\"", "\"TIN HOC\""), ("\"tin hoc\"", "\"tin hoc\""), ("\"Tin hoc\"", "\"Tin hoc\""), ("\"Tin Hoc\"", "\"Tin Hoc\"")),
    mc("tin10-b32-mc-08", 2, "Vòng lặp for i in range(1, 5) cho i lần lượt nhận những giá trị nào?", "Which values does i take in for i in range(1, 5)?",
       "range(1, 5) bắt đầu từ 1 và dừng trước 5: 1, 2, 3, 4.", "range(1, 5) starts at 1 and stops before 5: 1, 2, 3, 4.", "A",
       ("1, 2, 3, 4", "1, 2, 3, 4"), ("1, 2, 3, 4, 5", "1, 2, 3, 4, 5"), ("0, 1, 2, 3, 4", "0, 1, 2, 3, 4"), ("2, 3, 4, 5", "2, 3, 4, 5")),
    mc("tin10-b32-mc-09", 2, "Một học sinh nặng 490 N trên Trái Đất (g = 9,8). Trên Mặt Trăng (g = 1,62) em nặng bao nhiêu N?", "A student weighs 490 N on Earth (g = 9.8). How many newtons on the Moon (g = 1.62)?",
       "490 / 9,8 × 1,62 = 50 × 1,62 = 81 N.", "490 / 9.8 × 1.62 = 50 × 1.62 = 81 N.", "B",
       ("49 N", "49 N"), ("81 N", "81 N"), ("490 N", "490 N"), ("8,1 N", "8.1 N")),
    mc("tin10-b32-mc-10", 2, "Bộ ngày-tháng-năm nào sau đây không hợp lệ?", "Which of these day-month-year data is not valid?",
       "Tháng 4 chỉ có 30 ngày nên 31-04-2021 không hợp lệ; các bộ còn lại đều hợp lệ.", "April has only 30 days so 31-04-2021 is invalid; the others are valid.", "C",
       ("31-01-2021", "31-01-2021"), ("28-02-2021", "28-02-2021"), ("31-04-2021", "31-04-2021"), ("30-06-2021", "30-06-2021")),
    mc("tin10-b32-mc-11", 3, "Hàm tb_duong tính trung bình các số dương của danh sách. Với A = [4, -2, 7, 0, 10], tb_duong(A) trả về giá trị nào?", "The function tb_duong averages the positive numbers of a list. For A = [4, -2, 7, 0, 10], what does tb_duong(A) return?",
       "Các số dương là 4, 7, 10 (số 0 không dương): tổng 21, có 3 số nên trung bình 7.0.", "The positives are 4, 7, 10 (0 is not positive): sum 21 over 3 numbers gives 7.0.", "D",
       ("3.8", "3.8"), ("5.25", "5.25"), ("21.0", "21.0"), ("7.0", "7.0")),
    mc("tin10-b32-mc-12", 3, "Ngày 29-02-2100 có hợp lệ không, vì sao?", "Is 29-02-2100 valid, and why?",
       "2100 chia hết cho 100 nhưng không chia hết cho 400 nên không phải năm nhuận; tháng 2 có 28 ngày, do đó 29-02-2100 không hợp lệ.", "2100 is divisible by 100 but not by 400, so it is not leap; February has 28 days and 29-02-2100 is invalid.", "A",
       ("Không hợp lệ vì 2100 chia hết cho 100 nhưng không chia hết cho 400", "Invalid because 2100 is divisible by 100 but not by 400"), ("Hợp lệ vì 2100 chia hết cho 4", "Valid because 2100 is divisible by 4"), ("Hợp lệ vì tháng 2 luôn có 29 ngày", "Valid because February always has 29 days"), ("Không hợp lệ vì sai khuôn dạng nhập", "Invalid because the input format is wrong")),
]

truefalse = [
    tf("tin10-b32-tf-01", 2, "Xét kiến thức Python đã học.", "Consider the Python knowledge learned.",
       "int là số nguyên, bool nhận True/False, vòng lặp while lặp khi điều kiện đúng (không phải sai), list có append() để thêm phần tử.", "int is integer, bool takes True/False, while loops while the condition is true (not false), list has append() to add an item.",
       ("int là kiểu số nguyên.", "int is the integer type.", True),
       ("bool chỉ nhận một trong hai giá trị True hoặc False.", "bool takes only True or False.", True),
       ("Vòng lặp while lặp lại khi điều kiện sai.", "A while loop repeats while its condition is false.", False),
       ("Danh sách có phương thức append() để thêm phần tử vào cuối.", "A list has the append() method to add an item at the end.", True)),
    tf("tin10-b32-tf-02", 2, "Cho ds = \"Nguyễn Thị Mai Hương\".split().", "Given ds = \"Nguyễn Thị Mai Hương\".split().",
       "ds có 4 từ; ds[-1] là Hương; ds[0] là Nguyễn (không phải Thị); ds[1:-1] chỉ gồm Thị, Mai, không gồm họ hay tên.", "ds has 4 words; ds[-1] is Hương; ds[0] is Nguyễn (not Thị); ds[1:-1] holds only Thị and Mai, not the family or given name.",
       ("ds là danh sách gồm 4 phần tử.", "ds is a list with 4 elements.", True),
       ("ds[-1] là \"Hương\".", "ds[-1] is \"Hương\".", True),
       ("ds[0] là \"Thị\".", "ds[0] is \"Thị\".", False),
       ("ds[1:-1] gồm cả họ và tên.", "ds[1:-1] includes both the family and the given name.", False)),
    tf("tin10-b32-tf-03", 2, "Xét trọng lượng trên các hành tinh (Trái Đất g = 9,8; Hoả tinh g = 3,71; Mộc tinh g = 24,79).", "Consider weight on planets (Earth g = 9.8; Mars g = 3.71; Jupiter g = 24.79).",
       "Trọng lượng tỉ lệ với g nên giảm khi g nhỏ hơn và tăng khi g lớn hơn; 490 / 9,8 × 3,71 = 185,5 N.", "Weight is proportional to g so it falls where g is smaller and rises where g is bigger; 490 / 9.8 × 3.71 = 185.5 N.",
       ("Trọng lượng của một người tỉ lệ với gia tốc trọng trường nơi đo.", "A person's weight is proportional to the local gravitational acceleration.", True),
       ("Trên Mặt Trăng em nhẹ hơn trên Trái Đất.", "On the Moon you weigh less than on Earth.", True),
       ("Trên Mộc tinh em nhẹ hơn trên Trái Đất.", "On Jupiter you weigh less than on Earth.", False),
       ("Người nặng 490 N trên Trái Đất nặng 185,5 N trên Hoả tinh.", "A person weighing 490 N on Earth weighs 185.5 N on Mars.", True)),
    tf("tin10-b32-tf-04", 3, "Xét việc kiểm tra ngày tháng hợp lệ.", "Consider checking that a date is valid.",
       "29-02-2020 hợp lệ (2020 nhuận); 29-02-2021 không (2021 không nhuận); tháng 6 chỉ có 30 ngày nên 31-06-2021 không hợp lệ; tháng 13 không tồn tại.", "29-02-2020 is valid (2020 is leap); 29-02-2021 is not (2021 is not leap); June has only 30 days so 31-06-2021 is invalid; month 13 does not exist.",
       ("29-02-2020 là ngày hợp lệ.", "29-02-2020 is a valid date.", True),
       ("29-02-2021 là ngày không hợp lệ.", "29-02-2021 is an invalid date.", True),
       ("31-06-2021 là ngày hợp lệ.", "31-06-2021 is a valid date.", False),
       ("Bộ dữ liệu có tháng 13 là không hợp lệ.", "Data with month 13 is invalid.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
