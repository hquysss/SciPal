# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_16_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "ngon-ngu-lap-trinh-bac-cao-va-python-bai-16-tin10"
title_vi = "Bài 16. Ngôn ngữ lập trình bậc cao và Python"
title_en = "Lesson 16. High-level programming languages and Python"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nêu được khái niệm **ngôn ngữ lập trình bậc cao** và biết **Python** là một ngôn ngữ như vậy;\n- phân biệt **chế độ gõ lệnh trực tiếp** và **chế độ soạn thảo chương trình**;\n- gõ được các lệnh Python đầu tiên: tính biểu thức, nhận biết số nguyên, số thực, xâu kí tự, dùng lệnh `print()`;\n- tạo, lưu và chạy một chương trình Python đơn giản.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- explain what a **high-level programming language** is and know that **Python** is one;\n- tell the **interactive (direct command) mode** from the **program editing mode**;\n- type your first Python commands: evaluate expressions, recognise integers, real numbers and strings, use `print()`;\n- create, save and run a simple Python program.",
    ),
    T(
        "### 1. Ngôn ngữ lập trình bậc cao\n\n**Ngôn ngữ lập trình** là công cụ giúp con người \"lập trình\" để giải các bài toán trên máy tính. Có ba loại:\n\n| Loại | Đặc điểm |\n|---|---|\n| **Ngôn ngữ máy** | toàn số 0 và 1, máy hiểu trực tiếp nhưng người rất khó đọc |\n| **Hợp ngữ** | có cả chữ và số, dùng tên gợi nhớ cho lệnh máy |\n| **Ngôn ngữ lập trình bậc cao** | câu lệnh viết gần với ngôn ngữ tự nhiên, dễ đọc, dễ hiểu |\n\nChương trình viết bằng ngôn ngữ bậc cao phải qua **chương trình dịch** để chuyển sang ngôn ngữ máy thì máy mới thực hiện được.\n\nCác ngôn ngữ bậc cao phổ biến hiện nay: **Python**, C/C++, Java... **Python** được dùng nhiều trong nghiên cứu và giáo dục vì dễ đọc, dễ học, dễ nhớ.",
        "### 1. High-level programming languages\n\nA **programming language** is a tool that lets people \"program\" a computer to solve problems. There are three kinds:\n\n| Kind | Features |\n|---|---|\n| **Machine language** | only 0s and 1s, understood directly by the machine but very hard for people to read |\n| **Assembly language** | letters and numbers, mnemonic names for machine instructions |\n| **High-level language** | commands written close to natural language, easy to read and understand |\n\nA program written in a high-level language must go through a **translator** to become machine language before the machine can run it.\n\nPopular high-level languages today: **Python**, C/C++, Java... **Python** is widely used in research and education because it is easy to read, learn and remember.",
    ),
    T(
        "### 2. Môi trường lập trình Python\n\nMôi trường lập trình Python (ví dụ IDLE) có **hai chế độ làm việc**:\n\n| Chế độ | Cách dùng |\n|---|---|\n| **Gõ lệnh trực tiếp** (cửa sổ Shell) | gõ một lệnh sau dấu nhắc `>>>`, nhấn **Enter** là chạy ngay. Thường dùng để tính toán và thử lệnh. |\n| **Soạn thảo chương trình** (cửa sổ Editor) | gõ nhiều dòng lệnh vào một tệp, lưu lại (đuôi `.py`) rồi **chạy một lần** bằng lệnh *Run* hoặc phím **F5**. |\n\nĐiểm giống: mỗi câu lệnh gõ trên một dòng. Chú ý: **dấu nhắc `>>>` không phải là con trỏ soạn thảo**; nó chỉ báo hiệu hệ thống sẵn sàng nhận lệnh.",
        "### 2. The Python programming environment\n\nThe Python environment (for example IDLE) has **two working modes**:\n\n| Mode | How to use it |\n|---|---|\n| **Direct commands** (Shell window) | type one command after the `>>>` prompt and press **Enter** to run it at once. Often used for calculations and trying commands. |\n| **Program editing** (Editor window) | type many lines into a file, save it (extension `.py`) and **run it once** with *Run* or the **F5** key. |\n\nIn common: each command is typed on one line. Note: **the `>>>` prompt is not the editing cursor**; it only signals that the system is ready for a command.",
    ),
    T(
        "### 3. Một số lệnh Python đầu tiên\n\n- Khi nhập một giá trị, Python **tự nhận biết kiểu**: `5` là **số nguyên**, `2.6` là **số thực**, chữ nằm giữa cặp dấu nháy (`\"Xin chào\"`) là **xâu kí tự**.\n- Các phép toán với số: cộng `+`, trừ `-`, nhân `*`, chia `/`. Phép chia `/` **luôn cho số thực** (`5 / 2` là `2.5`). Nếu có số thực tham gia phép tính thì kết quả là số thực (`12 + 1.5` là `13.5`).\n- Thứ tự tính như trong toán: nhân, chia trước; cộng, trừ sau; trong ngoặc tính trước.\n- Lệnh **`print()`** in dữ liệu ra màn hình, có thể in **một hay nhiều giá trị**; các giá trị cách nhau bằng một dấu cách.\n- Viết thiếu ngoặc đơn, ví dụ `print \"Xin chào\"`, Python báo lỗi **SyntaxError**.",
        "### 3. First Python commands\n\n- When you enter a value, Python **recognises its type automatically**: `5` is an **integer**, `2.6` is a **real number**, text between quotation marks (`\"Hello\"`) is a **string**.\n- Arithmetic on numbers: add `+`, subtract `-`, multiply `*`, divide `/`. The division `/` **always gives a real number** (`5 / 2` is `2.5`). If a real number takes part, the result is real (`12 + 1.5` is `13.5`).\n- The order of evaluation is as in maths: multiply and divide first, then add and subtract; parentheses first.\n- The **`print()`** command prints data on the screen; it can print **one or several values**, separated by a space.\n- Writing it without parentheses, such as `print \"Hello\"`, makes Python report a **SyntaxError**.",
    ),
    trace_block(
        sim("Các phép tính đầu tiên", "First calculations", "Theo dõi từng dòng: chia / cho số thực, biểu thức có nhiều phép toán tính theo thứ tự ưu tiên.", "Follow each line: / gives a real number, and a mixed expression is evaluated by precedence."),
        """print(5 + 3)
print(5 / 2)
print(12 + 1.5)
print(10 + 7 / 2)
print(13 + 10 * 3 / 2 - 3 * 2)""",
    ),
    trace_block(
        sim("Lệnh print() in nhiều giá trị", "print() with several values", "print() in số và xâu kí tự; các giá trị cách nhau một dấu cách.", "print() prints numbers and strings; the values are separated by a space."),
        """print("Xin chào")
print("Tổng 1 + 2 =", 1 + 2)
print(1, 2.5, "ba")""",
    ),
    T(
        "### 4. Thực hành: tạo và chạy chương trình đầu tiên\n\nSử dụng chế độ soạn thảo để tạo chương trình **Bai1.py**:\n\n1. Mở IDLE, chọn *File → New File* để mở cửa sổ soạn thảo.\n2. Gõ các lệnh của chương trình.\n3. Lưu tệp với tên `Bai1.py` (đuôi `.py`) vào thư mục của em.\n4. Chọn *Run → Run Module* hoặc nhấn **F5**; kết quả hiện trong cửa sổ Shell.\n\nCác lệnh trong *Luyện tập 3* của sách in ra màn hình hai dòng thông tin: `1 × 3 × 5 × 7 = 105` và `Bạn Hoa năm nay 16 tuổi`.",
        "### 4. Practice: create and run your first program\n\nUse the editing mode to create the program **Bai1.py**:\n\n1. Open IDLE and choose *File → New File* to open the editor window.\n2. Type the commands of the program.\n3. Save the file as `Bai1.py` (extension `.py`) in your folder.\n4. Choose *Run → Run Module* or press **F5**; the result appears in the Shell window.\n\nThe commands in *Practice 3* of the textbook print two lines on the screen: `1 × 3 × 5 × 7 = 105` and `Bạn Hoa năm nay 16 tuổi` (Hoa is 16 years old).",
    ),
    trace_block(
        sim("Chương trình in hai dòng thông tin", "A program that prints two lines", "Chương trình gồm hai lệnh print(); mỗi lệnh in một dòng ra màn hình.", "The program has two print() commands; each prints one line on the screen."),
        """print("1 x 3 x 5 x 7 =", 1 * 3 * 5 * 7)
print("Bạn Hoa năm nay", 16, "tuổi")""",
    ),
    trace_block(
        sim("Bảng nhân 5 (bài Vận dụng)", "The 5 times table (Application task)", "Mỗi dòng in một phép nhân; vòng lặp ở bài sau sẽ giúp viết ngắn hơn.", "Each line prints one product; loops in a later lesson will make this shorter."),
        """print("5 x 1 =", 5 * 1)
print("5 x 2 =", 5 * 2)
print("5 x 3 =", 5 * 3)
print("5 x 4 =", 5 * 4)
print("5 x 5 =", 5 * 5)
print("5 x 6 =", 5 * 6)
print("5 x 7 =", 5 * 7)
print("5 x 8 =", 5 * 8)
print("5 x 9 =", 5 * 9)
print("5 x 10 =", 5 * 10)""",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Ngôn ngữ bậc cao | lệnh gần ngôn ngữ tự nhiên; Python là ví dụ |\n| Chương trình dịch | chuyển chương trình bậc cao sang ngôn ngữ máy |\n| Chế độ gõ lệnh trực tiếp | gõ lệnh sau `>>>`, Enter là chạy |\n| Chế độ soạn thảo | nhiều lệnh trong một tệp `.py`, chạy bằng F5 |\n| Kiểu dữ liệu | số nguyên `5`, số thực `2.6`, xâu `\"abc\"` |\n| Phép chia `/` | luôn cho số thực |\n| `print()` | in một hay nhiều giá trị, cách nhau bởi dấu cách |\n\n**Tự kiểm tra:** `5 / 2` bằng bao nhiêu? (đáp án: `2.5`). `13 + 10 * 3 / 2 - 3 * 2` bằng bao nhiêu? (đáp án: `22.0`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| High-level language | commands close to natural language; Python is an example |\n| Translator | turns a high-level program into machine language |\n| Direct command mode | type a command after `>>>`, Enter runs it |\n| Editing mode | many commands in one `.py` file, run with F5 |\n| Data types | integer `5`, real `2.6`, string `\"abc\"` |\n| Division `/` | always gives a real number |\n| `print()` | prints one or several values separated by spaces |\n\n**Self-check:** what is `5 / 2`? (answer: `2.5`). What is `13 + 10 * 3 / 2 - 3 * 2`? (answer: `22.0`).",
    ),
]

