# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_21_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "cau-lenh-lap-while-bai-21-tin10"
title_vi = "Bài 21. Câu lệnh lặp while"
title_en = "Lesson 21. The while loop statement"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nêu được chức năng của **lệnh lặp `while`** (lặp với số lần **không biết trước**);\n- viết đúng cú pháp `while` và biết điều kiện được kiểm tra **trước** mỗi lần lặp;\n- nhận ra **vòng lặp vô hạn** và cách tránh nó;\n- kể ra **ba cấu trúc lập trình cơ bản** và giải bài toán bằng `while`.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- explain the role of the **`while` loop** (looping an **unknown** number of times);\n- write correct `while` syntax and know the condition is checked **before** each repetition;\n- spot an **infinite loop** and know how to avoid it;\n- name the **three basic programming structures** and solve problems with `while`.",
    ),
    T(
        "### 1. Lệnh lặp `while`\n\nHãy so sánh hai cột công việc:\n\n| Biết trước số lần lặp | Không biết trước số lần lặp |\n|---|---|\n| Chạy 20 vòng quanh sân vận động | Chạy nhiều vòng trong 2 tiếng |\n| Làm 5 bài tập thầy cô giao | Làm bài tập đến giờ ăn cơm thì dừng |\n| Lấy 15 xô nước giúp mẹ | Xách nước cho đến khi đầy thùng |\n\nCột bên trái dùng `for`. Cột bên phải chỉ có **điều kiện dừng**, còn số lần lặp phụ thuộc vào điều kiện, ta dùng **`while`**.\n\n**Cấu trúc của lệnh `while`:**\n\n```python\nwhile <điều kiện>:\n    <khối lệnh>\n```\n\n- **điều kiện** được kiểm tra **trước** mỗi lần lặp; điều kiện đúng thì thực hiện khối lệnh rồi quay lại kiểm tra tiếp, điều kiện sai thì thoát vòng lặp;\n- sau điều kiện có dấu **`:`** và khối lệnh **thụt vào**;\n- nếu điều kiện sai ngay từ đầu, khối lệnh **không chạy lần nào**;\n- trong khối lệnh phải có lệnh **làm thay đổi điều kiện** (ví dụ `k = k + 1`), nếu không vòng lặp **không bao giờ dừng**.",
        "### 1. The `while` loop\n\nCompare the two columns of jobs:\n\n| Known number of repeats | Unknown number of repeats |\n|---|---|\n| Run 20 laps around the stadium | Run many laps for 2 hours |\n| Do the 5 exercises the teacher set | Do exercises until dinner time |\n| Fetch 15 buckets of water for mum | Carry water until the tank is full |\n\nThe left column uses `for`. The right column only has a **stop condition** and the number of repeats depends on it, so we use **`while`**.\n\n**Structure of `while`:**\n\n```python\nwhile <condition>:\n    <block>\n```\n\n- the **condition** is checked **before** each repetition; when true, the block runs and the condition is checked again; when false, the loop ends;\n- a **`:`** follows the condition and the block is **indented**;\n- if the condition is false from the start, the block **never runs**;\n- the block must contain a command that **changes the condition** (for example `k = k + 1`), otherwise the loop **never stops**.",
    ),
    trace_block(
        sim("Tổng 1 + 8 + 15 + … + 99", "Sum 1 + 8 + 15 + … + 99", "k tăng 7 sau mỗi lần lặp; vòng lặp dừng khi k ≥ 100 và S = 750.", "k grows by 7 each repetition; the loop stops when k ≥ 100 and S = 750."),
        """S = 0
k = 1
while k < 100:
    S = S + k
    k = k + 7
print(S)""",
    ),
    trace_block(
        sim("Tổng bình phương với k × k < 100", "Sum of squares while k × k < 100", "Điều kiện k * k < 100 sai khi k = 10, nên S = 1² + 2² + … + 9² = 285.", "The condition k * k < 100 fails at k = 10, so S = 1² + 2² + … + 9² = 285."),
        """S = 0
k = 1
while k * k < 100:
    S = S + k * k
    k = k + 1
print(S)""",
    ),
    trace_block(
        sim("In k = 2, 5, 8, … khi k < 50", "Print k = 2, 5, 8, … while k < 50", "k tăng 3 mỗi lần; dãy in ra kết thúc ở 47 vì với k = 50 điều kiện đã sai.", "k grows by 3 each time; the printed sequence ends at 47 because the condition is already false at k = 50."),
        """k = 2
while k < 50:
    print(k, end=" ")
    k = k + 3""",
    ),
    trace_block(
        sim("Vòng lặp vô hạn", "An infinite loop", "Thân vòng lặp không thay đổi k nên điều kiện k < 10 luôn đúng; mô phỏng bị dừng sau 500 bước.", "The body never changes k, so the condition k < 10 is always true; the simulation is stopped after 500 steps."),
        """k = 1
while k < 10:
    print(k)""",
    ),
    T(
        "### 2. Cấu trúc lập trình\n\nCác ngôn ngữ lập trình bậc cao đều dùng **ba cấu trúc cơ bản**:\n\n| Cấu trúc | Ý nghĩa | Lệnh Python |\n|---|---|---|\n| **Tuần tự** | các lệnh thực hiện lần lượt từ trên xuống | `=`, `input()`, `print()` |\n| **Rẽ nhánh** | chọn làm hay bỏ qua một khối lệnh tùy điều kiện | `if`, `if ... else` |\n| **Lặp** | lặp lại khối lệnh | `for` (biết trước số lần), `while` (chưa biết trước) |\n\nMột chương trình thường **kết hợp** cả ba cấu trúc, ví dụ vòng lặp có lệnh `if` bên trong.",
        "### 2. Programming structures\n\nHigh-level languages all use **three basic structures**:\n\n| Structure | Meaning | Python commands |\n|---|---|---|\n| **Sequence** | commands run one after another from top to bottom | `=`, `input()`, `print()` |\n| **Branching** | choose to run or skip a block depending on a condition | `if`, `if ... else` |\n| **Loop** | repeat a block | `for` (known count), `while` (unknown count) |\n\nA program usually **combines** all three, for example a loop with an `if` inside.",
    ),
    T(
        "### 3. Thực hành `while` và các lệnh đã học\n\n**Nhiệm vụ 1.** In dãy số tự nhiên từ 1 đến 100 trên **một hàng ngang**.\n\n**Nhiệm vụ 2.** In các chữ cái tiếng Anh từ `A` đến `Z` thành ba hàng: hai hàng đầu 10 chữ, hàng cuối 6 chữ. Hai lệnh hỗ trợ:\n\n- `ord(<kí tự>)` cho số thứ tự của kí tự trong bảng mã Unicode, ví dụ `ord(\"A\")` là `65`;\n- `chr(k)` cho kí tự có số thứ tự `k`, ví dụ `chr(66)` là `\"B\"`.\n\nLệnh `print()` **không có tham số** có nghĩa là xuống dòng.\n\n**So sánh `for` và `while`:** tổng bình phương các số từ 5 đến 10 viết được bằng cả hai lệnh, kết quả như nhau: $25 + 36 + 49 + 64 + 81 + 100 = 355$.",
        "### 3. Practice: `while` with the commands you know\n\n**Task 1.** Print the natural numbers from 1 to 100 on **one line**.\n\n**Task 2.** Print the English letters `A` to `Z` in three rows: the first two rows have 10 letters, the last has 6. Two helper commands:\n\n- `ord(<character>)` gives the position of the character in the Unicode table, for example `ord(\"A\")` is `65`;\n- `chr(k)` gives the character at position `k`, for example `chr(66)` is `\"B\"`.\n\n`print()` **with no argument** means a line break.\n\n**`for` versus `while`:** the sum of squares of the numbers 5 to 10 can be written with either loop with the same result: $25 + 36 + 49 + 64 + 81 + 100 = 355$.",
    ),
    trace_block(
        sim("Nhiệm vụ 1: in dãy số từ 1 đến 100", "Task 1: print the numbers 1 to 100", "k tăng 1 sau mỗi lần in; vòng lặp dừng khi k = 101.", "k grows by 1 after each print; the loop stops when k = 101."),
        """k = 1
while k <= 100:
    print(k, end=" ")
    k = k + 1""",
    ),
    trace_block(
        sim("Nhiệm vụ 2: chữ cái A đến Z thành ba hàng", "Task 2: letters A to Z in three rows", "dem đếm số chữ đã in; cứ đủ 10 chữ thì print() xuống dòng. Hàng cuối chỉ còn 6 chữ.", "dem counts the printed letters; every 10 letters print() starts a new line. The last row has only 6 letters."),
        """k = ord("A")
dem = 0
while k <= ord("Z"):
    print(chr(k), end=" ")
    dem = dem + 1
    if dem % 10 == 0:
        print()
    k = k + 1""",
    ),
    trace_block(
        sim("Thay for bằng while: tổng bình phương từ 5 đến 10", "Replacing for with while: sum of squares from 5 to 10", "Vòng for và vòng while cho cùng kết quả 355.", "The for loop and the while loop give the same result 355."),
        """S = 0
for i in range(5, 11):
    S = S + i * i
print("for:", S)
S = 0
i = 5
while i <= 10:
    S = S + i * i
    i = i + 1
print("while:", S)""",
    ),
    trace_block(
        sim("Nhập thu nhập đến khi gặp số không dương", "Reading incomes until a non-positive number", "Không biết trước số lần nhập: vòng lặp dừng khi giá trị nhập vào ≤ 0.", "The number of inputs is unknown: the loop stops when the entered value is ≤ 0."),
        """tong = 0
x = int(input("Thu nhập (nhập 0 để dừng): "))
while x > 0:
    tong = tong + x
    x = int(input("Thu nhập (nhập 0 để dừng): "))
print("Tổng thu nhập:", tong)""",
        ["5", "8", "3", "0"],
    ),
    trace_block(
        sim("Vừa gà vừa chó bằng while", "Chickens and dogs with while", "Thử ga = 0, 1, …, 36 bằng vòng while; điều kiện 2 × ga + 4 × cho = 100 chỉ đúng khi ga = 22.", "Try ga = 0, 1, …, 36 with a while loop; 2 × ga + 4 × cho = 100 holds only for ga = 22."),
        """ga = 0
while ga <= 36:
    cho = 36 - ga
    if ga * 2 + cho * 4 == 100:
        print("Gà:", ga, "Chó:", cho)
    ga = ga + 1""",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| `while` | lặp khi **chưa biết trước** số lần |\n| Cú pháp | `while điều kiện:` + khối lệnh thụt vào |\n| Kiểm tra điều kiện | **trước** mỗi lần lặp |\n| Vòng lặp vô hạn | điều kiện luôn đúng, thân vòng lặp không đổi biến điều kiện |\n| Ba cấu trúc | tuần tự, rẽ nhánh, lặp |\n| `ord()` / `chr()` | kí tự ↔ số thứ tự Unicode |\n\n**Tự kiểm tra:** `i = 1; while i <= 3: print(i); i = i + 1` in ra gì? (đáp án: `1`, `2`, `3` mỗi số một dòng). Vì sao `k = 1; while k < 10: print(k)` không dừng? (đáp án: `k` không bao giờ đổi nên điều kiện luôn đúng).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| `while` | loop when the number of repeats is **not known** |\n| Syntax | `while condition:` + indented block |\n| Checking the condition | **before** each repetition |\n| Infinite loop | condition always true, body does not change the condition variable |\n| Three structures | sequence, branching, loop |\n| `ord()` / `chr()` | character ↔ Unicode position |\n\n**Self-check:** what does `i = 1; while i <= 3: print(i); i = i + 1` print? (answer: `1`, `2`, `3`, one per line). Why does `k = 1; while k < 10: print(k)` never stop? (answer: `k` never changes so the condition is always true).",
    ),
]

