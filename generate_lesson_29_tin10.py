# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_29_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "nhan-biet-loi-chuong-trinh-bai-29-tin10"
title_vi = "Bài 29. Nhận biết lỗi chương trình"
title_en = "Lesson 29. Recognising program errors"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- phân biệt **ba loại lỗi** chương trình: lỗi cú pháp, lỗi ngoại lệ và lỗi khác (lỗi ngữ nghĩa, hay lỗi lôgic);\n- nhận ra một số **lỗi ngoại lệ** thường gặp của Python qua tên lỗi: `ZeroDivisionError`, `IndexError`, `NameError`, `TypeError`, `ValueError`, `IndentationError`, `SyntaxError`;\n- đọc thông báo lỗi để biết **dòng nào** và **vì sao** chương trình dừng;\n- dự đoán những dữ liệu nhập có thể làm chương trình sinh lỗi.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- tell the **three kinds of program error** apart: syntax errors, exceptions, and other errors (semantic or logic errors);\n- recognise common Python **exceptions** by name: `ZeroDivisionError`, `IndexError`, `NameError`, `TypeError`, `ValueError`, `IndentationError`, `SyntaxError`;\n- read an error message to see **which line** and **why** the program stopped;\n- predict which inputs can make a program raise an error.",
    ),
    T(
        "### 1. Nhận biết lỗi chương trình\n\nMột chương trình hoàn chỉnh nhận dữ liệu vào, xử lí theo yêu cầu bài toán rồi đưa ra kết quả. Lỗi có thể nằm ở từng khâu. Có thể chia thành **ba loại**:\n\n| Loại | Khi nào xuất hiện | Chương trình có dừng không? |\n|---|---|---|\n| **Lỗi cú pháp** | viết sai quy tắc của ngôn ngữ (thiếu dấu ngoặc, dấu `:`, thụt dòng sai…) | Python phát hiện **ngay khi đọc chương trình, trước khi chạy dòng nào**; chương trình không chạy |\n| **Lỗi ngoại lệ** | chương trình đang chạy gặp lệnh không thực hiện được (chia cho 0, chỉ số quá giới hạn, nhập sai dữ liệu…) | **dừng ngay** tại dòng lệnh đó và báo một **mã lỗi ngoại lệ** |\n| **Lỗi khác** (lỗi ngữ nghĩa, lỗi lôgic) | thuật toán hay lệnh viết sai ý định | **không dừng**, nhưng cho **kết quả sai** |\n\nVí dụ lỗi cú pháp: `print(\"Xin chao\"` (thiếu dấu ngoặc đóng). Python báo `SyntaxError` và không chạy chương trình.\n\nLoại thứ ba nguy hiểm nhất vì máy không báo gì: **chương trình chạy được chưa chắc là chương trình đúng**. Ví dụ bài toán sắp xếp dãy `[3, 1, 8, 10, 0]` tăng dần mà chương trình cho `[1, 3, 8, 10, 0]` là chương trình có lỗi ngữ nghĩa.",
        "### 1. Recognising program errors\n\nA complete program takes input, processes it as the problem requires, then outputs the result. An error can hide in any step. Errors fall into **three kinds**:\n\n| Kind | When it shows | Does the program stop? |\n|---|---|---|\n| **Syntax error** | breaking the rules of the language (a missing bracket or `:`, wrong indentation…) | Python spots it **when it reads the program, before running any line**; the program does not run |\n| **Exception** | the running program meets a command it cannot carry out (division by 0, index out of range, bad input…) | **stops at once** at that line and reports an **exception name** |\n| **Other errors** (semantic or logic errors) | an algorithm or command that does not do what was intended | **does not stop**, but gives a **wrong result** |\n\nExample of a syntax error: `print(\"Xin chao\"` (closing bracket missing). Python reports `SyntaxError` and does not run the program.\n\nThe third kind is the most dangerous because the machine says nothing: **a program that runs is not necessarily a correct program**. For example, a program that sorts `[3, 1, 8, 10, 0]` in increasing order and returns `[1, 3, 8, 10, 0]` has a semantic error.",
    ),
    trace_block(
        sim("Lỗi ngoại lệ: chia cho 0", "Exception: division by zero", "Nhập 12 và 0: các dòng trước vẫn chạy; đến dòng chia cho 0 chương trình dừng với ZeroDivisionError.", "Input 12 and 0: earlier lines run; at the division by zero the program stops with ZeroDivisionError."),
        """st = input("Nhập m và n: ")
ds = st.split()
m = int(ds[0])
n = int(ds[1])
print("Tổng:", m + n, "Hiệu:", m - n)
print("Thương:", m / n)""",
        ["12 0"],
    ),
    trace_block(
        sim("Lỗi ngoại lệ: sai giá trị", "Exception: invalid value", "Nhập 7 và abc: int('abc') không đổi được thành số nguyên nên báo ValueError.", "Input 7 and abc: int('abc') cannot become an integer, so ValueError is raised."),
        """st = input("Nhập m và n: ")
ds = st.split()
m = int(ds[0])
n = int(ds[1])
print("Tổng:", m + n, "Hiệu:", m - n)
print("Thương:", m / n)""",
        ["7 abc"],
    ),
    trace_block(
        sim("Lỗi ngoại lệ: chỉ số vượt giới hạn", "Exception: index out of range", "Danh sách A có 3 phần tử (chỉ số 0, 1, 2); A[5] vượt giới hạn nên báo IndexError.", "List A has 3 elements (indexes 0, 1, 2); A[5] is out of range so IndexError is raised."),
        """A = [10, 20, 30]
print(A[2])
print(A[5])""",
    ),
    trace_block(
        sim("Lỗi ngoại lệ: sai kiểu dữ liệu", "Exception: wrong data type", "Không nhân được một xâu với số thực 3.5: TypeError.", "A string cannot be multiplied by the float 3.5: TypeError."),
        """s = "10"
print(s * 3)
print(s * 3.5)""",
    ),
    trace_block(
        sim("Lỗi ngoại lệ: tên chưa có", "Exception: unknown name", "Biến tong chưa được gán giá trị nên Python không tìm thấy tên: NameError.", "The variable tong has no value yet so Python cannot find the name: NameError."),
        """a = 5
print(a + tong)""",
    ),
    T(
        "### 2. Một số lỗi ngoại lệ thường gặp\n\nMỗi lỗi ngoại lệ có một **tên riêng**; nhìn tên lỗi là biết nên sửa theo hướng nào.\n\n| Tên lỗi | Xảy ra khi | Ví dụ |\n|---|---|---|\n| `ZeroDivisionError` | chia cho giá trị 0 | `10 / 0` |\n| `IndexError` | truy cập phần tử danh sách với chỉ số vượt giới hạn | `A[5]` khi `A` có 3 phần tử |\n| `NameError` | dùng một tên mà chương trình không tìm thấy | `print(tong)` khi chưa gán `tong` |\n| `TypeError` | lỗi kiểu dữ liệu | `\"10\" * 3.5`, `list(12)` |\n| `ValueError` | kiểu đúng nhưng **giá trị** hàm không xử lí được | `int(\"abc\")`, `int(\"1.5\")` |\n| `IndentationError` | các dòng lệnh thụt vào không thẳng hàng hoặc sai vị trí | thiếu thụt dòng sau `if` |\n| `SyntaxError` | lỗi cú pháp | `print(\"a\"` |\n\nLưu ý: `IndentationError` và `SyntaxError` là lỗi cú pháp, Python báo trước khi chạy; năm lỗi còn lại chỉ xuất hiện khi chương trình **chạy đến** dòng lệnh đó.",
        "### 2. Common exceptions\n\nEach exception has its **own name**; the name tells you which way to fix it.\n\n| Name | Happens when | Example |\n|---|---|---|\n| `ZeroDivisionError` | dividing by 0 | `10 / 0` |\n| `IndexError` | accessing a list element with an index out of range | `A[5]` when `A` has 3 elements |\n| `NameError` | using a name the program cannot find | `print(tong)` before `tong` is assigned |\n| `TypeError` | wrong data type | `\"10\" * 3.5`, `list(12)` |\n| `ValueError` | right type but a **value** the function cannot handle | `int(\"abc\")`, `int(\"1.5\")` |\n| `IndentationError` | indented lines not aligned or in the wrong place | missing indentation after `if` |\n| `SyntaxError` | a syntax error | `print(\"a\"` |\n\nNote: `IndentationError` and `SyntaxError` are syntax errors that Python reports before running; the other five appear only when the program **reaches** that line.",
    ),
    T(
        "### Cách đọc thông báo lỗi\n\nKhi gặp lỗi ngoại lệ, Python in một thông báo (gọi là **Traceback**). Chỉ cần đọc hai thứ:\n\n1. Dòng có chữ `line N`: **dòng lệnh** làm chương trình dừng;\n2. Dòng cuối: **tên lỗi** và lời giải thích, ví dụ `ZeroDivisionError: division by zero`.\n\nQuy trình gỡ lỗi nên theo: **chạy thử → đọc lỗi → sửa mã → chạy lại**. Trong các mô phỏng ở trên, bước cuối cùng được đánh dấu lỗi chính là điều Traceback cho bạn biết. Nếu chưa hiểu một tên lỗi, bạn có thể nhờ trợ lí AI giải thích bằng một ví dụ cụ thể, rồi tự kiểm tra lại bằng cách chạy thử.",
        "### How to read an error message\n\nWhen an exception happens Python prints a message called a **Traceback**. You only need two things:\n\n1. The line with `line N`: the **command** that stopped the program;\n2. The last line: the **error name** and its explanation, for example `ZeroDivisionError: division by zero`.\n\nFollow this debugging routine: **run → read the error → fix the code → run again**. In the simulations above, the last step marked as an error is exactly what the Traceback tells you. If an error name is unclear, you can ask an AI assistant to explain it with a concrete example, then check it yourself by running it.",
    ),
    T(
        "### 3. Thực hành: dự đoán dữ liệu gây lỗi\n\nChương trình nhập hai số nguyên `m`, `n` cách nhau dấu cách rồi in tổng, hiệu và thương. Những tình huống có thể sinh lỗi:\n\n| Dữ liệu nhập | Lỗi |\n|---|---|\n| `12 0` (n bằng 0) | `ZeroDivisionError` |\n| `7 abc` hoặc `1.5 2` (không phải số nguyên) | `ValueError` |\n| `7` hoặc `7,2` (thiếu số thứ hai, hoặc không có dấu cách) | `IndexError` |\n\nChương trình nhập số tự nhiên `n` rồi nhập `n` số nguyên vào danh sách có thể lỗi khi `n` hoặc một số hạng nhập vào **không phải số nguyên**, hoặc khi người dùng **chỉ nhấn Enter** mà không nhập gì. Kiểm tra \"khả năng sinh lỗi\" như vậy là bước đầu của kiểm thử, chủ đề của bài sau.",
        "### 3. Practice: predict the inputs that cause errors\n\nThe program reads two integers `m`, `n` separated by a space, then prints their sum, difference and quotient. The situations that can raise an error:\n\n| Input | Error |\n|---|---|\n| `12 0` (n is 0) | `ZeroDivisionError` |\n| `7 abc` or `1.5 2` (not integers) | `ValueError` |\n| `7` or `7,2` (second number missing, or no space) | `IndexError` |\n\nThe program that reads a natural number `n` and then `n` integers into a list can fail when `n` or an item **is not an integer**, or when the user **just presses Enter** without typing anything. Checking for such \"possible errors\" is the first step of testing, the topic of the next lesson.",
    ),
    trace_block(
        sim("Lỗi ngữ nghĩa: kết quả sai nhưng không báo lỗi", "Semantic error: a wrong result, no error", "Chương trình chỉ duyệt một lượt nên dãy chưa sắp xếp xong: [1, 3, 8, 0, 10]. Python không báo lỗi nào.", "The program makes only one pass so the list is not fully sorted: [1, 3, 8, 0, 10]. Python reports no error."),
        """A = [3, 1, 8, 10, 0]
for i in range(len(A) - 1):
    if A[i] > A[i + 1]:
        A[i], A[i + 1] = A[i + 1], A[i]
print(A)""",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Lỗi cú pháp | viết sai quy tắc; Python báo trước khi chạy |\n| Lỗi ngoại lệ | dừng ngay khi chạy tới dòng lỗi, có tên lỗi riêng |\n| Lỗi ngữ nghĩa / lôgic | không dừng, kết quả sai |\n| `ZeroDivisionError` | chia cho 0 |\n| `IndexError` | chỉ số vượt giới hạn |\n| `NameError` | tên chưa có |\n| `TypeError` / `ValueError` | sai kiểu / sai giá trị |\n\n**Tự kiểm tra:** lệnh `gttb = sum(A) / len(A)` gây lỗi gì khi danh sách `A` rỗng? (đáp án: `ZeroDivisionError`, vì `len(A)` bằng 0). Hãy viết thêm điều kiện để tránh lỗi này.",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Syntax error | breaks the rules; Python reports it before running |\n| Exception | stops as soon as the faulty line is reached, with its own name |\n| Semantic / logic error | does not stop, the result is wrong |\n| `ZeroDivisionError` | dividing by 0 |\n| `IndexError` | index out of range |\n| `NameError` | unknown name |\n| `TypeError` / `ValueError` | wrong type / wrong value |\n\n**Self-check:** what error does `avg = sum(A) / len(A)` raise when the list `A` is empty? (answer: `ZeroDivisionError`, because `len(A)` is 0). Add a condition to avoid this error.",
    ),
]

