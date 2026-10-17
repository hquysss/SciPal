# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_18_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "cac-lenh-vao-ra-don-gian-bai-18-tin10"
title_vi = "Bài 18. Các lệnh vào ra đơn giản"
title_en = "Lesson 18. Simple input and output commands"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- dùng lệnh **`input()`** để nhập dữ liệu từ bàn phím và **`print()`** để đưa dữ liệu ra màn hình;\n- nhận biết các kiểu dữ liệu cơ bản `int`, `float`, `str`, `bool` bằng lệnh `type()`;\n- chuyển đổi kiểu dữ liệu bằng `int()`, `float()`, `str()`;\n- nhập số nguyên, số thực từ bàn phím và viết chương trình đơn giản có nhập, xử lí, xuất.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- use **`input()`** to read data from the keyboard and **`print()`** to show data on the screen;\n- recognise the basic types `int`, `float`, `str`, `bool` with `type()`;\n- convert data types with `int()`, `float()`, `str()`;\n- read integers and real numbers from the keyboard and write simple programs that read, process and print.",
    ),
    T(
        "### 1. Các lệnh vào ra đơn giản\n\nĐể chương trình **tương tác** với người dùng, ta cần lệnh đưa dữ liệu ra màn hình và lệnh nhập dữ liệu từ bàn phím. Các lệnh vào ra đơn giản của Python là `input()` và `print()`.\n\n**Lệnh `input()` (lệnh vào)** nhập dữ liệu từ thiết bị vào chuẩn, thường là bàn phím. Nội dung nhập có thể là số, biểu thức hay xâu, nhưng **kết quả luôn là một xâu kí tự**.\n\n```python\n<biến> = input(<dòng thông báo>)\n```\n\n**Lệnh `print()` (lệnh ra)** đưa dữ liệu ra thiết bị ra chuẩn, thường là màn hình. Có thể in một hay nhiều dữ liệu thuộc kiểu khác nhau, kể cả biểu thức tính toán.\n\nVí dụ: sau `a = input(\"Nhập một số: \")` và nhập `12`, biến `a` chứa **xâu** `'12'`; vì vậy `a + 5` báo lỗi **TypeError** (không cộng được xâu với số).",
        "### 1. Simple input and output commands\n\nFor a program to **interact** with the user we need a command that shows data on the screen and one that reads data from the keyboard. The simple I/O commands of Python are `input()` and `print()`.\n\n**`input()` (input command)** reads data from the standard input device, usually the keyboard. The content may be a number, an expression or a string, but **the result is always a string**.\n\n```python\n<variable> = input(<prompt>)\n```\n\n**`print()` (output command)** sends data to the standard output device, usually the screen. It can print one or several values of different types, including calculated expressions.\n\nFor example, after `a = input(\"Enter a number: \")` and entering `12`, the variable `a` holds the **string** `'12'`; so `a + 5` raises a **TypeError** (a string cannot be added to a number).",
    ),
    trace_block(
        sim("input() luôn trả về xâu — nhập 12", "input() always returns a string — enter 12", "Biến a chứa xâu '12' (kiểu str), nên a + 5 ở dòng cuối báo TypeError.", "The variable a holds the string '12' (type str), so a + 5 on the last line raises a TypeError."),
        """a = input("Nhập một số: ")
print(a, type(a))
print(a + 5)""",
        ["12"],
    ),
    T(
        "### 2. Chuyển đổi kiểu dữ liệu cơ bản\n\nCác kiểu dữ liệu cơ bản của Python:\n\n| Kiểu | Ý nghĩa | Ví dụ |\n|---|---|---|\n| `int` | số nguyên | `15` |\n| `float` | số thực | `2.5` |\n| `str` | xâu kí tự | `'Tin'` |\n| `bool` | lôgic | `True`, `False` |\n\nLệnh **`type(a)`** cho biết kiểu của `a`. Biểu thức so sánh như `32 > 45` có kiểu `bool`.",
        "### 2. Converting basic data types\n\nThe basic data types of Python:\n\n| Type | Meaning | Example |\n|---|---|---|\n| `int` | integer | `15` |\n| `float` | real number | `2.5` |\n| `str` | string | `'Tin'` |\n| `bool` | logical | `True`, `False` |\n\nThe command **`type(a)`** shows the type of `a`. A comparison such as `32 > 45` has type `bool`.",
    ),
    T(
        "Các lệnh **chuyển đổi kiểu** trùng tên với kiểu:\n\n- `int()`: chuyển từ số thực hoặc xâu sang số nguyên: `int(\"123\")` là `123`, `int(4.3 + 2)` là `6` (bỏ phần thập phân);\n- `float()`: chuyển từ số nguyên hoặc xâu sang số thực: `float(\"15.0\")` là `15.0`, `float(4 + 5)` là `9.0`;\n- `str()`: chuyển từ số sang xâu: `str(150)` là `'150'`.\n\nChú ý: `int()` và `float()` **không tính** xâu là biểu thức toán. `int(\"5*2\")`, `int(\"12+5\")` báo lỗi; `int(\"12.0\")` cũng báo lỗi **ValueError** vì xâu `\"12.0\"` không phải số nguyên.",
        "The **conversion commands** are named after the types:\n\n- `int()`: converts a real number or a string to an integer: `int(\"123\")` is `123`, `int(4.3 + 2)` is `6` (the decimal part is dropped);\n- `float()`: converts an integer or a string to a real number: `float(\"15.0\")` is `15.0`, `float(4 + 5)` is `9.0`;\n- `str()`: converts a number to a string: `str(150)` is `'150'`.\n\nNote: `int()` and `float()` **do not evaluate** a string as a maths expression. `int(\"5*2\")` and `int(\"12+5\")` raise an error; `int(\"12.0\")` also raises a **ValueError** because the string `\"12.0\"` is not an integer.",
    ),
    trace_block(
        sim("Chuyển đổi bằng int(), float(), str()", "Converting with int(), float(), str()", "Cùng xâu \"123\" thành số nguyên và số thực; số 150 thành xâu; type() cho thấy kiểu mới.", "The same string \"123\" becomes an integer and a real number; 150 becomes a string; type() shows the new types."),
        """s = "123"
n = int(s)
x = float(s)
t = str(150)
print(n, x, t)
print(type(n), type(x), type(t))""",
    ),
    trace_block(
        sim("Kiểu của biểu thức so sánh và xâu", "Types of comparisons and strings", "Xâu nằm trong dấu nháy là str và không tự tính; các phép so sánh cho kiểu bool.", "A string in quotes is str and is not evaluated; comparisons give type bool."),
        """print("15 + 20 - 7", type("15 + 20 - 7"))
print(32 > 45, type(32 > 45))
print(13 != 8 + 5)
print(1 == 2)""",
    ),
    trace_block(
        sim("int() không nhận xâu số thực", "int() does not accept a real-number string", "float(\"12.0\") chạy được nhưng int(\"12.0\") báo ValueError.", "float(\"12.0\") works but int(\"12.0\") raises a ValueError."),
        """a = "12.0"
print(float(a))
print(int(a))""",
    ),
    T(
        "### 3. Thực hành nhập dữ liệu từ bàn phím\n\nVì `input()` luôn cho xâu, muốn nhập **số** phải **chuyển kiểu**: `int(input(...))` cho số nguyên, `float(input(...))` cho số thực.\n\n**Nhiệm vụ 1.** Nhập lần lượt ba số tự nhiên `m`, `n`, `p` rồi in tổng của chúng.\n\n**Nhiệm vụ 2.** Nhập họ tên rồi nhập tuổi của học sinh; in thông báo, ví dụ: `Bạn Nguyễn Hòa Bình 15 tuổi`.\n\n**Hình thang.** Nhập đáy trên, đáy dưới, chiều cao (số thực) rồi tính diện tích $S = \\frac{(a + b) \\times h}{2}$.\n\nLỗi hay gặp: quên chuyển kiểu. Nếu `x = input()` nhận `5` thì `2 * x` là xâu `'55'` (lặp xâu), không phải số `10`.",
        "### 3. Practice: reading data from the keyboard\n\nBecause `input()` always gives a string, to read a **number** you must **convert**: `int(input(...))` for an integer, `float(input(...))` for a real number.\n\n**Task 1.** Read three natural numbers `m`, `n`, `p` in turn and print their sum.\n\n**Task 2.** Read a student's full name and then age; print a message such as `Bạn Nguyễn Hòa Bình 15 tuổi` (Nguyễn Hòa Bình is 15 years old).\n\n**Trapezoid.** Read the top base, bottom base and height (real numbers) and compute the area $S = \\frac{(a + b) \\times h}{2}$.\n\nA common mistake is forgetting the conversion. If `x = input()` receives `5` then `2 * x` is the string `'55'` (string repetition), not the number `10`.",
    ),
    trace_block(
        sim("Nhiệm vụ 1: tổng ba số — nhập 4, 7, 9", "Task 1: sum of three numbers — enter 4, 7, 9", "Mỗi số nhập vào được int() chuyển thành số nguyên rồi mới cộng.", "Each entered value is converted by int() to an integer before adding."),
        """m = int(input("Nhập m: "))
n = int(input("Nhập n: "))
p = int(input("Nhập p: "))
print("Tổng ba số là:", m + n + p)""",
        ["4", "7", "9"],
    ),
    trace_block(
        sim("Nhiệm vụ 2: họ tên và tuổi", "Task 2: name and age", "Họ tên giữ nguyên là xâu; tuổi được chuyển thành số nguyên, rồi cả hai được in cùng thông báo.", "The name stays a string; the age is converted to an integer, then both are printed with the message."),
        """ho_ten = input("Nhập họ tên: ")
tuoi = int(input("Nhập tuổi: "))
print("Bạn", ho_ten, tuoi, "tuổi")""",
        ["Nguyễn Hòa Bình", "15"],
    ),
    trace_block(
        sim("Quên chuyển kiểu — nhập 5", "Forgetting the conversion — enter 5", "x là xâu '5' nên 2 * x lặp xâu thành '55', không phải 10.", "x is the string '5', so 2 * x repeats it as '55', not 10."),
        """x = input("Nhập giá trị x: ")
print(2 * x)
print(2 * int(x))""",
        ["5"],
    ),
    trace_block(
        sim("Diện tích hình thang — nhập 4, 6, 3.5", "Trapezoid area — enter 4, 6, 3.5", "Ba số thực được nhập bằng float(input()); diện tích = (đáy trên + đáy dưới) × chiều cao / 2.", "Three real numbers are read with float(input()); area = (top + bottom) × height / 2."),
        """a = float(input("Đáy trên: "))
b = float(input("Đáy dưới: "))
h = float(input("Chiều cao: "))
s = (a + b) * h / 2
print("Diện tích hình thang:", s)""",
        ["4", "6", "3.5"],
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| `input()` | nhập từ bàn phím, **luôn trả về xâu** |\n| `print()` | in một hay nhiều giá trị ra màn hình |\n| `type(x)` | cho biết kiểu của `x` |\n| `int()`, `float()`, `str()` | chuyển kiểu dữ liệu |\n| Nhập số nguyên | `int(input())` |\n| Nhập số thực | `float(input())` |\n| Lỗi hay gặp | `int(\"12.0\")`, `int(\"5*2\")`, cộng xâu với số |\n\n**Tự kiểm tra:** `str(5 + 3)` là gì? (đáp án: `'8'`). `int(4.3 + 2)` là gì? (đáp án: `6`). `print(\"m\" + 3 * \"k\")` in gì? (đáp án: `mkkk`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| `input()` | reads from the keyboard, **always returns a string** |\n| `print()` | prints one or several values on the screen |\n| `type(x)` | shows the type of `x` |\n| `int()`, `float()`, `str()` | convert data types |\n| Read an integer | `int(input())` |\n| Read a real number | `float(input())` |\n| Common errors | `int(\"12.0\")`, `int(\"5*2\")`, adding a string to a number |\n\n**Self-check:** what is `str(5 + 3)`? (answer: `'8'`). What is `int(4.3 + 2)`? (answer: `6`). What does `print(\"m\" + 3 * \"k\")` print? (answer: `mkkk`).",
    ),
]