questions = [
    mc("tin10-b21-mc-01", 1, "Câu lệnh lặp while phù hợp nhất khi nào?", "When is the while loop most suitable?",
       "while dùng khi số lần lặp chưa biết trước và phụ thuộc vào điều kiện.", "while is used when the number of repeats is unknown and depends on a condition.", "C",
       ("Khi biết trước số lần lặp", "When the number of repeats is known"), ("Khi chỉ cần thực hiện lệnh đúng một lần", "When a command needs to run exactly once"), ("Khi số lần lặp chưa biết trước, phụ thuộc điều kiện", "When the number of repeats is unknown and depends on a condition"), ("Khi không cần kiểm tra điều kiện", "When no condition needs checking")),
    mc("tin10-b21-mc-02", 1, "Trong lệnh while, điều kiện lặp được kiểm tra vào thời điểm nào?", "When is the loop condition of while checked?",
       "while kiểm tra điều kiện trước khi thực hiện khối lệnh trong mỗi lần lặp.", "while checks the condition before running the block in each repetition.", "D",
       ("Sau mỗi lần lặp", "After each repetition"), ("Sau khi kết thúc toàn bộ vòng lặp", "After the whole loop ends"), ("Chỉ kiểm tra một lần duy nhất", "Only once"), ("Trước khi thực hiện khối lệnh lặp", "Before running the loop block")),
    mc("tin10-b21-mc-03", 1, "Trong Python, câu lệnh nào là cú pháp đúng của vòng lặp while?", "In Python, which is the correct syntax of a while loop?",
       "Python viết while <điều kiện>: rồi khối lệnh thụt vào; không dùng do hay then.", "Python writes while <condition>: followed by an indented block; no do or then.", "B",
       ("while i < 5 (không có dấu hai chấm)", "while i < 5 (no colon)"), ("while i < 5: rồi print(i) thụt vào", "while i < 5: then an indented print(i)"), ("while (i < 5) do rồi print(i)", "while (i < 5) do then print(i)"), ("while i < 5 then rồi print(i)", "while i < 5 then print(i)")),
    mc("tin10-b21-mc-04", 1, "Điều gì xảy ra nếu điều kiện của while luôn đúng và không có lệnh thay đổi điều kiện?", "What happens if the while condition is always true and nothing changes it?",
       "Điều kiện không bao giờ sai nên vòng lặp không dừng: vòng lặp vô hạn.", "The condition never becomes false so the loop never stops: an infinite loop.", "A",
       ("Chương trình rơi vào vòng lặp vô hạn", "The program falls into an infinite loop"), ("Vòng lặp chỉ chạy một lần", "The loop runs only once"), ("Chương trình kết thúc ngay", "The program ends at once"), ("Chương trình chạy nhanh hơn", "The program runs faster")),
    mc("tin10-b21-mc-05", 2, "Đoạn i = 1; while i <= 3: print(i); i = i + 1 in ra kết quả nào?", "What does i = 1; while i <= 3: print(i); i = i + 1 print?",
       "i nhận 1, 2, 3 rồi i = 4 làm điều kiện sai; in ba số 1, 2, 3 (mỗi số một dòng).", "i takes 1, 2, 3 and then i = 4 makes the condition false; it prints 1, 2, 3 (one per line).", "A",
       ("1 2 3", "1 2 3"), ("1 2", "1 2"), ("1 2 3 4", "1 2 3 4"), ("1", "1")),
    mc("tin10-b21-mc-06", 2, "Với S = 0, k = 1, vòng while k < 100: S = S + k; k = k + 7 cho S bằng bao nhiêu?", "With S = 0, k = 1, what is S after while k < 100: S = S + k; k = k + 7?",
       "S = 1 + 8 + 15 + ... + 99 gồm 15 số hạng cách đều 7: 15 × (1 + 99) / 2 = 750.", "S = 1 + 8 + 15 + ... + 99 has 15 terms 7 apart: 15 × (1 + 99) / 2 = 750.", "C",
       ("700", "700"), ("735", "735"), ("750", "750"), ("825", "825")),
    mc("tin10-b21-mc-07", 2, "Đoạn k = 2; while k < 50: print(k, end=\" \"); k = k + 3 in ra số cuối cùng là số nào?", "What is the last number printed by k = 2; while k < 50: print(k, end=\" \"); k = k + 3?",
       "Dãy 2, 5, 8, ..., 47 (k = 47 + 3 = 50 làm điều kiện k < 50 sai), nên số cuối là 47.", "The sequence 2, 5, 8, ..., 47 (47 + 3 = 50 makes k < 50 false), so the last number is 47.", "D",
       ("50", "50"), ("49", "49"), ("44", "44"), ("47", "47")),
    mc("tin10-b21-mc-08", 2, "Với S = 0, k = 1, vòng while k * k < 100: S = S + k * k; k = k + 1 cho S bằng bao nhiêu?", "With S = 0, k = 1, what is S after while k * k < 100: S = S + k * k; k = k + 1?",
       "k chạy từ 1 đến 9: S = 1 + 4 + 9 + 16 + 25 + 36 + 49 + 64 + 81 = 285.", "k runs from 1 to 9: S = 1 + 4 + 9 + 16 + 25 + 36 + 49 + 64 + 81 = 285.", "B",
       ("385", "385"), ("285", "285"), ("225", "225"), ("100", "100")),
    mc("tin10-b21-mc-09", 2, "Đoạn i = 7; while i < 5: print(i) in ra gì?", "What does i = 7; while i < 5: print(i) print?",
       "Điều kiện 7 < 5 sai ngay từ đầu nên khối lệnh không chạy lần nào, chương trình không in gì.", "The condition 7 < 5 is false from the start, so the block never runs and nothing is printed.", "C",
       ("7", "7"), ("Lặp vô hạn số 7", "The number 7 forever"), ("Không in gì", "Nothing"), ("Báo lỗi", "An error")),
    mc("tin10-b21-mc-10", 2, "Ba cấu trúc lập trình cơ bản của các ngôn ngữ bậc cao là gì?", "What are the three basic programming structures of high-level languages?",
       "Ba cấu trúc cơ bản là tuần tự, rẽ nhánh và lặp.", "The three basic structures are sequence, branching and loop.", "A",
       ("Tuần tự, rẽ nhánh, lặp", "Sequence, branching, loop"), ("Biến, hằng, hàm", "Variable, constant, function"), ("Nhập, xử lí, xuất", "Input, processing, output"), ("Số, xâu, lôgic", "Number, string, logical")),
    mc("tin10-b21-mc-11", 2, "Vòng i = 0; while i < 6: i = i + 2 thực hiện khối lệnh bao nhiêu lần?", "How many times does the loop i = 0; while i < 6: i = i + 2 run its block?",
       "i nhận 0, 2, 4 thì điều kiện đúng (3 lần); khi i = 6 điều kiện sai nên dừng.", "The condition is true for i = 0, 2, 4 (3 times); at i = 6 it is false so the loop stops.", "B",
       ("2", "2"), ("3", "3"), ("4", "4"), ("6", "6")),
    mc("tin10-b21-mc-12", 3, "In các chữ A đến Z, mỗi hàng 10 chữ. Hàng cuối cùng có bao nhiêu chữ?", "Printing the letters A to Z with 10 letters per row, how many letters are in the last row?",
       "26 chữ cái = 10 + 10 + 6 nên hàng thứ ba có 6 chữ.", "26 letters = 10 + 10 + 6, so the third row has 6 letters.", "D",
       ("10", "10"), ("4", "4"), ("26", "26"), ("6", "6")),
]

