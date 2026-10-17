# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_31_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "thuc-hanh-viet-chuong-trinh-don-gian-bai-31-tin10"
title_vi = "Bài 31. Thực hành viết chương trình đơn giản"
title_en = "Lesson 31. Practice: writing simple programs"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


PHAN_TICH = """n = int(input("Nhập n: "))
if n < 2:
    print(n, "không là số nguyên tố, cũng không là hợp số")
else:
    kq = []
    m = n
    i = 2
    while m > 1:
        if m % i == 0:
            kq.append(i)
            m = m // i
        else:
            i = i + 1
    if len(kq) == 1:
        print(n, "là số nguyên tố")
    else:
        print(n, "là hợp số, phân tích:", kq)"""

PT_BAC_HAI = """a = float(input("a = "))
b = float(input("b = "))
c = float(input("c = "))
if a == 0:
    if b == 0:
        if c == 0:
            print("Vô số nghiệm")
        else:
            print("Vô nghiệm")
    else:
        print("Nghiệm duy nhất x =", -c / b)
else:
    delta = b * b - 4 * a * c
    if delta < 0:
        print("Vô nghiệm")
    elif delta == 0:
        print("Nghiệm kép x =", -b / (2 * a))
    else:
        can = delta ** 0.5
        print("Hai nghiệm:", (-b - can) / (2 * a), (-b + can) / (2 * a))"""

blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- viết được chương trình Python hoàn chỉnh cho hai bài toán: **phân tích một số thành thừa số nguyên tố** và **giải phương trình bậc hai**;\n- chia bài toán thành các **trường hợp** rồi dùng `if`, `elif`, `else` và vòng lặp `while` để xử lí đủ mọi trường hợp;\n- vận dụng hai cách gỡ rối: **in giá trị trung gian** và **điểm dừng**;\n- kiểm tra chương trình bằng dữ liệu đặc biệt như `n = 1`, `a = 0`.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- write complete Python programs for two problems: **factorising a number into primes** and **solving a quadratic equation**;\n- split a problem into **cases** and use `if`, `elif`, `else` and a `while` loop to cover every case;\n- use two debugging methods: **printing intermediate values** and **breakpoints**;\n- test a program with special data such as `n = 1`, `a = 0`.",
    ),
    T(
        "### 1. Nhiệm vụ 1: số nguyên tố và phân tích thừa số nguyên tố\n\n**Đề bài.** Nhập số tự nhiên `n`. Kiểm tra `n` có phải số nguyên tố không; nếu `n` là hợp số thì in phân tích `n` thành các thừa số nguyên tố. Chú ý: số 1 **không** là số nguyên tố và cũng **không** là hợp số.\n\n**Ý tưởng.** Thử chia `n` cho `i = 2, 3, 4, …`:\n\n- nếu `n` chia hết cho `i`: ghi `i` vào danh sách `kq`, thay `n` bằng `n // i` và **thử lại với cùng `i`** (vì một thừa số có thể xuất hiện nhiều lần, như `60 = 2 × 2 × 3 × 5`);\n- nếu không chia hết: tăng `i` thêm 1;\n- lặp đến khi phần còn lại bằng 1.\n\nNếu danh sách `kq` chỉ có **một** thừa số thì `n` là số nguyên tố; có từ hai thừa số trở lên thì `n` là hợp số. Chương trình dùng thêm biến `m` để giữ nguyên giá trị `n` ban đầu cho lời in.",
        "### 1. Task 1: primes and prime factorisation\n\n**Problem.** Read a natural number `n`. Check whether `n` is prime; if `n` is composite, print its prime factorisation. Note: 1 is **not** a prime and **not** composite either.\n\n**Idea.** Try dividing `n` by `i = 2, 3, 4, …`:\n\n- if `n` is divisible by `i`: append `i` to the list `kq`, replace `n` by `n // i` and **try the same `i` again** (a factor may appear several times, as in `60 = 2 × 2 × 3 × 5`);\n- otherwise: increase `i` by 1;\n- repeat until what is left is 1.\n\nIf `kq` has only **one** factor, `n` is prime; with two or more factors, `n` is composite. The program uses an extra variable `m` so that the original `n` is kept for the message.",
    ),
    trace_block(
        sim("Nhập n = 17: số nguyên tố", "Input n = 17: a prime", "Không có i nào từ 2 đến 16 chia hết 17; đến i = 17 mới chia hết, danh sách chỉ có một thừa số [17].", "No i from 2 to 16 divides 17; only i = 17 does, so the list holds one factor, [17]."),
        PHAN_TICH,
        ["17"],
    ),
    trace_block(
        sim("Nhập n = 60: hợp số", "Input n = 60: composite", "i = 2 chia được hai lần, i = 3 một lần, rồi i = 5 một lần: 60 = 2 × 2 × 3 × 5.", "i = 2 divides twice, i = 3 once, then i = 5 once: 60 = 2 × 2 × 3 × 5."),
        PHAN_TICH,
        ["60"],
    ),
    trace_block(
        sim("Dữ liệu đặc biệt: n = 1", "Special data: n = 1", "n = 1 vào nhánh n < 2: không là số nguyên tố, cũng không là hợp số.", "n = 1 takes the n < 2 branch: neither prime nor composite."),
        PHAN_TICH,
        ["1"],
    ),
    T(
        "**Gỡ rối.** Khi kết quả không như mong đợi, có hai cách:\n\n1. Chèn `print()` vào vòng lặp để xem `i`, `m` và `kq` sau mỗi lượt;\n2. Đặt điểm dừng ở dòng `if m % i == 0:` rồi chạy từng lệnh, nhìn các biến.\n\nCác mô phỏng ở trên cho bạn cùng thông tin đó: ở mỗi bước, bảng biến hiển thị `n`, `kq`, `m`, `i`. Hãy kiểm tra thêm các dữ liệu đặc biệt: `n = 0`, `n = 2`, một số chính phương như `n = 49`.",
        "**Debugging.** When the result is not as expected there are two ways:\n\n1. Insert `print()` in the loop to see `i`, `m` and `kq` after each pass;\n2. Set a breakpoint at the line `if m % i == 0:` and run command by command, watching the variables.\n\nThe simulations above give you the same information: at each step the variable table shows `n`, `kq`, `m`, `i`. Also test special data: `n = 0`, `n = 2`, a square such as `n = 49`.",
    ),
    T(
        "### 2. Nhiệm vụ 2: giải phương trình bậc hai\n\n**Đề bài.** Nhập ba số thực `a`, `b`, `c` và tìm nghiệm của phương trình `ax² + bx + c = 0`. Chương trình phải xét **đầy đủ các trường hợp**:\n\n| Trường hợp | Kết luận |\n|---|---|\n| `a = 0`, `b = 0`, `c = 0` | vô số nghiệm |\n| `a = 0`, `b = 0`, `c ≠ 0` | vô nghiệm |\n| `a = 0`, `b ≠ 0` | một nghiệm `x = −c / b` |\n| `a ≠ 0`, `Δ = b² − 4ac < 0` | vô nghiệm |\n| `a ≠ 0`, `Δ = 0` | nghiệm kép `x = −b / (2a)` |\n| `a ≠ 0`, `Δ > 0` | hai nghiệm `x = (−b ± √Δ) / (2a)` |\n\nCăn bậc hai tính bằng `delta ** 0.5`. Các `if` lồng nhau thể hiện đúng cây quyết định ở bảng trên.",
        "### 2. Task 2: solving a quadratic equation\n\n**Problem.** Read three real numbers `a`, `b`, `c` and find the solutions of `ax² + bx + c = 0`. The program must cover **every case**:\n\n| Case | Conclusion |\n|---|---|\n| `a = 0`, `b = 0`, `c = 0` | infinitely many solutions |\n| `a = 0`, `b = 0`, `c ≠ 0` | no solution |\n| `a = 0`, `b ≠ 0` | one solution `x = −c / b` |\n| `a ≠ 0`, `Δ = b² − 4ac < 0` | no solution |\n| `a ≠ 0`, `Δ = 0` | double root `x = −b / (2a)` |\n| `a ≠ 0`, `Δ > 0` | two solutions `x = (−b ± √Δ) / (2a)` |\n\nThe square root is `delta ** 0.5`. The nested `if` statements follow the decision tree in the table.",
    ),
    trace_block(
        sim("x² − 5x + 6 = 0: hai nghiệm", "x² − 5x + 6 = 0: two solutions", "Δ = 25 − 24 = 1 > 0 nên có hai nghiệm 2.0 và 3.0.", "Δ = 25 − 24 = 1 > 0 so there are two solutions, 2.0 and 3.0."),
        PT_BAC_HAI,
        ["1", "-5", "6"],
    ),
    trace_block(
        sim("2x² + 4x + 2 = 0: nghiệm kép", "2x² + 4x + 2 = 0: a double root", "Δ = 16 − 16 = 0 nên nghiệm kép x = −4 / 4 = −1.0.", "Δ = 16 − 16 = 0 so the double root is x = −4 / 4 = −1.0."),
        PT_BAC_HAI,
        ["2", "4", "2"],
    ),
    trace_block(
        sim("0x² + 2x − 6 = 0: không còn là bậc hai", "0x² + 2x − 6 = 0: no longer quadratic", "a = 0 và b ≠ 0 nên chương trình đi vào nhánh phương trình bậc nhất: x = 6 / 2 = 3.0.", "a = 0 and b ≠ 0 so the program takes the linear branch: x = 6 / 2 = 3.0."),
        PT_BAC_HAI,
        ["0", "2", "-6"],
    ),
    T(
        "### 3. Luyện tập và vận dụng: năm nhuận\n\nMột năm là **năm nhuận** nếu chia hết cho 400, hoặc chia hết cho 4 nhưng không chia hết cho 100. Ví dụ 2000 và 2024 là năm nhuận, còn 1900 và 2100 thì không.\n\nBài toán: đếm số năm nhuận từ năm 2000 đến năm 2100. Chương trình dùng `for` duyệt từng năm và `if` kiểm tra điều kiện; theo dõi biến `dem` tăng lên mỗi khi gặp một năm nhuận. Kết quả là **25 năm nhuận** (2000, 2004, …, 2096; năm 2100 không nhuận).\n\nCác bài làm thêm cùng dạng: tìm vị trí đầu tiên trong dãy `A` có ba số hạng liên tiếp là 1, 2, 3; đưa các chữ số về bên trái xâu; in các ước nguyên tố khác nhau của `n`.",
        "### 3. Practice and application: leap years\n\nA year is a **leap year** if it is divisible by 400, or divisible by 4 but not by 100. For example 2000 and 2024 are leap years, while 1900 and 2100 are not.\n\nProblem: count the leap years from 2000 to 2100. The program walks through every year with `for` and tests the condition with `if`; watch the variable `dem` grow each time a leap year is found. The result is **25 leap years** (2000, 2004, …, 2096; the year 2100 is not leap).\n\nSimilar extra exercises: find the first position in a list `A` where three consecutive items are 1, 2, 3; move the digits to the left of a string; print the distinct prime divisors of `n`.",
    ),
    trace_block(
        sim("Đếm năm nhuận từ 2000 đến 2100", "Counting leap years from 2000 to 2100", "Biến dem tăng 1 mỗi khi điều kiện năm nhuận đúng; kết thúc dem = 25.", "The variable dem increases by 1 whenever the leap-year condition holds; it ends at dem = 25."),
        """dem = 0
for nam in range(2000, 2101):
    if nam % 400 == 0 or (nam % 4 == 0 and nam % 100 != 0):
        dem = dem + 1
print("Số năm nhuận:", dem)""",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Số 1 | không là số nguyên tố, không là hợp số |\n| Phân tích thừa số | thử `i` từ 2; chia hết thì ghi `i` và **thử lại cùng `i`**, không chia hết mới tăng `i` |\n| Phương trình bậc hai | xét `a = 0` trước, rồi `Δ < 0`, `Δ = 0`, `Δ > 0` |\n| Năm nhuận | chia hết 400, hoặc chia hết 4 mà không chia hết 100 |\n| Gỡ rối | `print()` giá trị trung gian hoặc điểm dừng |\n| Kiểm thử | luôn thử dữ liệu đặc biệt: `n = 1`, `a = 0`, `Δ = 0` |\n\n**Tự kiểm tra:** phân tích `36` thành thừa số nguyên tố (đáp án: `[2, 2, 3, 3]`). Phương trình `x² + x + 1 = 0` có nghiệm không? (đáp án: không, vì `Δ = 1 − 4 = −3 < 0`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| The number 1 | neither prime nor composite |\n| Factorising | try `i` from 2; if it divides, record `i` and **try the same `i` again**; only otherwise increase `i` |\n| Quadratic equation | handle `a = 0` first, then `Δ < 0`, `Δ = 0`, `Δ > 0` |\n| Leap year | divisible by 400, or by 4 but not by 100 |\n| Debugging | `print()` intermediate values or breakpoints |\n| Testing | always try special data: `n = 1`, `a = 0`, `Δ = 0` |\n\n**Self-check:** factorise `36` into primes (answer: `[2, 2, 3, 3]`). Does `x² + x + 1 = 0` have solutions? (answer: no, because `Δ = 1 − 4 = −3 < 0`).",
    ),
]

