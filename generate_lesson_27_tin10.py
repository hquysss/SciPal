# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_27_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "tham-so-cua-ham-bai-27-tin10"
title_vi = "Bài 27. Tham số của hàm"
title_en = "Lesson 27. Function parameters"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


PRIME = """def prime(n):
    if n < 2:
        return False
    for k in range(2, n):
        if n % k == 0:
            return False
    return True
"""

BMI = """def bmi(m, h):
    return m / (h * h)

ten = input("Họ tên: ")
m = float(input("Cân nặng (kg): "))
h = float(input("Chiều cao (m): "))
chi_so = bmi(m, h)
if chi_so < 18:
    print(ten, ": Bạn gầy")
else:
    if chi_so <= 25:
        print(ten, ": Bạn bình thường")
    else:
        print(ten, ": Bạn bị béo phì")"""

blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- phân biệt **tham số** và **đối số** của hàm và truyền giá trị cho hàm qua đối số;\n- biết hàm có thể có **nhiều tham số** và lời gọi hàm phải đúng số đối số;\n- nêu **lợi ích** của việc dùng chương trình con;\n- viết các hàm có tham số, như tổng có điều kiện, đếm từ, gộp xâu, lũy thừa, chỉ số BMI, hàm dấu, và dùng chúng trong chương trình.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- tell **parameters** from **arguments** and pass values to a function through arguments;\n- know that a function can have **several parameters** and a call must give the right number of arguments;\n- state the **benefits** of using subprograms;\n- write functions with parameters, such as a conditional sum, word count, string merge, power, BMI, sign function, and use them in programs.",
    ),
    T(
        "### 1. Tham số và đối số của hàm\n\nXét hàm `f` có ba tham số:\n\n```python\ndef f(a, b, c):\n    return a + b + c\n```\n\n- **Tham số** là biến được ghi trong **khai báo** hàm: `a`, `b`, `c`. Hàm có thể có hoặc không có tham số.\n- **Đối số** là giá trị được ghi khi **gọi** hàm. Đối số có thể là số cụ thể (`f(1, 2, 3)`) hoặc biến đã có giá trị (`f(x, y, z)` sau khi gán `x, y, z = 4, 5, 6`). Khi gọi, các đối số **lần lượt** được truyền cho các tham số.\n- Biến dùng làm đối số **phải đã được gán giá trị**; nếu không, lời gọi báo lỗi **NameError** (không xác định được giá trị).\n- Số đối số khi gọi phải **bằng số tham số** khi khai báo; thiếu hoặc thừa đối số báo lỗi **TypeError**. Vì vậy hàm khai báo một tham số không thể gọi với hai đối số.",
        "### 1. Parameters and arguments of a function\n\nConsider a function `f` with three parameters:\n\n```python\ndef f(a, b, c):\n    return a + b + c\n```\n\n- A **parameter** is a variable written in the function **definition**: `a`, `b`, `c`. A function may or may not have parameters.\n- An **argument** is a value written when the function is **called**. It may be a concrete number (`f(1, 2, 3)`) or a variable that already has a value (`f(x, y, z)` after `x, y, z = 4, 5, 6`). On a call, the arguments are passed to the parameters **in order**.\n- A variable used as an argument **must already be assigned**; otherwise the call raises a **NameError** (its value cannot be determined).\n- The number of arguments in a call must **equal the number of parameters** in the definition; too few or too many raises a **TypeError**. So a function defined with one parameter cannot be called with two arguments.",
    ),
    trace_block(
        sim("Truyền số cụ thể và truyền biến làm đối số", "Passing concrete numbers and variables as arguments", "Khi gọi f(1, 2, 3) và f(x, y, z), các tham số a, b, c lần lượt nhận giá trị của đối số.", "On the calls f(1, 2, 3) and f(x, y, z), the parameters a, b, c receive the values of the arguments in order."),
        """def f(a, b, c):
    return a + b + c

print(f(1, 2, 3))
x, y, z = 4, 5, 6
print(f(x, y, z))""",
    ),
    trace_block(
        sim("Đối số là biến chưa có giá trị", "An argument that is a variable with no value", "p, q, r chưa được gán nên lời gọi f(p, q, r) báo NameError.", "p, q, r have not been assigned so the call f(p, q, r) raises a NameError."),
        """def f(a, b, c):
    return a + b + c

print(f(1, 2, 3))
print(f(p, q, r))""",
    ),
    trace_block(
        sim("Gọi hàm thiếu đối số", "Calling a function with too few arguments", "Hàm cần ba đối số nhưng chỉ truyền hai nên báo TypeError.", "The function needs three arguments but only two are passed, so a TypeError is raised."),
        """def f(a, b, c):
    return a + b + c

print(f(1, 2))""",
    ),
    T(
        "### 2. Cách sử dụng chương trình con\n\nKhi một việc phải làm nhiều lần với dữ liệu khác nhau, ta viết thành **hàm** rồi gọi nhiều lần. Ví dụ dùng hàm `prime(n)` ở Bài 26 để in các số nguyên tố trong khoảng từ `m` đến `n` (`1 < m < n`): gọi `prime(i)` cho từng `i` từ `m` đến `n`.\n\n**Lợi ích của chương trình con:**\n\n- làm **giảm số câu lệnh** của chương trình (viết một lần, gọi nhiều lần);\n- chương trình có cấu trúc **dễ hiểu**;\n- dễ **nâng cấp, mở rộng, chỉnh sửa**.\n\nVí dụ bài toán dùng hàm: đếm số năm nhuận trong một khoảng thời gian; đếm và tính tổng, trung bình các số chia hết cho 5 trong một dãy số.",
        "### 2. Using subprograms\n\nWhen a job must be done many times with different data, we write it as a **function** and call it many times. For example, use the function `prime(n)` from Lesson 26 to print the primes from `m` to `n` (`1 < m < n`): call `prime(i)` for each `i` from `m` to `n`.\n\n**Benefits of subprograms:**\n\n- they **reduce the number of statements** (write once, call many times);\n- a structured program is **easier to understand**;\n- it is easier to **upgrade, extend and modify**.\n\nExamples of problems that use functions: counting leap years in a period; counting, summing and averaging the numbers divisible by 5 in a sequence.",
    ),
    trace_block(
        sim("In các số nguyên tố từ m đến n — nhập 10 và 20", "Printing the primes from m to n — enter 10 and 20", "Hàm prime viết một lần, được gọi với đối số i lần lượt từ 10 đến 20.", "The function prime is written once and called with the argument i from 10 to 20."),
        PRIME
        + """
m = int(input("Nhập m: "))
n = int(input("Nhập n: "))
for i in range(m, n + 1):
    if prime(i):
        print(i, end=" ")""",
        ["10", "20"],
    ),
    T(
        "### 3. Thực hành: truyền giá trị cho đối số\n\n**Nhiệm vụ 1.** Hàm `f_sum(A, b)` tính tổng các số của danh sách `A`: nếu `b = 0` thì cộng **tất cả**, nếu `b` khác 0 thì chỉ cộng các số **dương**.\n\n**Nhiệm vụ 2.** Hàm `f_dem(msg, sep)` đếm số **từ** của xâu `msg` khi kí tự tách từ là `sep` (bỏ qua các từ rỗng do kí tự tách bị lặp).\n\n**Nhiệm vụ 3.** Hàm `merge_str(s1, s2)` **gộp** hai xâu `s1`, `s2` thành xâu `S`. Giáo án không nêu rõ cách gộp; ở đây ta chọn cách **xen kẽ** lần lượt từng kí tự của `s1` và `s2`, các kí tự thừa của xâu dài hơn được nối vào cuối.",
        "### 3. Practice: passing values to arguments\n\n**Task 1.** The function `f_sum(A, b)` sums the numbers of the list `A`: if `b = 0` add **all** of them, if `b` is nonzero add only the **positive** ones.\n\n**Task 2.** The function `f_dem(msg, sep)` counts the **words** of the string `msg` when the word separator is `sep` (ignoring empty words caused by a repeated separator).\n\n**Task 3.** The function `merge_str(s1, s2)` **merges** the strings `s1`, `s2` into a string `S`. The lesson plan does not say how to merge; here we choose to **interleave** the characters of `s1` and `s2` in turn, appending the leftover characters of the longer string at the end.",
    ),
    trace_block(
        sim("Nhiệm vụ 1: hàm f_sum(A, b)", "Task 1: the function f_sum(A, b)", "Cùng danh sách A: b = 0 cộng tất cả (được 3), b = 1 chỉ cộng các số dương (được 9).", "The same list A: b = 0 adds everything (3), b = 1 adds only the positive numbers (9)."),
        """def f_sum(A, b):
    tong = 0
    for x in A:
        if b == 0 or x > 0:
            tong = tong + x
    return tong

A = [3, -1, 4, -5, 2]
print(f_sum(A, 0))
print(f_sum(A, 1))""",
    ),
    trace_block(
        sim("Nhiệm vụ 2: hàm f_dem(msg, sep)", "Task 2: the function f_dem(msg, sep)", "split(sep) tách xâu; chỉ các từ khác rỗng được đếm, nên hai kí tự tách liền nhau không làm đếm thừa.", "split(sep) breaks the string; only non-empty words are counted, so two adjacent separators do not cause an extra count."),
        """def f_dem(msg, sep):
    dem = 0
    for tu in msg.split(sep):
        if tu != "":
            dem = dem + 1
    return dem

print(f_dem("Hà Nội  Việt Nam", " "))
print(f_dem("gà,vịt,chó,,lợn", ","))""",
    ),
    trace_block(
        sim("Nhiệm vụ 3: hàm merge_str(s1, s2) xen kẽ", "Task 3: the interleaving function merge_str(s1, s2)", "Mỗi lần lặp lấy kí tự thứ i của s1 rồi của s2 (nếu còn); kí tự thừa của s2 nối vào cuối.", "Each repetition takes character i of s1 and then of s2 (if any is left); the leftover of s2 goes at the end."),
        """def merge_str(s1, s2):
    S = ""
    n = len(s1)
    if len(s2) > n:
        n = len(s2)
    for i in range(n):
        if i < len(s1):
            S = S + s1[i]
        if i < len(s2):
            S = S + s2[i]
    return S

print(merge_str("abc", "12345"))""",
    ),
    T(
        "### 4. Luyện tập và vận dụng\n\n**Luyện tập 1.** Viết hàm `power(a, n)` tính $a^n$ (với `n` tự nhiên) bằng vòng `for`: bắt đầu `kq = 1`, nhân `kq` với `a` đúng `n` lần. Ví dụ `power(2, 10)` là `1024`, `power(5, 0)` là `1`.\n\n**Luyện tập 2.** Viết hàm `tong(n)` tính $1 + 2 + \\dots + n$ rồi dùng hàm để in tổng của các số tự nhiên từ 1 đến 10 và từ 1 đến 100 (`55` và `5050`).\n\n**Vận dụng 1.** Chỉ số khối cơ thể $BMI = \\frac{m}{h^2}$, với `m` là khối lượng (kg), `h` là chiều cao (m). Viết hàm `bmi(m, h)`.\n\n**Vận dụng 2.** Viết hàm dấu `sign(x)` trả về `1` nếu `x > 0`, `0` nếu `x = 0`, `-1` nếu `x < 0`.\n\n**Bài làm thêm.** Nhập họ tên, cân nặng, chiều cao; thông báo \"Bạn gầy\" nếu BMI < 18, \"Bạn bình thường\" nếu BMI từ 18 đến 25, \"Bạn bị béo phì\" nếu BMI > 25.",
        "### 4. Practice and application\n\n**Practice 1.** Write a function `power(a, n)` that computes $a^n$ (with natural `n`) using a `for` loop: start with `kq = 1` and multiply `kq` by `a` exactly `n` times. For example `power(2, 10)` is `1024`, `power(5, 0)` is `1`.\n\n**Practice 2.** Write a function `tong(n)` that computes $1 + 2 + \\dots + n$, then use it to print the sum of the natural numbers from 1 to 10 and from 1 to 100 (`55` and `5050`).\n\n**Application 1.** The body mass index $BMI = \\frac{m}{h^2}$, where `m` is the mass (kg) and `h` the height (m). Write a function `bmi(m, h)`.\n\n**Application 2.** Write the sign function `sign(x)` returning `1` if `x > 0`, `0` if `x = 0`, `-1` if `x < 0`.\n\n**Extra exercise.** Enter a name, weight and height; report \"Bạn gầy\" (underweight) if BMI < 18, \"Bạn bình thường\" (normal) if BMI is 18 to 25, \"Bạn bị béo phì\" (obese) if BMI > 25.",
    ),
    trace_block(
        sim("Luyện tập 1: hàm power(a, n)", "Practice 1: the function power(a, n)", "Hàm nhân kq với a đúng n lần; với n = 0 vòng lặp không chạy nên kết quả là 1.", "The function multiplies kq by a exactly n times; with n = 0 the loop does not run so the result is 1."),
        """def power(a, n):
    kq = 1
    for i in range(n):
        kq = kq * a
    return kq

print(power(2, 10))
print(power(5, 0))""",
    ),
    trace_block(
        sim("Luyện tập 2: hàm tong(n)", "Practice 2: the function tong(n)", "Cùng một hàm được gọi hai lần với hai đối số khác nhau: 10 và 100.", "The same function is called twice with two different arguments: 10 and 100."),
        """def tong(n):
    S = 0
    for i in range(1, n + 1):
        S = S + i
    return S

print(tong(10))
print(tong(100))""",
    ),
    trace_block(
        sim("Vận dụng 1: hàm bmi(m, h)", "Application 1: the function bmi(m, h)", "bmi(54, 1.5) = 54 / (1.5 × 1.5) = 24.0; tham số m, h nhận giá trị của đối số.", "bmi(54, 1.5) = 54 / (1.5 × 1.5) = 24.0; the parameters m, h receive the values of the arguments."),
        """def bmi(m, h):
    return m / (h * h)

print(bmi(54, 1.5))
print(bmi(36, 1.5))""",
    ),
    trace_block(
        sim("Vận dụng 2: hàm dấu sign(x)", "Application 2: the sign function sign(x)", "Hàm có ba lệnh return; mỗi lời gọi chỉ chạy một return rồi dừng.", "The function has three return commands; each call runs only one return and stops."),
        """def sign(x):
    if x > 0:
        return 1
    if x == 0:
        return 0
    return -1

print(sign(5))
print(sign(0))
print(sign(-3))""",
    ),
    trace_block(
        sim("Bài làm thêm: phân loại BMI — gầy (36 kg, 1.5 m)", "Extra exercise: BMI classes — underweight (36 kg, 1.5 m)", "BMI = 16.0 < 18 nên chương trình in Bạn gầy.", "BMI = 16.0 < 18 so the program prints Bạn gầy."),
        BMI,
        ["Lan", "36", "1.5"],
    ),
    trace_block(
        sim("Bài làm thêm: phân loại BMI — bình thường (54 kg, 1.5 m)", "Extra exercise: BMI classes — normal (54 kg, 1.5 m)", "BMI = 24.0 nằm trong khoảng từ 18 đến 25 nên in Bạn bình thường.", "BMI = 24.0 is between 18 and 25 so it prints Bạn bình thường."),
        BMI,
        ["Hòa", "54", "1.5"],
    ),
    trace_block(
        sim("Bài làm thêm: phân loại BMI — béo phì (63 kg, 1.5 m)", "Extra exercise: BMI classes — obese (63 kg, 1.5 m)", "BMI = 28.0 > 25 nên in Bạn bị béo phì.", "BMI = 28.0 > 25 so it prints Bạn bị béo phì."),
        BMI,
        ["Nam", "63", "1.5"],
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Tham số | biến ghi trong khai báo `def` |\n| Đối số | giá trị (hoặc biến đã có giá trị) ghi khi gọi hàm |\n| Truyền đối số | lần lượt cho các tham số; số đối số phải đúng bằng số tham số |\n| Biến chưa gán làm đối số | `NameError` |\n| Sai số đối số | `TypeError` |\n| Lợi ích chương trình con | ít câu lệnh, dễ hiểu, dễ nâng cấp |\n\n**Tự kiểm tra:** với `def power(a, b): return a ** b`, `power(2, 3)` bằng bao nhiêu? (đáp án: `8`). Gọi hàm ba tham số `f(1, 2)` báo lỗi gì? (đáp án: `TypeError`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Parameter | a variable written in the `def` definition |\n| Argument | a value (or a variable with a value) written in the call |\n| Passing arguments | in order to the parameters; the number of arguments must equal the number of parameters |\n| Unassigned variable as an argument | `NameError` |\n| Wrong number of arguments | `TypeError` |\n| Benefits of subprograms | fewer statements, easier to understand, easier to upgrade |\n\n**Self-check:** with `def power(a, b): return a ** b`, what is `power(2, 3)`? (answer: `8`). What error does calling the three-parameter function as `f(1, 2)` give? (answer: `TypeError`).",
    ),
]

