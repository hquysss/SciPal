# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_20_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "cau-lenh-lap-for-bai-20-tin10"
title_vi = "Bài 20. Câu lệnh lặp for"
title_en = "Lesson 20. The for loop statement"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- nêu được chức năng của **lệnh lặp `for`** (lặp với số lần biết trước);\n- hiểu **vùng giá trị** do lệnh **`range()`** tạo ra;\n- viết được chương trình dùng `for` kết hợp `range()` để tính tổng, đếm và duyệt các ước số;\n- dùng `for` để giải bài toán dân gian bằng cách thử lần lượt các giá trị.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- explain the role of the **`for` loop** (looping a known number of times);\n- understand the **range of values** produced by **`range()`**;\n- write programs that combine `for` and `range()` to sum, count and list divisors;\n- use `for` to solve folk puzzles by trying values one by one.",
    ),
    T(
        "### 1. Lệnh lặp `for`\n\nCó nhiều việc phải làm đi làm lại: đọc tên từng bạn trong lớp 30 học sinh (lặp 30 lần), xét lần lượt các số từ 1 đến 50 để tìm số chia hết cho 3 (lặp 50 lần)... **`for`** là lệnh lặp với **số lần biết trước**; số lần lặp thường do vùng giá trị của lệnh `range()` quyết định.\n\n**Cấu trúc chung:**\n\n```python\nfor <i> in range(m, n):\n    <khối lệnh>\n```\n\nKhi `m` bằng 0, viết gọn:\n\n```python\nfor <i> in range(n):\n    <khối lệnh>\n```\n\n- `<i>` là **biến chạy**, lần lượt nhận từng giá trị trong vùng giá trị của `range()`; mỗi giá trị ứng với một lần lặp;\n- sau dòng `for` có dấu **`:`**; các lệnh lặp viết **thụt vào** (1 phím Tab hoặc 4 dấu cách).\n\nVí dụ tính $0 + 1 + \\dots + 9$: lệnh `range(10)` cho 10 giá trị `0, 1, ..., 9`; `for` lặp 10 lần, mỗi lần cộng giá trị hiện tại của `k` vào `S`. Kết quả là `45`.",
        "### 1. The `for` loop\n\nMany jobs must be repeated: reading the name of each of 30 students (30 times), checking the numbers 1 to 50 one by one for divisibility by 3 (50 times)... **`for`** is a loop with a **known number of repeats**; the number of repeats is usually set by the range of values of `range()`.\n\n**General structure:**\n\n```python\nfor <i> in range(m, n):\n    <block>\n```\n\nWhen `m` is 0, it can be shortened to:\n\n```python\nfor <i> in range(n):\n    <block>\n```\n\n- `<i>` is the **loop variable**; it takes each value of the `range()` in turn, one value per repetition;\n- a **`:`** ends the `for` line; the repeated commands are **indented** (one Tab or 4 spaces).\n\nExample: to compute $0 + 1 + \\dots + 9$, `range(10)` gives the 10 values `0, 1, ..., 9`; `for` repeats 10 times, adding the current value of `k` to `S` each time. The result is `45`.",
    ),
    trace_block(
        sim("Tổng 0 + 1 + … + 9 bằng vòng for", "Sum 0 + 1 + … + 9 with a for loop", "Theo dõi S và k qua từng lần lặp: k chạy từ 0 đến 9, S tăng dần đến 45.", "Follow S and k through each repetition: k runs from 0 to 9 and S grows to 45."),
        """S = 0
for k in range(10):
    S = S + k
print("Tổng là", S)""",
    ),
    T(
        "### 2. Lệnh `range()`\n\nLệnh `range()` tạo ra **vùng giá trị** là các số nguyên liên tiếp:\n\n| Dạng | Vùng giá trị | Ví dụ |\n|---|---|---|\n| `range(n)` | `0, 1, ..., n - 1` | `range(5)` là `0, 1, 2, 3, 4` |\n| `range(start, stop)` | từ `start` đến **trước** `stop` (tức `stop - 1`), bước nhảy 1 | `range(3, 10)` là `3, 4, ..., 9` |\n\nChú ý: giá trị `stop` **không** được lấy. Nếu `start >= stop` thì vùng giá trị **rỗng**, vòng `for` không lặp lần nào.\n\n**Biểu diễn dãy bằng `range()`:**\n\n| Dãy | Lệnh |\n|---|---|\n| 1, 2, 3, ..., 50 | `range(1, 51)` |\n| 5, 6, 7, 8, 9, 10 | `range(5, 11)` |\n| 0, 1 | `range(2)` |\n| 10 | `range(10, 11)` |\n\nCác số $1, 2, \\dots, n$ được duyệt bằng `range(1, n + 1)`. Lệnh `print(i, end=\" \")` in các giá trị trên **cùng một hàng**, cách nhau dấu cách.",
        "### 2. The `range()` command\n\n`range()` produces a **range of values**, consecutive integers:\n\n| Form | Values | Example |\n|---|---|---|\n| `range(n)` | `0, 1, ..., n - 1` | `range(5)` is `0, 1, 2, 3, 4` |\n| `range(start, stop)` | from `start` up to **before** `stop` (that is `stop - 1`), step 1 | `range(3, 10)` is `3, 4, ..., 9` |\n\nNote: the value `stop` is **not** included. If `start >= stop` the range is **empty** and the `for` loop does not run at all.\n\n**Writing sequences with `range()`:**\n\n| Sequence | Command |\n|---|---|\n| 1, 2, 3, ..., 50 | `range(1, 51)` |\n| 5, 6, 7, 8, 9, 10 | `range(5, 11)` |\n| 0, 1 | `range(2)` |\n| 10 | `range(10, 11)` |\n\nThe numbers $1, 2, \\dots, n$ are visited with `range(1, n + 1)`. The command `print(i, end=\" \")` prints the values on the **same line**, separated by spaces.",
    ),
    trace_block(
        sim("Vùng giá trị của range(3, 10) và range(0, 15)", "Values of range(3, 10) and range(0, 15)", "Biến i chạy từ start đến stop − 1; end=\" \" giữ các số trên cùng một hàng.", "The variable i runs from start to stop − 1; end=\" \" keeps the numbers on one line."),
        """for i in range(3, 10):
    print(i, end=" ")
print()
for i in range(0, 15):
    print(i, end=" ")""",
    ),
    trace_block(
        sim("Tổng các số chẵn nhỏ hơn n — nhập 10", "Sum of even numbers below n — enter 10", "Vòng for duyệt i từ 0 đến 9; chỉ những i chia hết cho 2 mới được cộng vào S.", "The for loop visits i from 0 to 9; only the i divisible by 2 are added to S."),
        """n = int(input("Nhập n: "))
S = 0
for i in range(n):
    if i % 2 == 0:
        S = S + i
print("Tổng các số chẵn nhỏ hơn", n, "là", S)""",
        ["10"],
    ),
    trace_block(
        sim("Đếm số nguyên dương nhỏ hơn 20 là bội của 3", "Counting positive integers below 20 that are multiples of 3", "Biến dem tăng thêm 1 mỗi khi i chia hết cho 3: 3, 6, 9, 12, 15, 18.", "The variable dem grows by 1 whenever i is divisible by 3: 3, 6, 9, 12, 15, 18."),
        """n = 20
dem = 0
for i in range(1, n):
    if i % 3 == 0:
        dem = dem + 1
print("Có", dem, "số là bội của 3")""",
    ),
    T(
        "### 3. Thực hành: ước số của n\n\nSố tự nhiên $k$ là **ước** của $n$ khi $n$ chia hết cho $k$, tức `n % k == 0`.\n\n**Nhiệm vụ 1.** Nhập số tự nhiên `n` và in các ước số của `n` (kể cả 1 và `n`) theo hàng ngang. Duyệt `k` trong `range(1, n + 1)`.\n\n**Nhiệm vụ 2.** Nhập số tự nhiên `n` và đếm các **ước thực sự** của `n`, tức ước số nhỏ hơn `n`. Duyệt `k` trong `range(1, n)`. Với `n = 12`, các ước thực sự là `1, 2, 3, 4, 6` nên có 5 ước.",
        "### 3. Practice: divisors of n\n\nA natural number $k$ is a **divisor** of $n$ when $n$ is divisible by $k$, that is `n % k == 0`.\n\n**Task 1.** Enter a natural number `n` and print its divisors (including 1 and `n`) on one line. Visit `k` in `range(1, n + 1)`.\n\n**Task 2.** Enter a natural number `n` and count its **proper divisors**, the divisors smaller than `n`. Visit `k` in `range(1, n)`. For `n = 12` the proper divisors are `1, 2, 3, 4, 6`, so there are 5.",
    ),
    trace_block(
        sim("Nhiệm vụ 1: các ước của n — nhập 12", "Task 1: the divisors of n — enter 12", "Mỗi lần lặp thử một k; chỉ in k khi n % k == 0.", "Each repetition tries one k; k is printed only when n % k == 0."),
        """n = int(input("Nhập n: "))
for k in range(1, n + 1):
    if n % k == 0:
        print(k, end=" ")""",
        ["12"],
    ),
    trace_block(
        sim("Nhiệm vụ 2: đếm ước thực sự — nhập 12", "Task 2: counting proper divisors — enter 12", "k chỉ chạy đến n − 1 nên n không bị tính; dem đếm được 5 ước.", "k only runs to n − 1, so n is not counted; dem counts 5 divisors."),
        """n = int(input("Nhập n: "))
dem = 0
for k in range(1, n):
    if n % k == 0:
        dem = dem + 1
print("Số ước thực sự của", n, "là", dem)""",
        ["12"],
    ),
    T(
        "### 4. Luyện tập và vận dụng\n\n**Luyện tập 1.** Nhập `n`, tính tổng các số tự nhiên **nhỏ hơn** `n` và chia hết cho 3 **hoặc** chia hết cho 5. Với `n = 20` các số đó là `3, 5, 6, 9, 10, 12, 15, 18`, tổng bằng 78.\n\n**Luyện tập 2.** Nhập `n`, tính $S = 1 \\times 2 + 2 \\times 3 + \\dots + (n - 1) \\times n$. Với `n = 5`: $2 + 6 + 12 + 20 = 40$.\n\n**Bài toán dân gian: vừa gà vừa chó** — 36 con, 100 chân. Gọi `ga` là số gà thì số chó là `36 - ga` và số chân là `ga * 2 + (36 - ga) * 4`. Cho `ga` chạy từ 0 đến 36 rồi kiểm tra điều kiện bằng 100.\n\n**Bài toán dân gian: trăm trâu trăm cỏ** — trâu đứng ăn 5 bó, trâu nằm ăn 3 bó, 3 trâu già ăn 1 bó; 100 con ăn 100 bó. Trâu đứng tối đa $100 / 5 = 20$ con, trâu nằm tối đa $100 / 3 = 33$ con, trâu già bằng `100 - dung - nam` và phải chia hết cho 3. Dùng hai vòng `for` lồng nhau:\n\n```python\nfor dung in range(21):\n    for nam in range(34):\n        gia = 100 - dung - nam\n        if gia % 3 == 0 and 5 * dung + 3 * nam + gia // 3 == 100:\n            print(dung, nam, gia)\n```\n\nChương trình in ra các nghiệm `(0, 25, 75)`, `(4, 18, 78)`, `(8, 11, 81)`, `(12, 4, 84)`.",
        "### 4. Practice and application\n\n**Practice 1.** Enter `n` and sum the natural numbers **below** `n` that are divisible by 3 **or** by 5. For `n = 20` they are `3, 5, 6, 9, 10, 12, 15, 18`, and the sum is 78.\n\n**Practice 2.** Enter `n` and compute $S = 1 \\times 2 + 2 \\times 3 + \\dots + (n - 1) \\times n$. For `n = 5`: $2 + 6 + 12 + 20 = 40$.\n\n**Folk puzzle: chickens and dogs** — 36 animals, 100 legs. If `ga` is the number of chickens, the dogs number `36 - ga` and the legs are `ga * 2 + (36 - ga) * 4`. Let `ga` run from 0 to 36 and test whether the legs equal 100.\n\n**Folk puzzle: a hundred buffaloes, a hundred bundles of grass** — a standing buffalo eats 5 bundles, a lying one eats 3, three old ones share 1 bundle; 100 animals eat 100 bundles. Standing buffaloes are at most $100 / 5 = 20$, lying ones at most $100 / 3 = 33$, and old ones equal `100 - dung - nam` and must be divisible by 3. Use two nested `for` loops:\n\n```python\nfor dung in range(21):\n    for nam in range(34):\n        gia = 100 - dung - nam\n        if gia % 3 == 0 and 5 * dung + 3 * nam + gia // 3 == 100:\n            print(dung, nam, gia)\n```\n\nThe program prints the solutions `(0, 25, 75)`, `(4, 18, 78)`, `(8, 11, 81)`, `(12, 4, 84)`.",
    ),
    trace_block(
        sim("Luyện tập 1: tổng số chia hết cho 3 hoặc 5 — nhập 20", "Practice 1: sum of multiples of 3 or 5 — enter 20", "Điều kiện i % 3 == 0 or i % 5 == 0 chọn ra 3, 5, 6, 9, 10, 12, 15, 18; tổng là 78.", "The condition i % 3 == 0 or i % 5 == 0 picks 3, 5, 6, 9, 10, 12, 15, 18; the sum is 78."),
        """n = int(input("Nhập n: "))
S = 0
for i in range(1, n):
    if i % 3 == 0 or i % 5 == 0:
        S = S + i
print("Tổng là", S)""",
        ["20"],
    ),
    trace_block(
        sim("Luyện tập 2: S = 1×2 + 2×3 + … — nhập 5", "Practice 2: S = 1×2 + 2×3 + … — enter 5", "Mỗi lần lặp cộng thêm một số hạng i × (i + 1): 2, 6, 12, 20.", "Each repetition adds one term i × (i + 1): 2, 6, 12, 20."),
        """n = int(input("Nhập n: "))
S = 0
for i in range(1, n):
    S = S + i * (i + 1)
print("S =", S)""",
        ["5"],
    ),
    trace_block(
        sim("Vừa gà vừa chó: 36 con, 100 chân", "Chickens and dogs: 36 animals, 100 legs", "Thử số gà từ 0 đến 36; chỉ một giá trị cho đúng 100 chân.", "Try the number of chickens from 0 to 36; only one value gives exactly 100 legs."),
        """for ga in range(37):
    cho = 36 - ga
    if ga * 2 + cho * 4 == 100:
        print("Gà:", ga, "Chó:", cho)""",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| `for` | lặp với số lần biết trước |\n| Cú pháp | `for i in range(...):` rồi khối lệnh thụt vào |\n| `range(n)` | `0, 1, ..., n - 1` |\n| `range(start, stop)` | từ `start` đến `stop - 1`; rỗng nếu `start >= stop` |\n| Duyệt $1..n$ | `range(1, n + 1)` |\n| Ước của `n` | `n % k == 0` |\n| Tổng, đếm | khởi tạo `S = 0` hoặc `dem = 0` trước vòng lặp |\n\n**Tự kiểm tra:** biểu diễn dãy `1, 2, ..., 50` bằng `range()` (đáp án: `range(1, 51)`). Vòng `for i in range(5)` cho `i` các giá trị nào? (đáp án: `0, 1, 2, 3, 4`).",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| `for` | a loop with a known number of repeats |\n| Syntax | `for i in range(...):` then an indented block |\n| `range(n)` | `0, 1, ..., n - 1` |\n| `range(start, stop)` | from `start` to `stop - 1`; empty if `start >= stop` |\n| Visit $1..n$ | `range(1, n + 1)` |\n| Divisor of `n` | `n % k == 0` |\n| Sum, count | set `S = 0` or `dem = 0` before the loop |\n\n**Self-check:** write the sequence `1, 2, ..., 50` with `range()` (answer: `range(1, 51)`). Which values does `i` take in `for i in range(5)`? (answer: `0, 1, 2, 3, 4`).",
    ),
]