questions = [
    mc("tin10-b29-mc-01", 1, "Theo bài học, các lỗi chương trình được chia thành mấy loại chính?", "According to the lesson, into how many main kinds are program errors divided?",
       "Có ba loại: lỗi cú pháp, lỗi ngoại lệ và lỗi khác (lỗi ngữ nghĩa, hay lỗi lôgic).", "Three kinds: syntax errors, exceptions, and other errors (semantic or logic errors).", "B",
       ("Hai loại", "Two"), ("Ba loại", "Three"), ("Bốn loại", "Four"), ("Năm loại", "Five")),
    mc("tin10-b29-mc-02", 1, "Chương trình đang chạy gặp lệnh không thực hiện được, dừng lại và báo một mã lỗi riêng. Đó là loại lỗi nào?", "A running program meets a command it cannot carry out, stops and reports its own error name. Which kind of error is it?",
       "Lỗi làm chương trình dừng khi đang chạy và trả về mã lỗi riêng là lỗi ngoại lệ.", "An error that stops the running program and reports its own name is an exception.", "C",
       ("Lỗi cú pháp", "Syntax error"), ("Lỗi ngữ nghĩa (lôgic)", "Semantic (logic) error"), ("Lỗi ngoại lệ", "Exception"), ("Không phải lỗi", "Not an error")),
    mc("tin10-b29-mc-03", 1, "ZeroDivisionError xảy ra khi nào?", "When does ZeroDivisionError happen?",
       "ZeroDivisionError xảy ra khi thực hiện phép chia cho giá trị 0.", "ZeroDivisionError happens when dividing by 0.", "D",
       ("Khi chỉ số vượt quá giới hạn danh sách", "When an index is out of the list's range"), ("Khi dùng một tên chưa có", "When using a name that does not exist"), ("Khi sai kiểu dữ liệu", "When the data type is wrong"), ("Khi chia cho 0", "When dividing by 0")),
    mc("tin10-b29-mc-04", 2, "Lệnh A = list(12) sinh ra lỗi ngoại lệ nào?", "Which exception does the command A = list(12) raise?",
       "Số nguyên 12 không phải dãy để chuyển thành danh sách; đây là lỗi kiểu dữ liệu, TypeError.", "The integer 12 is not a sequence to turn into a list; this is a data-type error, TypeError.", "A",
       ("TypeError", "TypeError"), ("ValueError", "ValueError"), ("IndexError", "IndexError"), ("SyntaxError", "SyntaxError")),
    mc("tin10-b29-mc-05", 2, "Lệnh int(\"abc\") sinh ra lỗi ngoại lệ nào?", "Which exception does int(\"abc\") raise?",
       "Chuyển \"abc\" sang số nguyên không được vì giá trị không hợp lệ: ValueError.", "\"abc\" cannot be converted to an integer because the value is invalid: ValueError.", "B",
       ("TypeError", "TypeError"), ("ValueError", "ValueError"), ("NameError", "NameError"), ("ZeroDivisionError", "ZeroDivisionError")),
    mc("tin10-b29-mc-06", 2, "Danh sách A = [1, 2, 3]. Lệnh print(A[5]) gây lỗi nào?", "The list is A = [1, 2, 3]. Which error does print(A[5]) cause?",
       "A chỉ có chỉ số 0, 1, 2; chỉ số 5 vượt giới hạn nên báo IndexError.", "A has only indexes 0, 1, 2; index 5 is out of range so IndexError is raised.", "C",
       ("NameError", "NameError"), ("ValueError", "ValueError"), ("IndexError", "IndexError"), ("ZeroDivisionError", "ZeroDivisionError")),
    mc("tin10-b29-mc-07", 2, "Chương trình có lệnh print(a + tong) nhưng chưa gán giá trị cho tong. Khi chạy sẽ báo lỗi nào?", "A program has print(a + tong) but never assigns a value to tong. Which error is reported when it runs?",
       "tong là một tên chương trình không tìm thấy nên báo NameError.", "tong is a name the program cannot find, so NameError is raised.", "D",
       ("TypeError", "TypeError"), ("IndexError", "IndexError"), ("SyntaxError", "SyntaxError"), ("NameError", "NameError")),
    mc("tin10-b29-mc-08", 2, "Chương trình có lệnh n = int(input()). Nếu người dùng nhập 1.5 thì xảy ra điều gì?", "A program has n = int(input()). What happens if the user types 1.5?",
       "int(\"1.5\") không đổi được trực tiếp sang số nguyên nên báo ValueError.", "int(\"1.5\") cannot be converted directly to an integer, so ValueError is raised.", "A",
       ("Lỗi ngoại lệ ValueError", "A ValueError exception"), ("Lỗi ngoại lệ TypeError", "A TypeError exception"), ("Lỗi ngoại lệ IndexError", "An IndexError exception"), ("Không có lỗi, n bằng 1", "No error, n becomes 1")),
    mc("tin10-b29-mc-09", 2, "Bài toán sắp xếp dãy [3, 1, 8, 10, 0] tăng dần, chương trình in ra [1, 3, 8, 10, 0] mà không báo lỗi nào. Chương trình có lỗi thuộc loại nào?", "A program should sort [3, 1, 8, 10, 0] in increasing order, prints [1, 3, 8, 10, 0] and reports no error. Which kind of error does it have?",
       "Chương trình không dừng nhưng cho kết quả sai nên là lỗi ngữ nghĩa (lôgic).", "The program does not stop but gives a wrong result, so it is a semantic (logic) error.", "B",
       ("Lỗi cú pháp", "A syntax error"), ("Lỗi ngữ nghĩa (lôgic)", "A semantic (logic) error"), ("Lỗi ngoại lệ ZeroDivisionError", "A ZeroDivisionError exception"), ("Không có lỗi", "No error")),
    mc("tin10-b29-mc-10", 2, "Gõ lệnh print(\"Xin chao\" (thiếu dấu ngoặc đóng) và chạy chương trình, Python báo lỗi nào?", "You type print(\"Xin chao\" (closing bracket missing) and run the program. Which error does Python report?",
       "Thiếu dấu ngoặc là sai cú pháp nên Python báo SyntaxError ngay khi đọc chương trình.", "A missing bracket is a syntax mistake, so Python reports SyntaxError as soon as it reads the program.", "C",
       ("ValueError", "ValueError"), ("NameError", "NameError"), ("SyntaxError", "SyntaxError"), ("IndexError", "IndexError")),
    mc("tin10-b29-mc-11", 3, "Lệnh gttb = sum(A) / len(A) có thể gây lỗi ngoại lệ nào khi danh sách A rỗng?", "Which exception can gttb = sum(A) / len(A) raise when the list A is empty?",
       "Khi A rỗng, len(A) bằng 0 nên phép chia gây ZeroDivisionError.", "When A is empty, len(A) is 0 so the division raises ZeroDivisionError.", "D",
       ("IndexError", "IndexError"), ("TypeError", "TypeError"), ("ValueError", "ValueError"), ("ZeroDivisionError", "ZeroDivisionError")),
    mc("tin10-b29-mc-12", 3, "Chương trình chạy xong, không báo lỗi nào. Kết luận nào sau đây đúng?", "A program finishes without reporting any error. Which conclusion is correct?",
       "Không có thông báo lỗi chỉ cho biết không có lỗi cú pháp hay ngoại lệ; vẫn có thể còn lỗi ngữ nghĩa nên cần kiểm thử.", "No error message only means there is no syntax error or exception; a semantic error may remain, so testing is still needed.", "A",
       ("Vẫn có thể còn lỗi ngữ nghĩa (lôgic)", "A semantic (logic) error may still remain"), ("Chắc chắn chương trình đúng với mọi dữ liệu", "The program is surely correct for all data"), ("Chắc chắn còn lỗi cú pháp", "A syntax error surely remains"), ("Chắc chắn còn lỗi ZeroDivisionError", "A ZeroDivisionError surely remains")),
]