questions = [
    mc("tin10-b27-mc-01", 1, "Hàm tự định nghĩa trong Python có thể có bao nhiêu tham số?", "How many parameters can a user-defined function in Python have?",
       "Hàm có thể không có tham số hoặc có nhiều tham số, số lượng không hạn chế.", "A function may have no parameters or many, with no limit.", "D",
       ("Đúng 1", "Exactly 1"), ("Tối đa 2", "At most 2"), ("Phải có ít nhất 1", "At least 1"), ("Không hạn chế", "No limit")),
    mc("tin10-b27-mc-02", 1, "Khi gọi hàm, dữ liệu truyền vào hàm được gọi là gì?", "When calling a function, what is the data passed into it called?",
       "Giá trị ghi khi gọi hàm là đối số; tham số là biến ghi trong khai báo hàm.", "The value written in the call is an argument; a parameter is the variable written in the definition.", "B",
       ("Tham số", "Parameter"), ("Đối số", "Argument"), ("Hiệu số", "Difference"), ("Hàm số", "Function")),
    mc("tin10-b27-mc-03", 1, "Tham số của hàm là gì?", "What is a parameter of a function?",
       "Tham số là biến được ghi trong khai báo (dòng def) của hàm.", "A parameter is a variable written in the function's definition (the def line).", "A",
       ("Biến ghi trong khai báo hàm", "A variable written in the function definition"), ("Giá trị ghi khi gọi hàm", "A value written in the call"), ("Kết quả của lệnh return", "The result of return"), ("Tên của hàm", "The name of the function")),
    mc("tin10-b27-mc-04", 2, "Cho def power(a, b): return a ** b. Lệnh print(power(2, 3)) in ra số nào?", "Given def power(a, b): return a ** b. Which number does print(power(2, 3)) print?",
       "a nhận 2, b nhận 3 nên power(2, 3) = 2 ** 3 = 8.", "a receives 2 and b receives 3 so power(2, 3) = 2 ** 3 = 8.", "C",
       ("5", "5"), ("6", "6"), ("8", "8"), ("9", "9")),
    mc("tin10-b27-mc-05", 2, "Cho def f(a, b, c): return a + b + c. Giá trị của f(1, 2, 3) là gì?", "Given def f(a, b, c): return a + b + c. What is f(1, 2, 3)?",
       "a, b, c lần lượt nhận 1, 2, 3 nên f trả về 1 + 2 + 3 = 6.", "a, b, c receive 1, 2, 3 in order so f returns 1 + 2 + 3 = 6.", "B",
       ("123", "123"), ("6", "6"), ("5", "5"), ("Báo lỗi", "An error")),
    mc("tin10-b27-mc-06", 2, "Với hàm f(a, b, c) ở trên, lời gọi f(1, 2) báo lỗi nào?", "With the function f(a, b, c) above, which error does the call f(1, 2) raise?",
       "Thiếu một đối số cho tham số c nên Python báo TypeError.", "One argument is missing for the parameter c so Python raises a TypeError.", "D",
       ("NameError", "NameError"), ("ValueError", "ValueError"), ("IndexError", "IndexError"), ("TypeError", "TypeError")),
    mc("tin10-b27-mc-07", 2, "Sau x, y, z = 4, 5, 6, lệnh f(x, y, z) với hàm f(a, b, c) ở trên trả về giá trị nào?", "After x, y, z = 4, 5, 6, which value does f(x, y, z) return with the function f(a, b, c) above?",
       "Đối số là các biến đã có giá trị 4, 5, 6 nên f trả về 4 + 5 + 6 = 15.", "The arguments are variables holding 4, 5, 6 so f returns 4 + 5 + 6 = 15.", "A",
       ("15", "15"), ("456", "456"), ("6", "6"), ("Báo lỗi", "An error")),
    mc("tin10-b27-mc-08", 2, "Gọi f(p, q, r) khi p, q, r chưa được gán giá trị thì Python báo lỗi nào?", "Which error does Python raise for f(p, q, r) when p, q, r have not been assigned?",
       "Không xác định được giá trị của p, q, r nên báo NameError.", "The values of p, q, r cannot be determined so a NameError is raised.", "C",
       ("TypeError", "TypeError"), ("SyntaxError", "SyntaxError"), ("NameError", "NameError"), ("Không báo lỗi", "No error")),
    mc("tin10-b27-mc-09", 2, "Phát biểu nào KHÔNG phải lợi ích của việc dùng chương trình con?", "Which statement is NOT a benefit of using subprograms?",
       "Chương trình con giảm số câu lệnh, làm chương trình dễ hiểu và dễ nâng cấp; nó không tự sửa lỗi cú pháp.", "Subprograms reduce statements and make a program easier to understand and upgrade; they do not fix syntax errors by themselves.", "D",
       ("Làm giảm số câu lệnh của chương trình", "Reduces the number of statements"), ("Làm chương trình dễ hiểu hơn", "Makes the program easier to understand"), ("Dễ nâng cấp, mở rộng, chỉnh sửa", "Easier to upgrade, extend and modify"), ("Giúp máy tính tự sửa lỗi cú pháp", "Makes the computer fix syntax errors itself")),
    mc("tin10-b27-mc-10", 2, "Với A = [3, -1, 4, -5, 2], hàm f_sum(A, 1) (chỉ cộng các số dương) cho giá trị nào?", "With A = [3, -1, 4, -5, 2], what does f_sum(A, 1) (adding only positive numbers) give?",
       "Các số dương là 3, 4, 2 nên tổng là 9.", "The positive numbers are 3, 4, 2 so the sum is 9.", "A",
       ("9", "9"), ("3", "3"), ("-3", "-3"), ("13", "13")),
    mc("tin10-b27-mc-11", 2, "Với A = [3, -1, 4, -5, 2], hàm f_sum(A, 0) (cộng tất cả) cho giá trị nào?", "With A = [3, -1, 4, -5, 2], what does f_sum(A, 0) (adding all) give?",
       "3 - 1 + 4 - 5 + 2 = 3.", "3 - 1 + 4 - 5 + 2 = 3.", "C",
       ("9", "9"), ("0", "0"), ("3", "3"), ("-3", "-3")),
    mc("tin10-b27-mc-12", 3, "Một người nặng 54 kg, cao 1,5 m. Với BMI = m / h² (gầy: BMI < 18; bình thường: 18 đến 25; béo phì: BMI > 25), người đó thuộc nhóm nào?", "A person weighs 54 kg and is 1.5 m tall. With BMI = m / h² (underweight: BMI < 18; normal: 18 to 25; obese: BMI > 25), which group are they in?",
       "BMI = 54 / (1,5 × 1,5) = 54 / 2,25 = 24, nằm trong khoảng 18 đến 25 nên là bình thường.", "BMI = 54 / (1.5 × 1.5) = 54 / 2.25 = 24, between 18 and 25, so normal.", "B",
       ("Gầy", "Underweight"), ("Bình thường", "Normal"), ("Béo phì", "Obese"), ("Không xác định", "Cannot be determined")),
]

