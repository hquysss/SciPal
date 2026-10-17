# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1,<4"]
# ///
# How to run: python generate_lesson_30_tin10.py
from generate_tin_common import T, build, configure, mc, tf, trace_block

configure(10, "Giải quyết vấn đề với sự trợ giúp của máy tính", "Problem solving with computers")

slug = "kiem-thu-va-go-loi-chuong-trinh-bai-30-tin10"
title_vi = "Bài 30. Kiểm thử và gỡ lỗi chương trình"
title_en = "Lesson 30. Testing and debugging programs"


def sim(vi, en, cap_vi, cap_en):
    return {"heading_vi": vi, "heading_en": en, "caption_vi": cap_vi, "caption_en": cap_en}


UCLN = """m = int(input("m = "))
n = int(input("n = "))
while m != n:
    if m > n:
        m = m - n
    else:
        n = n - m
    print("m =", m, "n =", n)
print("UCLN:", m)"""

SAP_XEP_SAI = """n = int(input("n = "))
A = []
for i in range(n):
    x = int(input("x = "))
    A.append(x)
    j = len(A) - 1
    while j > 1 and A[j] < A[j - 1]:
        A[j], A[j - 1] = A[j - 1], A[j]
        j = j - 1
print(A)"""

SAP_XEP_DUNG = SAP_XEP_SAI.replace("while j > 1", "while j > 0")