truefalse = [
    tf("tin10-b29-tf-01", 2, "Xét các loại lỗi chương trình.", "Consider the kinds of program error.",
       "Lỗi cú pháp bị phát hiện trước khi chạy; lỗi ngoại lệ dừng chương trình khi chạy; lỗi lôgic không dừng nhưng cho kết quả sai; chạy được chưa chắc đúng.", "Syntax errors are caught before running; exceptions stop the running program; logic errors do not stop it but give wrong results; running is not the same as correct.",
       ("Lỗi cú pháp bị Python phát hiện trước khi chương trình chạy.", "A syntax error is caught by Python before the program runs.", True),
       ("Lỗi ngoại lệ làm chương trình dừng và báo một mã lỗi.", "An exception stops the program and reports an error name.", True),
       ("Lỗi ngữ nghĩa (lôgic) làm chương trình dừng và báo mã lỗi.", "A semantic (logic) error stops the program and reports an error name.", False),
       ("Chương trình chạy không báo lỗi thì chắc chắn đúng.", "A program that runs with no error report is certainly correct.", False)),
    tf("tin10-b29-tf-02", 2, "Xét tên các lỗi ngoại lệ.", "Consider the names of exceptions.",
       "int(\"abc\") sai giá trị nên là ValueError, không phải TypeError; các tên còn lại đúng.", "int(\"abc\") has an invalid value so it is ValueError, not TypeError; the other names are right.",
       ("ZeroDivisionError xảy ra khi chia cho 0.", "ZeroDivisionError happens when dividing by 0.", True),
       ("IndexError xảy ra khi chỉ số vượt giới hạn danh sách.", "IndexError happens when an index is out of the list's range.", True),
       ("int(\"abc\") sinh ra lỗi TypeError.", "int(\"abc\") raises TypeError.", False),
       ("NameError xảy ra khi dùng một tên chưa có.", "NameError happens when a name that does not exist is used.", True)),
    tf("tin10-b29-tf-03", 2, "Chương trình nhập hai số nguyên m, n cách nhau dấu cách rồi in m + n, m - n và m / n.", "A program reads two integers m, n separated by a space and prints m + n, m - n and m / n.",
       "Nhập 12 0 gây ZeroDivisionError; nhập 7 abc gây ValueError; chỉ nhập 7 làm ds[1] không tồn tại nên là IndexError; 12 / 4 bằng 3.0.", "Input 12 0 raises ZeroDivisionError; 7 abc raises ValueError; typing just 7 leaves ds[1] missing, an IndexError; 12 / 4 is 3.0.",
       ("Nhập \"12 0\" thì phép m / n gây ZeroDivisionError.", "Typing \"12 0\" makes m / n raise ZeroDivisionError.", True),
       ("Nhập \"7 abc\" thì lệnh đổi sang số nguyên gây ValueError.", "Typing \"7 abc\" makes the integer conversion raise ValueError.", True),
       ("Chỉ nhập \"7\" thì chương trình gặp lỗi NameError.", "Typing only \"7\" makes the program raise NameError.", False),
       ("Nhập \"12 4\" thì dòng thương in ra 3.0.", "Typing \"12 4\" makes the quotient line print 3.0.", True)),
    tf("tin10-b29-tf-04", 3, "Xét lệnh gttb = sum(A) / len(A).", "Consider the command avg = sum(A) / len(A).",
       "Với A rỗng, len(A) = 0 gây ZeroDivisionError; với A = [2, 4] kết quả 3.0; với A = [10] vẫn tính được 10.0; nên kiểm tra len(A) > 0 trước khi chia.", "For an empty A, len(A) = 0 raises ZeroDivisionError; A = [2, 4] gives 3.0; A = [10] still gives 10.0; check len(A) > 0 before dividing.",
       ("Khi A rỗng, lệnh gây lỗi ZeroDivisionError.", "When A is empty, the command raises ZeroDivisionError.", True),
       ("Khi A = [2, 4], gttb bằng 3.0.", "When A = [2, 4], gttb is 3.0.", True),
       ("Khi A = [10], lệnh cũng gây lỗi.", "When A = [10], the command also raises an error.", False),
       ("Nên kiểm tra len(A) > 0 trước khi thực hiện phép chia.", "It is good to check len(A) > 0 before dividing.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