questions = [
    mc("tin10-b16-mc-01", 1, "Ngôn ngữ lập trình là gì?", "What is a programming language?",
       "Ngôn ngữ lập trình là công cụ giúp con người viết chương trình để giải các bài toán trên máy tính.", "A programming language is a tool that lets people write programs to solve problems on a computer.", "C",
       ("Ngôn ngữ nói chuyện giữa hai người", "A language for two people to talk"), ("Một phần mềm soạn văn bản", "A word-processing program"), ("Công cụ để viết chương trình giải bài toán trên máy tính", "A tool for writing programs that solve problems on a computer"), ("Tên một loại máy tính", "The name of a kind of computer")),
    mc("tin10-b16-mc-02", 1, "Loại ngôn ngữ lập trình nào có câu lệnh gần với ngôn ngữ tự nhiên nhất?", "Which kind of programming language has commands closest to natural language?",
       "Ngôn ngữ bậc cao viết gần với ngôn ngữ tự nhiên nên dễ đọc, dễ hiểu hơn ngôn ngữ máy và hợp ngữ.", "High-level languages are written close to natural language, so they are easier to read than machine language and assembly.", "A",
       ("Ngôn ngữ lập trình bậc cao", "High-level language"), ("Ngôn ngữ máy", "Machine language"), ("Hợp ngữ", "Assembly language"), ("Dãy bit 0 và 1", "A string of 0 and 1 bits")),
    mc("tin10-b16-mc-03", 1, "Python là ngôn ngữ lập trình thuộc loại nào?", "What kind of programming language is Python?",
       "Python là ngôn ngữ lập trình bậc cao, phổ biến trong nghiên cứu và giáo dục.", "Python is a high-level programming language, popular in research and education.", "D",
       ("Ngôn ngữ máy", "Machine language"), ("Hợp ngữ", "Assembly language"), ("Ngôn ngữ tự nhiên", "A natural language"), ("Ngôn ngữ lập trình bậc cao", "A high-level programming language")),
    mc("tin10-b16-mc-04", 1, "Chế độ gõ lệnh trực tiếp của Python thường dùng để làm gì?", "What is the direct command mode of Python usually used for?",
       "Gõ một lệnh rồi nhấn Enter là chạy ngay, nên chế độ này tiện để tính toán và kiểm tra lệnh.", "Typing a command and pressing Enter runs it at once, so this mode is handy for calculations and testing commands.", "B",
       ("Viết chương trình có nhiều dòng lệnh", "Writing programs with many lines"), ("Tính toán và kiểm tra các lệnh", "Calculating and testing commands"), ("Lưu chương trình thành tệp", "Saving a program as a file"), ("Dịch chương trình sang ngôn ngữ máy", "Translating a program to machine language")),
    mc("tin10-b16-mc-05", 1, "Chương trình dịch là phần mềm có nhiệm vụ gì?", "What is the job of a translator program?",
       "Chương trình dịch chuyển chương trình viết bằng ngôn ngữ bậc cao sang ngôn ngữ máy để máy thực hiện được.", "A translator turns a program written in a high-level language into machine language so the machine can run it.", "B",
       ("Phát hiện virus trong chương trình", "Detect viruses in a program"), ("Dịch chương trình bậc cao sang ngôn ngữ máy", "Translate a high-level program into machine language"), ("Soạn thảo chương trình", "Edit the program"), ("Nén tệp chương trình", "Compress the program file")),
    mc("tin10-b16-mc-06", 1, "Trong Python, giá trị 2.6 thuộc kiểu dữ liệu nào?", "In Python, what data type is the value 2.6?",
       "Số có phần thập phân như 2.6 là số thực; Python tự nhận ra kiểu này.", "A number with a decimal part such as 2.6 is a real number; Python recognises this type automatically.", "C",
       ("Số nguyên", "Integer"), ("Xâu kí tự", "String"), ("Số thực", "Real number"), ("Kiểu lôgic", "Logical type")),
    mc("tin10-b16-mc-07", 1, "Kết quả của lệnh 5 / 2 trong Python là gì?", "What is the result of 5 / 2 in Python?",
       "Phép chia / luôn cho số thực nên 5 / 2 bằng 2.5.", "The division / always gives a real number, so 5 / 2 is 2.5.", "A",
       ("2.5", "2.5"), ("2", "2"), ("3", "3"), ("2.0", "2.0")),
    mc("tin10-b16-mc-08", 2, "Kết quả của 13 + 10 * 3 / 2 - 3 * 2 là gì?", "What is the result of 13 + 10 * 3 / 2 - 3 * 2?",
       "10 * 3 = 30, 30 / 2 = 15.0, 3 * 2 = 6; 13 + 15.0 - 6 = 22.0 (số thực vì có phép chia /).", "10 * 3 = 30, 30 / 2 = 15.0, 3 * 2 = 6; 13 + 15.0 - 6 = 22.0 (a real number because of the division /).", "D",
       ("22", "22"), ("19", "19"), ("25.0", "25.0"), ("22.0", "22.0")),
    mc("tin10-b16-mc-09", 2, "Lệnh print(1, 2.5, \"ba\") in ra màn hình dòng nào?", "Which line does print(1, 2.5, \"ba\") show on the screen?",
       "print() in các giá trị theo thứ tự và cách nhau bởi một dấu cách: 1 2.5 ba.", "print() prints the values in order separated by a space: 1 2.5 ba.", "C",
       ("1, 2.5, ba", "1, 2.5, ba"), ("12.5ba", "12.5ba"), ("1 2.5 ba", "1 2.5 ba"), ("\"1\" \"2.5\" \"ba\"", "\"1\" \"2.5\" \"ba\"")),
    mc("tin10-b16-mc-10", 2, "Gõ print \"Xin chào\" (thiếu ngoặc đơn) thì Python báo lỗi nào?", "Which error does Python report for print \"Hello\" (missing parentheses)?",
       "Thiếu ngoặc đơn là sai cú pháp nên Python báo SyntaxError.", "Missing parentheses is a syntax mistake, so Python reports a SyntaxError.", "D",
       ("ZeroDivisionError", "ZeroDivisionError"), ("NameError", "NameError"), ("IndentationError", "IndentationError"), ("SyntaxError", "SyntaxError")),
    mc("tin10-b16-mc-11", 1, "Ở chế độ soạn thảo của IDLE, có thể chạy chương trình bằng phím nào?", "In the IDLE editing mode, which key runs the program?",
       "Chương trình được chạy bằng lệnh Run hoặc phím F5; kết quả hiện ở cửa sổ Shell.", "The program is run with Run or the F5 key; the result appears in the Shell window.", "A",
       ("F5", "F5"), ("F1", "F1"), ("Esc", "Esc"), ("Caps Lock", "Caps Lock")),
    mc("tin10-b16-mc-12", 3, "Lệnh nào in đúng dòng: 1 x 3 x 5 x 7 = 105 ?", "Which command prints exactly the line: 1 x 3 x 5 x 7 = 105 ?",
       "Cần in xâu rồi đến giá trị tích 1 * 3 * 5 * 7 = 105, hai thành phần cách nhau một dấu cách: print(\"1 x 3 x 5 x 7 =\", 1 * 3 * 5 * 7).", "Print the string and then the product 1 * 3 * 5 * 7 = 105, separated by a space: print(\"1 x 3 x 5 x 7 =\", 1 * 3 * 5 * 7).", "B",
       ("print(1 x 3 x 5 x 7 = 105)", "print(1 x 3 x 5 x 7 = 105)"), ("print(\"1 x 3 x 5 x 7 =\", 1 * 3 * 5 * 7)", "print(\"1 x 3 x 5 x 7 =\", 1 * 3 * 5 * 7)"), ("print \"1 x 3 x 5 x 7 = 105\"", "print \"1 x 3 x 5 x 7 = 105\""), ("print(\"1 x 3 x 5 x 7 =\" 1 * 3 * 5 * 7)", "print(\"1 x 3 x 5 x 7 =\" 1 * 3 * 5 * 7)")),
]