blocks = [
    T(
        "### Mục tiêu bài học\n\nSau bài này, bạn có thể:\n\n- phân biệt **kiểm thử** (test: kiểm tra, chạy thử) và **gỡ lỗi** (debug: tìm và loại bỏ lỗi, gọi là *bug*);\n- nêu bốn phương pháp kiểm thử đơn giản: quan sát mã lỗi, dùng nhiều bộ dữ liệu test, in giá trị trung gian, đặt điểm dừng;\n- chọn **bộ dữ liệu test** gồm cả dữ liệu ngẫu nhiên và dữ liệu ở **vùng biên**;\n- theo dõi giá trị biến để tìm ra dòng lệnh gây lỗi lôgic.",
        "### Learning goals\n\nAfter this lesson, you can:\n\n- tell **testing** (checking and trial runs) from **debugging** (finding and removing errors, called *bugs*);\n- name four simple testing methods: reading error names, using many test data sets, printing intermediate values, setting breakpoints;\n- choose a **test set** that includes random data and data at the **boundary**;\n- follow variable values to find the line that causes a logic error.",
    ),
    T(
        "### 1. Một vài phương pháp kiểm thử chương trình\n\nBài trước cho thấy chương trình không báo lỗi ngoại lệ vẫn có thể sai (lỗi *bug* \"âm thầm\"). Vì vậy cần **kiểm thử**: kiểm tra và chạy thử chương trình để tìm lỗi, đồng thời phòng ngừa lỗi phát sinh sau này. **Gỡ lỗi** (debug) là tìm ra và tháo *bug* khỏi chương trình.\n\n| Phương pháp | Cách làm |\n|---|---|\n| **Quan sát mã lỗi** và bắt lỗi ngoại lệ | đọc tên lỗi và dòng lệnh gây lỗi, từ đó phân tích và sửa |\n| **Dùng các bộ dữ liệu test** | chạy thử với dữ liệu mà ta biết trước kết quả đúng |\n| **In các giá trị trung gian** | chèn lệnh `print()` để xem biến thay đổi thế nào; thường dùng nhất trong thực tế |\n| **Điểm dừng** (*breakpoint*) | tạm dừng chương trình ở dòng chọn trước để xem các biến |\n\nBộ dữ liệu test tốt cần: **nhiều bộ**; có bộ **ngẫu nhiên**; có bộ ở **vùng biên**. Ví dụ dữ liệu vào là vùng {x ≥ 0} thì vùng biên là x = 0, x rất gần 0 và x rất lớn.",
        "### 1. Some methods for testing programs\n\nThe previous lesson showed that a program with no exception can still be wrong (a \"silent\" *bug*). That is why we **test**: check and trial-run the program to find errors and to prevent future ones. **Debugging** is finding the bug and taking it out of the program.\n\n| Method | How |\n|---|---|\n| **Read the error** and catch exceptions | read the error name and the faulty line, then analyse and fix |\n| **Use test data sets** | run with data whose correct result is known in advance |\n| **Print intermediate values** | insert `print()` to see how variables change; the most common way in practice |\n| **Breakpoints** | pause the program at chosen lines to inspect variables |\n\nA good test set has: **many sets**; some **random** sets; sets at the **boundary**. For example, when the input domain is {x ≥ 0}, the boundary is x = 0, x very close to 0 and x very large.",
    ),
    T(
        "### 2. Ví dụ: ƯCLN của hai số tự nhiên\n\nBài toán: nhập hai số tự nhiên `m`, `n` từ bàn phím và tính **ước chung lớn nhất**. Chương trình dưới đây dùng cách trừ liên tiếp: khi hai số khác nhau, lấy số lớn trừ đi số nhỏ, cho đến khi bằng nhau thì số đó là ƯCLN.\n\n**Cách 1: in giá trị trung gian.** Dòng `print(\"m =\", m, \"n =\", n)` trong vòng lặp cho ta thấy `m`, `n` sau mỗi lượt. Với `m = 12`, `n = 18`: `12 18` → `12 6` → `6 6`, vậy ƯCLN là 6 sau **2 lượt lặp**.\n\nHãy bấm chạy và đối chiếu bảng biến ở mô phỏng với dòng `print` ở cột đầu ra.",
        "### 2. Example: the GCD of two natural numbers\n\nProblem: read two natural numbers `m`, `n` and compute their **greatest common divisor**. The program below subtracts repeatedly: while the numbers differ, subtract the smaller from the larger until they are equal; that number is the GCD.\n\n**Method 1: print intermediate values.** The line `print(\"m =\", m, \"n =\", n)` in the loop shows `m`, `n` after each pass. With `m = 12`, `n = 18`: `12 18` → `12 6` → `6 6`, so the GCD is 6 after **2 passes**.\n\nRun it and compare the variable table in the simulation with the `print` lines in the output column.",
    ),
    trace_block(
        sim("ƯCLN(12, 18) và các giá trị trung gian", "GCD(12, 18) and intermediate values", "Mỗi lượt lặp in ra m và n; khi m = n = 6 vòng lặp dừng và in ƯCLN.", "Each pass prints m and n; when m = n = 6 the loop stops and the GCD is printed."),
        UCLN,
        ["12", "18"],
    ),
    trace_block(
        sim("Dữ liệu biên: hai số bằng nhau", "Boundary data: equal numbers", "Với m = n = 7, điều kiện m != n sai ngay, vòng lặp không chạy lượt nào và ƯCLN là 7.", "With m = n = 7, m != n is false at once, the loop does not run and the GCD is 7."),
        UCLN,
        ["7", "7"],
    ),
    T(
        "**Cách 2: dùng điểm dừng (breakpoint).** Chức năng này có ở các phần mềm soạn thảo lập trình chuyên nghiệp. Các bước làm:\n\n1. Đặt điểm dừng (có thể đặt **nhiều hơn một**) bằng cách nháy chuột vào cột bên trái dòng lệnh; xuất hiện chấm đỏ.\n2. Chạy chương trình: chương trình chạy bình thường và **dừng lại trước dòng đã đánh dấu**.\n3. Quan sát giá trị các biến lúc đó; bấm nút chạy tiếp để dừng ở điểm dừng kế tiếp (hoặc ở lượt lặp kế tiếp).\n\nCác mô phỏng trong bài này làm việc giống một trình gỡ lỗi: bạn bấm **bước tiếp** để dừng ở từng dòng và nhìn bảng biến. Hãy lập một bảng theo dõi giá trị `m`, `n` qua từng lượt lặp rồi so với **kết quả mong đợi**.",
        "**Method 2: breakpoints.** This feature is found in professional programming editors. Steps:\n\n1. Set a breakpoint (you may set **more than one**) by clicking the margin left of a line; a red dot appears.\n2. Run the program: it runs normally and **pauses before the marked line**.\n3. Look at the variables at that moment; press continue to stop at the next breakpoint (or the next loop pass).\n\nThe simulations in this lesson act like a debugger: you press **next step** to stop at every line and read the variable table. Make a tracking table of `m`, `n` for each pass and compare it with the **expected result**.",
    ),
    T(
        "### 3. Luyện tập gỡ lỗi: chèn số vào dãy đã sắp xếp\n\nBài toán: nhập `n`, rồi nhập lần lượt `n` số; mỗi số mới được đưa vào danh sách `A` và **đổi chỗ dần về đúng vị trí** để `A` luôn tăng dần. Chương trình sau có lỗi ở dòng `while`.\n\nVới dữ liệu test `5, 4, 1`, kết quả mong đợi là `[1, 4, 5]`. Hãy chạy chương trình, so sánh kết quả thực tế với mong đợi, rồi theo dõi `j` và `A` để tìm dòng nghi ngờ.",
        "### 3. Debugging practice: inserting numbers into a sorted list\n\nProblem: read `n`, then `n` numbers; each new number goes into the list `A` and **swaps down into its right place** so `A` is always increasing. The program below has a bug on the `while` line.\n\nWith the test data `5, 4, 1`, the expected result is `[1, 4, 5]`. Run the program, compare the actual result with the expected one, then follow `j` and `A` to find the suspect line.",
    ),
    trace_block(
        sim("Chương trình có lỗi: kết quả sai nhưng không báo lỗi", "A buggy program: wrong result, no error", "Nhập 5, 4, 1 ra [5, 1, 4] thay vì [1, 4, 5]. Khi j = 1 điều kiện j > 1 sai nên phần tử không được đổi chỗ.", "Input 5, 4, 1 gives [5, 1, 4] instead of [1, 4, 5]. When j = 1 the condition j > 1 is false so the element is not swapped."),
        SAP_XEP_SAI,
        ["3", "5", "4", "1"],
    ),
    trace_block(
        sim("Sau khi sửa: while j > 0", "After the fix: while j > 0", "Đổi j > 1 thành j > 0 để phần tử vẫn được so với A[0]; cùng dữ liệu cho [1, 4, 5].", "Changing j > 1 to j > 0 lets the element be compared with A[0]; the same data now gives [1, 4, 5]."),
        SAP_XEP_DUNG,
        ["3", "5", "4", "1"],
    ),
    T(
        "Đã qua một vài bộ test đúng thì sao? Kiểm thử với **càng nhiều bộ dữ liệu càng làm tăng độ tin cậy** của chương trình, nhưng **chưa chứng minh được chương trình đúng hoàn toàn**: vẫn có thể còn trường hợp ta chưa nghĩ tới.\n\nTrường hợp gặp `ZeroDivisionError`: hãy xác định *dòng nào* sinh ra phép chia cho 0, rồi tìm hiểu *vì sao* mẫu số lại bằng 0; sau đó thêm lệnh kiểm tra trước khi chia, ví dụ chỉ chia khi mẫu số khác 0, thay vì xoá phép tính khỏi chương trình.",
        "What if the program has passed a few tests? Testing with **more data sets raises confidence** in the program but **does not prove it is fully correct**: some case we never thought of may remain.\n\nWhen you meet a `ZeroDivisionError`: find *which line* divides by 0, find out *why* the divisor is 0, then add a check before dividing, for example divide only when the divisor is not 0, instead of deleting the calculation.",
    ),
    T(
        "### Tóm tắt và tự kiểm tra\n\n| Nội dung | Ghi nhớ |\n|---|---|\n| Kiểm thử (test) | kiểm tra, chạy thử để tìm lỗi và phòng lỗi về sau |\n| Gỡ lỗi (debug) | tìm và loại bỏ *bug* |\n| Bốn phương pháp | quan sát mã lỗi · bộ dữ liệu test · in giá trị trung gian · điểm dừng |\n| Bộ dữ liệu test | nhiều bộ; có ngẫu nhiên; có vùng biên |\n| Điểm dừng | tạm dừng để xem biến; đặt được nhiều điểm |\n| Qua nhiều test | tăng độ tin cậy nhưng chưa chứng minh chương trình đúng |\n\n**Tự kiểm tra:** với ƯCLN bằng phép trừ, cặp dữ liệu nào là dữ liệu biên đáng thử? (gợi ý: hai số bằng nhau như `7 7`, hoặc một số bằng 1 như `1 9`). Hãy lập bảng theo dõi `m`, `n` cho `1 9`.",
        "### Summary and self-check\n\n| Topic | Remember |\n|---|---|\n| Testing | checking and trial-running to find errors and prevent later ones |\n| Debugging | finding and removing a *bug* |\n| Four methods | read error names · test data sets · print intermediate values · breakpoints |\n| Test data | many sets; random ones; boundary ones |\n| Breakpoint | pause to inspect variables; several can be set |\n| Passing many tests | raises confidence but does not prove the program correct |\n\n**Self-check:** for the GCD by subtraction, which data pairs are boundary data worth trying? (hint: equal numbers such as `7 7`, or one number equal to 1 such as `1 9`). Make a tracking table of `m`, `n` for `1 9`.",
    ),
]

