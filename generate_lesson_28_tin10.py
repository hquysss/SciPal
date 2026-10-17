# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_28_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "pham-vi-cua-bien-bai-28-tin10"
title_vi = "Bài 28. Phạm vi của biến"
title_en = "Lesson 28. The scope of a variable"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nêu được **phạm vi** của một biến: biến đó dùng được ở những đâu trong chương trình;\n- phân biệt **biến địa phương** (cục bộ) khai báo trong hàm và biến khai báo ngoài hàm;\n- dùng từ khoá **`global`** để một hàm thay đổi được biến ngoài hàm;\n- đọc được bảng biến của chương trình có hàm, nhận ra lỗi `NameError` và `UnboundLocalError`.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- explain the **scope** of a variable: where in the program it can be used;\n- tell a **local variable** declared inside a function from a variable declared outside;\n- use the **`global`** keyword so a function can change a variable defined outside it;\n- read the variable table of a program with functions and recognise `NameError` and `UnboundLocalError`.",
    ),
    T(
        "### 1. Phạm vi của biến khai báo trong hàm\n\nMỗi lần một hàm được gọi, Python dành cho hàm đó một **vùng nhớ riêng**. Các biến được gán giá trị **bên trong hàm** (kể cả các **tham số**) chỉ nằm trong vùng nhớ này: chúng được tạo ra khi hàm bắt đầu chạy và **mất đi khi hàm kết thúc**. Những biến như vậy gọi là **biến địa phương**, hay **biến cục bộ**.\n\n- Biến địa phương chỉ dùng được **bên trong hàm** đã khai báo ra nó; chương trình chính không dùng được.\n- Nếu ngoài hàm có biến **cùng tên**, hai biến vẫn là **hai biến khác nhau**: sau khi hàm chạy xong, biến ngoài hàm **không thay đổi**.\n- Nếu ngoài hàm chưa có biến đó mà vẫn gọi tên nó, Python báo lỗi `NameError`.\n\nHãy bấm chạy các mô phỏng bên dưới: cột **khung** (frame) cho thấy rõ biến nào nằm trong `<module>` (chương trình chính) và biến nào nằm trong hàm.",
        "### 1. Scope of a variable declared inside a function\n\nEach time a function is called, Python gives it its **own area of memory**. Variables assigned **inside the function** (including its **parameters**) live only there: they are created when the function starts and **disappear when it ends**. Such variables are called **local variables**.\n\n- A local variable can be used only **inside the function** that declares it; the main program cannot use it.\n- If a variable with the **same name** exists outside, they are still **two different variables**: after the function finishes, the outer variable is **unchanged**.\n- If nothing outside has that name and you still use it, Python reports `NameError`.\n\nRun the simulations below: the **frame** panel shows which variables belong to `<module>` (the main program) and which belong to the function.",
    ),
    trace_block(
        sim("Tham số là biến địa phương", "Parameters are local variables", "x, y chỉ có trong hàm f; a, b ở chương trình chính vẫn là 1 và 2.", "x and y exist only inside f; a and b in the main program are still 1 and 2."),
        """def f(x, y):
    x = x * 2
    y = y * 2
    return x + y
a = 1
b = 2
kq = f(a, b)
print(a, b, kq)""",
    ),
    trace_block(
        sim("Biến địa phương không dùng được bên ngoài hàm", "A local variable cannot be used outside", "Sau khi hàm kết thúc, biến n biến mất; dòng cuối báo NameError.", "After the function ends, n is gone; the last line reports NameError."),
        """def tinh():
    n = 5
    print("Trong hàm: n =", n)
tinh()
print(n)""",
    ),
    trace_block(
        sim("Hai biến cùng tên n", "Two variables named n", "n trong hàm g là biến riêng (bằng 1); n ở chương trình chính vẫn bằng 100.", "n inside g is its own variable (1); n in the main program is still 100."),
        """n = 100
def g():
    n = 1
    return n * 2
kq = g()
print(kq, n)""",
    ),
    T(
        "### Hai khung nhớ: chương trình chính và hàm\n\nKhi chạy, Python giữ biến trong các **khung** (frame):\n\n- khung **`<module>`** chứa các biến của chương trình chính (còn gọi là phạm vi **toàn cục**);\n- mỗi lần gọi hàm lại có thêm một khung của hàm, chứa **tham số** và các biến gán trong hàm (phạm vi **địa phương**).\n\nKhi hàm chạy xong, khung của hàm bị bỏ đi cùng mọi biến địa phương. Đó là lí do `print(n)` ở ví dụ trên báo `NameError`: tên `n` không còn ở khung nào cả.\n\nCách nhớ: *tên được tìm trước trong khung của hàm, rồi mới tìm ở khung chương trình chính*.",
        "### Two memory frames: the main program and a function\n\nWhile running, Python keeps variables in **frames**:\n\n- the **`<module>`** frame holds the variables of the main program (the **global** scope);\n- each function call adds a frame for the function, holding its **parameters** and the variables assigned in it (the **local** scope).\n\nWhen the function finishes, its frame is dropped together with every local variable. That is why `print(n)` in the example above raises `NameError`: the name `n` is in no frame any more.\n\nRule of thumb: *a name is looked up first in the function's frame, then in the main program's frame*.",
    ),
    T(
        "### 2. Phạm vi của biến khai báo ngoài hàm\n\nBiến được gán giá trị ở **chương trình chính** (ngoài mọi hàm) có thể được **đọc** bên trong hàm.\n\n```python\na = 10\ndef f():\n    return a + 5   # chỉ đọc a\nprint(f())          # 15\n```\n\nNhưng nếu trong hàm có **lệnh gán** cho tên đó (ví dụ `a = a + 1`) thì Python coi `a` là **biến địa phương** của hàm. Khi đó vế phải `a + 1` đọc một biến địa phương chưa có giá trị và Python báo lỗi `UnboundLocalError`. Vì vậy:\n\n> Muốn hàm **thay đổi** biến ở ngoài hàm, đầu hàm phải khai báo lại biến đó với từ khoá **`global`**. Khi đó biến ngoài hàm trở thành **biến tổng thể**: dùng được cả bên ngoài và bên trong hàm.\n\n```python\nx = 3\ndef f():\n    global x\n    x = x + 2\nf()\nprint(x)   # 5\n```",
        "### 2. Scope of a variable declared outside a function\n\nA variable assigned in the **main program** (outside every function) can be **read** inside a function.\n\n```python\na = 10\ndef f():\n    return a + 5   # only reads a\nprint(f())          # 15\n```\n\nBut if the function **assigns** to that name (for example `a = a + 1`), Python treats `a` as a **local variable** of the function. The right side `a + 1` then reads a local variable with no value yet, and Python reports `UnboundLocalError`. So:\n\n> To let a function **change** a variable defined outside it, declare that variable again at the top of the function with the keyword **`global`**. The outer variable then becomes a **global variable**: usable both outside and inside the function.\n\n```python\nx = 3\ndef f():\n    global x\n    x = x + 2\nf()\nprint(x)   # 5\n```",
    ),
    trace_block(
        sim("Hàm chỉ đọc biến ngoài hàm", "A function only reads an outer variable", "f đọc a = 10 và trả về 15; a vẫn bằng 10.", "f reads a = 10 and returns 15; a is still 10."),
        """a = 10
def f():
    return a + 5
kq = f()
print(kq, a)""",
    ),
    T(
        "Hãy thử một chương trình có lệnh `x = x + 2` **trong hàm** nhưng **không có** `global`. Quan sát bước cuối: hàm chưa kịp đọc được giá trị nào của `x` thì Python đã báo lỗi, vì ngay khi thấy lệnh gán, Python xếp `x` vào **biến địa phương** của hàm.",
        "Try a program with the statement `x = x + 2` **inside a function** but **without** `global`. Watch the last step: the function has not read any value of `x` before Python reports an error, because as soon as it sees the assignment Python files `x` among the function's **local variables**.",
    ),
    trace_block(
        sim("Gán cho biến ngoài mà thiếu global", "Assigning to an outer variable without global", "Có lệnh gán x = x + 2 trong hàm nên x là biến địa phương chưa có giá trị: UnboundLocalError.", "The assignment x = x + 2 makes x local with no value yet: UnboundLocalError."),
        """x = 3
def f():
    x = x + 2
f()
print(x)""",
    ),
    trace_block(
        sim("Dùng global để đổi biến ngoài hàm", "Using global to change an outer variable", "Có global x, hàm đổi chính biến x ở chương trình chính: x thành 5.", "With global x the function changes the main program's x itself: x becomes 5."),
        """x = 3
def f():
    global x
    x = x + 2
f()
print(x)""",
    ),
    T(
        "### 3. Thực hành: hàm trả về danh sách\n\nViết **hàm** với đầu vào là danh sách `A` các số và một số `x`; hàm trả lại danh sách `B` chỉ gồm các phần tử của `A` lớn hơn hoặc bằng `x`.\n\n- `B` được tạo **bên trong hàm** nên là biến địa phương; hàm phải `return B` thì chương trình chính mới nhận được kết quả.\n- Chương trình chính cũng có biến tên `B`, nhưng đó là biến khác: hãy nhìn hai khung trong mô phỏng.\n\nCác nhiệm vụ khác của bài thực hành (đổi một xâu thành chữ hoa, chữ thường hay viết hoa chữ cái đầu mỗi từ theo tham số `c`; nhập dãy số, rồi tách ra các số dương và số âm bằng các hàm riêng) dựng theo cùng cách: **mỗi việc một hàm, nhận dữ liệu qua tham số và trả kết quả bằng `return`**.",
        "### 3. Practice: a function that returns a list\n\nWrite a **function** whose input is a list `A` of numbers and a number `x`; it returns a list `B` containing only the elements of `A` that are greater than or equal to `x`.\n\n- `B` is created **inside the function**, so it is a local variable; the function must `return B` for the main program to receive the result.\n- The main program also has a variable named `B`, but it is a different variable: look at the two frames in the simulation.\n\nThe other tasks of the practice (turn a string into upper case, lower case or capitalised words according to a parameter `c`; read a sequence of numbers and split out the positives and negatives with separate functions) are built the same way: **one function per job, data in through parameters, the result out with `return`**.",
    ),
    trace_block(
        sim("Lọc các phần tử lớn hơn hoặc bằng x", "Keep elements greater than or equal to x", "B trong hàm là biến địa phương; kết quả được return rồi gán cho B ở chương trình chính.", "B inside the function is local; the result is returned and assigned to B in the main program."),
        """def loc(A, x):
    B = []
    for v in A:
        if v >= x:
            B.append(v)
    return B
A = [3, 8, 1, 9, 5]
B = loc(A, 5)
print(B)""",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Biến địa phương | gán trong hàm (kể cả tham số); mất khi hàm kết thúc |\n| Dùng ngoài hàm | báo `NameError` nếu ngoài hàm không có biến cùng tên |\n| Trùng tên | biến trong hàm và biến ngoài hàm là **hai biến khác nhau** |\n| Đọc biến ngoài hàm | được, không cần khai báo gì thêm |\n| Đổi biến ngoài hàm | phải có `global` ở đầu hàm; thiếu thì `UnboundLocalError` |\n| Biến tổng thể | biến ngoài hàm đã khai báo `global` trong hàm, dùng được ở cả hai nơi |\n\n**Tự kiểm tra:** với `t = 0` ngoài hàm và hàm `def them(k): global t; t = t + k`, sau `them(3)` rồi `them(4)` giá trị của `t` là bao nhiêu? (đáp án: 7). Nếu bỏ dòng `global t` thì chuyện gì xảy ra? (đáp án: lỗi `UnboundLocalError`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Local variable | assigned in a function (parameters included); gone when the function ends |\n| Used outside | `NameError` if nothing outside has the same name |\n| Same name | the variable in the function and the one outside are **two different variables** |\n| Reading an outer variable | allowed, nothing extra needed |\n| Changing an outer variable | needs `global` at the top of the function; without it, `UnboundLocalError` |\n| Global variable | an outer variable declared `global` in a function, usable in both places |\n\n**Self-check:** with `t = 0` outside and the function `def add(k): global t; t = t + k`, what is `t` after `add(3)` then `add(4)`? (answer: 7). What happens if the line `global t` is removed? (answer: an `UnboundLocalError`).",
    ),
]

