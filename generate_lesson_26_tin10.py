# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_26_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "ham-trong-python-bai-26-tin10"
title_vi = "Bài 26. Hàm trong Python"
title_en = "Lesson 26. Functions in Python"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nêu được **chương trình con** trong Python chính là **hàm** và gọi một số hàm thiết kế sẵn;\n- phân biệt hàm **có** và **không có** giá trị trả lại;\n- **tạo hàm** bằng từ khóa `def` và dùng lệnh `return`;\n- viết các hàm đơn giản như chào, kiểm tra số nguyên tố, đếm chữ số.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- explain that a **subprogram** in Python is a **function** and call some built-in functions;\n- tell functions that **do** and **do not** return a value;\n- **create a function** with the keyword `def` and use `return`;\n- write simple functions such as greeting, prime test and digit counting.",
    ),
    T(
        "### 1. Một số hàm thiết kế sẵn của Python\n\nCác lệnh `abs()`, `round()`, `divmod()`, `len()`, `list()`, `str()`, `int()`, `float()`, `bool()`, `range()`, `chr()`, `ord()`, `type()`, `input()`, `print()` là các **chương trình con** được Python thiết kế sẵn, gọi là **hàm**.\n\n**Đặc điểm chung:** sau tên hàm luôn có cặp **dấu ngoặc tròn**; bên trong là các **tham số** (số, biến hoặc biểu thức).\n\n**Cú pháp gọi hàm:**\n\n```python\n<tên hàm>(<danh sách tham số>)\n```\n\nHàm chia làm hai loại:\n\n- hàm **có giá trị trả lại**: `input()`, `int()`, `divmod()`, `len()`...;\n- hàm **không có giá trị trả lại**: `print()`.\n\n| Hàm | Tham số `x` | Ý nghĩa |\n|---|---|---|\n| `float(x)` | số hoặc xâu | chuyển `x` sang số thực |\n| `str(x)` | số hoặc xâu | chuyển `x` sang xâu |\n| `len(x)` | xâu hoặc danh sách | độ dài của `x` |\n| `list(x)` | xâu hoặc `range()` | chuyển `x` sang danh sách |",
        "### 1. Some built-in Python functions\n\nThe commands `abs()`, `round()`, `divmod()`, `len()`, `list()`, `str()`, `int()`, `float()`, `bool()`, `range()`, `chr()`, `ord()`, `type()`, `input()`, `print()` are **subprograms** designed in advance by Python, called **functions**.\n\n**What they share:** a pair of **parentheses** always follows the name; inside are the **parameters** (numbers, variables or expressions).\n\n**Syntax of a call:**\n\n```python\n<function name>(<list of parameters>)\n```\n\nFunctions are of two kinds:\n\n- functions **with a return value**: `input()`, `int()`, `divmod()`, `len()`...;\n- functions **without a return value**: `print()`.\n\n| Function | Parameter `x` | Meaning |\n|---|---|---|\n| `float(x)` | number or string | converts `x` to a real number |\n| `str(x)` | number or string | converts `x` to a string |\n| `len(x)` | string or list | length of `x` |\n| `list(x)` | string or `range()` | converts `x` to a list |",
    ),
    trace_block(
        sim("Gọi một số hàm thiết kế sẵn", "Calling some built-in functions", "Mỗi lệnh gọi hàm cho một giá trị: abs, round, divmod (cặp thương và dư), len, list, bool.", "Each call returns a value: abs, round, divmod (quotient and remainder pair), len, list, bool."),
        """print(abs(-7))
print(round(3.14159, 2))
print(divmod(17, 5))
print(len("Tin học"))
print(list(range(5)))
print(bool(0), bool(7))""",
    ),
    T(
        "### 2. Thiết lập hàm tự định nghĩa\n\nNgoài hàm có sẵn, ta tự viết hàm bằng từ khóa **`def`**, theo sau là **tên hàm** (đặt theo quy tắc đặt tên định danh như tên biến) và các **tham số** trong ngoặc tròn. Khối lệnh của hàm viết sau dấu **`:`**, xuống dòng và **thụt vào** (1 phím Tab hoặc 4 dấu cách).\n\n**Hàm có giá trị trả lại:**\n\n```python\ndef <tên hàm>(<tham số>):\n    <khối lệnh>\n    return <giá trị>\n```\n\n**Hàm không có giá trị trả lại:**\n\n```python\ndef <tên hàm>(<tham số>):\n    <khối lệnh>\n    return\n```\n\nSau khi định nghĩa, ta **gọi hàm** như hàm có sẵn: `<tên hàm>(<tham số>)`.",
        "### 2. Defining your own functions\n\nBesides built-in functions we write our own with the keyword **`def`**, followed by the **function name** (named by the same identifier rules as variables) and the **parameters** in parentheses. The body is written after a **`:`**, on a new line and **indented** (one Tab or 4 spaces).\n\n**A function with a return value:**\n\n```python\ndef <name>(<parameters>):\n    <block>\n    return <value>\n```\n\n**A function without a return value:**\n\n```python\ndef <name>(<parameters>):\n    <block>\n    return\n```\n\nAfter defining it, we **call** it like a built-in function: `<name>(<parameters>)`.",
    ),
    T(
        "**Quy tắc về `return` và tham số:**\n\n- Hàm có lệnh `return <giá trị>` là hàm **có giá trị trả lại**. Hàm **không có** `return`, hoặc `return` mà sau đó không có giá trị, là hàm **không có giá trị trả lại**.\n- Gặp lệnh `return`, hàm **dừng ngay**, các lệnh sau đó không chạy.\n- Trong một hàm có thể có **nhiều** lệnh `return`.\n- Các biến trong ngoặc ở dòng `def` gọi là **tham số** của hàm; hàm có thể có hoặc không có tham số.\n- Không được đặt tên hàm trùng với từ khóa của Python.",
        "**Rules about `return` and parameters:**\n\n- A function with `return <value>` has a **return value**. A function with **no** `return`, or a `return` followed by no value, has **no return value**.\n- On reaching `return`, the function **stops at once**; later commands do not run.\n- A function may contain **several** `return` commands.\n- The variables in parentheses on the `def` line are the function's **parameters**; a function may or may not have parameters.\n- A function name must not equal a Python keyword.",
    ),
    trace_block(
        sim("Hàm có giá trị trả lại: binh_phuong(x)", "A function with a return value: binh_phuong(x)", "Khi gọi, tham số x nhận giá trị truyền vào; return đưa x * x về nơi gọi để gán cho a.", "On a call, the parameter x receives the passed value; return sends x * x back to the caller to be assigned to a."),
        """def binh_phuong(x):
    return x * x

a = binh_phuong(5)
print(a)
print(binh_phuong(a))""",
    ),
    trace_block(
        sim("Hàm không trả lại giá trị: in_day(n)", "A function with no return value: in_day(n)", "Hàm chỉ in các số 0 đến n − 1 trên một dòng, không trả về giá trị nào.", "The function only prints the numbers 0 to n − 1 on one line and returns no value."),
        """def in_day(n):
    for i in range(n):
        print(i, end=" ")
    print()

in_day(5)
in_day(3)""",
    ),
    trace_block(
        sim("Hàm nhập một xâu và trả về xâu đó — nhập Python", "A function that reads a string and returns it — enter Python", "Hàm nhap_xau() không có tham số nhưng có giá trị trả lại là xâu người dùng nhập.", "The function nhap_xau() has no parameters but returns the string the user entered."),
        """def nhap_xau():
    s = input("Nhập một xâu: ")
    return s

ten = nhap_xau()
print("Bạn vừa nhập:", ten)""",
        ["Python"],
    ),
    T(
        "### 3. Thực hành\n\n**Nhiệm vụ 1.** Viết hàm yêu cầu người dùng nhập họ tên rồi in lời chào.\n\n**Nhiệm vụ 2.** Viết hàm `prime(n)` nhận số tự nhiên `n`, trả về `True` nếu `n` là **số nguyên tố** (có đúng hai ước là 1 và `n`), trả về `False` nếu không. Cách đơn giản: đếm số ước của `n`; có đúng 2 ước thì là số nguyên tố.",
        "### 3. Practice\n\n**Task 1.** Write a function that asks the user for a full name and prints a greeting.\n\n**Task 2.** Write a function `prime(n)` that takes a natural number `n` and returns `True` if `n` is a **prime number** (exactly two divisors, 1 and `n`) and `False` otherwise. A simple way: count the divisors of `n`; exactly 2 means prime.",
    ),
    trace_block(
        sim("Nhiệm vụ 1: hàm chào — nhập Nguyễn Hòa Bình", "Task 1: a greeting function — enter Nguyễn Hòa Bình", "Hàm chao() không trả lại giá trị: nó nhập họ tên và in lời chào.", "The function chao() returns no value: it reads a full name and prints a greeting."),
        """def chao():
    ho_ten = input("Nhập họ tên: ")
    print("Xin chào", ho_ten)
    return

chao()""",
        ["Nguyễn Hòa Bình"],
    ),
    trace_block(
        sim("Nhiệm vụ 2: hàm prime(n) — nhập 7", "Task 2: the function prime(n) — enter 7", "Đếm các ước của 7: chỉ có 1 và 7, dem = 2 nên hàm trả về True.", "Count the divisors of 7: only 1 and 7, dem = 2 so the function returns True."),
        """def prime(n):
    dem = 0
    for k in range(1, n + 1):
        if n % k == 0:
            dem = dem + 1
    if dem == 2:
        return True
    else:
        return False

n = int(input("Nhập n: "))
if prime(n):
    print(n, "là số nguyên tố")
else:
    print(n, "không phải số nguyên tố")""",
        ["7"],
    ),
    trace_block(
        sim("Nhiệm vụ 2: hàm prime(n) — nhập 12", "Task 2: the function prime(n) — enter 12", "12 có 6 ước nên dem = 6 và hàm trả về False.", "12 has 6 divisors so dem = 6 and the function returns False."),
        """def prime(n):
    dem = 0
    for k in range(1, n + 1):
        if n % k == 0:
            dem = dem + 1
    if dem == 2:
        return True
    else:
        return False

n = int(input("Nhập n: "))
if prime(n):
    print(n, "là số nguyên tố")
else:
    print(n, "không phải số nguyên tố")""",
        ["12"],
    ),
    T(
        "### 4. Luyện tập và vận dụng\n\n**Luyện tập.** Dùng hàm `prime()` để in các số nguyên tố nhỏ hơn một số cho trước.\n\n**Vận dụng 1.** Viết `prime(n)` **tối ưu hơn** bằng ba lệnh `return`:\n\n- `n < 2` thì dừng ngay, trả về `False`;\n- tìm được `k` là ước của `n` thì dừng ngay, trả về `False`;\n- cuối cùng mới `return True`.\n\nHàm này không cần đếm hết các ước.\n\n**Vận dụng 2.** Viết hai hàm: đếm số kí tự là **chữ số** trong một xâu và đếm số kí tự là **chữ cái tiếng Anh** trong một xâu.",
        "### 4. Practice and application\n\n**Practice.** Use the function `prime()` to print the primes below a given number.\n\n**Application 1.** Write a **better** `prime(n)` with three `return` commands:\n\n- `n < 2` stops at once and returns `False`;\n- finding a divisor `k` of `n` stops at once and returns `False`;\n- only at the end `return True`.\n\nThis function does not need to count all the divisors.\n\n**Application 2.** Write two functions: count the characters that are **digits** in a string and count the characters that are **English letters** in a string.",
    ),
    trace_block(
        sim("Vận dụng 1: prime(n) có ba lệnh return", "Application 1: prime(n) with three return commands", "prime(1) dừng ở return đầu, prime(9) dừng ở return thứ hai khi k = 3, prime(11) chạy đến return True.", "prime(1) stops at the first return, prime(9) stops at the second when k = 3, prime(11) runs to return True."),
        """def prime(n):
    if n < 2:
        return False
    for k in range(2, n):
        if n % k == 0:
            return False
    return True

print(prime(1))
print(prime(9))
print(prime(11))""",
    ),
    trace_block(
        sim("Luyện tập: in các số nguyên tố nhỏ hơn 20", "Practice: printing the primes below 20", "Chương trình gọi hàm prime(i) cho từng i từ 2 đến 19 và chỉ in những i cho True.", "The program calls prime(i) for each i from 2 to 19 and prints only the i that give True."),
        """def prime(n):
    if n < 2:
        return False
    for k in range(2, n):
        if n % k == 0:
            return False
    return True

for i in range(2, 20):
    if prime(i):
        print(i, end=" ")""",
    ),
    trace_block(
        sim("Vận dụng 2: đếm chữ số và chữ cái trong xâu", "Application 2: counting digits and letters in a string", "Hai hàm dùng cùng khuôn: duyệt từng kí tự và đếm kí tự thuộc nhóm cho trước.", "The two functions share one pattern: traverse each character and count those in a given group."),
        """def dem_chu_so(s):
    dem = 0
    for ch in s:
        if ch in "0123456789":
            dem = dem + 1
    return dem

def dem_chu_cai(s):
    dem = 0
    for ch in s:
        if ch in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ":
            dem = dem + 1
    return dem

xau = "Tin hoc 10 nam 2025"
print(dem_chu_so(xau), dem_chu_cai(xau))""",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Hàm | chương trình con; gọi bằng `tên(tham số)` |\n| Hàm có sẵn | `abs`, `len`, `int`, `print`...; `print()` không trả lại giá trị |\n| Tạo hàm | `def tên(tham số):` + khối lệnh thụt vào |\n| `return` | trả giá trị về nơi gọi và **dừng hàm ngay** |\n| Nhiều `return` | được phép |\n| Không trả lại giá trị | không có `return` hoặc `return` không kèm giá trị |\n\n**Tự kiểm tra:** `divmod(17, 5)` bằng gì? (đáp án: `(3, 2)`). `prime(1)` và `prime(11)` trả về gì? (đáp án: `False` và `True`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Function | a subprogram; called with `name(parameters)` |\n| Built-in functions | `abs`, `len`, `int`, `print`...; `print()` returns no value |\n| Creating one | `def name(parameters):` + an indented block |\n| `return` | sends a value to the caller and **stops the function at once** |\n| Several `return`s | allowed |\n| No return value | no `return`, or a `return` with no value |\n\n**Self-check:** what is `divmod(17, 5)`? (answer: `(3, 2)`). What do `prime(1)` and `prime(11)` return? (answer: `False` and `True`).",
    ),
]