truefalse = [
    tf("tin10-b27-tf-01", 1, "Phân biệt tham số và đối số.", "Tell parameters from arguments.",
       "Tham số ghi trong khai báo; đối số ghi khi gọi; số đối số phải bằng số tham số; biến chưa gán làm đối số báo lỗi.", "Parameters are written in the definition; arguments in the call; the number of arguments must equal the number of parameters; an unassigned variable as an argument raises an error.",
       ("Tham số là biến được ghi trong khai báo hàm.", "A parameter is a variable written in the function definition.", True),
       ("Đối số là giá trị được ghi khi gọi hàm.", "An argument is a value written when calling the function.", True),
       ("Hàm khai báo một tham số vẫn gọi được với hai đối số.", "A function defined with one parameter can still be called with two arguments.", False),
       ("Gọi f(a, b, c) khi a, b, c chưa có giá trị thì báo lỗi.", "Calling f(a, b, c) when a, b, c have no values raises an error.", True)),
    tf("tin10-b27-tf-02", 2, "Xét lợi ích của chương trình con.", "Consider the benefits of subprograms.",
       "Viết hàm một lần rồi gọi nhiều lần giúp giảm câu lệnh, dễ sửa; hàm không bắt buộc phải có tham số.", "Writing a function once and calling it many times reduces statements and eases changes; a function need not have parameters.",
       ("Dùng chương trình con luôn làm tăng số câu lệnh khi cần làm một việc nhiều lần.", "Using subprograms always increases the number of statements when a job is repeated.", False),
       ("Chương trình có cấu trúc dễ nâng cấp, mở rộng, chỉnh sửa hơn.", "A structured program is easier to upgrade, extend and modify.", True),
       ("Chương trình con bắt buộc phải có tham số.", "A subprogram must have parameters.", False),
       ("Hàm prime viết một lần có thể gọi nhiều lần với các đối số khác nhau.", "The function prime written once can be called many times with different arguments.", True)),
    tf("tin10-b27-tf-03", 2, "Xét các hàm thực hành với A = [3, -1, 4, -5, 2].", "Consider the practice functions with A = [3, -1, 4, -5, 2].",
       "f_sum(A, 0) = 3, f_sum(A, 1) = 9; f_dem(\"Hà Nội  Việt Nam\", \" \") = 4; power(5, 0) = 1.", "f_sum(A, 0) = 3, f_sum(A, 1) = 9; f_dem(\"Hà Nội  Việt Nam\", \" \") = 4; power(5, 0) = 1.",
       ("f_sum(A, 0) cộng tất cả các số của A và bằng 3.", "f_sum(A, 0) adds all numbers of A and equals 3.", True),
       ("f_sum(A, 1) chỉ cộng các số dương của A và bằng 9.", "f_sum(A, 1) adds only the positive numbers of A and equals 9.", True),
       ("f_dem(\"Hà Nội  Việt Nam\", \" \") cho 5 từ.", "f_dem(\"Hà Nội  Việt Nam\", \" \") gives 5 words.", False),
       ("power(5, 0) bằng 0.", "power(5, 0) equals 0.", False)),
    tf("tin10-b27-tf-04", 3, "Xét hàm bmi(m, h) = m / (h * h) và hàm dấu sign(x).", "Consider the function bmi(m, h) = m / (h * h) and the sign function sign(x).",
       "Công thức BMI là m chia bình phương h; bmi(54, 1.5) = 24.0 (bình thường); sign(-3) = -1.", "The BMI formula is m divided by the square of h; bmi(54, 1.5) = 24.0 (normal); sign(-3) = -1.",
       ("Công thức BMI là khối lượng chia cho bình phương chiều cao.", "The BMI formula is mass divided by the square of height.", True),
       ("sign(-3) trả về -1.", "sign(-3) returns -1.", True),
       ("BMI bằng 24.0 được phân loại là béo phì.", "A BMI of 24.0 is classified as obese.", False),
       ("bmi(54, 1.5) trả về 24.0.", "bmi(54, 1.5) returns 24.0.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