questions = [
    mc("tin10-b28-mc-01", 1, "Biến được khai báo bên trong một hàm (không dùng từ khoá global) có phạm vi như thế nào?", "What is the scope of a variable declared inside a function (without the global keyword)?",
       "Biến đó là biến địa phương nên chỉ dùng được bên trong hàm đã khai báo ra nó.", "It is a local variable, so it can be used only inside the function that declares it.", "B",
       ("Dùng được ở mọi nơi trong chương trình", "Usable anywhere in the program"), ("Chỉ dùng được trong hàm đó", "Usable only inside that function"), ("Chỉ dùng được trong chương trình chính", "Usable only in the main program"), ("Dùng được trong mọi hàm khác", "Usable in every other function")),
    mc("tin10-b28-mc-02", 1, "Biến địa phương còn được gọi là gì?", "What else is a local variable called?",
       "Biến khai báo trong hàm gọi là biến địa phương, hay biến cục bộ.", "A variable declared in a function is called a local variable.", "C",
       ("Biến tổng thể", "Global variable"), ("Biến hằng", "Constant"), ("Biến cục bộ", "Local variable"), ("Biến toàn chương trình", "Program-wide variable")),
    mc("tin10-b28-mc-03", 1, "Từ khoá nào cho phép một hàm thay đổi biến đã khai báo ở ngoài hàm?", "Which keyword lets a function change a variable declared outside it?",
       "Khai báo lại biến trong hàm với từ khoá global thì biến ngoài hàm trở thành biến tổng thể.", "Declaring the variable again in the function with global makes the outer variable a global one.", "D",
       ("local", "local"), ("public", "public"), ("static", "static"), ("global", "global")),
    mc("tin10-b28-mc-04", 2, "Cho def f(): x = 5 rồi return x. Sau khi gọi f(), lệnh print(x) ở chương trình chính cho kết quả gì?", "Given def f(): x = 5 then return x. After calling f(), what does print(x) in the main program give?",
       "x là biến địa phương của f và đã mất khi hàm kết thúc, nên print(x) báo NameError.", "x is local to f and gone once the function ends, so print(x) raises NameError.", "A",
       ("Báo lỗi NameError", "A NameError"), ("In ra 5", "Prints 5"), ("In ra 0", "Prints 0"), ("In ra None", "Prints None")),
    mc("tin10-b28-mc-05", 2, "Cho a = 10 ở chương trình chính và hàm def f(): return a + 5. Lệnh print(f()) in ra gì?", "Given a = 10 in the main program and def f(): return a + 5, what does print(f()) print?",
       "Hàm chỉ đọc biến a ở ngoài hàm nên được phép: 10 + 5 = 15.", "The function only reads the outer variable a, which is allowed: 10 + 5 = 15.", "B",
       ("5", "5"), ("15", "15"), ("10", "10"), ("Báo lỗi", "An error")),
    mc("tin10-b28-mc-06", 2, "Cho x = 3 ở ngoài hàm; hàm def f(): global x rồi x = x + 2. Sau khi gọi f(), print(x) in ra gì?", "Given x = 3 outside; def f(): global x then x = x + 2. After calling f(), what does print(x) print?",
       "Có global nên hàm đổi chính biến x ngoài hàm: 3 + 2 = 5.", "With global the function changes the outer x itself: 3 + 2 = 5.", "C",
       ("3", "3"), ("2", "2"), ("5", "5"), ("Báo lỗi", "An error")),
    mc("tin10-b28-mc-07", 2, "Cho a = 1, b = 2 và def f(x, y): x = x * 2, y = y * 2, return x + y. Sau lệnh kq = f(a, b), print(a, b) in ra gì?", "Given a = 1, b = 2 and def f(x, y): x = x * 2, y = y * 2, return x + y. After kq = f(a, b), what does print(a, b) print?",
       "x và y là biến địa phương nhận bản sao giá trị của a và b; thay đổi chúng không làm a, b đổi.", "x and y are local variables holding copies of the values of a and b; changing them does not change a and b.", "D",
       ("2 4", "2 4"), ("6", "6"), ("1 4", "1 4"), ("1 2", "1 2")),
    mc("tin10-b28-mc-08", 2, "Có thể khai báo một biến bên trong hàm trùng tên với biến đã khai báo ngoài hàm không?", "Can you declare a variable inside a function with the same name as one declared outside?",
       "Được: hai biến cùng tên là hai biến khác nhau, biến ngoài hàm không bị ảnh hưởng.", "Yes: the two same-named variables are different, and the outer one is not affected.", "A",
       ("Được, đó là hai biến khác nhau", "Yes, they are two different variables"), ("Không, Python báo lỗi ngay", "No, Python reports an error at once"), ("Được, nhưng khi đó biến ngoài hàm bị xoá", "Yes, but the outer variable is deleted"), ("Chỉ được nếu dùng từ khoá local", "Only with the keyword local")),
    mc("tin10-b28-mc-09", 2, "Cho n = 100 ở chương trình chính; hàm def g(): n = 1 rồi return n. Sau kq = g(), giá trị của n ở chương trình chính là bao nhiêu?", "Given n = 100 in the main program and def g(): n = 1 then return n. After kq = g(), what is n in the main program?",
       "n trong g là biến địa phương nên n ở chương trình chính vẫn bằng 100.", "n inside g is local, so n in the main program is still 100.", "B",
       ("1", "1"), ("100", "100"), ("101", "101"), ("Báo lỗi", "An error")),
    mc("tin10-b28-mc-10", 2, "Biến địa phương của một hàm được tạo và mất đi vào lúc nào?", "When is a function's local variable created and when does it disappear?",
       "Biến địa phương được tạo khi hàm bắt đầu chạy và mất khi hàm kết thúc.", "A local variable is created when the function starts and disappears when it ends.", "C",
       ("Tạo khi mở chương trình, mất khi tắt máy", "Created when the program opens, gone when the computer is turned off"), ("Tạo khi định nghĩa hàm, mất khi gọi hàm", "Created when the function is defined, gone when it is called"), ("Tạo khi hàm bắt đầu chạy, mất khi hàm kết thúc", "Created when the function starts, gone when it ends"), ("Tạo khi hàm kết thúc, mất khi gọi lại", "Created when the function ends, gone when it is called again")),
    mc("tin10-b28-mc-11", 3, "Cho c = 1 ở ngoài hàm và def f(): c = c + 1. Điều gì xảy ra khi gọi f()?", "Given c = 1 outside and def f(): c = c + 1, what happens when f() is called?",
       "Lệnh gán làm c là biến địa phương của f, nhưng vế phải c + 1 đọc c khi nó chưa có giá trị: UnboundLocalError.", "The assignment makes c local to f, but the right side c + 1 reads c before it has a value: UnboundLocalError.", "D",
       ("c ngoài hàm trở thành 2", "The outer c becomes 2"), ("c vẫn bằng 1 và không báo lỗi", "c stays 1 and there is no error"), ("c ngoài hàm trở thành 0", "The outer c becomes 0"), ("Báo lỗi UnboundLocalError", "An UnboundLocalError is reported")),
    mc("tin10-b28-mc-12", 3, "Cho tong = 0 ở ngoài hàm và def them(k): global tong rồi tong = tong + k. Sau them(3) và them(4), print(tong) in ra gì?", "Given tong = 0 outside and def them(k): global tong then tong = tong + k. After them(3) and them(4), what does print(tong) print?",
       "Mỗi lần gọi cộng thêm vào chính biến tong ngoài hàm: 0 + 3 + 4 = 7.", "Each call adds to the outer variable tong itself: 0 + 3 + 4 = 7.", "A",
       ("7", "7"), ("4", "4"), ("3", "3"), ("0", "0")),
]

