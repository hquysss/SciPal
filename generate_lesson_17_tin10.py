# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_17_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "bien-va-lenh-gan-bai-17-tin10"
title_vi = "Bài 17. Biến và lệnh gán"
title_en = "Lesson 17. Variables and the assignment statement"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nêu được **biến** là gì và viết được **lệnh gán**;\n- đặt tên biến đúng quy tắc và **phân biệt biến với từ khóa**;\n- dùng các phép toán trên số nguyên, số thực và xâu kí tự;\n- dùng lệnh gán đồng thời, ví dụ để hoán đổi giá trị hai biến.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- explain what a **variable** is and write an **assignment statement**;\n- name variables correctly and **tell variables from keywords**;\n- use the operators on integers, real numbers and strings;\n- use simultaneous assignment, for example to swap two variables.",
    ),
    T(
        "### 1. Biến và lệnh gán\n\nTrong Đại số ta dùng chữ thay cho số cụ thể, ví dụ $(a + b)^2 = a^2 + 2ab + b^2$ đúng với mọi $a, b$. Trong lập trình, **biến** cũng đóng vai trò như vậy.\n\n**Biến** là tên của một vùng nhớ dùng để lưu trữ giá trị (dữ liệu); giá trị này **có thể thay đổi** khi chương trình chạy.\n\n**Lệnh gán** có cú pháp:\n\n```python\n<biến> = <biểu thức>\n```\n\nMáy tính toán biểu thức bên phải trước, rồi lưu kết quả vào biến bên trái. Python **không cần khai báo kiểu** trước: kiểu của biến theo giá trị được gán, và một biến có thể nhận giá trị thuộc kiểu khác tại thời điểm khác. Dùng `type(x)` để xem kiểu của `x`.\n\n**Lệnh gán đồng thời** gán nhiều giá trị cho nhiều biến cùng lúc:\n\n```python\n<biến 1>, <biến 2>, ..., <biến n> = <giá trị 1>, <giá trị 2>, ..., <giá trị n>\n```\n\nSố biến bên trái phải bằng số giá trị bên phải.",
        "### 1. Variables and assignment\n\nIn algebra we use letters for concrete numbers, for example $(a + b)^2 = a^2 + 2ab + b^2$ holds for all $a, b$. In programming, a **variable** plays the same role.\n\nA **variable** is the name of a memory location used to store a value (data); this value **can change** while the program runs.\n\nThe **assignment statement** has the syntax:\n\n```python\n<variable> = <expression>\n```\n\nThe computer evaluates the right-hand expression first and then stores the result in the left-hand variable. Python **needs no type declaration**: the type of a variable follows the assigned value, and a variable may receive a value of another type at another time. Use `type(x)` to see the type of `x`.\n\n**Simultaneous assignment** assigns several values to several variables at once:\n\n```python\n<variable 1>, <variable 2>, ..., <variable n> = <value 1>, <value 2>, ..., <value n>\n```\n\nThe number of variables on the left must equal the number of values on the right.",
    ),
    trace_block(
        sim("Biến đổi giá trị và kiểu", "A variable changes value and type", "Cùng biến n lần lượt nhận số nguyên, số thực, xâu kí tự; type() cho biết kiểu hiện tại.", "The same variable n receives an integer, a real number and a string; type() shows its current type."),
        """n = 5
print(n, type(n))
n = 2.5
print(n, type(n))
n = "Python"
print(n, type(n))""",
    ),
    T(
        "**Quy tắc đặt tên biến:**\n\n- chỉ gồm chữ cái tiếng Anh, chữ số từ 0 đến 9 và dấu gạch dưới `_`;\n- **không bắt đầu bằng chữ số**;\n- **phân biệt chữ hoa và chữ thường** (`ten` và `Ten` là hai biến khác nhau).\n\nVí dụ: `_name`, `xyzABC`, `tong1` hợp lệ; `12abc`, `My country`, `m123&b` không hợp lệ. Nên đặt tên gợi nhớ để mã nguồn dễ đọc.",
        "**Rules for naming variables:**\n\n- only English letters, digits 0 to 9 and the underscore `_`;\n- **must not start with a digit**;\n- **case-sensitive** (`ten` and `Ten` are two different variables).\n\nExamples: `_name`, `xyzABC`, `tong1` are valid; `12abc`, `My country`, `m123&b` are not. Prefer meaningful names so the code is easy to read.",
    ),
    trace_block(
        sim("Lệnh gán đồng thời: hoán đổi x và y", "Simultaneous assignment: swapping x and y", "Vế phải x, y = y, x được tính xong rồi mới gán, nên hai biến đổi chỗ cho nhau.", "The right side of x, y = y, x is evaluated first and then assigned, so the two variables swap."),
        """x, y = 10, 7
print("Trước:", x, y)
x, y = y, x
print("Sau:", x, y)""",
    ),
    T(
        "### 2. Các phép toán trên một số kiểu dữ liệu cơ bản\n\n**Với số:** cộng `+`, trừ `-`, nhân `*`, chia `/`, chia lấy phần nguyên `//`, chia lấy phần dư `%`, lũy thừa `**`.\n\n| Phép tính | Kết quả |\n|---|---|\n| `17 / 5` | `3.4` (luôn là số thực) |\n| `17 // 5` | `3` |\n| `17 % 5` | `2` |\n| `2 ** 3` | `8` |\n\nThứ tự ưu tiên như trong toán: `**` trước, rồi `*`, `/`, `//`, `%`, rồi `+`, `-`; biểu thức trong ngoặc được tính trước. Nhân với số phải viết dấu `*` (viết `(x + y) * (x + y)`, không viết `(x + y)(x + y)`).\n\n**Với xâu kí tự:** chỉ có hai phép: `+` **nối** hai xâu, `*` **lặp** xâu nhiều lần. Ví dụ `\"Tin\" * 3` cho `'TinTinTin'`. Cộng số với xâu, như `12 + \"A\"`, báo lỗi **TypeError**.",
        "### 2. Operations on some basic data types\n\n**On numbers:** add `+`, subtract `-`, multiply `*`, divide `/`, integer quotient `//`, remainder `%`, power `**`.\n\n| Expression | Result |\n|---|---|\n| `17 / 5` | `3.4` (always a real number) |\n| `17 // 5` | `3` |\n| `17 % 5` | `2` |\n| `2 ** 3` | `8` |\n\nPrecedence is as in maths: `**` first, then `*`, `/`, `//`, `%`, then `+`, `-`; parentheses first. A product needs the `*` sign (write `(x + y) * (x + y)`, not `(x + y)(x + y)`).\n\n**On strings:** only two operations: `+` **joins** two strings, `*` **repeats** a string. For example `\"Tin\" * 3` gives `'TinTinTin'`. Adding a number and a string, such as `12 + \"A\"`, raises a **TypeError**.",
    ),
    trace_block(
        sim("Các phép toán với số", "Operators on numbers", "Cùng hai số 17 và 5: so sánh kết quả của /, //, % và **.", "With the same numbers 17 and 5: compare the results of /, //, % and **."),
        """a = 17
b = 5
print(a + b, a - b, a * b)
print(a / b)
print(a // b)
print(a % b)
print(a ** 2)""",
    ),
    trace_block(
        sim("Phép toán với xâu kí tự", "Operators on strings", "Dấu + nối xâu, dấu * lặp xâu; kết quả luôn là xâu kí tự.", "+ joins strings and * repeats a string; the result is always a string."),
        """s = "0" + "1" + "0"
t = "1" + "0" * 6
u = "Tin" * 3
print(s)
print(t)
print(u)""",
    ),
    trace_block(
        sim("Cộng số với xâu gây lỗi", "Adding a number to a string causes an error", "Bước cuối báo TypeError: Python không cộng được số nguyên với xâu kí tự.", "The last step shows a TypeError: Python cannot add an integer to a string."),
        """so = 12
xau = "A"
print(so + xau)""",
    ),
    T(
        "### 3. Từ khóa\n\n**Từ khóa** là các từ đặc biệt tham gia vào cấu trúc của ngôn ngữ lập trình, ví dụ `if`, `else`, `for`, `while`, `def`, `return`, `import`, `with`, `global`, `nonlocal`, `and`, `or`, `not`, `True`, `False`, `None`. **Không được đặt tên biến trùng với từ khóa**, nếu không Python báo lỗi cú pháp.\n\nTất cả từ khóa đều viết chữ thường, trừ ba từ `True`, `False`, `None` bắt đầu bằng chữ hoa. Vì vậy `true` **không phải** từ khóa và dùng làm tên biến được; `_if` cũng hợp lệ vì khác `if`.\n\n**Phân biệt:** biến do người lập trình đặt tên và đổi được giá trị; từ khóa do ngôn ngữ quy định và có ý nghĩa cố định.",
        "### 3. Keywords\n\n**Keywords** are special words that take part in the structure of a programming language, for example `if`, `else`, `for`, `while`, `def`, `return`, `import`, `with`, `global`, `nonlocal`, `and`, `or`, `not`, `True`, `False`, `None`. **A variable name must not equal a keyword**, otherwise Python reports a syntax error.\n\nAll keywords are lower case except `True`, `False`, `None`, which start with a capital. So `true` is **not** a keyword and can be a variable name; `_if` is also valid because it differs from `if`.\n\n**The difference:** a variable is named by the programmer and its value can change; a keyword is fixed by the language and has a fixed meaning.",
    ),
    T(
        "### 4. Thực hành: tính toán với biến\n\n**Nhiệm vụ 1.** Tính trong Python rồi so sánh với tính tay:\n\n- $(1 + 2 + 3 + \\dots + 10)^3$;\n- với `x = 2`, `y = 5`: giá trị của $(x + y)(x^2 + y^2 - 1)$;\n- với `a = 2`, `b = 3`, `c = 4`: giá trị của $(a + b + c)(a + b - c)$.\n\n**Nhiệm vụ 2.** Gán giá trị cho biến `R` (bán kính hình tròn) rồi tính và in chu vi $2\\pi R$ và diện tích $\\pi R^2$. Với `R = 3` và $\\pi \\approx 3{,}14$, chu vi là `18.84`, diện tích là `28.26`.",
        "### 4. Practice: calculating with variables\n\n**Task 1.** Compute in Python and compare with hand calculation:\n\n- $(1 + 2 + 3 + \\dots + 10)^3$;\n- with `x = 2`, `y = 5`: the value of $(x + y)(x^2 + y^2 - 1)$;\n- with `a = 2`, `b = 3`, `c = 4`: the value of $(a + b + c)(a + b - c)$.\n\n**Task 2.** Assign a value to the variable `R` (radius of a circle), then compute and print the circumference $2\\pi R$ and the area $\\pi R^2$. With `R = 3` and $\\pi \\approx 3.14$ the circumference is `18.84` and the area is `28.26`.",
    ),
    trace_block(
        sim("Nhiệm vụ 1: tính giá trị biểu thức", "Task 1: evaluating expressions", "Viết đủ dấu * và ngoặc để biểu thức Python đúng như công thức toán.", "Write every * and parentheses so the Python expression matches the maths formula."),
        """x = 2
y = 5
print((x + y) * (x ** 2 + y ** 2 - 1))
a, b, c = 2, 3, 4
print((a + b + c) * (a + b - c))
print((1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10) ** 3)""",
    ),
    trace_block(
        sim("Nhiệm vụ 2: chu vi và diện tích hình tròn", "Task 2: circumference and area of a circle", "Chương trình gán R và pi rồi tính hai kết quả từ các biến.", "The program assigns R and pi and computes two results from the variables."),
        """R = 3
pi = 3.14
chu_vi = 2 * pi * R
dien_tich = pi * R ** 2
print("Chu vi hình tròn:", chu_vi)
print("Diện tích hình tròn:", dien_tich)""",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Biến | tên vùng nhớ lưu giá trị, đổi được khi chạy |\n| Lệnh gán | `<biến> = <biểu thức>`; vế phải tính trước |\n| Gán đồng thời | `x, y = y, x` hoán đổi hai biến |\n| Tên biến | chữ cái, chữ số, `_`; không bắt đầu bằng số; phân biệt hoa thường |\n| Phép toán số | `+ - * / // % **` |\n| Phép toán xâu | `+` nối, `*` lặp |\n| Từ khóa | không dùng làm tên biến; `True`, `False`, `None` viết hoa chữ đầu |\n\n**Tự kiểm tra:** sau `x = 5`, `x = x + 2`, `x = x * 3` thì `x` bằng bao nhiêu? (đáp án: `21`). `17 // 5` và `17 % 5` bằng bao nhiêu? (đáp án: `3` và `2`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Variable | name of a memory location that stores a value, can change at run time |\n| Assignment | `<variable> = <expression>`; the right side is evaluated first |\n| Simultaneous assignment | `x, y = y, x` swaps two variables |\n| Variable names | letters, digits, `_`; not starting with a digit; case-sensitive |\n| Number operators | `+ - * / // % **` |\n| String operators | `+` joins, `*` repeats |\n| Keywords | not usable as variable names; `True`, `False`, `None` start with a capital |\n\n**Self-check:** after `x = 5`, `x = x + 2`, `x = x * 3`, what is `x`? (answer: `21`). What are `17 // 5` and `17 % 5`? (answer: `3` and `2`).",
    ),
]

