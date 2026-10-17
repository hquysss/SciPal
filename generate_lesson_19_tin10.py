# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_19_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "cau-lenh-re-nhanh-if-bai-19-tin10"
title_vi = "Bài 19. Câu lệnh rẽ nhánh if"
title_en = "Lesson 19. The if branching statement"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nêu được **biểu thức lôgic** và các phép toán `and`, `or`, `not`;\n- viết được lệnh **`if`** dạng thiếu và dạng đủ trong Python;\n- nhớ dấu `:` và **thụt đầu dòng** sau điều kiện;\n- dùng `if` để giải bài toán có nhiều trường hợp, ví dụ tính tiền điện theo bậc thang.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- explain **logical expressions** and the operators `and`, `or`, `not`;\n- write the short and the full form of **`if`** in Python;\n- remember the `:` and the **indentation** after a condition;\n- use `if` for problems with several cases, such as a tiered electricity bill.",
    ),
    T(
        "### 1. Biểu thức lôgic\n\nNgoài đời, ta hay nghĩ: *nếu ngày mai không mưa thì đi chơi, nếu mưa thì ở nhà làm bài*. Việc nào được làm phụ thuộc vào một **điều kiện** đúng hay sai. Trong Python, điều kiện là một **biểu thức lôgic**: biểu thức chỉ nhận giá trị `True` (đúng) hoặc `False` (sai), thuộc kiểu `bool`.\n\n**Các phép so sánh:**\n\n| Phép so sánh | Ý nghĩa |\n|---|---|\n| `<` | nhỏ hơn |\n| `<=` | nhỏ hơn hoặc bằng |\n| `>` | lớn hơn |\n| `>=` | lớn hơn hoặc bằng |\n| `==` | bằng nhau |\n| `!=` | khác nhau |\n\nChú ý: `=` là **gán**, còn `==` mới là **so sánh bằng**.\n\n**Các phép toán lôgic:**\n\n| `A` | `B` | `A and B` | `A or B` | `not A` |\n|---|---|---|---|---|\n| True | True | True | True | False |\n| True | False | False | True | False |\n| False | True | False | True | True |\n| False | False | False | False | True |\n\n`and` chỉ đúng khi **cả hai** vế đúng; `or` chỉ sai khi **cả hai** vế sai; `not` đảo giá trị.",
        "### 1. Logical expressions\n\nIn daily life we often think: *if it does not rain tomorrow, go out; if it rains, stay home and study*. Which action happens depends on whether a **condition** is true or false. In Python the condition is a **logical expression**: an expression whose value is only `True` or `False`, of type `bool`.\n\n**Comparison operators:**\n\n| Operator | Meaning |\n|---|---|\n| `<` | less than |\n| `<=` | less than or equal |\n| `>` | greater than |\n| `>=` | greater than or equal |\n| `==` | equal |\n| `!=` | not equal |\n\nNote: `=` **assigns**, only `==` **compares for equality**.\n\n**Logical operators:**\n\n| `A` | `B` | `A and B` | `A or B` | `not A` |\n|---|---|---|---|---|\n| True | True | True | True | False |\n| True | False | False | True | False |\n| False | True | False | True | True |\n| False | False | False | False | True |\n\n`and` is true only when **both** sides are true; `or` is false only when **both** sides are false; `not` flips the value.",
    ),
    trace_block(
        sim("Ví dụ biểu thức lôgic", "Logical expression example", "Theo dõi từng biến lôgic a, b, c nhận giá trị nào.", "Watch which value each logical variable a, b, c receives."),
        """x = 10
y = 5
z = 9
b = x < 11 and z > 5
c = x > 15 or y < 9
a = not b
print(a, b, c)""",
    ),
    T(
        "Máy tính rất chặt chẽ về **kiểu dữ liệu**. Em thử so sánh số `5` với xâu `'3'` xem Python báo gì.",
        "Computers are strict about **data types**. Try comparing the number `5` with the string `'3'` and see what Python reports.",
    ),
    trace_block(
        sim("So sánh số với xâu", "Comparing a number with a string", "Bước cuối báo lỗi TypeError: Python không so sánh được số nguyên với xâu.", "The last step shows a TypeError: Python cannot compare an integer with a string."),
        """a = 5
b = '3'
print(a > b)""",
    ),
    T(
        "### 2. Lệnh `if`\n\nLệnh `if` cho chương trình **làm hay bỏ qua** một khối lệnh tùy điều kiện.\n\n**Dạng thiếu:**\n\n```python\nif <điều kiện>:\n    <khối lệnh>\n```\n\n**Dạng đủ:**\n\n```python\nif <điều kiện>:\n    <khối lệnh 1>\nelse:\n    <khối lệnh 2>\n```\n\nĐiều kiện đúng thì làm khối lệnh 1, sai thì làm khối lệnh 2 (dạng đủ) hoặc bỏ qua (dạng thiếu).\n\n**Cú pháp cần nhớ:**\n\n- sau `<điều kiện>` và sau `else` đều có dấu **`:`**;\n- các lệnh trong khối phải **thụt vào** cùng một mức (1 phím Tab hoặc 4 dấu cách). Thiếu thụt đầu dòng, Python báo `IndentationError`.\n\nCách viết này làm chương trình Python dễ đọc và tường minh.",
        "### 2. The `if` statement\n\n`if` lets the program **run or skip** a block of commands depending on a condition.\n\n**Short form:**\n\n```python\nif <condition>:\n    <block>\n```\n\n**Full form:**\n\n```python\nif <condition>:\n    <block 1>\nelse:\n    <block 2>\n```\n\nWhen the condition is true, run block 1; when false, run block 2 (full form) or skip (short form).\n\n**Syntax to remember:**\n\n- a **`:`** follows `<condition>` and `else`;\n- commands inside a block must be **indented** to the same level (one Tab or 4 spaces). Without indentation Python reports `IndentationError`.\n\nThis style makes Python programs easy to read and explicit.",
    ),
    trace_block(
        sim("Số chẵn hay lẻ — nhập 7", "Even or odd — input 7", "Điều kiện n % 2 == 0 sai nên chương trình đi vào nhánh else.", "The condition n % 2 == 0 is false, so the program takes the else branch."),
        """n = int(input("Nhập n: "))
if n % 2 == 0:
    print(n, "là số chẵn")
else:
    print(n, "là số lẻ")
print("Xong")""",
        ["7"],
    ),
    trace_block(
        sim("Số chẵn hay lẻ — nhập 10", "Even or odd — input 10", "Cùng chương trình, nhập 10: điều kiện đúng nên đi vào nhánh if.", "Same program with input 10: the condition is true, so it takes the if branch."),
        """n = int(input("Nhập n: "))
if n % 2 == 0:
    print(n, "là số chẵn")
else:
    print(n, "là số lẻ")
print("Xong")""",
        ["10"],
    ),
    T(
        "### 3. Thực hành: tính tiền điện theo bậc thang\n\nGiá điện sinh hoạt tính lũy kế theo từng kWh:\n\n| Mức tiêu thụ | Giá mỗi kWh |\n|---|---|\n| từ 0 đến 50 kWh | 1 678 đồng |\n| từ 51 đến 100 kWh | 1 734 đồng |\n| từ 101 kWh trở lên | 2 014 đồng |\n\nNghĩa là 50 kWh đầu tính giá bậc 1, 50 kWh tiếp theo tính giá bậc 2, phần còn lại tính giá bậc 3. Chương trình dùng hai lệnh `if` lồng nhau để chọn trường hợp. Với 80 kWh: 50 × 1 678 + 30 × 1 734 = 135 920 đồng.",
        "### 3. Practice: a tiered electricity bill\n\nHousehold electricity is charged cumulatively per kWh:\n\n| Usage | Price per kWh |\n|---|---|\n| 0 to 50 kWh | 1,678 VND |\n| 51 to 100 kWh | 1,734 VND |\n| 101 kWh and above | 2,014 VND |\n\nThe first 50 kWh use tier 1, the next 50 kWh use tier 2, and the rest use tier 3. The program picks the case with two nested `if` statements. For 80 kWh: 50 × 1,678 + 30 × 1,734 = 135,920 VND.",
    ),
    trace_block(
        sim("Tính tiền điện — 80 kWh", "Electricity bill — 80 kWh", "Điều kiện kwh <= 50 sai, kwh <= 100 đúng: tiền = 50 × 1678 + (80 − 50) × 1734.", "kwh <= 50 is false and kwh <= 100 is true: bill = 50 × 1678 + (80 − 50) × 1734."),
        """kwh = int(input("Số kWh: "))
if kwh <= 50:
    tien = kwh * 1678
else:
    if kwh <= 100:
        tien = 50 * 1678 + (kwh - 50) * 1734
    else:
        tien = 50 * 1678 + 50 * 1734 + (kwh - 100) * 2014
print("Tiền điện:", tien, "đồng")""",
        ["80"],
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Biểu thức lôgic | chỉ `True` hoặc `False` (kiểu `bool`) |\n| So sánh bằng | `==` (không phải `=`) |\n| `and` / `or` / `not` | và / hoặc / phủ định |\n| `if` dạng thiếu | `if điều kiện:` + khối thụt vào |\n| `if` dạng đủ | thêm `else:` cho trường hợp ngược lại |\n| Lỗi hay gặp | thiếu `:` hoặc quên thụt đầu dòng |\n\n**Tự kiểm tra:** viết điều kiện cho *\"y nhỏ hơn 1 hoặc lớn hơn 2\"* (đáp án: `y < 1 or y > 2`) và *\"x nằm giữa 0 và 10\"* (đáp án: `0 < x < 10`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Logical expression | only `True` or `False` (type `bool`) |\n| Equality test | `==` (not `=`) |\n| `and` / `or` / `not` | and / or / negation |\n| short `if` | `if condition:` + indented block |\n| full `if` | add `else:` for the opposite case |\n| Common errors | missing `:` or forgotten indentation |\n\n**Self-check:** write the condition for *\"y is less than 1 or greater than 2\"* (answer: `y < 1 or y > 2`) and *\"x is between 0 and 10\"* (answer: `0 < x < 10`).",
    ),
]