truefalse = [
    tf("tin10-b28-tf-01", 2, "Xét biến khai báo trong hàm.", "Consider variables declared inside a function.",
       "Biến trong hàm, kể cả tham số, là biến địa phương: chỉ dùng trong hàm và mất khi hàm kết thúc; được đặt trùng tên biến ngoài hàm.", "Variables in a function, parameters included, are local: usable only there and gone when it ends; they may share a name with an outer variable.",
       ("Biến khai báo trong hàm chỉ dùng được bên trong hàm đó.", "A variable declared in a function can be used only inside that function.", True),
       ("Tham số của hàm cũng là biến địa phương.", "A function's parameters are also local variables.", True),
       ("Sau khi hàm kết thúc, biến địa phương vẫn dùng được ở chương trình chính.", "After the function ends, its local variable is still usable in the main program.", False),
       ("Được đặt tên biến trong hàm trùng với tên một biến ngoài hàm.", "A variable inside a function may share a name with one outside.", True)),
    tf("tin10-b28-tf-02", 2, "Cho a = 10 ở chương trình chính và def f(): return a + 5.", "Given a = 10 in the main program and def f(): return a + 5.",
       "Hàm chỉ đọc a nên không cần global và không làm a thay đổi.", "The function only reads a, so global is not needed and a does not change.",
       ("Hàm f đọc được giá trị của a ở ngoài hàm.", "Function f can read the value of a outside it.", True),
       ("print(f()) in ra 15.", "print(f()) prints 15.", True),
       ("Sau khi gọi f(), biến a ở chương trình chính thành 15.", "After calling f(), a in the main program becomes 15.", False),
       ("Phải khai báo global a thì hàm mới đọc được a.", "global a is required before the function can read a.", False)),
    tf("tin10-b28-tf-03", 2, "Cho x = 3 ngoài hàm; def f(): global x rồi x = x + 2; sau đó gọi f() hai lần rồi print(x).", "Given x = 3 outside; def f(): global x then x = x + 2; then f() is called twice and print(x) runs.",
       "Có global nên mỗi lần gọi cộng 2 vào chính x ngoài hàm: 3 + 2 + 2 = 7; bỏ global thì lỗi UnboundLocalError.", "With global each call adds 2 to the outer x itself: 3 + 2 + 2 = 7; without global it is an UnboundLocalError.",
       ("Sau lần gọi thứ nhất, x bằng 5.", "After the first call x is 5.", True),
       ("print(x) cuối cùng in ra 7.", "The final print(x) prints 7.", True),
       ("Nếu bỏ dòng global x thì lệnh x = x + 2 vẫn chạy bình thường.", "Without the line global x the statement x = x + 2 still runs normally.", False),
       ("Với global x, biến x trong hàm là biến địa phương của hàm.", "With global x, the x in the function is a local variable of the function.", False)),
    tf("tin10-b28-tf-04", 3, "Cho n = 100 ngoài hàm; def g(): n = 1 rồi return n * 2; sau đó print(g()) và print(n).", "Given n = 100 outside; def g(): n = 1 then return n * 2; then print(g()) and print(n).",
       "n trong g là biến riêng: g() trả về 2, còn n ở chương trình chính giữ nguyên 100.", "n inside g is its own variable: g() returns 2 and n in the main program stays 100.",
       ("print(g()) in ra 2.", "print(g()) prints 2.", True),
       ("print(n) in ra 100.", "print(n) prints 100.", True),
       ("n trong hàm g và n ngoài hàm là cùng một biến.", "The n in g and the n outside are the same variable.", False),
       ("Lệnh n = 1 trong hàm g làm n ở chương trình chính bằng 1.", "The statement n = 1 inside g makes n in the main program equal to 1.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