questions = [
    mc("tin10-b17-mc-01", 1, "Trong Python, phát biểu nào đúng về biến?", "In Python, which statement about variables is correct?",
       "Biến là tên của vùng nhớ lưu trữ giá trị; giá trị đó có thể thay đổi khi chương trình chạy.", "A variable is the name of a memory location that stores a value; the value can change while the program runs.", "A",
       ("Là tên lưu trữ giá trị, giá trị có thể đổi khi chạy", "It is a name storing a value, which can change at run time"), ("Biến chỉ lưu được số nguyên", "A variable can only store integers"), ("Biến phải khai báo kiểu trước khi dùng", "A variable must be declared with a type before use"), ("Mỗi biến chỉ được gán giá trị một lần", "A variable can be assigned only once")),
    mc("tin10-b17-mc-02", 1, "Tên nào dưới đây là tên biến hợp lệ trong Python?", "Which of the following is a valid variable name in Python?",
       "_count chỉ gồm gạch dưới, chữ cái, không bắt đầu bằng chữ số. 2x bắt đầu bằng số, x-y chứa dấu trừ, if là từ khóa.", "_count has only an underscore and letters and does not start with a digit. 2x starts with a digit, x-y has a minus sign, if is a keyword.", "C",
       ("2x", "2x"), ("x-y", "x-y"), ("_count", "_count"), ("if", "if")),
    mc("tin10-b17-mc-03", 1, "Sau các lệnh x = 4, y = 2, z = x ** y thì z bằng bao nhiêu?", "After x = 4, y = 2, z = x ** y, what is z?",
       "** là phép lũy thừa: 4 ** 2 = 16.", "** is the power operator: 4 ** 2 = 16.", "B",
       ("6", "6"), ("16", "16"), ("8", "8"), ("64", "64")),
    mc("tin10-b17-mc-04", 1, "Kết quả của \"Tin\" * 3 là gì?", "What is the result of \"Tin\" * 3?",
       "Dấu * với xâu và số nguyên lặp xâu 3 lần, cho 'TinTinTin' (không có dấu cách).", "* with a string and an integer repeats the string 3 times, giving 'TinTinTin' (no spaces).", "D",
       ("'Tin3'", "'Tin3'"), ("'Tin Tin Tin'", "'Tin Tin Tin'"), ("Báo lỗi", "An error"), ("'TinTinTin'", "'TinTinTin'")),
    mc("tin10-b17-mc-05", 2, "Phát biểu nào KHÔNG đúng về lệnh gán trong Python?", "Which statement about assignment in Python is NOT correct?",
       "Lệnh gán đồng thời cần số biến bên trái bằng số giá trị bên phải; nói hai số đó có thể khác nhau là sai.", "Simultaneous assignment needs the number of variables on the left to equal the number of values on the right; saying they may differ is wrong.", "D",
       ("Có thể gán cùng lúc nhiều biến với nhiều giá trị", "Several variables can be assigned several values at once"), ("Giá trị bên phải dấu = được tính trước khi gán", "The value right of = is computed before assigning"), ("Biểu thức bên phải có thể chứa các biến đã có giá trị", "The right expression may contain variables that already have values"), ("Số biến bên trái có thể khác số giá trị bên phải", "The number of variables on the left may differ from the number of values on the right")),
    mc("tin10-b17-mc-06", 2, "Kết quả của 17 // 5 là gì?", "What is the result of 17 // 5?",
       "// là chia lấy phần nguyên: 17 chia 5 được 3 dư 2, nên 17 // 5 bằng 3.", "// is the integer quotient: 17 divided by 5 is 3 remainder 2, so 17 // 5 is 3.", "A",
       ("3", "3"), ("2", "2"), ("3.4", "3.4"), ("4", "4")),
    mc("tin10-b17-mc-07", 2, "Kết quả của 17 % 5 là gì?", "What is the result of 17 % 5?",
       "% là chia lấy phần dư: 17 = 3 × 5 + 2 nên phần dư bằng 2.", "% is the remainder: 17 = 3 × 5 + 2, so the remainder is 2.", "C",
       ("3", "3"), ("3.4", "3.4"), ("2", "2"), ("12", "12")),
    mc("tin10-b17-mc-08", 2, "Sau n = 5 rồi n = \"abc\", điều nào đúng?", "After n = 5 and then n = \"abc\", which is true?",
       "Python không khai báo kiểu: biến n được gán lại và giờ chứa xâu kí tự, không báo lỗi.", "Python has no type declaration: n is reassigned and now holds a string, with no error.", "B",
       ("Python báo lỗi vì đổi kiểu", "Python reports an error for changing type"), ("n chứa xâu 'abc', không có lỗi", "n holds the string 'abc' with no error"), ("n vẫn bằng 5", "n is still 5"), ("n bằng 5abc", "n is 5abc")),
    mc("tin10-b17-mc-09", 2, "Sau x, y = 10, 7 rồi x, y = y, x thì x bằng bao nhiêu?", "After x, y = 10, 7 and then x, y = y, x, what is x?",
       "Lệnh x, y = y, x hoán đổi hai biến nên x = 7 và y = 10.", "x, y = y, x swaps the two variables, so x = 7 and y = 10.", "A",
       ("7", "7"), ("10", "10"), ("17", "17"), ("3", "3")),
    mc("tin10-b17-mc-10", 2, "Lệnh 12 + \"A\" trong Python cho kết quả gì?", "What does the command 12 + \"A\" give in Python?",
       "Python không cộng được số nguyên với xâu kí tự nên báo TypeError.", "Python cannot add an integer to a string, so it raises a TypeError.", "C",
       ("'12A'", "'12A'"), ("13", "13"), ("Báo lỗi TypeError", "A TypeError"), ("Báo lỗi NameError", "A NameError")),
    mc("tin10-b17-mc-11", 2, "Tên nào KHÔNG thể dùng làm tên biến vì là từ khóa của Python?", "Which name cannot be used as a variable because it is a Python keyword?",
       "return là từ khóa. true (viết thường), _if và nolocal không phải từ khóa nên dùng được; từ khóa đúng là True và nonlocal.", "return is a keyword. true (lower case), _if and nolocal are not keywords so they are allowed; the real keywords are True and nonlocal.", "D",
       ("true", "true"), ("_if", "_if"), ("nolocal", "nolocal"), ("return", "return")),
    mc("tin10-b17-mc-12", 3, "Sau các lệnh x = 5, x = x + 2, x = x * 3 thì x bằng bao nhiêu?", "After x = 5, x = x + 2, x = x * 3, what is x?",
       "x = 5; x = 5 + 2 = 7; x = 7 * 3 = 21. Vế phải luôn dùng giá trị x hiện tại.", "x = 5; x = 5 + 2 = 7; x = 7 * 3 = 21. The right side always uses the current value of x.", "B",
       ("11", "11"), ("21", "21"), ("15", "15"), ("7", "7")),
]