truefalse = [
    tf("tin10-b21-tf-01", 1, "Xét lệnh lặp while.", "Consider the while loop.",
       "while kiểm tra điều kiện trước, dùng khi chưa biết số lần lặp; cần lệnh làm đổi điều kiện để tránh lặp vô hạn.", "while checks the condition first and is used when the number of repeats is unknown; a command that changes the condition avoids an infinite loop.",
       ("while kiểm tra điều kiện trước khi thực hiện khối lệnh.", "while checks the condition before running the block.", True),
       ("while chỉ dùng được khi biết trước số lần lặp.", "while can only be used when the number of repeats is known.", False),
       ("Thân vòng lặp cần có lệnh làm thay đổi điều kiện, nếu không có thể lặp vô hạn.", "The body needs a command that changes the condition, otherwise the loop may be infinite.", True),
       ("Sau điều kiện của while có dấu hai chấm và khối lệnh thụt vào.", "A colon follows the while condition and the block is indented.", True)),
    tf("tin10-b21-tf-02", 2, "Xét kết quả các đoạn chương trình dùng while.", "Consider the results of programs using while.",
       "Tổng 1 + 8 + ... + 99 là 750; k = 2, 5, ..., 47 dừng trước 50; vòng k * k < 100 chạy với k = 1..9 tức 9 lần.", "The sum 1 + 8 + ... + 99 is 750; k = 2, 5, ..., 47 stops before 50; the loop k * k < 100 runs for k = 1..9, that is 9 times.",
       ("Tổng 1 + 8 + 15 + ... + 99 bằng 750.", "The sum 1 + 8 + 15 + ... + 99 equals 750.", True),
       ("Đoạn k = 2; while k < 50 với k tăng 3 in ra dãy 2, 5, ..., 47.", "k = 2; while k < 50 with k growing by 3 prints 2, 5, ..., 47.", True),
       ("Đoạn trên cũng in ra số 50.", "The program above also prints the number 50.", False),
       ("Vòng while k * k < 100 (k bắt đầu từ 1, tăng 1) lặp đúng 10 lần.", "The loop while k * k < 100 (k starts at 1, grows by 1) repeats exactly 10 times.", False)),
    tf("tin10-b21-tf-03", 2, "Xét các cấu trúc lập trình.", "Consider the programming structures.",
       "Ba cấu trúc là tuần tự, rẽ nhánh, lặp; if thuộc rẽ nhánh còn for, while thuộc lặp; chương trình có thể kết hợp nhiều cấu trúc.", "The three structures are sequence, branching, loop; if is branching while for and while are loops; a program can combine structures.",
       ("Ba cấu trúc cơ bản là tuần tự, rẽ nhánh và lặp.", "The three basic structures are sequence, branching and loop.", True),
       ("Lệnh if thuộc cấu trúc lặp.", "The if statement belongs to the loop structure.", False),
       ("for và while đều thuộc cấu trúc lặp.", "for and while both belong to the loop structure.", True),
       ("Một chương trình chỉ được dùng một cấu trúc duy nhất.", "A program may use only one single structure.", False)),
    tf("tin10-b21-tf-04", 2, "Xét thực hành in chữ cái bằng ord() và chr().", "Consider the practice of printing letters with ord() and chr().",
       "ord(\"A\") = 65, chr(66) = \"B\"; 26 chữ chia ba hàng 10, 10, 6; print() không tham số xuống dòng.", "ord(\"A\") = 65, chr(66) = \"B\"; 26 letters split into rows 10, 10, 6; print() with no argument breaks the line.",
       ("ord(\"A\") có giá trị 65.", "ord(\"A\") has the value 65.", True),
       ("chr(66) cho kí tự \"B\".", "chr(66) gives the character \"B\".", True),
       ("Chia 26 chữ cái thành các hàng 10 chữ thì hàng cuối có 4 chữ.", "Splitting 26 letters into rows of 10 leaves 4 letters in the last row.", False),
       ("print() không có tham số có nghĩa là xuống dòng.", "print() with no argument means a line break.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