questions = [
    mc("tin10-b26-mc-01", 1, "Đặc điểm chung của các lệnh gọi hàm như input(), int(), len() là gì?", "What do function calls such as input(), int(), len() have in common?",
       "Các hàm đều có cặp dấu ngoặc tròn đi liền sau tên, bên trong là tham số.", "All functions have a pair of parentheses right after the name, with the parameters inside.", "B",
       ("Đều trả lại số nguyên", "They all return an integer"), ("Có dấu ngoặc tròn đi liền sau tên hàm", "Parentheses follow the function name"), ("Đều viết hoa chữ cái đầu", "They all start with a capital letter"), ("Đều không có tham số", "They all have no parameters")),
    mc("tin10-b26-mc-02", 1, "Trong Python, từ khóa nào dùng để định nghĩa một hàm?", "In Python, which keyword defines a function?",
       "Hàm tự định nghĩa bắt đầu bằng từ khóa def.", "A user-defined function starts with the keyword def.", "D",
       ("function", "function"), ("func", "func"), ("define", "define"), ("def", "def")),
    mc("tin10-b26-mc-03", 1, "Hàm nào sau đây là hàm không trả lại giá trị?", "Which of the following is a function with no return value?",
       "print() chỉ đưa dữ liệu ra màn hình; float(), len(), divmod() đều trả lại giá trị.", "print() only shows data on the screen; float(), len(), divmod() all return values.", "A",
       ("print()", "print()"), ("float()", "float()"), ("len()", "len()"), ("divmod()", "divmod()")),
    mc("tin10-b26-mc-04", 2, "Trong định nghĩa của một hàm có thể có bao nhiêu từ khóa return?", "How many return keywords can a function definition contain?",
       "Một hàm có thể có nhiều lệnh return, không hạn chế số lượng.", "A function may have many return commands with no limit.", "C",
       ("Đúng 1", "Exactly 1"), ("Tối đa 2", "At most 2"), ("Không hạn chế", "No limit"), ("Tối đa 5", "At most 5")),
    mc("tin10-b26-mc-05", 2, "Mệnh đề nào mô tả đúng hàm tự định nghĩa không trả lại giá trị?", "Which statement correctly describes a user-defined function with no return value?",
       "Hàm không trả lại giá trị khi không có return hoặc có return mà sau đó không có giá trị.", "A function returns no value when it has no return or a return with no value after it.", "D",
       ("Phải có tối thiểu hai từ khóa return", "It must have at least two return keywords"), ("Chỉ có đúng một từ khóa return kèm giá trị", "It has exactly one return with a value"), ("Không có tham số", "It has no parameters"), ("Không có return hoặc return không kèm giá trị", "It has no return or a return without a value")),
    mc("tin10-b26-mc-06", 2, "Chọn phát biểu SAI về hàm trong Python.", "Choose the INCORRECT statement about functions in Python.",
       "Không được đặt tên hàm trùng từ khóa như if; các phát biểu còn lại đều đúng.", "A function name must not equal a keyword such as if; the other statements are true.", "B",
       ("Hàm có thể có hoặc không có tham số", "A function may or may not have parameters"), ("Có thể đặt tên hàm trùng từ khóa, ví dụ if", "A function can be named like a keyword, for example if"), ("Khối lệnh của hàm viết thụt vào sau dấu hai chấm", "The function body is indented after the colon"), ("Gặp lệnh return thì hàm dừng ngay", "On reaching return the function stops at once")),
    mc("tin10-b26-mc-07", 2, "Lệnh print(abs(-7)) in ra gì?", "What does print(abs(-7)) print?",
       "abs() là hàm giá trị tuyệt đối nên abs(-7) bằng 7.", "abs() is the absolute value function so abs(-7) is 7.", "A",
       ("7", "7"), ("-7", "-7"), ("0", "0"), ("Báo lỗi", "An error")),
    mc("tin10-b26-mc-08", 2, "Lệnh print(divmod(17, 5)) in ra gì?", "What does print(divmod(17, 5)) print?",
       "divmod(a, b) trả về cặp (thương, dư): 17 = 3 × 5 + 2 nên được (3, 2).", "divmod(a, b) returns the pair (quotient, remainder): 17 = 3 × 5 + 2 so it gives (3, 2).", "C",
       ("(2, 3)", "(2, 3)"), ("3.4", "3.4"), ("(3, 2)", "(3, 2)"), ("17", "17")),
    mc("tin10-b26-mc-09", 2, "Cho def binh_phuong(x): return x * x. Giá trị của binh_phuong(binh_phuong(2)) là gì?", "Given def binh_phuong(x): return x * x. What is binh_phuong(binh_phuong(2))?",
       "binh_phuong(2) = 4 rồi binh_phuong(4) = 16.", "binh_phuong(2) = 4 and then binh_phuong(4) = 16.", "B",
       ("8", "8"), ("16", "16"), ("4", "4"), ("Báo lỗi", "An error")),
    mc("tin10-b26-mc-10", 2, "Với hàm prime(n) tối ưu (n < 2 trả về False; có ước k trong range(2, n) trả về False; cuối cùng trả về True), prime(1) trả về gì?", "With the better prime(n) (n < 2 returns False; a divisor k in range(2, n) returns False; finally return True), what does prime(1) return?",
       "1 < 2 nên hàm gặp return False ngay và dừng.", "1 < 2 so the function meets return False at once and stops.", "D",
       ("True", "True"), ("1", "1"), ("None", "None"), ("False", "False")),
    mc("tin10-b26-mc-11", 2, "Với hàm prime(n) trên, prime(11) trả về gì?", "With the same prime(n), what does prime(11) return?",
       "11 không chia hết cho các số từ 2 đến 10 nên chạy đến return True.", "11 is not divisible by any number from 2 to 10 so it reaches return True.", "A",
       ("True", "True"), ("False", "False"), ("11", "11"), ("Báo lỗi", "An error")),
    mc("tin10-b26-mc-12", 3, "Dùng prime(i) cho i trong range(2, 20), có bao nhiêu số được in ra?", "Using prime(i) for i in range(2, 20), how many numbers are printed?",
       "Các số nguyên tố nhỏ hơn 20 là 2, 3, 5, 7, 11, 13, 17, 19, tức 8 số.", "The primes below 20 are 2, 3, 5, 7, 11, 13, 17, 19, that is 8 numbers.", "C",
       ("7", "7"), ("9", "9"), ("8", "8"), ("10", "10")),
]