questions = [
    mc("tin10-b19-mc-01", 1, "Câu lệnh if dùng để làm gì?", "What is the if statement used for?",
       "if cho chương trình thực hiện hay bỏ qua một khối lệnh tùy điều kiện đúng hay sai.", "if makes the program run or skip a block depending on whether a condition is true or false.", "B",
       ("Lặp lại một khối lệnh nhiều lần", "Repeat a block many times"), ("Thực hiện lệnh theo điều kiện đúng/sai", "Run commands according to a true/false condition"), ("Khai báo biến", "Declare a variable"), ("Kết thúc chương trình", "End the program")),
    mc("tin10-b19-mc-02", 1, "Biểu thức lôgic nhận giá trị thuộc kiểu nào?", "What type are the values of a logical expression?",
       "Biểu thức lôgic chỉ nhận True hoặc False, thuộc kiểu bool.", "A logical expression is only True or False, of type bool.", "C",
       ("Số nguyên", "Integer"), ("Xâu kí tự", "String"), ("bool (True hoặc False)", "bool (True or False)"), ("Số thực", "Real number")),
    mc("tin10-b19-mc-03", 1, "Biểu thức 100 % 4 == 0 có giá trị gì?", "What is the value of 100 % 4 == 0?",
       "100 chia hết cho 4 nên 100 % 4 bằng 0 và phép so sánh cho True.", "100 is divisible by 4, so 100 % 4 is 0 and the comparison gives True.", "A",
       ("True", "True"), ("False", "False"), ("0", "0"), ("Báo lỗi", "An error")),
    mc("tin10-b19-mc-04", 1, "Sau điều kiện của lệnh if trong Python phải có kí tự nào?", "Which character must follow the condition of an if statement in Python?",
       "Sau điều kiện là dấu hai chấm, rồi xuống dòng và thụt đầu dòng.", "A colon follows the condition, then a new line and an indented block.", "D",
       ("Dấu chấm phẩy ;", "A semicolon ;"), ("Dấu chấm .", "A period ."), ("Từ then", "The word then"), ("Dấu hai chấm :", "A colon :")),
    mc("tin10-b19-mc-05", 2, "Cho x = 10, y = 5. Biểu thức x > 15 or y < 9 có giá trị gì?", "Given x = 10, y = 5, what is x > 15 or y < 9?",
       "x > 15 sai nhưng y < 9 đúng; or chỉ sai khi cả hai vế sai nên kết quả là True.", "x > 15 is false but y < 9 is true; or is false only when both sides are false, so the result is True.", "A",
       ("True", "True"), ("False", "False"), ("10", "10"), ("5", "5")),
    mc("tin10-b19-mc-06", 2, "Biểu thức not (3 > 2) có giá trị gì?", "What is the value of not (3 > 2)?",
       "3 > 2 là True, phủ định của True là False.", "3 > 2 is True, and the negation of True is False.", "B",
       ("True", "True"), ("False", "False"), ("3", "3"), ("2", "2")),
    mc("tin10-b19-mc-07", 2, "Với a = 5, đoạn lệnh: if a > 3: (xuống dòng, thụt vào) print(\"OK\") cho kết quả gì?", "With a = 5, what does the code do: if a > 3: (new line, indented) print(\"OK\")?",
       "a > 3 đúng nên khối lệnh thụt vào được thực hiện và in chữ OK.", "a > 3 is true, so the indented block runs and prints OK.", "C",
       ("Không in gì", "Prints nothing"), ("Báo lỗi", "Reports an error"), ("In ra chữ OK", "Prints OK"), ("In ra số 5", "Prints 5")),
    mc("tin10-b19-mc-08", 2, "Khi điều kiện của lệnh if dạng thiếu là sai, chương trình làm gì?", "When the condition of a short if is false, what does the program do?",
       "Dạng thiếu không có else, nên khối lệnh bị bỏ qua và chương trình chạy tiếp lệnh sau đó.", "The short form has no else, so the block is skipped and execution continues with the next statement.", "A",
       ("Bỏ qua khối lệnh và chạy tiếp", "Skips the block and continues"), ("Luôn thực hiện khối lệnh", "Always runs the block"), ("Dừng chương trình", "Stops the program"), ("In ra thông báo lỗi", "Prints an error message")),
    mc("tin10-b19-mc-09", 2, "Nhập n = 7 vào chương trình kiểm tra n % 2 == 0 (in \"chẵn\" nếu đúng, ngược lại in \"lẻ\"). Chương trình in gì?", "Input n = 7 into a program that tests n % 2 == 0 (prints \"even\" if true, otherwise \"odd\"). What does it print?",
       "7 % 2 bằng 1 nên điều kiện sai và nhánh else in lẻ.", "7 % 2 is 1, so the condition is false and the else branch prints odd.", "D",
       ("chẵn", "even"), ("chẵn rồi lẻ", "even then odd"), ("Không in gì", "Nothing"), ("lẻ", "odd")),
    mc("tin10-b19-mc-10", 2, "Giá điện: 50 kWh đầu 1 678 đồng, 50 kWh tiếp 1 734 đồng, từ kWh 101 là 2 014 đồng. Dùng 120 kWh phải trả bao nhiêu đồng?", "Electricity: first 50 kWh at 1,678 VND, next 50 at 1,734, from the 101st at 2,014. How much for 120 kWh?",
       "50 × 1 678 + 50 × 1 734 + 20 × 2 014 = 83 900 + 86 700 + 40 280 = 210 880 đồng.", "50 × 1,678 + 50 × 1,734 + 20 × 2,014 = 83,900 + 86,700 + 40,280 = 210,880 VND.", "B",
       ("241 680", "241,680"), ("210 880", "210,880"), ("201 400", "201,400"), ("170 000", "170,000")),
    mc("tin10-b19-mc-11", 2, "Phép so sánh 5 > '3' trong Python cho kết quả gì?", "What does the comparison 5 > '3' give in Python?",
       "Python không so sánh được số nguyên với xâu kí tự nên báo TypeError.", "Python cannot compare an integer with a string, so it raises a TypeError.", "C",
       ("True", "True"), ("False", "False"), ("Báo lỗi TypeError", "A TypeError"), ("Báo lỗi IndentationError", "An IndentationError")),
    mc("tin10-b19-mc-12", 3, "Dòng if (a = b) and (a = c): bị lỗi vì lí do nào?", "Why is the line if (a = b) and (a = c): wrong?",
       "Dấu = là phép gán; so sánh bằng phải dùng ==. Cần sửa thành if (a == b) and (a == c):.", "The sign = is assignment; equality needs ==. It should be if (a == b) and (a == c):.", "A",
       ("Dùng = thay vì == để so sánh", "It uses = instead of == to compare"), ("Thiếu từ khóa then", "The keyword then is missing"), ("Dùng and thay vì or", "It uses and instead of or"), ("Thiếu dấu chấm phẩy", "A semicolon is missing")),
]