questions = [
    mc("tin10-b20-mc-01", 1, "Câu lệnh lặp for thường được dùng trong trường hợp nào?", "When is the for loop usually used?",
       "for là lệnh lặp với số lần biết trước, thường do range() xác định.", "for is a loop with a known number of repeats, usually set by range().", "D",
       ("Khi số lần lặp chưa biết trước", "When the number of repeats is not known in advance"), ("Khi chỉ cần rẽ nhánh", "When only branching is needed"), ("Khi cần xử lí lỗi chương trình", "When handling program errors"), ("Khi số lần lặp đã biết trước", "When the number of repeats is known in advance")),
    mc("tin10-b20-mc-02", 1, "Trong Python, cấu trúc đúng của câu lệnh for là gì?", "In Python, what is the correct structure of the for statement?",
       "Python viết for <biến> in range(...): rồi khối lệnh thụt vào; các dạng còn lại thuộc ngôn ngữ khác.", "Python writes for <variable> in range(...): followed by an indented block; the others belong to other languages.", "B",
       ("for i to n do", "for i to n do"), ("for i in range(...):", "for i in range(...):"), ("for (i = 1; i <= n; i++)", "for (i = 1; i <= n; i++)"), ("foreach i in n", "foreach i in n")),
    mc("tin10-b20-mc-03", 1, "Trong câu lệnh for i in range(5):, biến i nhận các giá trị nào?", "In for i in range(5):, which values does i take?",
       "range(5) tạo các số 0, 1, 2, 3, 4 (5 giá trị, không có 5).", "range(5) gives 0, 1, 2, 3, 4 (5 values, without 5).", "A",
       ("0, 1, 2, 3, 4", "0, 1, 2, 3, 4"), ("1, 2, 3, 4, 5", "1, 2, 3, 4, 5"), ("1, 2, 3, 4", "1, 2, 3, 4"), ("0, 1, 2, 3", "0, 1, 2, 3")),
    mc("tin10-b20-mc-04", 1, "Đoạn for i in range(1, 4): print(i) in ra những số nào?", "Which numbers does for i in range(1, 4): print(i) print?",
       "range(1, 4) gồm 1, 2, 3 (dừng trước 4), nên in ba số 1 2 3.", "range(1, 4) is 1, 2, 3 (stops before 4), so it prints 1 2 3.", "C",
       ("1 2 3 4", "1 2 3 4"), ("1 2", "1 2"), ("1 2 3", "1 2 3"), ("Không in gì", "Nothing")),
    mc("tin10-b20-mc-05", 1, "Câu lệnh nào lặp lại một khối lệnh đúng 10 lần?", "Which statement repeats a block exactly 10 times?",
       "range(10) có 10 giá trị 0..9. range(1, 10) và range(0, 9) chỉ có 9 giá trị; range(1, 11, 2) có bước nhảy 2.", "range(10) has 10 values 0..9. range(1, 10) and range(0, 9) have only 9 values; range(1, 11, 2) uses step 2.", "B",
       ("for i in range(1, 10):", "for i in range(1, 10):"), ("for i in range(10):", "for i in range(10):"), ("for i in range(1, 11, 2):", "for i in range(1, 11, 2):"), ("for i in range(0, 9):", "for i in range(0, 9):")),
    mc("tin10-b20-mc-06", 1, "Dãy 1, 2, 3, ..., 50 được biểu diễn bằng lệnh nào?", "Which command represents the sequence 1, 2, 3, ..., 50?",
       "Giá trị cuối của range không được lấy nên cần range(1, 51).", "The last value of range is not included, so range(1, 51) is needed.", "D",
       ("range(50)", "range(50)"), ("range(1, 50)", "range(1, 50)"), ("range(0, 51)", "range(0, 51)"), ("range(1, 51)", "range(1, 51)")),
    mc("tin10-b20-mc-07", 2, "Lệnh range(10, 11) cho vùng giá trị nào?", "Which values does range(10, 11) give?",
       "Từ 10 đến trước 11, vậy chỉ có một số 10.", "From 10 up to before 11, so the only value is 10.", "C",
       ("10 và 11", "10 and 11"), ("Từ 0 đến 10", "From 0 to 10"), ("Chỉ số 10", "Only 10"), ("Rỗng", "Empty")),
    mc("tin10-b20-mc-08", 2, "Đoạn S = 0; for k in range(10): S = S + k cho S bằng bao nhiêu?", "What is S after S = 0; for k in range(10): S = S + k?",
       "S = 0 + 1 + 2 + ... + 9 = 45.", "S = 0 + 1 + 2 + ... + 9 = 45.", "A",
       ("45", "45"), ("55", "55"), ("36", "36"), ("10", "10")),
    mc("tin10-b20-mc-09", 2, "Đoạn S = 0; for i in range(1, 6): S = S + i cho S bằng bao nhiêu?", "What is S after S = 0; for i in range(1, 6): S = S + i?",
       "i chạy 1, 2, 3, 4, 5 nên S = 1 + 2 + 3 + 4 + 5 = 15.", "i runs 1, 2, 3, 4, 5, so S = 1 + 2 + 3 + 4 + 5 = 15.", "D",
       ("10", "10"), ("21", "21"), ("5", "5"), ("15", "15")),
    mc("tin10-b20-mc-10", 2, "Vòng for i in range(5, 3): print(i) in ra gì?", "What does the loop for i in range(5, 3): print(i) print?",
       "start = 5 không nhỏ hơn stop = 3 nên vùng giá trị rỗng, thân vòng lặp không chạy lần nào.", "start = 5 is not less than stop = 3, so the range is empty and the body never runs.", "A",
       ("Không in gì", "Nothing"), ("5 4", "5 4"), ("3 4 5", "3 4 5"), ("Báo lỗi", "An error")),
    mc("tin10-b20-mc-11", 2, "Số ước thực sự của n = 12 (ước nhỏ hơn 12) là bao nhiêu?", "How many proper divisors (divisors smaller than 12) does n = 12 have?",
       "Các ước nhỏ hơn 12 là 1, 2, 3, 4, 6, tức 5 ước.", "The divisors smaller than 12 are 1, 2, 3, 4, 6, which is 5.", "C",
       ("6", "6"), ("4", "4"), ("5", "5"), ("3", "3")),
    mc("tin10-b20-mc-12", 3, "Vừa gà vừa chó, bó lại cho tròn, 36 con, 100 chân chẵn. Có bao nhiêu con gà?", "Chickens and dogs together: 36 animals and 100 legs. How many chickens?",
       "Gọi gà là k thì chó là 36 - k; 2k + 4(36 - k) = 100 suy ra k = 22 (gà 22, chó 14). Kiểm tra: 44 + 56 = 100.", "If chickens are k, dogs are 36 - k; 2k + 4(36 - k) = 100 gives k = 22 (22 chickens, 14 dogs). Check: 44 + 56 = 100.", "B",
       ("14", "14"), ("22", "22"), ("20", "20"), ("24", "24")),
]