questions = [
    mc("tin10-b30-mc-01", 1, "Mục đích của việc kiểm thử chương trình là gì?", "What is the purpose of testing a program?",
       "Kiểm thử để tìm ra lỗi, đồng thời giúp phòng ngừa lỗi phát sinh về sau; nó không tự động sửa lỗi.", "Testing finds errors and also helps prevent later ones; it does not fix them automatically.", "B",
       ("Tự động sửa lỗi chương trình", "To fix the program automatically"), ("Tìm ra lỗi và phòng ngừa lỗi phát sinh về sau", "To find errors and prevent later ones"), ("Xoá dữ liệu cũ của chương trình", "To delete the program's old data"), ("Làm chương trình chạy nhanh hơn", "To make the program faster")),
    mc("tin10-b30-mc-02", 1, "Từ debug trong lập trình có nghĩa là gì?", "What does the word debug mean in programming?",
       "Debug là gỡ lỗi: tìm ra và loại bỏ bug khỏi chương trình.", "Debug means finding the bug and removing it from the program.", "C",
       ("Viết chương trình mới", "Write a new program"), ("Dịch chương trình sang ngôn ngữ khác", "Translate the program into another language"), ("Tìm và loại bỏ lỗi của chương trình", "Find and remove errors from the program"), ("Chạy chương trình nhiều lần", "Run the program many times")),
    mc("tin10-b30-mc-03", 1, "Điểm dừng (breakpoint) trong phần mềm soạn thảo lập trình có ý nghĩa gì?", "What does a breakpoint in a programming editor mean?",
       "Đó là vị trí chương trình tạm dừng để người lập trình quan sát các biến và cho chạy tiếp.", "It is a position where the program pauses so the programmer can inspect variables and then continue.", "D",
       ("Vị trí chương trình kết thúc", "The position where the program ends"), ("Vị trí chương trình tự xoá dòng lệnh", "The position where the program deletes a line"), ("Vị trí chương trình phát ra tiếng báo", "The position where the program beeps"), ("Vị trí chương trình tạm dừng để quan sát các biến", "The position where the program pauses to inspect variables")),
    mc("tin10-b30-mc-04", 1, "Cách đơn giản và hay dùng nhất để xem giá trị các biến trong lúc chương trình chạy là gì?", "What is the simplest and most common way to see variable values while a program runs?",
       "Chèn lệnh print() để in giá trị trung gian.", "Insert print() commands to show intermediate values.", "A",
       ("Chèn thêm lệnh print() để in giá trị trung gian", "Insert print() commands to show intermediate values"), ("Xoá các dòng nghi ngờ khỏi chương trình", "Delete the suspect lines"), ("Đổi tên tất cả các biến", "Rename every variable"), ("Khởi động lại máy tính", "Restart the computer")),
    mc("tin10-b30-mc-05", 2, "Dữ liệu vào của bài toán là vùng {x ≥ 0}. Dữ liệu ở vùng biên là những dữ liệu nào?", "The input domain of a problem is {x ≥ 0}. Which data lie at the boundary?",
       "Vùng biên gồm x = 0, x rất gần 0 và x rất lớn; giá trị ở giữa vùng không phải dữ liệu biên.", "The boundary is x = 0, x very close to 0 and x very large; a value in the middle is not boundary data.", "B",
       ("Chỉ x = 500 nằm giữa vùng", "Only x = 500, in the middle"), ("x = 0, x gần 0 hoặc x rất lớn", "x = 0, x near 0 or x very large"), ("x = −5, nằm ngoài vùng", "x = −5, outside the domain"), ("Mọi giá trị x đều là dữ liệu biên", "Every value of x is boundary data")),
    mc("tin10-b30-mc-06", 2, "Bộ dữ liệu kiểm thử tốt nên như thế nào?", "What should a good test set be like?",
       "Cần nhiều bộ test, trong đó có dữ liệu ngẫu nhiên và dữ liệu vùng biên.", "It needs many tests, including random data and boundary data.", "C",
       ("Chỉ một bộ duy nhất cho đỡ tốn thời gian", "Just one set to save time"), ("Chỉ gồm các dữ liệu dễ nhất", "Only the easiest data"), ("Nhiều bộ, có cả dữ liệu ngẫu nhiên và dữ liệu vùng biên", "Many sets, with random and boundary data"), ("Chỉ gồm dữ liệu ở vùng biên", "Only boundary data")),
    mc("tin10-b30-mc-07", 2, "Chương trình báo lỗi ZeroDivisionError. Cách xử lí hợp lí nhất là gì?", "A program reports ZeroDivisionError. What is the most sensible fix?",
       "Cần tìm vì sao mẫu số bằng 0 và bổ sung lệnh kiểm tra trước khi chia, không nên xoá phép tính hay bỏ qua lỗi.", "Find out why the divisor is 0 and add a check before dividing; do not just delete the calculation or ignore the error.", "D",
       ("Coi đây là lỗi không sửa được", "Treat it as an unfixable error"), ("Xoá phép chia khỏi chương trình", "Delete the division"), ("Thay bằng một phép toán bất kì", "Replace it with any other operation"), ("Tìm vì sao mẫu bằng 0 và kiểm tra mẫu khác 0 trước khi chia", "Find why the divisor is 0 and check it is not 0 before dividing")),
    mc("tin10-b30-mc-08", 2, "Về số điểm dừng có thể đặt trong một chương trình, phát biểu nào đúng?", "About how many breakpoints you can set in a program, which statement is correct?",
       "Có thể đặt nhiều hơn một điểm dừng, không bị hạn chế ở một điểm.", "You can set more than one breakpoint; you are not limited to one.", "A",
       ("Có thể đặt nhiều điểm dừng", "Several breakpoints can be set"), ("Chỉ đặt được đúng một điểm dừng", "Exactly one breakpoint only"), ("Không đặt được điểm dừng nào", "No breakpoint can be set"), ("Chỉ đặt được tối đa hai điểm dừng", "At most two breakpoints")),
    mc("tin10-b30-mc-09", 2, "Chạy chương trình ƯCLN bằng phép trừ với m = 12, n = 18. Sau lượt lặp đầu tiên, (m, n) bằng bao nhiêu?", "Run the subtraction GCD program with m = 12, n = 18. After the first pass, what is (m, n)?",
       "m = 12 nhỏ hơn n = 18 nên n = n − m = 6; được (12, 6).", "m = 12 is less than n = 18, so n = n − m = 6; giving (12, 6).", "B",
       ("(6, 18)", "(6, 18)"), ("(12, 6)", "(12, 6)"), ("(12, 18)", "(12, 18)"), ("(6, 6)", "(6, 6)")),
    mc("tin10-b30-mc-10", 2, "Cũng với m = 12, n = 18, thân vòng lặp while m != n chạy tất cả bao nhiêu lượt?", "Also for m = 12, n = 18, how many passes does the body of while m != n run in total?",
       "Lượt 1: (12, 18) → (12, 6); lượt 2: (12, 6) → (6, 6); sau đó m = n nên dừng, tổng cộng 2 lượt.", "Pass 1: (12, 18) → (12, 6); pass 2: (12, 6) → (6, 6); then m = n so it stops: 2 passes in all.", "C",
       ("1 lượt", "1 pass"), ("3 lượt", "3 passes"), ("2 lượt", "2 passes"), ("6 lượt", "6 passes")),
    mc("tin10-b30-mc-11", 3, "Chương trình chèn số vào dãy tăng dần có dòng while j > 1 and A[j] < A[j - 1]. Với dữ liệu 5, 4, 1 (n = 3), danh sách A in ra là gì?", "A program inserting numbers into an increasing list has the line while j > 1 and A[j] < A[j - 1]. With data 5, 4, 1 (n = 3), what list A is printed?",
       "Số 4 không được đổi chỗ vì j = 1; số 1 chỉ đổi chỗ được một lần: [5, 4, 1] → [5, 1, 4].", "The 4 is never swapped because j = 1; the 1 swaps only once: [5, 4, 1] → [5, 1, 4].", "D",
       ("[1, 4, 5]", "[1, 4, 5]"), ("[5, 4, 1]", "[5, 4, 1]"), ("[4, 5, 1]", "[4, 5, 1]"), ("[5, 1, 4]", "[5, 1, 4]")),
    mc("tin10-b30-mc-12", 3, "Chương trình qua nhiều bộ dữ liệu test mà đều cho kết quả đúng. Kết luận nào hợp lí?", "A program gives the right result on many test data sets. Which conclusion is sensible?",
       "Nhiều bộ test đúng làm tăng độ tin cậy nhưng chưa chứng minh chương trình đúng hoàn toàn.", "Many passing tests raise confidence but do not prove the program fully correct.", "A",
       ("Độ tin cậy tăng nhưng chưa chứng minh được chương trình đúng", "Confidence rises but it is not proven correct"), ("Chắc chắn chương trình đúng với mọi dữ liệu", "It is certainly correct for all data"), ("Chắc chắn chương trình còn lỗi", "It certainly still has bugs"), ("Không cần kiểm thử thêm nữa", "No further testing is ever needed")),
]