truefalse = [
    tf("tin10-b16-tf-01", 1, "Xét các loại ngôn ngữ lập trình.", "Consider the kinds of programming languages.",
       "Ngôn ngữ máy chỉ gồm 0 và 1; ngôn ngữ bậc cao dễ đọc hơn và cần chương trình dịch; Python, C/C++, Java là ngôn ngữ bậc cao.", "Machine language is only 0s and 1s; high-level languages are easier to read and need a translator; Python, C/C++, Java are high-level.",
       ("Ngôn ngữ máy gồm toàn số 0 và 1.", "Machine language consists only of 0s and 1s.", True),
       ("Python, C/C++ và Java đều là ngôn ngữ lập trình bậc cao.", "Python, C/C++ and Java are all high-level languages.", True),
       ("Chương trình bậc cao chạy được trực tiếp, không cần dịch sang ngôn ngữ máy.", "A high-level program runs directly without being translated to machine language.", False),
       ("Ngôn ngữ bậc cao có câu lệnh gần với ngôn ngữ tự nhiên.", "High-level languages have commands close to natural language.", True)),
    tf("tin10-b16-tf-02", 1, "Xét môi trường lập trình Python.", "Consider the Python programming environment.",
       "Dấu nhắc >>> chỉ báo hệ thống sẵn sàng nhận lệnh, không phải con trỏ soạn thảo; hai chế độ khác nhau ở cách chạy lệnh.", "The >>> prompt only signals readiness for a command and is not the editing cursor; the two modes differ in how commands run.",
       ("Dấu nhắc >>> chính là con trỏ soạn thảo chương trình.", "The >>> prompt is the program editing cursor.", False),
       ("Ở chế độ gõ lệnh trực tiếp, nhấn Enter là lệnh được chạy ngay.", "In direct command mode, pressing Enter runs the command at once.", True),
       ("Ở chế độ soạn thảo, ta gõ nhiều lệnh vào một tệp rồi chạy một lần.", "In editing mode, we type many commands in a file and run them once.", True),
       ("Ở cả hai chế độ, mỗi câu lệnh được gõ trên một dòng.", "In both modes each command is typed on one line.", True)),
    tf("tin10-b16-tf-03", 2, "Xét kiểu dữ liệu và phép toán trong Python.", "Consider data types and operations in Python.",
       "5/2 và 12 + 1.5 cho số thực; 10 + 7/2 = 13.5; \"Bạn là học sinh lớp 10\" là xâu kí tự.", "5/2 and 12 + 1.5 give real numbers; 10 + 7/2 = 13.5; \"Bạn là học sinh lớp 10\" is a string.",
       ("5 / 2 cho kết quả 2.5.", "5 / 2 gives 2.5.", True),
       ("12 + 1.5 cho kết quả 13.5, là số thực.", "12 + 1.5 gives 13.5, a real number.", True),
       ("10 + 7 / 2 cho kết quả 13 (số nguyên).", "10 + 7 / 2 gives 13 (an integer).", False),
       ("\"Bạn là học sinh lớp 10\" là một xâu kí tự.", "\"Bạn là học sinh lớp 10\" is a string.", True)),
    tf("tin10-b16-tf-04", 2, "Xét lệnh print() và việc chạy chương trình.", "Consider print() and running a program.",
       "print() in một hay nhiều giá trị cách nhau bởi dấu cách; thiếu ngoặc đơn gây SyntaxError; tệp chương trình có đuôi .py.", "print() prints one or several values separated by spaces; missing parentheses cause a SyntaxError; program files have the .py extension.",
       ("print(1, 2) in ra 1 2.", "print(1, 2) prints 1 2.", True),
       ("print \"Xin chào\" (không có ngoặc đơn) chạy bình thường.", "print \"Xin chào\" (no parentheses) runs normally.", False),
       ("Tệp chương trình Python thường được lưu với đuôi .py.", "A Python program file is usually saved with the .py extension.", True),
       ("Khi chạy chương trình, kết quả hiện trong cửa sổ Shell.", "When the program runs, the result appears in the Shell window.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