questions = [
    mc("tin10-b18-mc-01", 1, "Trong Python, lệnh nào dùng để nhập dữ liệu từ bàn phím?", "In Python, which command reads data from the keyboard?",
       "input() nhập dữ liệu từ thiết bị vào chuẩn là bàn phím; print() là lệnh ra, type() cho biết kiểu, int() chuyển kiểu.", "input() reads from the standard input, the keyboard; print() is output, type() shows the type, int() converts.", "B",
       ("print()", "print()"), ("input()", "input()"), ("type()", "type()"), ("int()", "int()")),
    mc("tin10-b18-mc-02", 1, "Sau x = input(\"Nhập số: \") và nhập 12, giá trị và kiểu của x là gì?", "After x = input(\"Enter a number: \") and entering 12, what are the value and type of x?",
       "input() luôn trả lại xâu kí tự nên x là xâu '12' kiểu str.", "input() always returns a string, so x is the string '12' of type str.", "D",
       ("Số nguyên 12, kiểu int", "Integer 12, type int"), ("Số thực 12.0, kiểu float", "Real number 12.0, type float"), ("Giá trị lôgic, kiểu bool", "A logical value, type bool"), ("Xâu '12', kiểu str", "String '12', type str")),
    mc("tin10-b18-mc-03", 1, "Lệnh nào chuyển dữ liệu nhập từ bàn phím thành số nguyên?", "Which command turns the keyboard input into an integer?",
       "int(input()) chuyển xâu do input() trả về thành số nguyên.", "int(input()) converts the string returned by input() into an integer.", "A",
       ("int(input())", "int(input())"), ("str(input())", "str(input())"), ("float(input())", "float(input())"), ("type(input())", "type(input())")),
    mc("tin10-b18-mc-04", 1, "Kết quả của type(3.5) cho biết đối tượng thuộc kiểu nào?", "The result of type(3.5) says the object has which type?",
       "3.5 là số thực nên kiểu là float (<class 'float'>).", "3.5 is a real number, so the type is float (<class 'float'>).", "C",
       ("int", "int"), ("str", "str"), ("float", "float"), ("bool", "bool")),
    mc("tin10-b18-mc-05", 2, "Lệnh nào sau đây sẽ báo lỗi khi thực hiện?", "Which of the following reports an error?",
       "int(\"12+5\") báo lỗi vì int() không tính xâu là biểu thức; các lệnh còn lại chuyển kiểu hợp lệ.", "int(\"12+5\") fails because int() does not evaluate a string as an expression; the others are valid conversions.", "C",
       ("int(\"123\")", "int(\"123\")"), ("float(\"10.5\")", "float(\"10.5\")"), ("int(\"12+5\")", "int(\"12+5\")"), ("str(12.5)", "str(12.5)")),
    mc("tin10-b18-mc-06", 2, "Giá trị của str(5 + 3) là gì?", "What is the value of str(5 + 3)?",
       "5 + 3 = 8 rồi str() chuyển thành xâu '8'.", "5 + 3 = 8 and str() turns it into the string '8'.", "B",
       ("8", "8"), ("'8'", "'8'"), ("'5 + 3'", "'5 + 3'"), ("Báo lỗi", "An error")),
    mc("tin10-b18-mc-07", 2, "Giá trị của float(4 + 5) là gì?", "What is the value of float(4 + 5)?",
       "4 + 5 = 9, float() chuyển thành số thực 9.0.", "4 + 5 = 9, and float() turns it into the real number 9.0.", "D",
       ("9", "9"), ("'9'", "'9'"), ("45.0", "45.0"), ("9.0", "9.0")),
    mc("tin10-b18-mc-08", 2, "Giá trị của int(4.3 + 2) là gì?", "What is the value of int(4.3 + 2)?",
       "4.3 + 2 = 6.3; int() bỏ phần thập phân nên được 6.", "4.3 + 2 = 6.3; int() drops the decimal part, giving 6.", "A",
       ("6", "6"), ("7", "7"), ("6.3", "6.3"), ("Báo lỗi", "An error")),
    mc("tin10-b18-mc-09", 2, "Bạn Lan nhập 5 cho x = input(\"x: \"). Lệnh tiếp theo print(2 * x) in ra gì?", "Lan enters 5 for x = input(\"x: \"). What does print(2 * x) print?",
       "x là xâu '5'; 2 * '5' lặp xâu hai lần nên in 55 (xâu), không phải 10.", "x is the string '5'; 2 * '5' repeats it twice and prints 55 (a string), not 10.", "B",
       ("10", "10"), ("55", "55"), ("2.5", "2.5"), ("Báo lỗi", "An error")),
    mc("tin10-b18-mc-10", 2, "Lệnh print(\"m\" + 3 * \"k\") in ra gì?", "What does print(\"m\" + 3 * \"k\") print?",
       "3 * \"k\" là 'kkk' (nhân trước), rồi nối với 'm' được mkkk.", "3 * \"k\" is 'kkk' (multiplication first), and joining with 'm' gives mkkk.", "D",
       ("mmmk", "mmmk"), ("m3k", "m3k"), ("kkkm", "kkkm"), ("mkkk", "mkkk")),
    mc("tin10-b18-mc-11", 2, "Biểu thức 13 != 8 + 5 có kiểu và giá trị nào?", "What are the type and value of 13 != 8 + 5?",
       "8 + 5 = 13 nên 13 != 13 sai: kiểu bool, giá trị False.", "8 + 5 = 13 so 13 != 13 is false: type bool, value False.", "C",
       ("int, 13", "int, 13"), ("str, '13'", "str, '13'"), ("bool, False", "bool, False"), ("bool, True", "bool, True")),
    mc("tin10-b18-mc-12", 3, "Nhập 4, 6, 3.5 vào chương trình a = float(input()), b = float(input()), h = float(input()), print((a + b) * h / 2). Chương trình in gì?", "Enter 4, 6, 3.5 into the program a = float(input()), b = float(input()), h = float(input()), print((a + b) * h / 2). What does it print?",
       "(4.0 + 6.0) * 3.5 = 35.0, chia 2 được 17.5.", "(4.0 + 6.0) * 3.5 = 35.0, divided by 2 is 17.5.", "A",
       ("17.5", "17.5"), ("35.0", "35.0"), ("21.0", "21.0"), ("Báo lỗi", "An error")),
]