truefalse = [
    tf("tin10-b19-tf-01", 2, "Xét các phép toán lôgic and, or, not.", "Consider the logical operators and, or, not.",
       "and cần cả hai vế đúng; or chỉ sai khi cả hai vế sai; not đảo giá trị.", "and needs both sides true; or is false only when both are false; not flips the value.",
       ("A and B chỉ đúng khi cả A và B đều đúng.", "A and B is true only when both A and B are true.", True),
       ("A or B chỉ sai khi cả A và B đều sai.", "A or B is false only when both A and B are false.", True),
       ("not True có giá trị True.", "not True has the value True.", False),
       ("Biểu thức lôgic có thể nhận giá trị Có hoặc Không.", "A logical expression can be Yes or No.", False)),
    tf("tin10-b19-tf-02", 2, "Xét cú pháp của lệnh if trong Python.", "Consider the syntax of the if statement in Python.",
       "Sau điều kiện và sau else đều có dấu hai chấm; khối lệnh phải thụt vào cùng mức.", "A colon follows the condition and else; the block must be indented to the same level.",
       ("Sau điều kiện của if có dấu hai chấm.", "A colon follows the condition of if.", True),
       ("Các lệnh trong khối phải thụt vào cùng một mức.", "Commands in the block must be indented to the same level.", True),
       ("Bỏ thụt đầu dòng thì Python vẫn hiểu đúng.", "Without indentation Python still understands correctly.", False),
       ("Từ khóa else cũng đi kèm dấu hai chấm.", "The keyword else is also followed by a colon.", True)),
    tf("tin10-b19-tf-03", 2, "Cho x = 10, y = 5, z = 9. Xét giá trị các biểu thức.", "Given x = 10, y = 5, z = 9. Consider the values of the expressions.",
       "x < 11 và z > 5 đều đúng; x > 15 sai, y < 9 đúng.", "x < 11 and z > 5 are both true; x > 15 is false, y < 9 is true.",
       ("x < 11 and z > 5 có giá trị True.", "x < 11 and z > 5 is True.", True),
       ("x > 15 or y < 9 có giá trị False.", "x > 15 or y < 9 is False.", False),
       ("not (x < 11) có giá trị False.", "not (x < 11) is False.", True),
       ("x > 15 and y < 9 có giá trị True.", "x > 15 and y < 9 is True.", False)),
    tf("tin10-b19-tf-04", 2, "Xét bài toán tính tiền điện theo bậc thang (1 678 / 1 734 / 2 014 đồng).", "Consider the tiered electricity bill (1,678 / 1,734 / 2,014 VND).",
       "Giá tính lũy kế: mỗi phần kWh tính theo giá của bậc chứa nó, không tính cả số điện theo giá bậc cao nhất.", "Prices are cumulative: each part of the kWh uses the price of its own tier, not the top price for the whole amount.",
       ("Dùng 40 kWh phải trả 40 × 1 678 = 67 120 đồng.", "Using 40 kWh costs 40 × 1,678 = 67,120 VND.", True),
       ("Dùng 80 kWh phải trả 50 × 1 678 + 30 × 1 734 = 135 920 đồng.", "Using 80 kWh costs 50 × 1,678 + 30 × 1,734 = 135,920 VND.", True),
       ("Dùng 120 kWh thì cả 120 kWh đều tính giá 2 014 đồng.", "Using 120 kWh charges all 120 kWh at 2,014 VND.", False),
       ("Chương trình cần ít nhất hai điều kiện để phân biệt ba bậc giá.", "The program needs at least two conditions to tell the three tiers apart.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