questions = [
    mc("tin10-b31-mc-01", 1, "Số 1 thuộc loại nào sau đây?", "Which of the following is the number 1?",
       "Số 1 không là số nguyên tố và cũng không là hợp số.", "The number 1 is neither prime nor composite.", "B",
       ("Vừa là số nguyên tố vừa là hợp số", "Both prime and composite"), ("Không là số nguyên tố, cũng không là hợp số", "Neither prime nor composite"), ("Là số nguyên tố", "A prime"), ("Là hợp số", "Composite")),
    mc("tin10-b31-mc-02", 1, "Với phương trình ax² + bx + c = 0 (a ≠ 0), biệt thức Δ được tính bằng công thức nào?", "For ax² + bx + c = 0 (a ≠ 0), which formula gives the discriminant Δ?",
       "Biệt thức của phương trình bậc hai là Δ = b² − 4ac.", "The discriminant of a quadratic equation is Δ = b² − 4ac.", "C",
       ("b² + 4ac", "b² + 4ac"), ("b − 4ac", "b − 4ac"), ("b² − 4ac", "b² − 4ac"), ("a² − 4bc", "a² − 4bc")),
    mc("tin10-b31-mc-03", 1, "Phân tích số 12 thành tích các thừa số nguyên tố được kết quả nào?", "Which is the prime factorisation of 12?",
       "12 = 2 × 2 × 3; các thừa số đều là số nguyên tố.", "12 = 2 × 2 × 3; every factor is prime.", "D",
       ("2 × 6", "2 × 6"), ("3 × 4", "3 × 4"), ("1 × 12", "1 × 12"), ("2 × 2 × 3", "2 × 2 × 3")),
    mc("tin10-b31-mc-04", 2, "Chạy chương trình phân tích thừa số với n = 17, chương trình in ra gì?", "Run the factorising program with n = 17. What does it print?",
       "Danh sách kq chỉ có một thừa số là 17 nên chương trình kết luận 17 là số nguyên tố.", "The list kq holds the single factor 17 so the program concludes 17 is prime.", "A",
       ("17 là số nguyên tố", "17 is prime"), ("17 là hợp số", "17 is composite"), ("17 không là số nguyên tố, cũng không là hợp số", "17 is neither prime nor composite"), ("Báo lỗi", "An error")),
    mc("tin10-b31-mc-05", 2, "Với n = 60, danh sách các thừa số nguyên tố mà chương trình ghi được là gì?", "For n = 60, what list of prime factors does the program record?",
       "60 = 2 × 2 × 3 × 5 nên danh sách là [2, 2, 3, 5].", "60 = 2 × 2 × 3 × 5 so the list is [2, 2, 3, 5].", "B",
       ("[2, 3, 5]", "[2, 3, 5]"), ("[2, 2, 3, 5]", "[2, 2, 3, 5]"), ("[2, 5, 6]", "[2, 5, 6]"), ("[4, 3, 5]", "[4, 3, 5]")),
    mc("tin10-b31-mc-06", 2, "Nghiệm của phương trình x² − 5x + 6 = 0 là gì?", "What are the solutions of x² − 5x + 6 = 0?",
       "Δ = 25 − 24 = 1, hai nghiệm là (5 − 1) / 2 = 2 và (5 + 1) / 2 = 3.", "Δ = 25 − 24 = 1, the two solutions are (5 − 1) / 2 = 2 and (5 + 1) / 2 = 3.", "C",
       ("x = 1 và x = 6", "x = 1 and x = 6"), ("x = −2 và x = −3", "x = −2 and x = −3"), ("x = 2 và x = 3", "x = 2 and x = 3"), ("Vô nghiệm", "No solution")),
    mc("tin10-b31-mc-07", 2, "Phương trình x² + 2x + 1 = 0 có kết quả nào?", "What is the result for x² + 2x + 1 = 0?",
       "Δ = 4 − 4 = 0 nên có nghiệm kép x = −2 / 2 = −1.", "Δ = 4 − 4 = 0 so there is a double root x = −2 / 2 = −1.", "D",
       ("Vô nghiệm", "No solution"), ("Hai nghiệm phân biệt", "Two distinct solutions"), ("Vô số nghiệm", "Infinitely many solutions"), ("Nghiệm kép x = −1", "A double root x = −1")),
    mc("tin10-b31-mc-08", 2, "Nhập a = 0, b = 0, c = 5. Kết luận của chương trình là gì?", "Enter a = 0, b = 0, c = 5. What does the program conclude?",
       "Phương trình trở thành 5 = 0 (vô lí) nên vô nghiệm.", "The equation becomes 5 = 0, which is impossible, so there is no solution.", "A",
       ("Vô nghiệm", "No solution"), ("Vô số nghiệm", "Infinitely many solutions"), ("Nghiệm duy nhất x = 5", "Exactly one solution x = 5"), ("Nghiệm kép", "A double root")),
    mc("tin10-b31-mc-09", 2, "Nhập a = 0, b = 2, c = −6. Kết luận của chương trình là gì?", "Enter a = 0, b = 2, c = −6. What does the program conclude?",
       "Đây là phương trình bậc nhất 2x − 6 = 0 nên x = −c / b = 3.", "This is the linear equation 2x − 6 = 0, so x = −c / b = 3.", "B",
       ("Vô nghiệm", "No solution"), ("Nghiệm duy nhất x = 3", "Exactly one solution x = 3"), ("Hai nghiệm x = 2 và x = −6", "Two solutions x = 2 and x = −6"), ("Vô số nghiệm", "Infinitely many solutions")),
    mc("tin10-b31-mc-10", 2, "Năm nào sau đây là năm nhuận?", "Which of these years is a leap year?",
       "2024 chia hết cho 4 mà không chia hết cho 100; còn 1900 và 2100 chia hết cho 100 nhưng không chia hết cho 400, 2023 không chia hết cho 4.", "2024 is divisible by 4 but not by 100; 1900 and 2100 are divisible by 100 but not by 400, and 2023 is not divisible by 4.", "C",
       ("1900", "1900"), ("2023", "2023"), ("2024", "2024"), ("2100", "2100")),
    mc("tin10-b31-mc-11", 3, "Từ năm 2000 đến năm 2100 (kể cả hai đầu) có bao nhiêu năm nhuận?", "How many leap years are there from 2000 to 2100 inclusive?",
       "Các năm nhuận là 2000, 2004, …, 2096: (2096 − 2000) / 4 + 1 = 25; năm 2100 không nhuận.", "The leap years are 2000, 2004, …, 2096: (2096 − 2000) / 4 + 1 = 25; 2100 is not leap.", "D",
       ("24", "24"), ("26", "26"), ("100", "100"), ("25", "25")),
    mc("tin10-b31-mc-12", 3, "Trong chương trình phân tích thừa số, lệnh i = i + 1 chỉ nằm ở nhánh else (khi m không chia hết cho i). Lí do chính là gì?", "In the factorising program, i = i + 1 sits only in the else branch (when m is not divisible by i). What is the main reason?",
       "Sau khi chia được, vẫn phải thử lại cùng i vì một thừa số có thể xuất hiện nhiều lần (như hai thừa số 2 trong 60).", "After a division we must try the same i again because a factor can appear several times (like the two 2s in 60).", "A",
       ("Để thử lại cùng i vì thừa số có thể xuất hiện nhiều lần", "To try the same i again because a factor can repeat"), ("Để chương trình chạy nhanh hơn", "To make the program faster"), ("Vì Python bắt buộc else phải có lệnh cộng", "Because Python requires else to contain an addition"), ("Để tránh lỗi cú pháp", "To avoid a syntax error")),
]