truefalse = [
    tf("tin10-b18-tf-01", 1, "Xét lệnh input() và print().", "Consider input() and print().",
       "input() luôn trả về xâu, kể cả khi người dùng gõ số; print() in được nhiều giá trị khác kiểu.", "input() always returns a string even when the user types a number; print() can print several values of different types.",
       ("input() luôn trả về một xâu kí tự.", "input() always returns a string.", True),
       ("Gõ 12 cho input() thì nhận được số nguyên 12 kiểu int.", "Typing 12 into input() gives the integer 12 of type int.", False),
       ("print() có thể in nhiều giá trị thuộc kiểu khác nhau.", "print() can print several values of different types.", True),
       ("Cú pháp lệnh nhập là <biến> = input(<dòng thông báo>).", "The input syntax is <variable> = input(<prompt>).", True)),
    tf("tin10-b18-tf-02", 2, "Xét các lệnh chuyển kiểu.", "Consider the conversion commands.",
       "int(\"1110\") là 1110; float(\"15.0\") là 15.0; str(150) là '150'; int(\"12.0\") báo lỗi.", "int(\"1110\") is 1110; float(\"15.0\") is 15.0; str(150) is '150'; int(\"12.0\") raises an error.",
       ("int(\"1110\") trả về số 1110.", "int(\"1110\") returns the number 1110.", True),
       ("float(\"15.0\") trả về số thực 15.0.", "float(\"15.0\") returns the real number 15.0.", True),
       ("int(\"12.0\") trả về số nguyên 12.", "int(\"12.0\") returns the integer 12.", False),
       ("str(150) trả về xâu '150'.", "str(150) returns the string '150'.", True)),
    tf("tin10-b18-tf-03", 2, "Xét kiểu dữ liệu của một số biểu thức.", "Consider the data types of some expressions.",
       "So sánh cho kiểu bool; xâu trong dấu nháy là str và không tự tính ra kết quả.", "Comparisons give bool; a string in quotes is str and is not evaluated.",
       ("32 > 45 có kiểu bool, giá trị False.", "32 > 45 has type bool, value False.", True),
       ("13 != 8 + 5 có giá trị True.", "13 != 8 + 5 has the value True.", False),
       ("\"15 + 20 - 7\" là xâu kí tự, Python không tự tính ra 28.", "\"15 + 20 - 7\" is a string; Python does not evaluate it to 28.", True),
       ("1 == 2 có giá trị True.", "1 == 2 has the value True.", False)),
    tf("tin10-b18-tf-04", 2, "Xét việc nhập số và các lệnh chuyển kiểu.", "Consider reading numbers and the conversion commands.",
       "Nhập số thực dùng float(input()); với x = '5' thì 2 * x là '55'; float(123) là 123.0 không lỗi; int(4.3 + 2) là 6.", "Read a real number with float(input()); with x = '5', 2 * x is '55'; float(123) is 123.0 with no error; int(4.3 + 2) is 6.",
       ("Muốn nhập số thực cần dùng float(input()).", "To read a real number use float(input()).", True),
       ("Nếu x = input() nhận 5 thì print(2 * x) in ra 10.", "If x = input() receives 5 then print(2 * x) prints 10.", False),
       ("float(123) báo lỗi.", "float(123) raises an error.", False),
       ("int(4.3 + 2) cho kết quả 6.", "int(4.3 + 2) gives 6.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