truefalse = [
    tf("tin10-b17-tf-01", 1, "Xét quy tắc đặt tên biến trong Python.", "Consider the rules for naming variables in Python.",
       "Tên biến gồm chữ cái, chữ số, gạch dưới; không bắt đầu bằng số; phân biệt chữ hoa, chữ thường.", "Names use letters, digits and underscore; they cannot start with a digit; they are case-sensitive.",
       ("_name là tên biến hợp lệ.", "_name is a valid variable name.", True),
       ("12abc là tên biến hợp lệ.", "12abc is a valid variable name.", False),
       ("Ten và ten là hai biến khác nhau.", "Ten and ten are two different variables.", True),
       ("My country (có dấu cách) là tên biến hợp lệ.", "My country (with a space) is a valid variable name.", False)),
    tf("tin10-b17-tf-02", 1, "Xét lệnh gán và kiểu dữ liệu.", "Consider assignment and data types.",
       "Cú pháp lệnh gán là <biến> = <biểu thức>; Python không cần khai báo kiểu; biến gán lại được nhiều lần.", "The assignment syntax is <variable> = <expression>; Python needs no type declaration; a variable can be reassigned many times.",
       ("Cú pháp lệnh gán là <biến> = <biểu thức>.", "The assignment syntax is <variable> = <expression>.", True),
       ("Phải khai báo kiểu của biến trước khi gán giá trị.", "A variable's type must be declared before assigning a value.", False),
       ("Lệnh x, y = y, x hoán đổi giá trị của x và y.", "The command x, y = y, x swaps the values of x and y.", True),
       ("Một biến chỉ được gán giá trị đúng một lần.", "A variable may be assigned exactly once.", False)),
    tf("tin10-b17-tf-03", 2, "Xét các phép toán trên số với a = 17, b = 5.", "Consider the number operators with a = 17, b = 5.",
       "17 // 5 = 3, 17 % 5 = 2, 2 ** 3 = 8, còn 17 / 5 = 3.4 là số thực.", "17 // 5 = 3, 17 % 5 = 2, 2 ** 3 = 8, while 17 / 5 = 3.4 is real.",
       ("a // b có giá trị 3.", "a // b is 3.", True),
       ("a % b có giá trị 3.", "a % b is 3.", False),
       ("2 ** 3 có giá trị 8.", "2 ** 3 is 8.", True),
       ("a / b có giá trị nguyên 3.", "a / b is the integer 3.", False)),
    tf("tin10-b17-tf-04", 2, "Xét xâu kí tự và từ khóa.", "Consider strings and keywords.",
       "+ nối xâu, * lặp xâu; số cộng xâu gây TypeError; True, False, None viết hoa chữ đầu còn true thì không phải từ khóa.", "+ joins strings, * repeats; number plus string raises TypeError; True, False, None start with a capital and true is not a keyword.",
       ("\"Tin\" * 3 cho xâu 'TinTinTin'.", "\"Tin\" * 3 gives the string 'TinTinTin'.", True),
       ("12 + \"A\" báo lỗi TypeError.", "12 + \"A\" raises a TypeError.", True),
       ("True, False, None là các từ khóa viết hoa chữ cái đầu.", "True, False, None are keywords that start with a capital letter.", True),
       ("true (viết thường) là từ khóa của Python.", "true (lower case) is a Python keyword.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