truefalse = [
    tf("tin10-b26-tf-01", 1, "Xét các hàm thiết kế sẵn.", "Consider the built-in functions.",
       "Lệnh gọi hàm có dạng tên(tham số); print() không có giá trị trả lại; input(), int(), divmod() có giá trị trả lại; len() cho độ dài.", "A call has the form name(parameters); print() has no return value; input(), int(), divmod() return values; len() gives a length.",
       ("Cú pháp gọi hàm là <tên hàm>(<danh sách tham số>).", "The call syntax is <function name>(<list of parameters>).", True),
       ("print() là hàm có giá trị trả lại.", "print() is a function with a return value.", False),
       ("input(), int() và divmod() đều là hàm có giá trị trả lại.", "input(), int() and divmod() are all functions with a return value.", True),
       ("len(x) cho độ dài của x, với x là xâu hoặc danh sách.", "len(x) gives the length of x, where x is a string or a list.", True)),
    tf("tin10-b26-tf-02", 2, "Xét cách tạo hàm và lệnh return.", "Consider creating functions and the return command.",
       "Hàm định nghĩa bằng def; khối lệnh thụt vào; gặp return thì hàm dừng ngay; một hàm có thể có nhiều return.", "Functions are defined with def; the body is indented; the function stops at return; a function may have many returns.",
       ("Hàm trong Python được định nghĩa bằng từ khóa function.", "A function in Python is defined with the keyword function.", False),
       ("Khối lệnh của hàm viết sau dấu hai chấm và thụt vào.", "The function body is written after the colon and indented.", True),
       ("Gặp lệnh return, hàm dừng ngay.", "On reaching return, the function stops at once.", True),
       ("Một hàm chỉ được có đúng một lệnh return.", "A function may have exactly one return only.", False)),
    tf("tin10-b26-tf-03", 2, "Xét hai hàm: def binh_phuong(x): return x * x và def in_day(n): in các số 0, 1, ..., n - 1 trên một dòng.", "Consider two functions: def binh_phuong(x): return x * x and def in_day(n): prints 0, 1, ..., n - 1 on one line.",
       "binh_phuong(5) = 25; in_day(3) in 0 1 2 và không trả lại giá trị.", "binh_phuong(5) = 25; in_day(3) prints 0 1 2 and returns no value.",
       ("binh_phuong(5) trả về 25.", "binh_phuong(5) returns 25.", True),
       ("in_day(3) in ra 0 1 2.", "in_day(3) prints 0 1 2.", True),
       ("in_day(3) trả về số 3.", "in_day(3) returns the number 3.", False),
       ("in_day(3) in ra 1 2 3.", "in_day(3) prints 1 2 3.", False)),
    tf("tin10-b26-tf-04", 3, "Xét hàm prime(n) tối ưu có ba lệnh return.", "Consider the better prime(n) with three return commands.",
       "prime(1) = False, prime(2) = True vì range(2, 2) rỗng, prime(9) = False vì 9 chia hết cho 3; có 8 số nguyên tố nhỏ hơn 20.", "prime(1) = False, prime(2) = True because range(2, 2) is empty, prime(9) = False because 9 is divisible by 3; there are 8 primes below 20.",
       ("prime(1) trả về False.", "prime(1) returns False.", True),
       ("prime(2) trả về True vì range(2, 2) rỗng.", "prime(2) returns True because range(2, 2) is empty.", True),
       ("Có 8 số nguyên tố nhỏ hơn 20.", "There are 8 primes below 20.", True),
       ("prime(9) trả về True.", "prime(9) returns True.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