truefalse = [
    tf("tin10-b30-tf-01", 2, "Xét các phương pháp kiểm thử chương trình.", "Consider program-testing methods.",
       "Quan sát mã lỗi, in giá trị trung gian, điểm dừng đều là phương pháp kiểm thử; một bộ test chưa đủ.", "Reading error names, printing intermediate values and breakpoints are all testing methods; one test set is not enough.",
       ("Quan sát mã lỗi ngoại lệ giúp biết dòng lệnh sinh ra lỗi.", "Reading the exception name helps find the line that raised it.", True),
       ("In giá trị trung gian là một phương pháp kiểm thử.", "Printing intermediate values is a testing method.", True),
       ("Chỉ cần chạy một bộ dữ liệu test là đủ để kết luận chương trình đúng.", "Running one test set is enough to conclude the program is correct.", False),
       ("Điểm dừng cho phép tạm dừng chương trình để quan sát các biến.", "A breakpoint lets you pause the program and inspect variables.", True)),
    tf("tin10-b30-tf-02", 2, "Xét việc chọn dữ liệu kiểm thử.", "Consider choosing test data.",
       "Cần nhiều bộ test, có bộ ngẫu nhiên và bộ ở vùng biên; test nhiều chưa đủ để chứng minh chương trình đúng.", "You need many sets, random ones and boundary ones; many tests are still not a proof of correctness.",
       ("Cần chuẩn bị nhiều bộ dữ liệu test.", "Many test data sets should be prepared.", True),
       ("Nên có cả bộ dữ liệu test ngẫu nhiên.", "Random test data should be included too.", True),
       ("Dữ liệu ở vùng biên không cần kiểm thử.", "Boundary data does not need testing.", False),
       ("Qua nhiều bộ test vẫn chưa chứng minh được chương trình đúng hoàn toàn.", "Passing many tests still does not prove the program fully correct.", True)),
    tf("tin10-b30-tf-03", 2, "Chương trình ƯCLN bằng phép trừ, có lệnh print(\"m =\", m, \"n =\", n) trong vòng lặp. Cho m = 12, n = 18.", "The subtraction GCD program has print(\"m =\", m, \"n =\", n) in its loop. Take m = 12, n = 18.",
       "Có 2 lượt lặp rồi dừng với m = n = 6; với m = n = 7 vòng lặp không chạy lượt nào.", "There are 2 passes and it stops with m = n = 6; with m = n = 7 the loop does not run at all.",
       ("Vòng lặp chạy 2 lượt.", "The loop runs 2 passes.", True),
       ("Kết quả ƯCLN in ra là 6.", "The GCD printed is 6.", True),
       ("Với m = n = 7, vòng lặp vẫn chạy đúng 1 lượt.", "With m = n = 7 the loop still runs exactly 1 pass.", False),
       ("Lệnh print trong vòng lặp là cách in giá trị trung gian để kiểm thử.", "The print in the loop is a way to show intermediate values for testing.", True)),
    tf("tin10-b30-tf-04", 3, "Chương trình chèn số vào dãy tăng dần có dòng while j > 1 and A[j] < A[j - 1].", "The program inserting numbers into an increasing list has the line while j > 1 and A[j] < A[j - 1].",
       "Lỗi là j > 1 bỏ qua trường hợp j = 1 (so với A[0]); đây là lỗi ngữ nghĩa không dừng chương trình; sửa thành j > 0 thì ra [1, 4, 5].", "The bug is that j > 1 skips the case j = 1 (comparing with A[0]); it is a semantic error that does not stop the program; with j > 0 the output is [1, 4, 5].",
       ("Điều kiện j > 1 bỏ qua trường hợp j = 1, tức bước so với A[0].", "The condition j > 1 skips the case j = 1, i.e. the comparison with A[0].", True),
       ("Chương trình báo lỗi cú pháp khi chạy.", "The program reports a syntax error when run.", False),
       ("Sửa j > 1 thành j > 0 thì dữ liệu 5, 4, 1 cho kết quả [1, 4, 5].", "Changing j > 1 to j > 0 makes the data 5, 4, 1 give [1, 4, 5].", True),
       ("Lỗi này làm chương trình dừng với một lỗi ngoại lệ.", "This bug stops the program with an exception.", False)),
]

build({"slug": slug, "title_vi": title_vi, "title_en": title_en, "blocks": blocks, "questions": questions, "truefalse": truefalse})