truefalse = [
    tf("tin10-b31-tf-01", 2, "Xét số nguyên tố và hợp số.", "Consider primes and composite numbers.",
       "1 không phải số nguyên tố; 2 là số nguyên tố nhỏ nhất; 9 = 3 × 3 là hợp số; hợp số phân tích được thành tích các thừa số nguyên tố.", "1 is not prime; 2 is the smallest prime; 9 = 3 × 3 is composite; a composite number factorises into primes.",
       ("Số 1 không là số nguyên tố và cũng không là hợp số.", "The number 1 is neither prime nor composite.", True),
       ("Số 2 là số nguyên tố.", "The number 2 is prime.", True),
       ("Số 9 là số nguyên tố.", "The number 9 is prime.", False),
       ("Mọi hợp số đều phân tích được thành tích các thừa số nguyên tố.", "Every composite number can be written as a product of primes.", True)),
    tf("tin10-b31-tf-02", 2, "Xét phương trình bậc hai ax² + bx + c = 0.", "Consider the quadratic equation ax² + bx + c = 0.",
       "Khi a ≠ 0: Δ < 0 vô nghiệm, Δ = 0 nghiệm kép; khi a = 0 phải xét riêng như phương trình bậc nhất; a = 0, b ≠ 0 thì có nghiệm x = −c / b.", "When a ≠ 0: Δ < 0 means no solution, Δ = 0 a double root; when a = 0 it must be handled as a linear equation; a = 0, b ≠ 0 gives x = −c / b.",
       ("Khi a ≠ 0 và Δ < 0 thì phương trình vô nghiệm thực.", "When a ≠ 0 and Δ < 0 there is no real solution.", True),
       ("Khi a ≠ 0 và Δ = 0 thì phương trình có nghiệm kép.", "When a ≠ 0 and Δ = 0 there is a double root.", True),
       ("Khi a = 0 vẫn dùng được công thức nghiệm có chia cho 2a.", "When a = 0 the formula with division by 2a can still be used.", False),
       ("Khi a = 0 và b ≠ 0 thì phương trình vô nghiệm.", "When a = 0 and b ≠ 0 the equation has no solution.", False)),
    tf("tin10-b31-tf-03", 2, "Xét việc gỡ rối và kiểm thử khi viết chương trình.", "Consider debugging and testing while writing programs.",
       "Chạy một lần thấy đúng chưa đủ; in giá trị trung gian và điểm dừng giúp gỡ rối; nên thử dữ liệu đặc biệt như n = 1.", "One correct run is not enough; printing intermediate values and breakpoints help debugging; try special data such as n = 1.",
       ("Chỉ cần chạy một lần và thấy kết quả đúng là đủ để kết luận chương trình đúng.", "One run with a correct result is enough to conclude the program is correct.", False),
       ("In giá trị trung gian bằng print() là một cách gỡ rối.", "Printing intermediate values with print() is a debugging method.", True),
       ("Điểm dừng cho phép dừng chương trình để xem giá trị các biến.", "A breakpoint lets you stop the program to see the variables.", True),
       ("Nên kiểm thử cả dữ liệu đặc biệt như n = 1.", "Special data such as n = 1 should also be tested.", True)),
    tf("tin10-b31-tf-04", 3, "Xét năm nhuận.", "Consider leap years.",
       "Năm nhuận: chia hết cho 400, hoặc chia hết cho 4 mà không chia hết cho 100. 2000 nhuận, 2100 không; 2024 chia hết cho 4 nên nhuận; từ 2000 đến 2100 có 25 năm nhuận.", "Leap year: divisible by 400, or by 4 but not by 100. 2000 is leap, 2100 is not; 2024 is divisible by 4 so it is leap; there are 25 leap years from 2000 to 2100.",
       ("Năm 2000 là năm nhuận.", "The year 2000 is a leap year.", True),
       ("Năm 2100 không phải năm nhuận.", "The year 2100 is not a leap year.", True),
       ("Năm 2024 không nhuận vì chia hết cho 4.", "The year 2024 is not a leap year because it is divisible by 4.", False),
       ("Từ năm 2000 đến năm 2100 có 25 năm nhuận.", "From 2000 to 2100 there are 25 leap years.", True)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