truefalse = [
    tf("tin10-b20-tf-01", 1, "Xét lệnh lặp for và lệnh range().", "Consider the for loop and range().",
       "for lặp với số lần biết trước; range(n) cho 0..n-1; sau dòng for có dấu hai chấm và khối lệnh thụt vào.", "for loops a known number of times; range(n) gives 0..n-1; the for line ends with a colon and the block is indented.",
       ("for là lệnh lặp với số lần lặp biết trước.", "for is a loop with a known number of repeats.", True),
       ("range(n) gồm các số 0, 1, ..., n - 1.", "range(n) consists of 0, 1, ..., n - 1.", True),
       ("range(5) gồm các số 1, 2, 3, 4, 5.", "range(5) consists of 1, 2, 3, 4, 5.", False),
       ("Các lệnh lặp phải viết thụt vào sau dòng for.", "The repeated commands must be indented after the for line.", True)),
    tf("tin10-b20-tf-02", 2, "Xét vùng giá trị của range(start, stop).", "Consider the values of range(start, stop).",
       "range(start, stop) lấy từ start đến stop - 1; nếu start >= stop thì rỗng.", "range(start, stop) runs from start to stop - 1; it is empty when start >= stop.",
       ("range(3, 10) gồm 3, 4, 5, 6, 7, 8, 9.", "range(3, 10) consists of 3, 4, 5, 6, 7, 8, 9.", True),
       ("range(0, 15) gồm đúng 15 số nguyên.", "range(0, 15) consists of exactly 15 integers.", True),
       ("range(5, 11) kết thúc ở số 11.", "range(5, 11) ends at the number 11.", False),
       ("Nếu start >= stop thì vùng giá trị rỗng.", "If start >= stop the range is empty.", True)),
    tf("tin10-b20-tf-03", 2, "Xét kết quả của một số đoạn chương trình.", "Consider the results of some programs.",
       "Tổng các số chẵn nhỏ hơn 10 là 20; tổng 0..9 là 45 chứ không phải 55; 1 + 2 + 3 + 4 = 10.", "The sum of the even numbers below 10 is 20; the sum 0..9 is 45, not 55; 1 + 2 + 3 + 4 = 10.",
       ("Tổng các số chẵn nhỏ hơn 10 là 0 + 2 + 4 + 6 + 8 = 20.", "The sum of the even numbers below 10 is 0 + 2 + 4 + 6 + 8 = 20.", True),
       ("for k in range(10): S = S + k (S ban đầu bằng 0) cho S bằng 55.", "for k in range(10): S = S + k (S starts at 0) gives S = 55.", False),
       ("Với n = 4, range(1, n + 1) tính được tổng 1 + 2 + 3 + 4 = 10.", "With n = 4, range(1, n + 1) can sum 1 + 2 + 3 + 4 = 10.", True),
       ("print(i, end=\" \") in các giá trị trên cùng một hàng, cách nhau dấu cách.", "print(i, end=\" \") prints the values on one line separated by spaces.", True)),
    tf("tin10-b20-tf-04", 3, "Xét các bài toán dân gian giải bằng vòng for.", "Consider the folk puzzles solved with a for loop.",
       "Gà 22, chó 14 thỏa 36 con và 100 chân; muốn k chạy 0..36 phải viết range(37); trâu đứng tối đa 100/5 = 20 con; bài trăm trâu có nhiều nghiệm.", "22 chickens and 14 dogs fit 36 animals and 100 legs; to run k over 0..36 write range(37); standing buffaloes are at most 100/5 = 20; the buffalo puzzle has several solutions.",
       ("22 con gà và 14 con chó thỏa mãn 36 con và 100 chân.", "22 chickens and 14 dogs fit 36 animals and 100 legs.", True),
       ("Để số gà k nhận các giá trị 0 đến 36 chỉ cần viết range(36).", "To let the number of chickens k take 0 to 36 it is enough to write range(36).", False),
       ("Số trâu đứng tối đa là 100 / 5 = 20 con.", "The number of standing buffaloes is at most 100 / 5 = 20.", True),
       ("Bài toán trăm trâu trăm cỏ có đúng một nghiệm.", "The hundred-buffalo puzzle has exactly one solution.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
